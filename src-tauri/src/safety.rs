use std::path::{Path, PathBuf};

#[cfg(windows)]
use std::os::windows::fs::MetadataExt;

pub struct SafetyEngine {
    custom_protected_paths: Vec<PathBuf>,
}

impl SafetyEngine {
    pub fn new(custom_protected_paths: Vec<String>) -> Self {
        let custom = custom_protected_paths
            .into_iter()
            .map(PathBuf::from)
            .collect();
        Self {
            custom_protected_paths: custom,
        }
    }

    pub fn normalize_path(path: &Path) -> String {
        let path_str = path.to_string_lossy();
        let cleaned = if let Some(stripped) = path_str.strip_prefix(r"\\?\") {
            stripped
        } else {
            &path_str
        };
        cleaned.replace('/', "\\").to_lowercase()
    }

    pub fn is_reparse_point(path: &Path) -> bool {
        #[cfg(windows)]
        {
            if let Ok(metadata) = std::fs::symlink_metadata(path) {
                const FILE_ATTRIBUTE_REPARSE_POINT: u32 = 0x400;
                return (metadata.file_attributes() & FILE_ATTRIBUTE_REPARSE_POINT) != 0;
            }
        }
        false
    }

    pub fn is_protected_path(&self, path: &Path) -> (bool, &'static str) {
        let norm = Self::normalize_path(path);

        // 1. Root drives check
        if norm.len() <= 3 && norm.ends_with(":\\") || norm.ends_with(':') {
            return (true, "Root drive directory cannot be modified");
        }

        // 2. Windows and System core paths & all drive system folders
        if norm.contains(r"\$recycle.bin") || norm.starts_with(r"$recycle.bin") {
            return (true, "Recycle Bin system store");
        }
        if norm.contains(r"\system volume information") || norm.starts_with(r"system volume information") {
            return (true, "System Volume Information / System Restore data");
        }
        if norm.contains(r"\recovery") || norm.starts_with(r"recovery") {
            return (true, "Windows Recovery environment");
        }
        if norm.starts_with(r"c:\windows\system32") {
            return (true, "Windows System32 critical directory");
        }
        if norm.starts_with(r"c:\windows\syswow64") {
            return (true, "Windows SysWOW64 critical directory");
        }
        if norm.starts_with(r"c:\windows\winsxs") {
            return (true, "Windows Component Store (WinSxS) is protected");
        }
        if norm.starts_with(r"c:\windows\boot") || norm.starts_with(r"c:\boot") {
            return (true, "Windows Boot infrastructure");
        }
        if norm.starts_with(r"c:\windows\servicing") {
            return (true, "Windows Servicing packages");
        }
        if norm.starts_with(r"c:\windows\microsoft.net") {
            return (true, ".NET Framework runtime directory");
        }

        // 3. Critical root and paging files
        if norm.ends_with(r"\pagefile.sys")
            || norm.ends_with(r"\hiberfil.sys")
            || norm.ends_with(r"\swapfile.sys")
            || norm.ends_with(r"\dumpstack.log")
            || norm.ends_with(r"\bootmgr")
            || norm.ends_with(r"\bootnxt")
        {
            return (true, "Windows virtual memory or boot system file");
        }

        // 4. Registry and Security stores
        if norm.ends_with(r"\ntuser.dat")
            || norm.ends_with(r"\usrclass.dat")
            || norm.contains(r"\appdata\roaming\microsoft\crypto")
            || norm.contains(r"\appdata\roaming\microsoft\protect")
            || norm.contains(r"\appdata\roaming\microsoft\credentials")
            || norm.contains(r"\appdata\roaming\microsoft\vault")
            || norm.contains(r"\windows\system32\config\sam")
            || norm.contains(r"\windows\system32\config\system")
            || norm.contains(r"\windows\system32\config\software")
            || norm.contains(r"\windows\system32\config\security")
        {
            return (true, "Security, cryptographic credentials, or user registry store");
        }

        // 5. User Profile roots
        if let Some(user_dir) = dirs::home_dir() {
            let user_norm = Self::normalize_path(&user_dir);
            if norm == user_norm {
                return (true, "User profile root folder cannot be deleted");
            }
        }

        // 6. Program Files roots (don't delete the root container)
        if norm == r"c:\program files" || norm == r"c:\program files (x86)" || norm == r"c:\programdata" {
            return (true, "System application directory root");
        }

        // 7. Custom user protected paths
        for custom_path in &self.custom_protected_paths {
            let custom_norm = Self::normalize_path(custom_path);
            if norm == custom_norm || norm.starts_with(&format!("{}\\", custom_norm)) {
                return (true, "Custom user-defined protected path");
            }
        }

        (false, "")
    }

    pub fn validate_candidate_for_cleanup(&self, path: &Path) -> Result<(), String> {
        if !path.exists() {
            return Err("File or directory no longer exists on disk".to_string());
        }

        let (is_protected, reason) = self.is_protected_path(path);
        if is_protected {
            return Err(format!("Cleanup rejected: Protected path ({})", reason));
        }

        if Self::is_reparse_point(path) {
            return Err("Cleanup rejected: Reparse point / junction target protection".to_string());
        }

        Ok(())
    }
}
