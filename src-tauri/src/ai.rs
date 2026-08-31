use std::sync::Arc;
use serde::Deserialize;
use serde_json::json;

use crate::models::{AIAnalysisResult, CategoryType, FileCandidate, RiskLevel, Settings};
use crate::safety::SafetyEngine;
use crate::storage::StorageManager;

pub struct AIEngine {
    storage: Arc<StorageManager>,
    safety: Arc<SafetyEngine>,
    http_client: reqwest::Client,
}

#[derive(Debug, Clone, Deserialize)]
struct AIStructuredItem {
    #[serde(alias = "candidate_id", alias = "candidateId", alias = "id")]
    candidate_id: Option<String>,
    #[serde(alias = "category")]
    category: Option<String>,
    #[serde(alias = "confidence")]
    confidence: Option<f32>,
    #[serde(alias = "risk", alias = "risk_level", alias = "riskLevel")]
    risk: Option<String>,
    #[serde(alias = "explanation")]
    explanation: Option<String>,
    #[serde(alias = "delete_effect", alias = "deleteEffect")]
    delete_effect: Option<String>,
    #[serde(alias = "recommendation")]
    recommendation: Option<String>,
}

#[derive(Debug, Deserialize)]
struct AIBatchResponse {
    results: Vec<AIStructuredItem>,
}

fn parse_ai_json(text: &str) -> Option<Vec<AIStructuredItem>> {
    let clean = text.trim();
    let unquoted = if clean.starts_with("```") {
        let without_prefix = clean.trim_start_matches("```json").trim_start_matches("```");
        without_prefix.trim_end_matches("```").trim()
    } else {
        clean
    };

    // 1. Try parsing as { "results": [...] }
    if let Ok(batch) = serde_json::from_str::<AIBatchResponse>(unquoted) {
        if !batch.results.is_empty() {
            return Some(batch.results);
        }
    }

    // 2. Try parsing directly as [ {...}, {...} ]
    if let Ok(items) = serde_json::from_str::<Vec<AIStructuredItem>>(unquoted) {
        if !items.is_empty() {
            return Some(items);
        }
    }

    // 3. Try parsing generic JSON Value
    if let Ok(v) = serde_json::from_str::<serde_json::Value>(unquoted) {
        if let Some(arr) = v.get("results").and_then(|r| r.as_array()) {
            if let Ok(items) = serde_json::from_value::<Vec<AIStructuredItem>>(serde_json::Value::Array(arr.clone())) {
                if !items.is_empty() {
                    return Some(items);
                }
            }
        }
    }

    None
}

impl AIEngine {
    pub fn new(storage: Arc<StorageManager>, safety: Arc<SafetyEngine>) -> Self {
        Self {
            storage,
            safety,
            http_client: reqwest::Client::builder()
                .timeout(std::time::Duration::from_secs(20))
                .build()
                .unwrap_or_default(),
        }
    }

    pub async fn analyze_candidates(
        &self,
        candidates: &[FileCandidate],
        settings: &Settings,
    ) -> Result<Vec<AIAnalysisResult>, String> {
        let mut results = Vec::new();
        let mut unanalyzed = Vec::new();

        // 1. Check AI fingerprint cache first
        for candidate in candidates {
            if let Some(ref fp) = candidate.fingerprint {
                if let Some(cached) = self.storage.load_ai_cache(fp) {
                    results.push(cached);
                    continue;
                }
            }
            unanalyzed.push(candidate.clone());
        }

        if unanalyzed.is_empty() {
            return Ok(results);
        }

        // 2. Dispatch to configured AI provider
        let provider_choice = settings.ai_provider.as_str();
        let gemini_key = settings.gemini_api_key.clone().or_else(|| std::env::var("GEMINI_API_KEY").ok());
        let model_id = settings.gemini_model.clone()
            .or_else(|| std::env::var("GEMINI_MODEL").ok())
            .unwrap_or_else(|| "gemini-3.5-flash-lite".to_string());

        let ai_analyzed = match provider_choice {
            "gemini" => {
                if let Some(ref key) = gemini_key {
                    self.analyze_with_gemini(&unanalyzed, key, &model_id).await?
                } else {
                    return Err("Google Gemini API key is missing. Please enter your API key in Settings -> AI Provider.".to_string());
                }
            }
            "local" => {
                let url = settings.llama_server_url.as_deref().unwrap_or("http://127.0.0.1:8080");
                self.analyze_with_local_llama(&unanalyzed, url).await?
            }
            "hybrid" => {
                // Try Gemini first if key is available, otherwise try local llama
                if let Some(ref key) = gemini_key {
                    self.analyze_with_gemini(&unanalyzed, key, &model_id).await?
                } else {
                    let url = settings.llama_server_url.as_deref().unwrap_or("http://127.0.0.1:8080");
                    match self.analyze_with_local_llama(&unanalyzed, url).await {
                        Ok(res) => res,
                        Err(_) => return Err("No AI provider is configured. Please provide a Google Gemini API Key in Settings or start a local llama.cpp server.".to_string()),
                    }
                }
            }
            _ => {
                return Err("AI Ambiguity Analysis is disabled in settings. Please select Gemini or Local mode in Settings.".to_string());
            }
        };

        // 3. Clamp AI results with deterministic safety rules and save to cache
        for res in ai_analyzed {
            let mut final_res = res.clone();

            // Deterministic safety is the final authority
            if let Some(cand) = unanalyzed.iter().find(|c| c.id == res.candidate_id) {
                let (is_protected, _) = self.safety.is_protected_path(std::path::Path::new(&cand.path));
                if is_protected {
                    final_res.risk = RiskLevel::Protected;
                }

                if let Some(ref fp) = cand.fingerprint {
                    let _ = self.storage.save_ai_cache(fp, &final_res);
                }
            }

            results.push(final_res);
        }

        Ok(results)
    }

    async fn analyze_with_local_llama(
        &self,
        candidates: &[FileCandidate],
        server_url: &str,
    ) -> Result<Vec<AIAnalysisResult>, String> {
        let endpoint = format!("{}/v1/chat/completions", server_url.trim_end_matches('/'));

        let metadata_list: Vec<_> = candidates.iter().map(|c| {
            json!({
                "candidate_id": c.id,
                "path": c.path,
                "name": c.name,
                "extension": c.extension,
                "size_bytes": c.size_bytes,
                "current_category": format!("{:?}", c.category),
                "in_use": c.in_use
            })
        }).collect();

        let prompt = format!(
            "You are CleanScope AI Analyzer. Analyze the following Windows disk items and output ONLY a JSON object with a 'results' array. Each item must have: candidate_id, category (temporary|cache|log|crash-data|installer|developer-cache|build-output|duplicate|large-file|unknown), confidence (0.0 to 1.0), risk (safe|review|protected|unknown), explanation (concise sentence), delete_effect (consequence of removal), recommendation (safe|review|keep).\n\nItems:\n{}",
            serde_json::to_string_pretty(&metadata_list).unwrap_or_default()
        );

        let body = json!({
            "model": "qwen3.5-0.8b",
            "messages": [
                { "role": "system", "content": "You are CleanScope AI file classifier. You always output valid JSON with schema: { \"results\": [ { \"candidate_id\": string, \"category\": string, \"confidence\": number, \"risk\": string, \"explanation\": string, \"delete_effect\": string, \"recommendation\": string } ] }" },
                { "role": "user", "content": prompt }
            ],
            "temperature": 0.1,
            "response_format": { "type": "json_object" }
        });

        match self.http_client.post(&endpoint).json(&body).send().await {
            Ok(resp) if resp.status().is_success() => {
                if let Ok(json_resp) = resp.json::<serde_json::Value>().await {
                    if let Some(content_str) = json_resp["choices"][0]["message"]["content"].as_str() {
                        if let Some(items) = parse_ai_json(content_str) {
                            return Ok(self.map_ai_items_to_results(items, candidates, "local-qwen"));
                        }
                    }
                }
                Err("Failed to parse response from local LLM".to_string())
            }
            Ok(resp) => Err(format!("Local LLM server returned HTTP status {}", resp.status())),
            Err(e) => Err(format!("Could not connect to local llama.cpp on {}: {}", server_url, e)),
        }
    }

    async fn analyze_with_gemini(
        &self,
        candidates: &[FileCandidate],
        api_key: &str,
        model_id: &str,
    ) -> Result<Vec<AIAnalysisResult>, String> {
        let endpoint = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model_id.trim(),
            api_key.trim()
        );

        let metadata_list: Vec<_> = candidates.iter().map(|c| {
            json!({
                "candidate_id": c.id,
                "path": c.path,
                "name": c.name,
                "extension": c.extension,
                "size_bytes": c.size_bytes,
                "is_directory": c.is_directory,
                "item_count": c.item_count,
                "initial_category": format!("{:?}", c.category),
                "in_use": c.in_use,
                "owning_process": c.owning_process,
                "related_app": c.related_application
            })
        }).collect();

        let prompt = format!(
            "You are CleanScope AI, a specialist Windows filesystem and disk storage analyzer.\nAnalyze the following Windows disk items and determine their exact purpose, origin, active dependency, and deletion consequences.\n\nFor each item, answer the 4 explainability questions and output ONLY a JSON object with a 'results' array:\n- candidate_id: string (must match the input item candidate_id)\n- category: 'temporary' | 'cache' | 'log' | 'crash-data' | 'installer' | 'developer-cache' | 'build-output' | 'duplicate' | 'large-file' | 'unknown'\n- confidence: number (0.0 to 1.0)\n- risk: 'safe' (disposable/recreateable caches) | 'review' (build outputs/installers) | 'protected' (system/user credentials) | 'unknown'\n- explanation: Clear 1-2 sentence technical explanation answering: 1. What is this? and 2. Why is it on the computer?\n- delete_effect: Clear sentence answering: 4. What happens if removed? (e.g. Can it be regenerated with npm install, cargo build, browser reload, or will it disrupt an active install?)\n- recommendation: 'safe' | 'review' | 'keep'\n\nItems to analyze:\n{}",
            serde_json::to_string_pretty(&metadata_list).unwrap_or_default()
        );

        let body = json!({
            "contents": [{
                "parts": [{ "text": prompt }]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        });

        match self.http_client.post(&endpoint).json(&body).send().await {
            Ok(resp) => {
                let status = resp.status();
                if status.is_success() {
                    if let Ok(json_resp) = resp.json::<serde_json::Value>().await {
                        if let Some(text) = json_resp["candidates"][0]["content"]["parts"][0]["text"].as_str() {
                            if let Some(items) = parse_ai_json(text) {
                                println!("[CleanScope AI] Successfully parsed {} AI analysis items from Gemini ({})", items.len(), model_id);
                                return Ok(self.map_ai_items_to_results(items, candidates, &format!("gemini-{}", model_id.trim())));
                            } else {
                                return Err(format!("Gemini ({}) did not return valid structured JSON: {}", model_id, text));
                            }
                        }
                    }
                    Err(format!("Gemini ({}) returned an empty response body.", model_id))
                } else {
                    let err_text = resp.text().await.unwrap_or_default();
                    eprintln!("[CleanScope AI] Gemini API error ({}): {}", status, err_text);
                    Err(format!("Gemini API error ({}): {}", status, err_text))
                }
            }
            Err(e) => {
                eprintln!("[CleanScope AI] Network error connecting to Gemini API: {}", e);
                Err(format!("Network error connecting to Gemini API: {}", e))
            }
        }
    }

    pub async fn ask_candidate_detailed(
        &self,
        candidate: &FileCandidate,
        user_prompt: Option<&str>,
        model_override: Option<&str>,
        settings: &Settings,
    ) -> Result<AIAnalysisResult, String> {
        let gemini_key = settings.gemini_api_key.clone().or_else(|| std::env::var("GEMINI_API_KEY").ok())
            .ok_or_else(|| "Google Gemini API key is missing. Please enter your API key in Settings -> AI Ambiguity Analysis.".to_string())?;

        let model_id = model_override
            .map(|s| s.to_string())
            .or_else(|| settings.gemini_model.clone())
            .unwrap_or_else(|| "gemini-3.5-flash-lite".to_string());

        let endpoint = format!(
            "https://generativelanguage.googleapis.com/v1beta/models/{}:generateContent?key={}",
            model_id.trim(),
            gemini_key.trim()
        );

        let metadata = json!({
            "candidate_id": candidate.id,
            "path": candidate.path,
            "name": candidate.name,
            "extension": candidate.extension,
            "size_bytes": candidate.size_bytes,
            "is_directory": candidate.is_directory,
            "item_count": candidate.item_count,
            "in_use": candidate.in_use,
            "owning_process": candidate.owning_process,
            "related_app": candidate.related_application
        });

        let custom_q = user_prompt.unwrap_or("Provide a deep technical explainability diagnosis for this item.");

        let prompt = format!(
            "You are CleanScope AI, a Windows storage and filesystem specialist.\nPerform a deep diagnostic analysis of this disk item:\n{}\n\nUser Question/Instruction: {}\n\nOutput ONLY a JSON object with schema:\n{{\n  \"results\": [\n    {{\n      \"candidate_id\": \"{}\",\n      \"category\": \"temporary\" | \"cache\" | \"log\" | \"crash-data\" | \"installer\" | \"developer-cache\" | \"build-output\" | \"duplicate\" | \"large-file\" | \"unknown\",\n      \"confidence\": 0.0 to 1.0,\n      \"risk\": \"safe\" | \"review\" | \"protected\" | \"unknown\",\n      \"explanation\": \"Detailed technical answer explaining what this item is, who created it, and directly addressing the user inquiry.\",\n      \"delete_effect\": \"Concrete deletion consequences, recreation path (e.g. npm install, cargo build, browser auto-rebuild), and lock safety.\",\n      \"recommendation\": \"safe\" | \"review\" | \"keep\"\n    }}\n  ]\n}}",
            serde_json::to_string_pretty(&metadata).unwrap_or_default(),
            custom_q,
            candidate.id
        );

        let body = json!({
            "contents": [{
                "parts": [{ "text": prompt }]
            }],
            "generationConfig": {
                "response_mime_type": "application/json",
                "temperature": 0.1
            }
        });

        let resp = self.http_client.post(&endpoint).json(&body).send().await
            .map_err(|e| format!("Network error connecting to Gemini API: {}", e))?;

        let status = resp.status();
        if !status.is_success() {
            let err_text = resp.text().await.unwrap_or_default();
            return Err(format!("Gemini API error ({}): {}", status, err_text));
        }

        let json_resp = resp.json::<serde_json::Value>().await
            .map_err(|e| format!("Failed to parse JSON response: {}", e))?;

        if let Some(text) = json_resp["candidates"][0]["content"]["parts"][0]["text"].as_str() {
            if let Some(items) = parse_ai_json(text) {
                let mapped = self.map_ai_items_to_results(items, std::slice::from_ref(candidate), &format!("gemini-{}", model_id.trim()));
                if let Some(first) = mapped.into_iter().next() {
                    let mut final_res = first;
                    let (is_protected, _) = self.safety.is_protected_path(std::path::Path::new(&candidate.path));
                    if is_protected {
                        final_res.risk = RiskLevel::Protected;
                    }
                    if let Some(ref fp) = candidate.fingerprint {
                        let _ = self.storage.save_ai_cache(fp, &final_res);
                    }
                    return Ok(final_res);
                }
            }
        }

        Err("Failed to parse reasoning output from Gemini.".to_string())
    }

    fn map_ai_items_to_results(
        &self,
        ai_items: Vec<AIStructuredItem>,
        candidates: &[FileCandidate],
        provider: &str,
    ) -> Vec<AIAnalysisResult> {
        let mut results = Vec::new();
        for (idx, item) in ai_items.into_iter().enumerate() {
            let matched_cand = if let Some(ref cid) = item.candidate_id {
                candidates.iter().find(|c| c.id == *cid)
            } else if candidates.len() == 1 {
                Some(&candidates[0])
            } else if idx < candidates.len() {
                Some(&candidates[idx])
            } else {
                None
            };

            if let Some(cand) = matched_cand {
                let category = match item.category.as_deref().unwrap_or("") {
                    "temporary" => CategoryType::Temporary,
                    "cache" => CategoryType::Cache,
                    "log" => CategoryType::Log,
                    "crash-data" => CategoryType::CrashData,
                    "installer" => CategoryType::Installer,
                    "developer-cache" => CategoryType::DeveloperCache,
                    "build-output" => CategoryType::BuildOutput,
                    "duplicate" => CategoryType::Duplicate,
                    "large-file" => CategoryType::LargeFile,
                    _ => cand.category,
                };

                let risk = match item.risk.as_deref().unwrap_or("") {
                    "safe" => RiskLevel::Safe,
                    "review" => RiskLevel::Review,
                    "protected" => RiskLevel::Protected,
                    _ => cand.risk_level,
                };

                results.push(AIAnalysisResult {
                    candidate_id: cand.id.clone(),
                    category,
                    confidence: item.confidence.unwrap_or(cand.confidence),
                    risk,
                    explanation: item.explanation.unwrap_or_else(|| cand.explanation.clone()),
                    delete_effect: item.delete_effect.unwrap_or_else(|| cand.delete_effect.clone()),
                    recommendation: item.recommendation.unwrap_or_else(|| "review".to_string()),
                    provider: provider.to_string(),
                });
            }
        }

        // If any candidates were missed by the AI, fill with fallback
        for cand in candidates {
            if !results.iter().any(|r| r.candidate_id == cand.id) {
                results.push(AIAnalysisResult {
                    candidate_id: cand.id.clone(),
                    category: cand.category,
                    confidence: cand.confidence,
                    risk: cand.risk_level,
                    explanation: cand.explanation.clone(),
                    delete_effect: cand.delete_effect.clone(),
                    recommendation: if cand.risk_level == RiskLevel::Safe { "safe".to_string() } else { "review".to_string() },
                    provider: provider.to_string(),
                });
            }
        }

        results
    }
}
