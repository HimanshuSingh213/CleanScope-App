use std::fs;
use std::path::{Path, PathBuf};
use crate::models::{AIAnalysisResult, CleanupReport, ScanReport, Settings};

pub struct StorageManager {
    base_dir: PathBuf,
}

impl StorageManager {
    pub fn new() -> Self {
        let base_dir = dirs::data_local_dir()
            .unwrap_or_else(|| PathBuf::from("C:\\ProgramData"))
            .join("CleanScope");

        let manager = Self { base_dir };
        let _ = manager.init_dirs();
        manager
    }

    pub fn get_base_dir(&self) -> &Path {
        &self.base_dir
    }

    fn init_dirs(&self) -> std::io::Result<()> {
        fs::create_dir_all(&self.base_dir)?;
        fs::create_dir_all(self.base_dir.join("scan-history"))?;
        fs::create_dir_all(self.base_dir.join("ai-cache"))?;
        fs::create_dir_all(self.base_dir.join("cleanup-history"))?;
        fs::create_dir_all(self.base_dir.join("models"))?;
        fs::create_dir_all(self.base_dir.join("logs"))?;
        Ok(())
    }

    pub fn load_settings(&self) -> Settings {
        let settings_path = self.base_dir.join("settings.json");
        let mut settings = if let Ok(content) = fs::read_to_string(&settings_path) {
            serde_json::from_str::<Settings>(&content).unwrap_or_default()
        } else {
            let default_settings = Settings::default();
            let _ = self.save_settings(&default_settings);
            default_settings
        };

        if settings.gemini_api_key.is_none() {
            if let Ok(key) = std::env::var("GEMINI_API_KEY") {
                if !key.trim().is_empty() {
                    settings.gemini_api_key = Some(key.trim().to_string());
                }
            }
        }

        settings
    }

    pub fn save_settings(&self, settings: &Settings) -> Result<(), String> {
        let settings_path = self.base_dir.join("settings.json");
        let content = serde_json::to_string_pretty(settings)
            .map_err(|e| format!("Failed to serialize settings: {}", e))?;
        fs::write(settings_path, content)
            .map_err(|e| format!("Failed to write settings.json: {}", e))?;
        Ok(())
    }

    pub fn load_ai_cache(&self, fingerprint: &str) -> Option<AIAnalysisResult> {
        let cache_file = self.base_dir.join("ai-cache").join(format!("{}.json", fingerprint));
        if let Ok(content) = fs::read_to_string(cache_file) {
            serde_json::from_str::<AIAnalysisResult>(&content).ok()
        } else {
            None
        }
    }

    pub fn save_ai_cache(&self, fingerprint: &str, result: &AIAnalysisResult) -> Result<(), String> {
        let cache_file = self.base_dir.join("ai-cache").join(format!("{}.json", fingerprint));
        let content = serde_json::to_string_pretty(result)
            .map_err(|e| format!("Failed to serialize AI result: {}", e))?;
        fs::write(cache_file, content)
            .map_err(|e| format!("Failed to write AI cache entry: {}", e))?;
        Ok(())
    }

    pub fn clear_ai_cache(&self) -> Result<(), String> {
        let cache_dir = self.base_dir.join("ai-cache");
        if cache_dir.exists() {
            for entry in fs::read_dir(cache_dir).map_err(|e| e.to_string())? {
                if let Ok(entry) = entry {
                    let _ = fs::remove_file(entry.path());
                }
            }
        }
        Ok(())
    }

    pub fn save_scan_report(&self, report: &ScanReport) -> Result<(), String> {
        let file_name = format!("{}.json", report.id);
        let report_path = self.base_dir.join("scan-history").join(file_name);
        let content = serde_json::to_string_pretty(report)
            .map_err(|e| format!("Failed to serialize scan report: {}", e))?;
        fs::write(report_path, content)
            .map_err(|e| format!("Failed to write scan report: {}", e))?;
        Ok(())
    }

    pub fn get_scan_history(&self) -> Vec<ScanReport> {
        let mut reports = Vec::new();
        let history_dir = self.base_dir.join("scan-history");
        if let Ok(entries) = fs::read_dir(history_dir) {
            for entry in entries.flatten() {
                if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(entry.path()) {
                        if let Ok(report) = serde_json::from_str::<ScanReport>(&content) {
                            reports.push(report);
                        }
                    }
                }
            }
        }
        reports.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        reports
    }

    pub fn save_cleanup_report(&self, report: &CleanupReport) -> Result<(), String> {
        let file_name = format!("{}.json", report.id);
        let report_path = self.base_dir.join("cleanup-history").join(file_name);
        let content = serde_json::to_string_pretty(report)
            .map_err(|e| format!("Failed to serialize cleanup report: {}", e))?;
        fs::write(report_path, content)
            .map_err(|e| format!("Failed to write cleanup report: {}", e))?;
        Ok(())
    }

    pub fn get_cleanup_history(&self) -> Vec<CleanupReport> {
        let mut reports = Vec::new();
        let history_dir = self.base_dir.join("cleanup-history");
        if let Ok(entries) = fs::read_dir(history_dir) {
            for entry in entries.flatten() {
                if entry.path().extension().and_then(|s| s.to_str()) == Some("json") {
                    if let Ok(content) = fs::read_to_string(entry.path()) {
                        if let Ok(report) = serde_json::from_str::<CleanupReport>(&content) {
                            reports.push(report);
                        }
                    }
                }
            }
        }
        reports.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));
        reports
    }

    pub fn clear_history(&self) -> Result<(), String> {
        let scan_dir = self.base_dir.join("scan-history");
        if scan_dir.exists() {
            if let Ok(entries) = fs::read_dir(scan_dir) {
                for entry in entries.flatten() {
                    let _ = fs::remove_file(entry.path());
                }
            }
        }

        let cleanup_dir = self.base_dir.join("cleanup-history");
        if cleanup_dir.exists() {
            if let Ok(entries) = fs::read_dir(cleanup_dir) {
                for entry in entries.flatten() {
                    let _ = fs::remove_file(entry.path());
                }
            }
        }
        Ok(())
    }

    pub fn reset_all_data(&self) -> Result<Settings, String> {
        if self.base_dir.exists() {
            let _ = fs::remove_dir_all(&self.base_dir);
        }
        let _ = self.init_dirs();
        let default_settings = Settings::default();
        let _ = self.save_settings(&default_settings);
        Ok(default_settings)
    }

    pub fn purge_everything(&self) -> Result<(), String> {
        if self.base_dir.exists() {
            let _ = fs::remove_dir_all(&self.base_dir);
        }
        Ok(())
    }
}
