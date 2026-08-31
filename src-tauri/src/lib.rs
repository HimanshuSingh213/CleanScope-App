use std::sync::atomic::AtomicBool;
use std::sync::Arc;
use tokio::sync::RwLock;

pub mod ai;
pub mod cleanup;
pub mod commands;
pub mod knowledge;
pub mod models;
pub mod process;
pub mod safety;
pub mod scanner;
pub mod storage;

use ai::AIEngine;
use models::{DuplicateGroup, FileCandidate};
use safety::SafetyEngine;
use storage::StorageManager;

pub struct AppState {
    pub storage: Arc<StorageManager>,
    pub safety: Arc<SafetyEngine>,
    pub ai: Arc<AIEngine>,
    pub cancel_flag: Arc<AtomicBool>,
    pub candidates: Arc<RwLock<Vec<FileCandidate>>>,
    pub duplicates: Arc<RwLock<Vec<DuplicateGroup>>>,
    pub large_files: Arc<RwLock<Vec<FileCandidate>>>,
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let storage = Arc::new(StorageManager::new());
    let settings = storage.load_settings();
    let safety = Arc::new(SafetyEngine::new(settings.protected_paths));
    let ai = Arc::new(AIEngine::new(storage.clone(), safety.clone()));
    let cancel_flag = Arc::new(AtomicBool::new(false));

    let state = AppState {
        storage,
        safety,
        ai,
        cancel_flag,
        candidates: Arc::new(RwLock::new(Vec::new())),
        duplicates: Arc::new(RwLock::new(Vec::new())),
        large_files: Arc::new(RwLock::new(Vec::new())),
    };

    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_process::init())
        .manage(state)
        .invoke_handler(tauri::generate_handler![
            commands::get_drives,
            commands::get_settings,
            commands::save_settings,
            commands::start_scan,
            commands::cancel_scan,
            commands::get_candidates,
            commands::analyze_candidates_ai,
            commands::ask_ai_about_candidate,
            commands::get_duplicates,
            commands::get_large_files,
            commands::get_developer_storage,
            commands::get_application_storage,
            commands::execute_cleanup,
            commands::get_scan_history,
            commands::get_cleanup_history,
            commands::clear_history,
            commands::open_in_explorer,
            commands::test_gemini_key,
            commands::reset_app_data,
            commands::purge_and_uninstall,
        ])
        .run(tauri::generate_context!())
        .expect("error while running CleanScope application");
}
