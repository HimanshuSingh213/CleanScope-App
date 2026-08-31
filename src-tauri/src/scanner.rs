use std::collections::HashMap;
use std::fs::File;
use std::io::Read;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::sync::Arc;
use std::time::Instant;

use sha2::{Digest, Sha256};
use walkdir::WalkDir;

use crate::knowledge::KnowledgeBase;
use crate::models::{
    CategoryType, DriveInfo, DuplicateGroup, FileCandidate, RiskLevel, ScanProgressEvent,
};
use crate::process::ProcessDetector;
use crate::safety::SafetyEngine;

#[cfg(windows)]
use windows::core::PCWSTR;
#[cfg(windows)]
use windows::Win32::Storage::FileSystem::{GetDiskFreeSpaceExW, GetDriveTypeW, GetLogicalDriveStringsW};

#[cfg(windows)]
const DRIVE_REMOVABLE: u32 = 2;
#[cfg(windows)]
const DRIVE_FIXED: u32 = 3;

pub struct Scanner {
    safety: Arc<SafetyEngine>,
    knowledge: KnowledgeBase,
    cancel_flag: Arc<AtomicBool>,
}

impl Scanner {
    pub fn new(safety: Arc<SafetyEngine>, cancel_flag: Arc<AtomicBool>) -> Self {
        Self {
            safety,
            knowledge: KnowledgeBase::new(),
            cancel_flag,
        }
    }

    pub fn get_drives() -> Vec<DriveInfo> {
        let mut drives = Vec::new();

        #[cfg(windows)]
        unsafe {
            let mut buffer = [0u16; 512];
            let len = GetLogicalDriveStringsW(Some(&mut buffer));
            if len > 0 {
                let mut start = 0;
                for i in 0..len as usize {
                    if buffer[i] == 0 && i > start {
                        let drive_str = String::from_utf16_lossy(&buffer[start..i]);
                        let mount_point = drive_str.clone();

                        let wide_mount: Vec<u16> = mount_point.encode_utf16().chain(std::iter::once(0)).collect();
                        let drive_type = GetDriveTypeW(PCWSTR::from_raw(wide_mount.as_ptr()));

                        if drive_type == DRIVE_FIXED || drive_type == DRIVE_REMOVABLE {
                            let mut free_bytes_available = 0u64;
                            let mut total_number_of_bytes = 0u64;
                            let mut total_number_of_free_bytes = 0u64;

                            if GetDiskFreeSpaceExW(
                                PCWSTR::from_raw(wide_mount.as_ptr()),
                                Some(&mut free_bytes_available),
                                Some(&mut total_number_of_bytes),
                                Some(&mut total_number_of_free_bytes),
                            ).is_ok() && total_number_of_bytes > 0 {
                                let used_bytes = total_number_of_bytes.saturating_sub(total_number_of_free_bytes);
                                let is_system = mount_point.to_uppercase().starts_with("C:");

                                drives.push(DriveInfo {
                                    name: format!("Local Disk ({})", mount_point.trim_end_matches('\\')),
                                    mount_point,
                                    total_bytes: total_number_of_bytes,
                                    available_bytes: total_number_of_free_bytes,
                                    used_bytes,
                                    file_system: "NTFS".to_string(),
                                    is_system,
                                });
                            }
                        }
                        start = i + 1;
                    }
                }
            }
        }

        if drives.is_empty() {
            // Fallback for non-Windows or if API fails
            drives.push(DriveInfo {
                name: "System Drive (C:)".to_string(),
                mount_point: "C:\\".to_string(),
                total_bytes: 512_000_000_000,
                available_bytes: 128_000_000_000,
                used_bytes: 384_000_000_000,
                file_system: "NTFS".to_string(),
                is_system: true,
            });
        }

        drives
    }

    pub fn get_default_scan_paths() -> Vec<PathBuf> {
        // Collect all fixed drives first
        let drives = Self::get_drives();
        let drive_roots: std::collections::HashSet<PathBuf> = drives
            .iter()
            .map(|d| PathBuf::from(&d.mount_point))
            .filter(|p| p.exists())
            .collect();

        let mut paths: Vec<PathBuf> = Vec::new();

        // Only add specific high-yield subdirs if they are NOT already covered by a drive root
        // that will be traversed anyway. This prevents double-walking AppData/Downloads/etc.
        let home = dirs::home_dir();
        let local_app_data = dirs::data_local_dir();

        // C:\ covers everything on C — so only add specific subdirs for non-C drives
        let c_root = PathBuf::from("C:\\");
        let c_covered = drive_roots.contains(&c_root);

        if !c_covered {
            // C drive not in roots, so add targeted high-yield paths explicitly
            if let Some(ref lad) = local_app_data {
                paths.push(lad.join("Temp"));
                paths.push(lad.clone());
            }
            if let Some(ref home) = home {
                paths.push(home.join(".cargo"));
                paths.push(home.join(".nuget"));
                paths.push(home.join(".gradle"));
                paths.push(home.join(".m2"));
                paths.push(home.join(".docker"));
                paths.push(home.join("Downloads"));
                paths.push(home.join("source"));
            }
            paths.push(PathBuf::from("C:\\Windows\\Temp"));
        }

        // Add all drive roots (they are each walked with their own depth limit in the scan loop)
        for root in &drive_roots {
            paths.push(root.clone());
        }

        let mut seen = std::collections::HashSet::new();
        paths.into_iter().filter(|p| p.exists() && seen.insert(p.clone())).collect()
    }

    /// Returns true if the given path is a raw drive root (e.g. "C:\", "D:\")
    fn is_drive_root(path: &Path) -> bool {
        let s = path.to_string_lossy();
        // Matches patterns like "C:\", "D:\", "C:/", length 3
        s.len() <= 3 && (s.ends_with(":\\") || s.ends_with(":/"))
    }

    pub fn scan_path_with_progress<F>(
        &self,
        targets: &[PathBuf],
        mut on_progress: F,
    ) -> (Vec<FileCandidate>, u64, u64)
    where
        F: FnMut(ScanProgressEvent),
    {
        let mut candidates = Vec::new();
        let mut total_files: u64 = 0;
        let mut total_bytes: u64 = 0;
        let mut skipped_count: u64 = 0;
        let mut potential_cleanup_bytes: u64 = 0;

        let start_time = Instant::now();
        let mut last_progress_time = Instant::now();

        let running_processes = ProcessDetector::get_running_process_names();

        // Track visited canonical paths to avoid re-scanning overlapping targets
        let mut visited_dirs: std::collections::HashSet<PathBuf> = std::collections::HashSet::new();

        for target in targets {
            if self.cancel_flag.load(Ordering::Relaxed) {
                break;
            }

            // Drive roots get a slightly shallower depth to keep scan time predictable;
            // targeted specific subdirs get a deeper pass.
            let depth = if Self::is_drive_root(target) { 8 } else { 9 };

            let mut walker = WalkDir::new(target)
                .follow_links(false)
                .max_depth(depth)
                .into_iter();

            while let Some(entry_res) = walker.next() {
                if self.cancel_flag.load(Ordering::Relaxed) {
                    break;
                }

                let entry = match entry_res {
                    Ok(e) => e,
                    Err(_) => {
                        skipped_count += 1;
                        continue;
                    }
                };

                let path = entry.path();
                let is_dir = entry.file_type().is_dir();
                let norm_path = SafetyEngine::normalize_path(path);
                let is_root_target = entry.depth() == 0 || (norm_path.len() <= 3 && (norm_path.ends_with(":\\") || norm_path.ends_with(':') || norm_path.ends_with(":/")));

                // Skip directories already fully processed by a previous target (e.g. C:\Users\X\AppData
                // first seen as an explicit target, then encountered again under C:\ root walk)
                if is_dir && !is_root_target {
                    let canonical = path.to_path_buf();
                    if !visited_dirs.insert(canonical) {
                        walker.skip_current_dir();
                        continue;
                    }
                }

                // Skip reparse points and junctions to avoid infinite or circular traversal
                if SafetyEngine::is_reparse_point(path) {
                    if is_dir {
                        walker.skip_current_dir();
                    }
                    continue;
                }

                // Never descend into protected Windows/system paths (e.g. System32, $Recycle.Bin, System Volume Information)
                let (is_protected, _) = self.safety.is_protected_path(path);
                if is_protected && !is_root_target {
                    if is_dir {
                        walker.skip_current_dir();
                    }
                    continue;
                }

                // Root drives/targets themselves are not candidates, but their contents must be traversed!
                if is_root_target {
                    continue;
                }

                // 1. ATOMIC DISPOSABLE DIRECTORY PRUNING (Massive 20x-50x speedup)
                // When a directory is a known disposable unit (e.g. node_modules, .next, target, browser Cache),
                // we calculate its total size in one fast pass and SKIP traversing its tens of thousands of subfiles!
                if is_dir {
                    if let Some(matched) = self.knowledge.match_atomic_disposable_dir(path) {
                        walker.skip_current_dir(); // CRUCIAL: Do not descend into children

                        let (dir_size, dir_count) = Self::compute_dir_size_fast(path);
                        if dir_size > 0 {
                            total_files += dir_count as u64;
                            total_bytes += dir_size;

                            let id = format!("{:x}", Sha256::digest(norm_path.as_bytes()));
                            let fingerprint = format!("{:x}", Sha256::digest(format!("{}:{}:dir", norm_path, dir_size).as_bytes()));

                            let is_app_running = matched.process_name.as_ref()
                                .map(|p| running_processes.contains(&p.to_lowercase()))
                                .unwrap_or(false);

                            let candidate = FileCandidate {
                                id,
                                path: path.to_string_lossy().to_string(),
                                name: entry.file_name().to_string_lossy().to_string(),
                                extension: None,
                                size_bytes: dir_size,
                                created_at: None,
                                modified_at: None,
                                accessed_at: None,
                                category: matched.category,
                                risk_level: matched.risk_level,
                                confidence: matched.confidence,
                                in_use: is_app_running,
                                owning_process: if is_app_running { matched.process_name.clone() } else { None },
                                related_application: matched.related_app,
                                delete_effect: matched.delete_effect,
                                explanation: matched.explanation,
                                evidence: matched.evidence,
                                is_directory: true,
                                item_count: Some(dir_count),
                                ai_provider: Some("rules".to_string()),
                                fingerprint: Some(fingerprint),
                            };

                            if matched.risk_level == RiskLevel::Safe || matched.risk_level == RiskLevel::Review {
                                potential_cleanup_bytes += dir_size;
                            }

                            candidates.push(candidate);
                        }

                        // Throttle progress updates to ~80ms
                        if last_progress_time.elapsed().as_millis() >= 80 {
                            let elapsed_sec = start_time.elapsed().as_secs_f64().max(0.001);
                            let scan_speed = total_files as f64 / elapsed_sec;

                            on_progress(ScanProgressEvent {
                                total_files,
                                total_bytes,
                                current_path: path.to_string_lossy().to_string(),
                                scan_speed_files_per_sec: scan_speed,
                                skipped_count,
                                potential_cleanup_bytes,
                                is_complete: false,
                                phase: "Scanning storage".to_string(),
                            });

                            last_progress_time = Instant::now();
                        }

                        continue;
                    }

                    // 1b. LARGE UNKNOWN DIRECTORY DETECTION
                    // If a directory is large (>= 1GB) and not matched by any known rule,
                    // surface it as a Large Directory candidate so the user can see it (e.g. game folders, VM images).
                    // We do a fast shallow size estimate (depth 2) to avoid spending too long on each dir.
                    // Only trigger at depth >= 2 to avoid flagging top-level dirs like Program Files itself.
                    if entry.depth() >= 2 {
                        const LARGE_DIR_THRESHOLD: u64 = 1_073_741_824; // 1 GB
                        let (quick_size, quick_count) = Self::compute_dir_size_shallow(path, 2);
                        if quick_size >= LARGE_DIR_THRESHOLD {
                            // It's large — now get the real full size (skip traversal in main loop)
                            walker.skip_current_dir();
                            let (dir_size, dir_count) = Self::compute_dir_size_fast(path);
                            total_files += dir_count as u64;
                            total_bytes += dir_size;

                            let id = format!("{:x}", Sha256::digest(norm_path.as_bytes()));
                            let fingerprint = format!("{:x}", Sha256::digest(format!("{}:{}:largedir", norm_path, dir_size).as_bytes()));

                            let candidate = FileCandidate {
                                id,
                                path: path.to_string_lossy().to_string(),
                                name: entry.file_name().to_string_lossy().to_string(),
                                extension: None,
                                size_bytes: dir_size,
                                created_at: None,
                                modified_at: None,
                                accessed_at: None,
                                category: CategoryType::LargeFile,
                                risk_level: RiskLevel::Review,
                                confidence: 0.80,
                                in_use: false,
                                owning_process: None,
                                related_application: None,
                                delete_effect: "Large directory removed. Verify contents before deleting — this may contain games, VMs, or important project files.".to_string(),
                                explanation: format!(
                                    "Large unrecognised directory occupying {:.1} GB ({} files).",
                                    dir_size as f64 / 1_073_741_824.0,
                                    dir_count
                                ),
                                evidence: vec![
                                    format!("Directory size: {:.1} GB", dir_size as f64 / 1_073_741_824.0),
                                    "Not matched to any known cache or build artifact pattern".to_string(),
                                ],
                                is_directory: true,
                                item_count: Some(dir_count),
                                ai_provider: Some("rules".to_string()),
                                fingerprint: Some(fingerprint),
                            };

                            potential_cleanup_bytes += dir_size;
                            candidates.push(candidate);
                            let _ = quick_count; // suppress unused warning
                            continue;
                        }
                    }
                }

                // 2. INDIVIDUAL FILE EVALUATION
                let metadata = match entry.metadata() {
                    Ok(m) => m,
                    Err(_) => {
                        skipped_count += 1;
                        continue;
                    }
                };

                let size = if is_dir { 0 } else { metadata.len() };
                total_files += 1;
                total_bytes += size;

                let ext = path.extension().and_then(|s| s.to_str()).map(|s| s.to_string());

                // Match against Knowledge Base rules
                if let Some(matched) = self.knowledge.match_candidate(&norm_path, ext.as_deref(), is_dir) {
                    if size > 0 {
                        let id = format!("{:x}", Sha256::digest(norm_path.as_bytes()));
                        let fingerprint = format!("{:x}", Sha256::digest(format!("{}:{}:{}", norm_path, size, is_dir).as_bytes()));

                        let is_app_running = matched.process_name.as_ref()
                            .map(|p| running_processes.contains(&p.to_lowercase()))
                            .unwrap_or(false);

                        let candidate = FileCandidate {
                            id,
                            path: path.to_string_lossy().to_string(),
                            name: entry.file_name().to_string_lossy().to_string(),
                            extension: ext.clone(),
                            size_bytes: size,
                            created_at: None,
                            modified_at: None,
                            accessed_at: None,
                            category: matched.category,
                            risk_level: matched.risk_level,
                            confidence: matched.confidence,
                            in_use: is_app_running,
                            owning_process: if is_app_running { matched.process_name.clone() } else { None },
                            related_application: matched.related_app,
                            delete_effect: matched.delete_effect,
                            explanation: matched.explanation,
                            evidence: matched.evidence,
                            is_directory: is_dir,
                            item_count: None,
                            ai_provider: Some("rules".to_string()),
                            fingerprint: Some(fingerprint),
                        };

                        if matched.risk_level == RiskLevel::Safe || matched.risk_level == RiskLevel::Review {
                            potential_cleanup_bytes += size;
                        }

                        candidates.push(candidate);
                    }
                } else if !is_dir && size >= 100 * 1024 * 1024 {
                    // 3. Standalone Large File Detection (Files >= 100 MB across all drives)
                    let id = format!("{:x}", Sha256::digest(norm_path.as_bytes()));
                    let fingerprint = format!("{:x}", Sha256::digest(format!("{}:{}:large", norm_path, size).as_bytes()));

                    let candidate = FileCandidate {
                        id,
                        path: path.to_string_lossy().to_string(),
                        name: entry.file_name().to_string_lossy().to_string(),
                        extension: ext.clone(),
                        size_bytes: size,
                        created_at: None,
                        modified_at: None,
                        accessed_at: None,
                        category: CategoryType::LargeFile,
                        risk_level: RiskLevel::Review,
                        confidence: 0.90,
                        in_use: false,
                        owning_process: None,
                        related_application: None,
                        delete_effect: "Removing this large file will immediately reclaim storage space. Ensure you have backed up any critical personal content.".to_string(),
                        explanation: format!("Large standalone file occupying {:.2} GB on disk.", size as f64 / 1_073_741_824.0),
                        evidence: vec![format!("File size exceeds 100 MB threshold ({} bytes)", size)],
                        is_directory: false,
                        item_count: None,
                        ai_provider: Some("rules".to_string()),
                        fingerprint: Some(fingerprint),
                    };

                    potential_cleanup_bytes += size;
                    candidates.push(candidate);
                }

                // Throttle progress updates to ~80ms
                if last_progress_time.elapsed().as_millis() >= 80 {
                    let elapsed_sec = start_time.elapsed().as_secs_f64().max(0.001);
                    let scan_speed = total_files as f64 / elapsed_sec;

                    on_progress(ScanProgressEvent {
                        total_files,
                        total_bytes,
                        current_path: path.to_string_lossy().to_string(),
                        scan_speed_files_per_sec: scan_speed,
                        skipped_count,
                        potential_cleanup_bytes,
                        is_complete: false,
                        phase: "Scanning storage".to_string(),
                    });

                    last_progress_time = Instant::now();
                }
            }
        }

        // Final progress event
        let elapsed_sec = start_time.elapsed().as_secs_f64().max(0.001);
        on_progress(ScanProgressEvent {
            total_files,
            total_bytes,
            current_path: "Scan complete".to_string(),
            scan_speed_files_per_sec: total_files as f64 / elapsed_sec,
            skipped_count,
            potential_cleanup_bytes,
            is_complete: true,
            phase: "Complete".to_string(),
        });

        (candidates, total_files, total_bytes)
    }

    /// Fast, non-filtering single-pass size and file count computation for atomic directories
    pub fn compute_dir_size_fast(path: &Path) -> (u64, usize) {
        let mut total_size = 0u64;
        let mut total_count = 0usize;

        for entry in WalkDir::new(path).follow_links(false).max_depth(12).into_iter().flatten() {
            if entry.file_type().is_file() {
                if let Ok(metadata) = entry.metadata() {
                    total_size += metadata.len();
                    total_count += 1;
                }
            }
        }

        (total_size, total_count)
    }

    /// Shallow size estimate — walks only `max_depth` levels deep.
    /// Used as a fast probe to check if an unknown dir is large before committing to a full walk.
    pub fn compute_dir_size_shallow(path: &Path, max_depth: usize) -> (u64, usize) {
        let mut total_size = 0u64;
        let mut total_count = 0usize;

        for entry in WalkDir::new(path).follow_links(false).max_depth(max_depth).into_iter().flatten() {
            if entry.file_type().is_file() {
                if let Ok(metadata) = entry.metadata() {
                    total_size += metadata.len();
                    total_count += 1;
                }
            }
        }

        (total_size, total_count)
    }


    pub fn find_duplicates(targets: &[PathBuf]) -> Vec<DuplicateGroup> {

        let mut size_map: HashMap<u64, Vec<PathBuf>> = HashMap::new();

        // 1. Group files by size
        for target in targets {
            for entry in WalkDir::new(target).max_depth(12).into_iter().flatten() {
                if entry.file_type().is_file() {
                    if let Ok(metadata) = entry.metadata() {
                        let size = metadata.len();
                        if size >= 1024 * 10 { // >= 10KB
                            size_map.entry(size).or_default().push(entry.path().to_path_buf());
                        }
                    }
                }
            }
        }

        let mut groups = Vec::new();

        // 2. Staged hashing for size collisions
        for (size, paths) in size_map {
            if paths.len() < 2 {
                continue;
            }

            // Step 2a: Partial 4KB hash
            let mut partial_hash_map: HashMap<String, Vec<PathBuf>> = HashMap::new();
            for path in paths {
                if let Some(partial_hash) = Self::compute_partial_hash(&path, 4096) {
                    partial_hash_map.entry(partial_hash).or_default().push(path);
                }
            }

            // Step 2b: Full SHA256 hash for remaining collisions
            for (_p_hash, p_paths) in partial_hash_map {
                if p_paths.len() < 2 {
                    continue;
                }

                let mut full_hash_map: HashMap<String, Vec<PathBuf>> = HashMap::new();
                for path in p_paths {
                    if let Some(full_hash) = Self::compute_full_hash(&path) {
                        full_hash_map.entry(full_hash).or_default().push(path);
                    }
                }

                for (full_hash, duplicate_paths) in full_hash_map {
                    if duplicate_paths.len() >= 2 {
                        let recoverable_bytes = (duplicate_paths.len() as u64 - 1) * size;
                        let mut items = Vec::new();

                        for d_path in duplicate_paths {
                            let name = d_path.file_name().map(|s| s.to_string_lossy().to_string()).unwrap_or_default();
                            let ext = d_path.extension().map(|s| s.to_string_lossy().to_string());
                            let id = format!("{:x}", Sha256::digest(d_path.to_string_lossy().as_bytes()));

                            items.push(FileCandidate {
                                id,
                                path: d_path.to_string_lossy().to_string(),
                                name,
                                extension: ext,
                                size_bytes: size,
                                created_at: None,
                                modified_at: None,
                                accessed_at: None,
                                category: CategoryType::Duplicate,
                                risk_level: RiskLevel::Review,
                                confidence: 0.99,
                                in_use: false,
                                owning_process: None,
                                related_application: None,
                                delete_effect: "Duplicate copy removed; original preserved.".to_string(),
                                explanation: format!("Exact binary duplicate matching SHA-256 hash {}.", &full_hash[..8]),
                                evidence: vec!["Identical byte size".to_string(), "Full binary SHA-256 match".to_string()],
                                is_directory: false,
                                item_count: None,
                                ai_provider: Some("rules".to_string()),
                                fingerprint: Some(full_hash.clone()),
                            });
                        }

                        groups.push(DuplicateGroup {
                            hash: full_hash,
                            size_bytes: size,
                            recoverable_bytes,
                            items,
                        });
                    }
                }
            }
        }

        groups.sort_by(|a, b| b.recoverable_bytes.cmp(&a.recoverable_bytes));
        groups
    }

    pub fn find_large_files(targets: &[PathBuf], min_size_bytes: u64) -> Vec<FileCandidate> {
        let mut large_files = Vec::new();

        for target in targets {
            for entry in WalkDir::new(target).max_depth(12).into_iter().flatten() {
                if entry.file_type().is_file() {
                    if let Ok(metadata) = entry.metadata() {
                        let size = metadata.len();
                        if size >= min_size_bytes {
                            let path = entry.path();
                            let name = entry.file_name().to_string_lossy().to_string();
                            let ext = path.extension().map(|s| s.to_string_lossy().to_string());
                            let id = format!("{:x}", Sha256::digest(path.to_string_lossy().as_bytes()));

                            let category = match ext.as_deref().unwrap_or("").to_lowercase().as_str() {
                                "iso" | "vmdk" | "vhd" | "vhdx" | "img" => CategoryType::LargeFile,
                                "mp4" | "mkv" | "mov" | "avi" => CategoryType::PersonalData,
                                "zip" | "7z" | "tar" | "gz" | "rar" => CategoryType::LargeFile,
                                "msi" | "exe" => CategoryType::Installer,
                                _ => CategoryType::LargeFile,
                            };

                            large_files.push(FileCandidate {
                                id,
                                path: path.to_string_lossy().to_string(),
                                name,
                                extension: ext,
                                size_bytes: size,
                                created_at: None,
                                modified_at: None,
                                accessed_at: None,
                                category,
                                risk_level: RiskLevel::Review,
                                confidence: 0.90,
                                in_use: ProcessDetector::is_file_locked(path),
                                owning_process: None,
                                related_application: None,
                                delete_effect: "Large file removed. Note: large size does not mean unnecessary.".to_string(),
                                explanation: format!("Large standalone file occupying {:.2} MB.", size as f64 / (1024.0 * 1024.0)),
                                evidence: vec![format!("File size: {} MB", size / (1024 * 1024))],
                                is_directory: false,
                                item_count: None,
                                ai_provider: Some("rules".to_string()),
                                fingerprint: None,
                            });
                        }
                    }
                }
            }
        }

        large_files.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
        large_files
    }

    fn compute_partial_hash(path: &Path, bytes_to_read: usize) -> Option<String> {
        let mut file = File::open(path).ok()?;
        let mut buffer = vec![0u8; bytes_to_read];
        let bytes_read = file.read(&mut buffer).ok()?;
        let mut hasher = Sha256::new();
        hasher.update(&buffer[..bytes_read]);
        Some(format!("{:x}", hasher.finalize()))
    }

    fn compute_full_hash(path: &Path) -> Option<String> {
        let mut file = File::open(path).ok()?;
        let mut hasher = Sha256::new();
        let mut buffer = [0u8; 65536];
        loop {
            let bytes_read = file.read(&mut buffer).ok()?;
            if bytes_read == 0 {
                break;
            }
            hasher.update(&buffer[..bytes_read]);
        }
        Some(format!("{:x}", hasher.finalize()))
    }
}
