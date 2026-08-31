use crate::models::{CategoryType, RiskLevel};

#[derive(Debug, Clone)]
pub struct KnowledgeRule {
    pub id: &'static str,
    pub name: &'static str,
    pub ecosystem: &'static str,
    pub path_patterns: &'static [&'static str],
    pub extensions: &'static [&'static str],
    pub category: CategoryType,
    pub default_risk: RiskLevel,
    pub confidence: f32,
    pub explanation: &'static str,
    pub delete_effect: &'static str,
    pub associated_processes: &'static [&'static str],
    pub can_regenerate: bool,
}

pub struct KnowledgeBase {
    rules: Vec<KnowledgeRule>,
}

pub struct KnowledgeMatch {
    pub category: CategoryType,
    pub risk_level: RiskLevel,
    pub confidence: f32,
    pub explanation: String,
    pub delete_effect: String,
    pub evidence: Vec<String>,
    pub related_app: Option<String>,
    pub process_name: Option<String>,
    pub can_regenerate: bool,
    pub ecosystem: String,
}

impl KnowledgeBase {
    pub fn new() -> Self {
        let rules = vec![
            // 1. Browsers
            KnowledgeRule {
                id: "chrome-cache",
                name: "Google Chrome Cache",
                ecosystem: "Web Browser",
                path_patterns: &[
                    r"\google\chrome\user data\default\cache",
                    r"\google\chrome\user data\default\code cache",
                    r"\google\chrome\user data\default\gpucache",
                    r"\google\chrome\user data\default\service worker\cachestorage",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.98,
                explanation: "Google Chrome cached web pages, media, and script bytecode.",
                delete_effect: "Chrome will recreate the cache automatically. Next page loads may temporarily take slightly longer.",
                associated_processes: &["chrome.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "edge-cache",
                name: "Microsoft Edge Cache",
                ecosystem: "Web Browser",
                path_patterns: &[
                    r"\microsoft\edge\user data\default\cache",
                    r"\microsoft\edge\user data\default\code cache",
                    r"\microsoft\edge\user data\default\gpucache",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.98,
                explanation: "Microsoft Edge browser cache holding temporary downloaded assets and scripts.",
                delete_effect: "Edge will automatically rebuild cache files during future browsing sessions.",
                associated_processes: &["msedge.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "firefox-cache",
                name: "Mozilla Firefox Cache",
                ecosystem: "Web Browser",
                path_patterns: &[
                    r"\mozilla\firefox\profiles\",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.94,
                explanation: "Mozilla Firefox browser web cache and startup cache entries.",
                delete_effect: "Firefox recreates caches upon restart.",
                associated_processes: &["firefox.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "brave-cache",
                name: "Brave Browser Cache",
                ecosystem: "Web Browser",
                path_patterns: &[
                    r"\bravesoftware\brave-browser\user data\default\cache",
                    r"\bravesoftware\brave-browser\user data\default\code cache",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.98,
                explanation: "Brave browser cached web resources and compiled script caches.",
                delete_effect: "Browser automatically recreates cached assets on demand.",
                associated_processes: &["brave.exe"],
                can_regenerate: true,
            },

            // 2. Developer Environments & Package Managers
            KnowledgeRule {
                id: "npm-cache",
                name: "NPM Package Cache",
                ecosystem: "Node.js",
                path_patterns: &[
                    r"\appdata\local\npm-cache",
                    r"\appdata\roaming\npm-cache",
                    r"\.npm\_cacache",
                ],
                extensions: &[],
                category: CategoryType::DeveloperCache,
                default_risk: RiskLevel::Review,
                confidence: 0.96,
                explanation: "NPM downloaded tarballs and package metadata cache used to accelerate npm install commands.",
                delete_effect: "Packages will be freshly downloaded from npm registry when needed in projects.",
                associated_processes: &["node.exe", "npm.cmd"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "pnpm-cache",
                name: "PNPM Store & Cache",
                ecosystem: "Node.js",
                path_patterns: &[
                    r"\appdata\local\pnpm-cache",
                    r"\.pnpm-state",
                    r"\pnpm\store",
                ],
                extensions: &[],
                category: CategoryType::DeveloperCache,
                default_risk: RiskLevel::Review,
                confidence: 0.95,
                explanation: "PNPM content-addressable package storage and cache.",
                delete_effect: "Future pnpm install operations will fetch packages from npm registry.",
                associated_processes: &["node.exe", "pnpm.cmd"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "yarn-cache",
                name: "Yarn Cache",
                ecosystem: "Node.js",
                path_patterns: &[
                    r"\appdata\local\yarn\cache",
                    r"\.yarn\cache",
                ],
                extensions: &[],
                category: CategoryType::DeveloperCache,
                default_risk: RiskLevel::Review,
                confidence: 0.96,
                explanation: "Yarn package manager global archive cache.",
                delete_effect: "Packages will be redownloaded on subsequent yarn installations.",
                associated_processes: &["yarn.cmd", "node.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "cargo-cache",
                name: "Rust Cargo Registry & Git Cache",
                ecosystem: "Rust",
                path_patterns: &[
                    r"\.cargo\registry\cache",
                    r"\.cargo\git\db",
                    r"\.cargo\git\checkouts",
                ],
                extensions: &[],
                category: CategoryType::DeveloperCache,
                default_risk: RiskLevel::Review,
                confidence: 0.97,
                explanation: "Cargo crate archive downloads and cached git dependency checkouts.",
                delete_effect: "Crates will be downloaded from crates.io again during next cargo build.",
                associated_processes: &["cargo.exe", "rustc.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "pip-cache",
                name: "Python Pip Cache",
                ecosystem: "Python",
                path_patterns: &[
                    r"\appdata\local\pip\cache",
                    r"\.cache\pip",
                ],
                extensions: &[],
                category: CategoryType::DeveloperCache,
                default_risk: RiskLevel::Review,
                confidence: 0.97,
                explanation: "Python pip wheel and package download cache.",
                delete_effect: "Wheels will be redownloaded from PyPI on next pip install.",
                associated_processes: &["python.exe", "pip.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "nuget-cache",
                name: "NuGet Package Cache",
                ecosystem: ".NET",
                path_patterns: &[
                    r"\.nuget\packages",
                    r"\appdata\local\nuget\cache",
                    r"\appdata\local\nuget\v3-cache",
                ],
                extensions: &[],
                category: CategoryType::DeveloperCache,
                default_risk: RiskLevel::Review,
                confidence: 0.95,
                explanation: ".NET NuGet global package cache holding downloaded assemblies.",
                delete_effect: "NuGet restore will redownload required packages.",
                associated_processes: &["dotnet.exe", "devenv.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "gradle-cache",
                name: "Gradle Cache",
                ecosystem: "Java/Kotlin",
                path_patterns: &[
                    r"\.gradle\caches",
                    r"\.gradle\daemon",
                ],
                extensions: &[],
                category: CategoryType::DeveloperCache,
                default_risk: RiskLevel::Review,
                confidence: 0.95,
                explanation: "Gradle artifact transforms, daemon logs, and dependency jars.",
                delete_effect: "Gradle will redownload dependencies and rebuild transforms on next build.",
                associated_processes: &["java.exe", "gradle.bat"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "go-build-cache",
                name: "Go Build Cache",
                ecosystem: "Go",
                path_patterns: &[
                    r"\appdata\local\go-build",
                ],
                extensions: &[],
                category: CategoryType::DeveloperCache,
                default_risk: RiskLevel::Review,
                confidence: 0.97,
                explanation: "Go compiler cached packages and compilation results.",
                delete_effect: "Go will recompile packages on next go build / test.",
                associated_processes: &["go.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "docker-data",
                name: "Docker Desktop Build Cache & Temp",
                ecosystem: "Docker",
                path_patterns: &[
                    r"\appdata\local\docker",
                    r"\.docker\contexts",
                ],
                extensions: &[],
                category: CategoryType::DeveloperCache,
                default_risk: RiskLevel::Review,
                confidence: 0.90,
                explanation: "Docker Desktop client caches and local temporary logs.",
                delete_effect: "Docker will refresh state on next run.",
                associated_processes: &["docker.exe", "com.docker.backend.exe"],
                can_regenerate: true,
            },

            // 3. Build Outputs & Artifacts
            KnowledgeRule {
                id: "node-cache-folder",
                name: "Node Modules Cache Directory",
                ecosystem: "Node.js",
                path_patterns: &[
                    r"\node_modules\.cache",
                    r"\.next\cache",
                    r"\.turbo",
                    r"\.parcel-cache",
                ],
                extensions: &[],
                category: CategoryType::BuildOutput,
                default_risk: RiskLevel::Safe,
                confidence: 0.96,
                explanation: "Bundler and build tool intermediate compiler caches (Next.js/Babel/Webpack/Turbo).",
                delete_effect: "Build tools will re-bundle automatically on next development/build command.",
                associated_processes: &["node.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "rust-target",
                name: "Rust Build Target Directory",
                ecosystem: "Rust",
                path_patterns: &[
                    r"\target\debug\incremental",
                    r"\target\debug\build",
                    r"\target\release\build",
                    r"\target\debug\deps",
                ],
                extensions: &[],
                category: CategoryType::BuildOutput,
                default_risk: RiskLevel::Review,
                confidence: 0.94,
                explanation: "Cargo intermediate compilation objects and incremental build cache.",
                delete_effect: "Cargo will rebuild the target directory on next cargo build.",
                associated_processes: &["cargo.exe", "rustc.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "python-cache",
                name: "Python Bytecode Cache",
                ecosystem: "Python",
                path_patterns: &[
                    r"\__pycache__",
                    r"\.pytest_cache",
                    r"\.mypy_cache",
                    r"\.ruff_cache",
                ],
                extensions: &[".pyc", ".pyo"],
                category: CategoryType::BuildOutput,
                default_risk: RiskLevel::Safe,
                confidence: 0.99,
                explanation: "Python compiled bytecode and test cache files.",
                delete_effect: "Python interpreter recreates .pyc files on next execution.",
                associated_processes: &["python.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "dotnet-bin-obj",
                name: ".NET Intermediate Build Output",
                ecosystem: ".NET",
                path_patterns: &[
                    r"\obj\debug\",
                    r"\obj\release\",
                    r"\bin\debug\",
                ],
                extensions: &[],
                category: CategoryType::BuildOutput,
                default_risk: RiskLevel::Review,
                confidence: 0.92,
                explanation: ".NET MSBuild intermediate objects and compile symbols.",
                delete_effect: "Rebuilt automatically during next dotnet build / Visual Studio compilation.",
                associated_processes: &["dotnet.exe", "msbuild.exe"],
                can_regenerate: true,
            },

            // 4. IDEs & Editors
            KnowledgeRule {
                id: "vscode-cache",
                name: "Visual Studio Code Cache",
                ecosystem: "Development IDE",
                path_patterns: &[
                    r"\appdata\roaming\code\cache",
                    r"\appdata\roaming\code\cacheddata",
                    r"\appdata\roaming\code\cachedextensions",
                    r"\appdata\roaming\code\logs",
                    r"\appdata\roaming\code\gpucache",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.97,
                explanation: "VS Code V8 bytecode cache, extension cache, and session log files.",
                delete_effect: "VS Code will regenerate caches on launch.",
                associated_processes: &["code.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "cursor-cache",
                name: "Cursor Editor Cache",
                ecosystem: "Development IDE",
                path_patterns: &[
                    r"\appdata\roaming\cursor\cache",
                    r"\appdata\roaming\cursor\cacheddata",
                    r"\appdata\roaming\cursor\logs",
                    r"\appdata\roaming\cursor\gpucache",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.97,
                explanation: "Cursor AI editor cached V8 scripts and session logs.",
                delete_effect: "Cursor recreates caches during next startup.",
                associated_processes: &["cursor.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "jetbrains-cache",
                name: "JetBrains IDE System Cache",
                ecosystem: "Development IDE",
                path_patterns: &[
                    r"\appdata\local\jetbrains\",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Review,
                confidence: 0.92,
                explanation: "JetBrains (IntelliJ, WebStorm, PyCharm, RustRover) index files and caches.",
                delete_effect: "IDE will re-index projects on next open.",
                associated_processes: &["idea64.exe", "pycharm64.exe", "webstorm64.exe", "rustrover64.exe"],
                can_regenerate: true,
            },

            // 5. System Temp & Caches
            KnowledgeRule {
                id: "user-temp",
                name: "Windows User Temporary Files",
                ecosystem: "Windows OS",
                path_patterns: &[
                    r"\appdata\local\temp",
                ],
                extensions: &[".tmp", ".temp", ".log", ".bak", ".old", ".dmp"],
                category: CategoryType::Temporary,
                default_risk: RiskLevel::Review,
                confidence: 0.90,
                explanation: "Temporary workspace files created by desktop applications, background tasks, or extractors.",
                delete_effect: "Safe to remove if the parent application is closed. If an installer, archive extractor, or export is actively running, removing this may interrupt that operation.",
                associated_processes: &[],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "windows-temp",
                name: "Windows System Temp",
                ecosystem: "Windows OS",
                path_patterns: &[
                    r"\windows\temp",
                ],
                extensions: &[".tmp", ".log", ".cab", ".txt", ".bak"],
                category: CategoryType::Temporary,
                default_risk: RiskLevel::Review,
                confidence: 0.90,
                explanation: "System-level temporary workspace files created by Windows background services and installers.",
                delete_effect: "Safe to clean if Windows services and installers are idle. If a pending system update or driver setup is underway, removing these may require restarting that setup.",
                associated_processes: &[],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "crash-dumps",
                name: "Windows Crash Memory Dumps",
                ecosystem: "Windows OS",
                path_patterns: &[
                    r"\appdata\local\crashdumps",
                    r"\windows\minidump",
                ],
                extensions: &[".dmp", ".hdmp", ".mdmp"],
                category: CategoryType::CrashData,
                default_risk: RiskLevel::Safe,
                confidence: 0.98,
                explanation: "Process memory crash dump files created by Windows Error Reporting after application crashes.",
                delete_effect: "Reclaims disk space without affecting application operation.",
                associated_processes: &[],
                can_regenerate: false,
            },
            KnowledgeRule {
                id: "windows-update-cache",
                name: "Windows Update Download Cache",
                ecosystem: "Windows OS",
                path_patterns: &[
                    r"\windows\softwaredistribution\download",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Review,
                confidence: 0.95,
                explanation: "Downloaded Windows Update installation files.",
                delete_effect: "Windows Update will redownload any pending update files if required.",
                associated_processes: &["trustedinstaller.exe", "wuauclt.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "thumbnail-cache",
                name: "Windows Explorer Thumbnail Cache",
                ecosystem: "Windows OS",
                path_patterns: &[
                    r"\appdata\local\microsoft\windows\explorer",
                ],
                extensions: &[".db"],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.95,
                explanation: "Windows File Explorer pre-rendered thumbnail database files.",
                delete_effect: "Explorer will dynamically regenerate thumbnails when viewing media folders.",
                associated_processes: &["explorer.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "shader-cache",
                name: "GPU DirectX / Shader Cache",
                ecosystem: "Graphics Drivers",
                path_patterns: &[
                    r"\appdata\local\nvidia\dxcache",
                    r"\appdata\local\amd\dxcache",
                    r"\appdata\local\d3dscache",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.95,
                explanation: "Compiled GPU shaders stored to minimize in-game stuttering.",
                delete_effect: "Graphics driver will recompile shaders on the fly when running 3D games.",
                associated_processes: &[],
                can_regenerate: true,
            },

            // 6. Communication & Media Apps
            KnowledgeRule {
                id: "discord-cache",
                name: "Discord Media Cache",
                ecosystem: "Discord",
                path_patterns: &[
                    r"\appdata\roaming\discord\cache",
                    r"\appdata\roaming\discord\code cache",
                    r"\appdata\roaming\discord\gpucache",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.98,
                explanation: "Discord cached profile images, emotes, voice clips, and attachments.",
                delete_effect: "Discord will download images/emotes as needed upon viewing.",
                associated_processes: &["discord.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "spotify-cache",
                name: "Spotify Offline Storage & Cache",
                ecosystem: "Spotify",
                path_patterns: &[
                    r"\appdata\local\spotify\storage",
                    r"\appdata\local\spotify\data",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.97,
                explanation: "Spotify cached album artwork, streamed music tracks, and UI data.",
                delete_effect: "Tracks and album art will stream and recache dynamically.",
                associated_processes: &["spotify.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "slack-cache",
                name: "Slack App Cache",
                ecosystem: "Slack",
                path_patterns: &[
                    r"\appdata\roaming\slack\cache",
                    r"\appdata\roaming\slack\service worker\cachestorage",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.97,
                explanation: "Slack cached workspace files, profile avatars, and message attachments.",
                delete_effect: "Slack will recache assets on demand.",
                associated_processes: &["slack.exe"],
                can_regenerate: true,
            },
            KnowledgeRule {
                id: "steam-cache",
                name: "Steam Client Web & Download Cache",
                ecosystem: "Steam",
                path_patterns: &[
                    r"\steam\htmlcache",
                    r"\steam\appcache\httpcache",
                    r"\steam\depotcache",
                ],
                extensions: &[],
                category: CategoryType::Cache,
                default_risk: RiskLevel::Safe,
                confidence: 0.96,
                explanation: "Steam client store HTML cache and temporary package manifests.",
                delete_effect: "Steam client will reload store pages from the network.",
                associated_processes: &["steam.exe", "steamwebhelper.exe"],
                can_regenerate: true,
            },

            // 7. General Old Logs & Installers
            KnowledgeRule {
                id: "old-installer",
                name: "Downloaded Installer Archive",
                ecosystem: "System Installers",
                path_patterns: &[
                    r"\downloads\",
                ],
                extensions: &[".msi", ".exe", ".iso"],
                category: CategoryType::Installer,
                default_risk: RiskLevel::Review,
                confidence: 0.85,
                explanation: "Downloaded installation executable or disk image in your Downloads folder.",
                delete_effect: "Removes installer setup file. Does NOT uninstall the installed application.",
                associated_processes: &[],
                can_regenerate: false,
            },
            KnowledgeRule {
                id: "application-logs",
                name: "Application Diagnostic Log File",
                ecosystem: "Diagnostics",
                path_patterns: &[
                    r"\logs\",
                    r"\appdata\local\",
                    r"\appdata\roaming\",
                ],
                extensions: &[".log", ".etl", ".dmp.txt", ".trace"],
                category: CategoryType::Log,
                default_risk: RiskLevel::Safe,
                confidence: 0.90,
                explanation: "Diagnostic event logging file written by an application.",
                delete_effect: "Reclaims space; future errors will create new log entries.",
                associated_processes: &[],
                can_regenerate: true,
            },
        ];

        Self { rules }
    }

    pub fn match_candidate(&self, norm_path: &str, extension: Option<&str>, is_dir: bool) -> Option<KnowledgeMatch> {
        let ext = extension.map(|e| if e.starts_with('.') { e.to_lowercase() } else { format!(".{}", e.to_lowercase()) });

        for rule in &self.rules {
            let mut pattern_matched = false;
            for pattern in rule.path_patterns {
                if norm_path.contains(pattern) {
                    pattern_matched = true;
                    break;
                }
            }

            if !pattern_matched && !rule.path_patterns.is_empty() {
                continue;
            }

            if !rule.extensions.is_empty() {
                if let Some(ref candidate_ext) = ext {
                    if !rule.extensions.contains(&candidate_ext.as_str()) {
                        if rule.path_patterns.is_empty() || !is_dir {
                            continue;
                        }
                    }
                } else if !is_dir {
                    continue;
                }
            }

            let mut evidence = Vec::new();
            evidence.push(format!("Matched known pattern for {}", rule.name));
            if rule.can_regenerate {
                evidence.push("Data can be automatically regenerated by the host application".to_string());
            }
            if !rule.associated_processes.is_empty() {
                evidence.push(format!("Associated with {}", rule.associated_processes.join(", ")));
            }

            let process = rule.associated_processes.first().map(|s| s.to_string());

            return Some(KnowledgeMatch {
                category: rule.category,
                risk_level: rule.default_risk,
                confidence: rule.confidence,
                explanation: rule.explanation.to_string(),
                delete_effect: rule.delete_effect.to_string(),
                evidence,
                related_app: Some(rule.name.to_string()),
                process_name: process,
                can_regenerate: rule.can_regenerate,
                ecosystem: rule.ecosystem.to_string(),
            });
        }

        None
    }

    /// Fast, zero-recursion check for entire directories that can be treated as atomic disposable units.
    /// When matched, the scanner computes size in one fast pass and skips traversing its inner files.
    pub fn match_atomic_disposable_dir(&self, path: &std::path::Path) -> Option<KnowledgeMatch> {
        let file_name = path.file_name()?.to_str()?.to_lowercase();
        let norm_path = crate::safety::SafetyEngine::normalize_path(path);

        // 1. Developer Project Dependencies & Build Outputs
        if file_name == "node_modules" {
            return Some(KnowledgeMatch {
                category: CategoryType::DeveloperCache,
                risk_level: RiskLevel::Safe,
                confidence: 0.99,
                explanation: "Node.js package dependencies directory. Can be reinstalled cleanly at any time with npm/pnpm/yarn install.".to_string(),
                delete_effect: "Project dependencies are removed. Run 'npm install' or 'pnpm install' in the project directory to restore.".to_string(),
                evidence: vec!["Matched Node.js dependencies directory (node_modules)".to_string(), "Can be regenerated via package manager".to_string()],
                related_app: Some("Node.js / NPM".to_string()),
                process_name: Some("node.exe".to_string()),
                can_regenerate: true,
                ecosystem: "Node.js".to_string(),
            });
        }

        if file_name == ".next" || file_name == ".nuxt" || file_name == ".svelte-kit" || file_name == ".turbo" || file_name == ".parcel-cache" || file_name == ".angular" {
            return Some(KnowledgeMatch {
                category: CategoryType::BuildOutput,
                risk_level: RiskLevel::Safe,
                confidence: 0.99,
                explanation: format!("{} intermediate build outputs and client/server compiler caches.", file_name.trim_start_matches('.')),
                delete_effect: "Build tools will re-bundle automatically on next development or build run.".to_string(),
                evidence: vec![format!("Matched web framework build directory ({})", file_name), "Rebuilt from source code".to_string()],
                related_app: Some(file_name.trim_start_matches('.').to_uppercase()),
                process_name: Some("node.exe".to_string()),
                can_regenerate: true,
                ecosystem: "Web Framework".to_string(),
            });
        }

        if file_name == "__pycache__" || file_name == ".pytest_cache" || file_name == ".mypy_cache" || file_name == ".ruff_cache" || file_name == ".tox" || file_name == ".nox" {
            return Some(KnowledgeMatch {
                category: CategoryType::BuildOutput,
                risk_level: RiskLevel::Safe,
                confidence: 0.99,
                explanation: "Python bytecode compilation (.pyc) and test/lint cache directory.".to_string(),
                delete_effect: "Python interpreter and tooling will regenerate caches on next execution.".to_string(),
                evidence: vec![format!("Matched Python cache directory ({})", file_name)],
                related_app: Some("Python Tooling".to_string()),
                process_name: Some("python.exe".to_string()),
                can_regenerate: true,
                ecosystem: "Python".to_string(),
            });
        }

        if file_name == "target" {
            // Check if inside a Rust project (parent has Cargo.toml or path contains rust markers)
            let is_rust = path.parent().map(|p| p.join("Cargo.toml").exists()).unwrap_or(false)
                || norm_path.contains(r"\target\debug")
                || norm_path.contains(r"\target\release");

            if is_rust {
                return Some(KnowledgeMatch {
                    category: CategoryType::BuildOutput,
                    risk_level: RiskLevel::Review,
                    confidence: 0.95,
                    explanation: "Rust Cargo build output directory containing compiled binaries and incremental objects.".to_string(),
                    delete_effect: "Cargo will rebuild the workspace on next 'cargo build'.".to_string(),
                    evidence: vec!["Matched Rust target build directory".to_string(), "Rebuilt via cargo build".to_string()],
                    related_app: Some("Rust Cargo".to_string()),
                    process_name: Some("cargo.exe".to_string()),
                    can_regenerate: true,
                    ecosystem: "Rust".to_string(),
                });
            }
        }

        if file_name == "obj" || (file_name == "bin" && norm_path.contains(r"\bin\debug") || norm_path.contains(r"\bin\release")) {
            let is_dotnet = path.parent().map(|p| p.read_dir().map(|mut r| r.any(|e| e.ok().map(|de| de.path().extension().map(|ex| ex == "csproj" || ex == "sln" || ex == "fsproj").unwrap_or(false)).unwrap_or(false))).unwrap_or(false)).unwrap_or(false)
                || norm_path.contains(r"\obj\debug") || norm_path.contains(r"\obj\release");

            if is_dotnet {
                return Some(KnowledgeMatch {
                    category: CategoryType::BuildOutput,
                    risk_level: RiskLevel::Review,
                    confidence: 0.92,
                    explanation: ".NET MSBuild intermediate objects and compile symbols.".to_string(),
                    delete_effect: "Rebuilt automatically during next dotnet build or Visual Studio build.".to_string(),
                    evidence: vec![format!(".NET intermediate output ({})", file_name)],
                    related_app: Some(".NET MSBuild".to_string()),
                    process_name: Some("dotnet.exe".to_string()),
                    can_regenerate: true,
                    ecosystem: ".NET".to_string(),
                });
            }
        }

        if file_name == ".dart_tool" {
            return Some(KnowledgeMatch {
                category: CategoryType::DeveloperCache,
                risk_level: RiskLevel::Safe,
                confidence: 0.98,
                explanation: "Flutter and Dart package resolution cache directory.".to_string(),
                delete_effect: "Recreated on next 'flutter pub get' or 'dart pub get'.".to_string(),
                evidence: vec!["Matched Flutter / Dart tool cache".to_string()],
                related_app: Some("Flutter / Dart".to_string()),
                process_name: Some("dart.exe".to_string()),
                can_regenerate: true,
                ecosystem: "Flutter".to_string(),
            });
        }

        if file_name == "deriveddata" {
            return Some(KnowledgeMatch {
                category: CategoryType::BuildOutput,
                risk_level: RiskLevel::Review,
                confidence: 0.95,
                explanation: "Xcode / Apple Developer build outputs and module cache.".to_string(),
                delete_effect: "Rebuilt on next compilation.".to_string(),
                evidence: vec!["Matched Xcode DerivedData directory".to_string()],
                related_app: Some("Xcode".to_string()),
                process_name: None,
                can_regenerate: true,
                ecosystem: "Apple Developer".to_string(),
            });
        }

        // 2. Browser, Electron & GPU Shader Caches
        let is_cache_dir = file_name == "cache"
            || file_name == "code cache"
            || file_name == "gpucache"
            || file_name == "grshadercache"
            || file_name == "dawncache"
            || file_name == "d3dscache"
            || file_name == "dxcache"
            || file_name == "cachestorage";

        if is_cache_dir {
            return Some(KnowledgeMatch {
                category: CategoryType::Cache,
                risk_level: RiskLevel::Safe,
                confidence: 0.97,
                explanation: "Disposable application cache directory storing temporary web/shader/bytecode assets.".to_string(),
                delete_effect: "Application will recreate cache entries automatically as needed.".to_string(),
                evidence: vec![format!("Matched disposable cache directory ({})", file_name)],
                related_app: Some("Application Cache".to_string()),
                process_name: None,
                can_regenerate: true,
                ecosystem: "Cache".to_string(),
            });
        }

        // 3. Crash Reports & Telemetry Dumps
        let is_crash_dir = file_name == "crashpad"
            || file_name == "crashreports"
            || file_name == "crash dumps"
            || (file_name == "logs" && (norm_path.contains(r"\appdata\local\") || norm_path.contains(r"\appdata\roaming\")));

        if is_crash_dir {
            return Some(KnowledgeMatch {
                category: CategoryType::CrashData,
                risk_level: RiskLevel::Safe,
                confidence: 0.95,
                explanation: "Historical crash dumps, stack traces, and application diagnostics logs.".to_string(),
                delete_effect: "Safely reclaims disk space; future errors will record fresh logs.".to_string(),
                evidence: vec![format!("Diagnostic and crash reports ({})", file_name)],
                related_app: Some("Diagnostics".to_string()),
                process_name: None,
                can_regenerate: false,
                ecosystem: "Diagnostics".to_string(),
            });
        }

        // 4. Fall back to standard rules with is_dir = true
        self.match_candidate(&norm_path, None, true)
    }
}
