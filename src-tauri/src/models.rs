use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Copy, PartialEq, Eq, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum CategoryType {
    Temporary,
    Cache,
    Log,
    CrashData,
    Installer,
    DeveloperCache,
    BuildOutput,
    Duplicate,
    LargeFile,
    OldFile,
    ApplicationData,
    PersonalData,
    SystemData,
    Unknown,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord, Hash, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum RiskLevel {
    Safe,       // Green - Verified disposable, recreateable
    Review,     // Yellow - Developer cache, duplicates, archives, requires review
    Protected,  // Red - Windows system paths, boot, credentials, protected stores
    Unknown,    // Gray - Insufficient evidence, default is KEEP
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FileCandidate {
    pub id: String,
    pub path: String,
    pub name: String,
    pub extension: Option<String>,
    pub size_bytes: u64,
    pub created_at: Option<String>,
    pub modified_at: Option<String>,
    pub accessed_at: Option<String>,

    pub category: CategoryType,
    pub risk_level: RiskLevel,
    pub confidence: f32,

    pub in_use: bool,
    pub owning_process: Option<String>,
    pub related_application: Option<String>,

    pub delete_effect: String,
    pub explanation: String,
    pub evidence: Vec<String>,

    pub is_directory: bool,
    pub item_count: Option<usize>,

    pub ai_provider: Option<String>,
    pub fingerprint: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanProgressEvent {
    pub total_files: u64,
    pub total_bytes: u64,
    pub current_path: String,
    pub scan_speed_files_per_sec: f64,
    pub skipped_count: u64,
    pub potential_cleanup_bytes: u64,
    pub is_complete: bool,
    pub phase: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DriveInfo {
    pub name: String,
    pub mount_point: String,
    pub total_bytes: u64,
    pub available_bytes: u64,
    pub used_bytes: u64,
    pub file_system: String,
    pub is_system: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DuplicateGroup {
    pub hash: String,
    pub size_bytes: u64,
    pub recoverable_bytes: u64,
    pub items: Vec<FileCandidate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct DeveloperCategorySummary {
    pub id: String,
    pub name: String,
    pub ecosystem: String,
    pub total_size_bytes: u64,
    pub item_count: usize,
    pub can_regenerate: bool,
    pub delete_effect: String,
    pub candidates: Vec<FileCandidate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppStorageSummary {
    pub app_name: String,
    pub total_size_bytes: u64,
    pub cache_size_bytes: u64,
    pub log_size_bytes: u64,
    pub is_running: bool,
    pub process_name: Option<String>,
    pub candidates: Vec<FileCandidate>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupItemResult {
    pub id: String,
    pub path: String,
    pub size_bytes: u64,
    pub status: String, // "recycled", "skipped_in_use", "skipped_protected", "skipped_missing", "failed"
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct CleanupReport {
    pub id: String,
    pub timestamp: String,
    pub total_selected_items: usize,
    pub reclaimed_bytes: u64,
    pub recycled_count: usize,
    pub skipped_count: usize,
    pub failed_count: usize,
    pub items: Vec<CleanupItemResult>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanReport {
    pub id: String,
    pub timestamp: String,
    pub target_paths: Vec<String>,
    pub total_files_scanned: u64,
    pub total_bytes_scanned: u64,
    pub duration_ms: u64,
    pub potential_cleanup_bytes: u64,
    pub candidates_count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Settings {
    pub scan_locations: Vec<String>,
    pub protected_paths: Vec<String>,
    pub excluded_paths: Vec<String>,
    pub use_recycle_bin: bool,
    pub skip_in_use: bool,
    pub min_safe_confidence: f32,
    pub ai_provider: String, // "local", "gemini", "hybrid", "none"
    pub gemini_api_key: Option<String>,
    pub gemini_model: Option<String>,
    pub privacy_metadata_only: bool,
    pub local_model_path: Option<String>,
    pub llama_server_url: Option<String>,
    pub animations_enabled: bool,
    pub reduced_motion: bool,
    pub first_run_completed: bool,
}

impl Default for Settings {
    fn default() -> Self {
        Self {
            scan_locations: Vec::new(),
            protected_paths: Vec::new(),
            excluded_paths: Vec::new(),
            use_recycle_bin: true,
            skip_in_use: true,
            min_safe_confidence: 0.85,
            ai_provider: "hybrid".to_string(),
            gemini_api_key: None,
            gemini_model: Some("gemini-3.5-flash-lite".to_string()),
            privacy_metadata_only: true,
            local_model_path: None,
            llama_server_url: Some("http://127.0.0.1:8080".to_string()),
            animations_enabled: true,
            reduced_motion: false,
            first_run_completed: false,
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AIAnalysisResult {
    pub candidate_id: String,
    pub category: CategoryType,
    pub confidence: f32,
    pub risk: RiskLevel,
    pub explanation: String,
    pub delete_effect: String,
    pub recommendation: String,
    pub provider: String,
}
