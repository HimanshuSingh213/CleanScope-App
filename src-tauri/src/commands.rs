use std::path::PathBuf;
use std::sync::atomic::Ordering;
use tauri::{AppHandle, Emitter, State};
use chrono::Local;
use sha2::Digest;

use crate::models::{
    AIAnalysisResult, AppStorageSummary, CleanupReport, DeveloperCategorySummary, DriveInfo,
    DuplicateGroup, FileCandidate, ScanReport, Settings, CategoryType,
};
use crate::scanner::Scanner;
use crate::AppState;

#[tauri::command]
pub fn get_drives() -> Vec<DriveInfo> {
    Scanner::get_drives()
}

#[tauri::command]
pub fn get_settings(state: State<'_, AppState>) -> Settings {
    state.storage.load_settings()
}

#[tauri::command]
pub fn save_settings(settings: Settings, state: State<'_, AppState>) -> Result<(), String> {
    state.storage.save_settings(&settings)
}

#[tauri::command]
pub async fn start_scan(
    targets: Option<Vec<String>>,
    app_handle: AppHandle,
    state: State<'_, AppState>,
) -> Result<ScanReport, String> {
    state.cancel_flag.store(false, Ordering::Relaxed);

    let target_paths: Vec<PathBuf> = match targets {
        Some(t) if !t.is_empty() => t.into_iter().map(PathBuf::from).collect(),
        _ => Scanner::get_default_scan_paths(),
    };

    let start_time = std::time::Instant::now();
    let scanner = Scanner::new(state.safety.clone(), state.cancel_flag.clone());

    let handle_clone = app_handle.clone();
    let target_paths_for_scan = target_paths.clone();

    let (discovered_candidates, total_files, total_bytes) = tokio::task::spawn_blocking(move || {
        scanner.scan_path_with_progress(&target_paths_for_scan, |progress| {
            let _ = handle_clone.emit("scan-progress", &progress);
        })
    })
    .await
    .map_err(|e| format!("Scan task failed: {}", e))?;

    let duration_ms = start_time.elapsed().as_millis() as u64;
    let potential_cleanup_bytes: u64 = discovered_candidates
        .iter()
        .map(|c| c.size_bytes)
        .sum();

    // Store candidates in state
    {
        let mut cand_lock = state.candidates.write().await;
        *cand_lock = discovered_candidates.clone();
    }

    let report_id = format!("scan-{}", Local::now().format("%Y%m%d-%H%M%S"));
    let report = ScanReport {
        id: report_id,
        timestamp: Local::now().to_rfc3339(),
        target_paths: target_paths.into_iter().map(|p| p.to_string_lossy().to_string()).collect(),
        total_files_scanned: total_files,
        total_bytes_scanned: total_bytes,
        duration_ms,
        potential_cleanup_bytes,
        candidates_count: discovered_candidates.len(),
    };

    let _ = state.storage.save_scan_report(&report);

    // Emit final candidates to UI
    let _ = app_handle.emit("scan-candidates-ready", &discovered_candidates);

    Ok(report)
}

#[tauri::command]
pub fn cancel_scan(state: State<'_, AppState>) {
    state.cancel_flag.store(true, Ordering::Relaxed);
}

#[tauri::command]
pub async fn get_candidates(state: State<'_, AppState>) -> Result<Vec<FileCandidate>, String> {
    let cand_lock = state.candidates.read().await;
    Ok(cand_lock.clone())
}

#[tauri::command]
pub async fn analyze_candidates_ai(
    candidate_ids: Vec<String>,
    state: State<'_, AppState>,
) -> Result<Vec<AIAnalysisResult>, String> {
    let settings = state.storage.load_settings();
    let candidates_to_analyze: Vec<FileCandidate> = {
        let cand_lock = state.candidates.read().await;
        cand_lock
            .iter()
            .filter(|c| candidate_ids.contains(&c.id))
            .cloned()
            .collect()
    };

    if candidates_to_analyze.is_empty() {
        return Ok(Vec::new());
    }

    let results = state.ai.analyze_candidates(&candidates_to_analyze, &settings).await?;

    // Update candidates in state with AI explanations
    {
        let mut cand_lock = state.candidates.write().await;
        for res in &results {
            if let Some(cand) = cand_lock.iter_mut().find(|c| c.id == res.candidate_id) {
                cand.explanation = res.explanation.clone();
                cand.delete_effect = res.delete_effect.clone();
                cand.category = res.category;
                cand.confidence = res.confidence;
                cand.risk_level = res.risk;
                cand.ai_provider = Some(res.provider.clone());
            }
        }
    }

    Ok(results)
}

#[tauri::command]
pub async fn ask_ai_about_candidate(
    candidate_id: String,
    user_prompt: Option<String>,
    model_override: Option<String>,
    state: State<'_, AppState>,
) -> Result<AIAnalysisResult, String> {
    let settings = state.storage.load_settings();
    let candidate = {
        let cand_lock = state.candidates.read().await;
        cand_lock.iter().find(|c| c.id == candidate_id).cloned()
            .ok_or_else(|| "Candidate item not found in scan results".to_string())?
    };

    let result = state.ai.ask_candidate_detailed(
        &candidate,
        user_prompt.as_deref(),
        model_override.as_deref(),
        &settings
    ).await?;

    // Update candidate in state with AI reasoning
    {
        let mut cand_lock = state.candidates.write().await;
        if let Some(cand) = cand_lock.iter_mut().find(|c| c.id == candidate_id) {
            cand.explanation = result.explanation.clone();
            cand.delete_effect = result.delete_effect.clone();
            cand.category = result.category;
            cand.confidence = result.confidence;
            cand.risk_level = result.risk;
            cand.ai_provider = Some(result.provider.clone());
        }
    }

    Ok(result)
}

#[tauri::command]
pub async fn get_duplicates(
    targets: Option<Vec<String>>,
    state: State<'_, AppState>,
) -> Result<Vec<DuplicateGroup>, String> {
    // 1. If duplicates are already computed and no custom target requested, return cached result
    if targets.is_none() {
        let dup_lock = state.duplicates.read().await;
        if !dup_lock.is_empty() {
            return Ok(dup_lock.clone());
        }
    }

    let target_paths: Vec<PathBuf> = match targets {
        Some(t) if !t.is_empty() => t.into_iter().map(PathBuf::from).collect(),
        _ => Scanner::get_default_scan_paths(),
    };

    let duplicates = tokio::task::spawn_blocking(move || {
        Scanner::find_duplicates(&target_paths)
    })
    .await
    .map_err(|e| format!("Duplicate detection error: {}", e))?;

    {
        let mut dup_lock = state.duplicates.write().await;
        *dup_lock = duplicates.clone();
    }

    Ok(duplicates)
}

#[tauri::command]
pub async fn get_large_files(
    min_size_bytes: Option<u64>,
    state: State<'_, AppState>,
) -> Result<Vec<FileCandidate>, String> {
    let min_size = min_size_bytes.unwrap_or(100 * 1024 * 1024); // default 100MB

    // 1. First check if we already have candidates in memory from the primary Smart Scan
    {
        let cand_lock = state.candidates.read().await;
        if !cand_lock.is_empty() {
            let mut matched: Vec<FileCandidate> = cand_lock
                .iter()
                .filter(|c| !c.is_directory && c.size_bytes >= min_size)
                .cloned()
                .collect();
            matched.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
            if !matched.is_empty() {
                return Ok(matched);
            }
        }
    }

    // 2. Check if large_files cache is available
    {
        let large_lock = state.large_files.read().await;
        if !large_lock.is_empty() {
            let mut matched: Vec<FileCandidate> = large_lock
                .iter()
                .filter(|c| c.size_bytes >= min_size)
                .cloned()
                .collect();
            matched.sort_by(|a, b| b.size_bytes.cmp(&a.size_bytes));
            if !matched.is_empty() {
                return Ok(matched);
            }
        }
    }

    let default_paths = Scanner::get_default_scan_paths();
    let large_files = tokio::task::spawn_blocking(move || {
        Scanner::find_large_files(&default_paths, min_size)
    })
    .await
    .map_err(|e| format!("Large files scan error: {}", e))?;

    {
        let mut large_lock = state.large_files.write().await;
        *large_lock = large_files.clone();
    }

    Ok(large_files)
}

#[tauri::command]
pub async fn get_developer_storage(state: State<'_, AppState>) -> Result<Vec<DeveloperCategorySummary>, String> {
    let cand_lock = state.candidates.read().await;

    let mut map: std::collections::HashMap<String, Vec<FileCandidate>> = std::collections::HashMap::new();

    for cand in cand_lock.iter() {
        if cand.category == CategoryType::DeveloperCache || cand.category == CategoryType::BuildOutput {
            let ecosystem = if let Some(ref app) = cand.related_application {
                app.clone()
            } else {
                "Developer Build Cache".to_string()
            };
            map.entry(ecosystem).or_default().push(cand.clone());
        }
    }

    let mut summaries = Vec::new();
    for (ecosystem, cands) in map {
        let total_size_bytes: u64 = cands.iter().map(|c| c.size_bytes).sum();
        let item_count = cands.len();
        let id = format!("{:x}", sha2::Sha256::digest(ecosystem.as_bytes()));

        summaries.push(DeveloperCategorySummary {
            id,
            name: ecosystem.clone(),
            ecosystem: ecosystem.clone(),
            total_size_bytes,
            item_count,
            can_regenerate: true,
            delete_effect: "Dependencies or build files will be regenerated on next compile/install.".to_string(),
            candidates: cands,
        });
    }

    summaries.sort_by(|a, b| b.total_size_bytes.cmp(&a.total_size_bytes));
    Ok(summaries)
}

#[tauri::command]
pub async fn get_application_storage(state: State<'_, AppState>) -> Result<Vec<AppStorageSummary>, String> {
    let cand_lock = state.candidates.read().await;
    let mut map: std::collections::HashMap<String, Vec<FileCandidate>> = std::collections::HashMap::new();

    for cand in cand_lock.iter() {
        let app_name = if let Some(ref app) = cand.related_application {
            app.clone()
        } else {
            "System & Other".to_string()
        };
        map.entry(app_name).or_default().push(cand.clone());
    }

    let mut summaries = Vec::new();
    for (app_name, cands) in map {
        let total_size_bytes: u64 = cands.iter().map(|c| c.size_bytes).sum();
        let cache_size_bytes: u64 = cands
            .iter()
            .filter(|c| c.category == CategoryType::Cache || c.category == CategoryType::DeveloperCache)
            .map(|c| c.size_bytes)
            .sum();
        let log_size_bytes: u64 = cands
            .iter()
            .filter(|c| c.category == CategoryType::Log || c.category == CategoryType::CrashData)
            .map(|c| c.size_bytes)
            .sum();
        let is_running = cands.iter().any(|c| c.in_use);
        let process_name = cands.iter().find_map(|c| c.owning_process.clone());

        summaries.push(AppStorageSummary {
            app_name,
            total_size_bytes,
            cache_size_bytes,
            log_size_bytes,
            is_running,
            process_name,
            candidates: cands,
        });
    }

    summaries.sort_by(|a, b| b.total_size_bytes.cmp(&a.total_size_bytes));
    Ok(summaries)
}

#[tauri::command]
pub async fn execute_cleanup(
    candidate_ids: Vec<String>,
    use_recycle_bin: bool,
    state: State<'_, AppState>,
) -> Result<CleanupReport, String> {
    let candidates_to_clean: Vec<FileCandidate> = {
        let cand_lock = state.candidates.read().await;
        cand_lock
            .iter()
            .filter(|c| candidate_ids.contains(&c.id))
            .cloned()
            .collect()
    };

    if candidates_to_clean.is_empty() {
        return Err("No valid candidates selected for cleanup".to_string());
    }

    let cleanup_engine = crate::cleanup::CleanupEngine::new(
        state.safety.clone(),
        state.storage.clone(),
    );

    let report = tokio::task::spawn_blocking(move || {
        cleanup_engine.execute_cleanup(&candidates_to_clean, use_recycle_bin)
    })
    .await
    .map_err(|e| format!("Cleanup task error: {}", e))?;

    // Remove cleaned items from in-memory candidate state
    {
        let mut cand_lock = state.candidates.write().await;
        let successful_ids: Vec<&str> = report
            .items
            .iter()
            .filter(|i| i.status == "recycled" || i.status == "deleted")
            .map(|i| i.id.as_str())
            .collect();
        cand_lock.retain(|c| !successful_ids.contains(&c.id.as_str()));
    }

    Ok(report)
}

#[tauri::command]
pub fn get_scan_history(state: State<'_, AppState>) -> Vec<ScanReport> {
    state.storage.get_scan_history()
}

#[tauri::command]
pub fn get_cleanup_history(state: State<'_, AppState>) -> Vec<CleanupReport> {
    state.storage.get_cleanup_history()
}

#[tauri::command]
pub fn clear_history(state: State<'_, AppState>) -> Result<(), String> {
    state.storage.clear_history()
}

#[tauri::command]
pub fn open_in_explorer(path: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        let p = std::path::Path::new(&path);
        let arg = if p.is_dir() {
            path
        } else {
            format!("/select,\"{}\"", path)
        };
        std::process::Command::new("explorer")
            .arg(arg)
            .spawn()
            .map_err(|e| format!("Failed to open Explorer: {}", e))?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        Ok(())
    }
}

#[tauri::command]
pub fn open_url(url: String) -> Result<(), String> {
    #[cfg(windows)]
    {
        std::process::Command::new("cmd")
            .args(["/c", "start", "", &url])
            .spawn()
            .map_err(|e| format!("Failed to open browser URL: {}", e))?;
        Ok(())
    }
    #[cfg(not(windows))]
    {
        let _ = url;
        Ok(())
    }
}

#[tauri::command]
pub async fn test_gemini_key(api_key: String, model: Option<String>) -> Result<String, String> {
    let client = reqwest::Client::new();
    let model_id = model.unwrap_or_else(|| "gemini-3.5-flash-lite".to_string());
    let url = format!(
        "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
        model_id.trim(),
        api_key.trim()
    );

    let body = serde_json::json!({
        "contents": [{
            "parts": [{ "text": "Ping test for CleanScope disk analyzer. Respond with {\"status\": \"ok\"}" }]
        }],
        "generationConfig": {
            "response_mime_type": "application/json"
        }
    });

    let resp = client
        .post(&url)
        .json(&body)
        .send()
        .await
        .map_err(|e| format!("Network error connecting to Gemini API: {}", e))?;

    if resp.status().is_success() {
        Ok(format!("Connected successfully to Gemini ({})", model_id))
    } else {
        let err_body = resp.text().await.unwrap_or_default();
        Err(format!("Gemini API error: {}", err_body))
    }
}

#[tauri::command]
pub async fn reset_app_data(state: State<'_, AppState>) -> Result<Settings, String> {
    // Clear candidates from memory
    {
        let mut cand_lock = state.candidates.write().await;
        cand_lock.clear();
    }
    state.storage.reset_all_data()
}

#[tauri::command]
pub async fn purge_and_uninstall(state: State<'_, AppState>) -> Result<(), String> {
    // 1. Wipe all local data (%LOCALAPPDATA%\CleanScope)
    let _ = state.storage.purge_everything();

    // 2. Schedule deletion of executable if running as standalone
    #[cfg(windows)]
    {
        if let Ok(current_exe) = std::env::current_exe() {
            let exe_path = current_exe.to_string_lossy().to_string();
            let script = format!("timeout /t 2 /nobreak > NUL & del /f /q \"{}\"", exe_path);
            let _ = std::process::Command::new("cmd")
                .args(["/C", &script])
                .spawn();
        }
    }

    // 3. Exit process gracefully
    std::process::exit(0);
}
