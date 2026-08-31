use std::fs;
use std::path::Path;
use std::sync::Arc;
use chrono::Local;

use crate::models::{CleanupItemResult, CleanupReport, FileCandidate};
use crate::process::ProcessDetector;
use crate::safety::SafetyEngine;
use crate::storage::StorageManager;

#[cfg(windows)]
use windows::core::PCWSTR;
#[cfg(windows)]
use windows::Win32::UI::Shell::{
    SHFileOperationW, FOF_ALLOWUNDO, FOF_NOCONFIRMATION, FOF_NOERRORUI, FOF_SILENT, FO_DELETE,
    SHFILEOPSTRUCTW,
};

pub struct CleanupEngine {
    safety: Arc<SafetyEngine>,
    storage: Arc<StorageManager>,
}

impl CleanupEngine {
    pub fn new(safety: Arc<SafetyEngine>, storage: Arc<StorageManager>) -> Self {
        Self { safety, storage }
    }

    pub fn execute_cleanup(
        &self,
        candidates: &[FileCandidate],
        use_recycle_bin: bool,
    ) -> CleanupReport {
        let mut items = Vec::new();
        let mut reclaimed_bytes: u64 = 0;
        let mut recycled_count: usize = 0;
        let mut skipped_count: usize = 0;
        let mut failed_count: usize = 0;

        for candidate in candidates {
            let path = Path::new(&candidate.path);

            // 1. Revalidation: existence check
            if !path.exists() {
                items.push(CleanupItemResult {
                    id: candidate.id.clone(),
                    path: candidate.path.clone(),
                    size_bytes: candidate.size_bytes,
                    status: "skipped_missing".to_string(),
                    error_message: Some("File or folder no longer exists on disk".to_string()),
                });
                skipped_count += 1;
                continue;
            }

            // 2. Revalidation: deterministic safety protection check
            let (is_protected, reason) = self.safety.is_protected_path(path);
            if is_protected {
                items.push(CleanupItemResult {
                    id: candidate.id.clone(),
                    path: candidate.path.clone(),
                    size_bytes: candidate.size_bytes,
                    status: "skipped_protected".to_string(),
                    error_message: Some(format!("Protected path: {}", reason)),
                });
                skipped_count += 1;
                continue;
            }

            // 3. Revalidation: junction / reparse point check
            if SafetyEngine::is_reparse_point(path) {
                items.push(CleanupItemResult {
                    id: candidate.id.clone(),
                    path: candidate.path.clone(),
                    size_bytes: candidate.size_bytes,
                    status: "skipped_protected".to_string(),
                    error_message: Some("Skipped reparse point / junction point".to_string()),
                });
                skipped_count += 1;
                continue;
            }

            // 4. Revalidation: in-use lock check
            let (is_locked, proc_name) = ProcessDetector::get_locking_processes(path);
            if is_locked {
                let msg = if let Some(proc) = proc_name {
                    format!("Locked by active process {}", proc)
                } else {
                    "File is currently in use or locked by another process".to_string()
                };
                items.push(CleanupItemResult {
                    id: candidate.id.clone(),
                    path: candidate.path.clone(),
                    size_bytes: candidate.size_bytes,
                    status: "skipped_in_use".to_string(),
                    error_message: Some(msg),
                });
                skipped_count += 1;
                continue;
            }

            // 5. Execution pass: Recycle Bin or standard removal
            let delete_result = if use_recycle_bin {
                Self::move_to_recycle_bin(path)
            } else {
                Self::delete_directly(path)
            };

            match delete_result {
                Ok(_) => {
                    reclaimed_bytes += candidate.size_bytes;
                    recycled_count += 1;
                    items.push(CleanupItemResult {
                        id: candidate.id.clone(),
                        path: candidate.path.clone(),
                        size_bytes: candidate.size_bytes,
                        status: if use_recycle_bin { "recycled".to_string() } else { "deleted".to_string() },
                        error_message: None,
                    });
                }
                Err(err) => {
                    failed_count += 1;
                    items.push(CleanupItemResult {
                        id: candidate.id.clone(),
                        path: candidate.path.clone(),
                        size_bytes: candidate.size_bytes,
                        status: "failed".to_string(),
                        error_message: Some(err),
                    });
                }
            }
        }

        let report_id = format!("cleanup-{}", Local::now().format("%Y%m%d-%H%M%S"));
        let report = CleanupReport {
            id: report_id,
            timestamp: Local::now().to_rfc3339(),
            total_selected_items: candidates.len(),
            reclaimed_bytes,
            recycled_count,
            skipped_count,
            failed_count,
            items,
        };

        let _ = self.storage.save_cleanup_report(&report);
        report
    }

    #[cfg(windows)]
    pub fn move_to_recycle_bin(path: &Path) -> Result<(), String> {
        let path_str = path.to_string_lossy();
        // Windows SHFileOperation requires double null-terminated string (pFrom)
        let mut wide_path: Vec<u16> = path_str.encode_utf16().collect();
        wide_path.push(0);
        wide_path.push(0);

        let mut file_op = SHFILEOPSTRUCTW {
            hwnd: windows::Win32::Foundation::HWND::default(),
            wFunc: FO_DELETE,
            pFrom: PCWSTR::from_raw(wide_path.as_ptr()),
            pTo: PCWSTR::null(),
            fFlags: (FOF_ALLOWUNDO | FOF_NOCONFIRMATION | FOF_SILENT | FOF_NOERRORUI).0 as u16,
            fAnyOperationsAborted: windows::Win32::Foundation::BOOL(0),
            hNameMappings: std::ptr::null_mut(),
            lpszProgressTitle: PCWSTR::null(),
        };

        let res = unsafe { SHFileOperationW(&mut file_op) };
        if res == 0 && file_op.fAnyOperationsAborted.0 == 0 {
            Ok(())
        } else {
            Err(format!("Windows Recycle Bin error code: {}", res))
        }
    }

    #[cfg(not(windows))]
    pub fn move_to_recycle_bin(path: &Path) -> Result<(), String> {
        Self::delete_directly(path)
    }

    fn delete_directly(path: &Path) -> Result<(), String> {
        if path.is_dir() {
            fs::remove_dir_all(path).map_err(|e| e.to_string())
        } else {
            fs::remove_file(path).map_err(|e| e.to_string())
        }
    }
}
