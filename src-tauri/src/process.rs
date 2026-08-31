use std::fs::OpenOptions;
use std::path::Path;

#[cfg(windows)]
use windows::Win32::Foundation::{ERROR_MORE_DATA, ERROR_SUCCESS};
#[cfg(windows)]
use windows::Win32::System::RestartManager::{
    RmEndSession, RmGetList, RmRegisterResources, RmStartSession, RM_PROCESS_INFO,
};
#[cfg(windows)]
use windows::Win32::System::ProcessStatus::{EnumProcesses, GetProcessImageFileNameW};
#[cfg(windows)]
use windows::Win32::System::Threading::{OpenProcess, PROCESS_QUERY_LIMITED_INFORMATION};

pub struct ProcessDetector;

impl ProcessDetector {
    pub fn is_file_locked(path: &Path) -> bool {
        if !path.exists() {
            return false;
        }

        if path.is_file() {
            // Attempt to open the file with read/write access to check if another process holds an exclusive lock
            match OpenOptions::new().read(true).write(true).open(path) {
                Ok(_) => false,
                Err(e) => {
                    // Windows error 32 is ERROR_SHARING_VIOLATION, error 33 is ERROR_LOCK_VIOLATION
                    if let Some(raw_os_error) = e.raw_os_error() {
                        raw_os_error == 32 || raw_os_error == 33 || raw_os_error == 5
                    } else {
                        false
                    }
                }
            }
        } else {
            // For directories, check if any file inside is currently locked or if directory is in use
            false
        }
    }

    #[cfg(windows)]
    pub fn get_locking_processes(path: &Path) -> (bool, Option<String>) {
        if !path.exists() {
            return (false, None);
        }

        let mut session_handle: u32 = 0;
        let mut session_key = [0u16; 64];

        unsafe {
            let res = RmStartSession(&mut session_handle, 0, windows::core::PWSTR::from_raw(session_key.as_mut_ptr()));
            if res != ERROR_SUCCESS {
                return (Self::is_file_locked(path), None);
            }

            let path_str = path.to_string_lossy();
            let wide_path: Vec<u16> = path_str.encode_utf16().chain(std::iter::once(0)).collect();
            let files = [windows::core::PCWSTR::from_raw(wide_path.as_ptr())];

            let reg_res = RmRegisterResources(session_handle, Some(&files), None, None);
            if reg_res != ERROR_SUCCESS {
                let _ = RmEndSession(session_handle);
                return (Self::is_file_locked(path), None);
            }

            let mut n_proc_info_needed = 0u32;
            let mut n_proc_info = 10u32;
            let mut proc_info: Vec<RM_PROCESS_INFO> = vec![std::mem::zeroed(); n_proc_info as usize];
            let mut reboot_reasons = 0u32;

            let get_res = RmGetList(
                session_handle,
                &mut n_proc_info_needed,
                &mut n_proc_info,
                Some(proc_info.as_mut_ptr()),
                &mut reboot_reasons,
            );

            let _ = RmEndSession(session_handle);

            if get_res == ERROR_SUCCESS && n_proc_info > 0 {
                let first_proc = &proc_info[0];
                let app_name = String::from_utf16_lossy(&first_proc.strAppName)
                    .trim_matches('\0')
                    .trim()
                    .to_string();
                let display_name = if !app_name.is_empty() {
                    app_name
                } else {
                    format!("PID {}", first_proc.Process.dwProcessId)
                };
                return (true, Some(display_name));
            } else if get_res == ERROR_MORE_DATA {
                return (true, Some("Multiple active processes".to_string()));
            }
        }

        (Self::is_file_locked(path), None)
    }

    #[cfg(not(windows))]
    pub fn get_locking_processes(path: &Path) -> (bool, Option<String>) {
        (Self::is_file_locked(path), None)
    }

    pub fn get_running_process_names() -> Vec<String> {
        let mut processes = Vec::new();

        #[cfg(windows)]
        unsafe {
            let mut process_ids = [0u32; 1024];
            let mut bytes_returned = 0u32;

            if EnumProcesses(
                process_ids.as_mut_ptr(),
                (process_ids.len() * std::mem::size_of::<u32>()) as u32,
                &mut bytes_returned,
            ).is_ok() {
                let count = bytes_returned as usize / std::mem::size_of::<u32>();
                for &pid in &process_ids[..count] {
                    if pid == 0 {
                        continue;
                    }
                    if let Ok(handle) = OpenProcess(PROCESS_QUERY_LIMITED_INFORMATION, false, pid) {
                        let mut name_buf = [0u16; 512];
                        let len = GetProcessImageFileNameW(handle, &mut name_buf);
                        if len > 0 {
                            let raw_name = String::from_utf16_lossy(&name_buf[..len as usize]);
                            if let Some(file_name) = raw_name.rsplit('\\').next() {
                                processes.push(file_name.to_lowercase());
                            }
                        }
                    }
                }
            }
        }

        processes
    }
}
