# CleanScope

<div align="center">
  <h3>Intelligent Windows Disk Analysis & Deterministic Safe Cleanup</h3>
  <p><strong>A high-speed, explainable disk analyzer for Windows power users and developers.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?style=flat-square" alt="Platform">
    <img src="https://img.shields.io/badge/Backend-Rust%20%2F%20Tauri%202-orange?style=flat-square" alt="Backend">
    <img src="https://img.shields.io/badge/Frontend-React%20%2F%20TypeScript%20%2F%20Tailwind-blueviolet?style=flat-square" alt="Frontend">
    <img src="https://img.shields.io/badge/AI-Gemini%203.5%20Flash--Lite%20%7C%20Local%20Qwen-emerald?style=flat-square" alt="AI">
    <img src="https://img.shields.io/badge/Safety-Deterministic%20Guarantees-success?style=flat-square" alt="Safety">
    <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License">
  </p>
</div>

---

## ⚡ Why CleanScope?

Traditional disk cleanup utilities use vague labels like *"Junk Files"* or *"System Optimization"* and delete files without explaining why they exist, whether anything is using them, or what consequences will occur.

**CleanScope** is designed with **Safety-First Determinism and Transparent Explainability**:
1. **Never guesses or destroys without explanation**: Every discovered candidate item explicitly answers 4 fundamental questions.
2. **Deterministic Safety Engine as the Final Authority**: AI models can assist with technical explainability and classification, but **cannot override deterministic safety rules** or authorize the deletion of protected Windows paths.
3. **Windows Recycle Bin by Default**: Deletions are sent to the Windows Recycle Bin with rollback capability (`SHFileOperationW`), not permanently shredded.
4. **Active Process Lock Detection**: Uses the Windows Restart Manager API to detect active process locks and prevent deleting files in active use.

---

## 💎 Key Features

- **High-Speed Atomic Directory Pruning**: Traverses entire disposable trees (`node_modules`, `.next`, `target`, `bin`/`obj`, `__pycache__`, browser caches, crash dumps) as atomic units in a single pass without recursively choking on millions of nested files.
- **The 4 Fundamental Questions**:
  - `1. What exactly is this?`
  - `2. Why is it on my computer?`
  - `3. Is anything currently using it?`
  - `4. What happens if I remove it?`
- **Interactive Deep AI Reasoning Workspace**:
  - Ask custom questions directly to Gemini models (`gemini-3.5-flash-lite`, `gemini-3.7-flash`, `gemini-2.5-flash`, `gemini-2.5-pro`) or local `llama.cpp` (`Qwen 0.8B`).
  - Diagnose exact build systems, frameworks, and recreation paths (e.g., `npm install`, `cargo build`, browser auto-rebuild).
- **Two-Pass Duplicate Detection**: Exact byte-size clustering followed by 4KB partial header checks and cryptographic SHA-256 validation.
- **Developer & Application Storage Analyzers**: Dedicated inspection views for dev ecosystems (Node, Rust, Python, Gradle, Docker, NuGet, Go) and popular applications.
- **Danger Zone & Self-Purge**:
  - One-click reset for CleanScope local caches and history under `%LOCALAPPDATA%\CleanScope\`.
  - Self-purge uninstallation with confirmation validation that completely removes app files and binary from the system.
- **Deep Dark OLED UI**: Built for technical users with a sleek dark palette (`#050505`), high-contrast typography, crisp Lucide icons, and zero emojis.

---

## 🛡️ The CleanScope Safety Architecture

```text
Filesystem Scan / Candidate Discovery
                │
                ▼
┌───────────────────────────────────────────┐
│     DETERMINISTIC SAFETY ENGINE           │
│  - System32 / Windows protected paths     │
│  - Multi-drive $Recycle.Bin exclusions    │
│  - Process lock detection (Win32 RM)      │
│  - Custom user-protected directory paths  │
└─────────────────────┬─────────────────────┘
                      │
        ┌─────────────┴─────────────┐
        ▼                           ▼
[ Deterministic Rules ]     [ AI Reasoning Engine ]
- Instant offline cache     - Gemini 3.5 Flash-Lite / Local LLM
- 50+ curated frameworks    - Metadata-only transmission
- Zero network latency      - Deep technical explainability
        │                           │
        └─────────────┬─────────────┘
                      ▼
┌───────────────────────────────────────────┐
│          CLEANUP VALIDATION               │
│  - Re-verify file existence & locks       │
│  - Route to Windows Recycle Bin           │
│  - Audit log saved to %LOCALAPPDATA%      │
└───────────────────────────────────────────┘
```

---

## 🚀 Getting Started

### Prerequisites
- Windows 10 (64-bit, Version 2004+) or Windows 11
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (stable toolchain)
- MinGW / UCRT64 GCC (if building with GNU toolchain)

### Installation & Development

```powershell
# 1. Clone the repository
git clone https://github.com/HimanshuSingh213/CleanScope-App.git
cd CleanScope-App

# 2. Install frontend dependencies
npm install

# 3. Start development desktop application
npm run dev:app
```

---

## 📦 Building Standalone Release Binary (`.exe`)

You can generate a standalone portable `.exe` or an NSIS Windows installer:

```powershell
# Quick build script
.\build-exe.ps1
```

Or via Tauri CLI:
```powershell
$env:PATH = "C:\Users\Himanshu Singh\.cargo\bin;C:\msys64\ucrt64\bin;$env:PATH"
$env:CARGO_TARGET_DIR = "C:\Users\Himanshu Singh\AppData\Local\Temp\cargo-target-cleanscope"

npm run tauri build
```

The output executables will be available at:
- **Standalone Portable `.exe`**: `target/release/cleanscope.exe` (Single file, no installation required)
- **Windows NSIS Installer**: `target/release/bundle/nsis/CleanScope_0.1.0_x64-setup.exe`

---

## 🤖 AI Configuration (Optional)

CleanScope operates fully offline by default. If you wish to enable cloud or local AI explainability:

### Google Gemini Cloud (Recommended)
1. Open CleanScope and navigate to **Settings -> AI Explanation & Ambiguity Analysis**.
2. Paste your Google Gemini API key.
3. Select `gemini-3.5-flash-lite` (Recommended / Ultra Fast) or any Gemini 2.5/3.x model.
4. Click **Test Connection**.

### Local LLM (`llama.cpp`)
1. Place `llama-server.exe` and `Qwen2.5-0.8B-Instruct-Q4_0.gguf` inside `%LOCALAPPDATA%\CleanScope\models\`.
2. Start the local server:
   ```powershell
   llama-server.exe -m "%LOCALAPPDATA%\CleanScope\models\Qwen2.5-0.8B-Instruct-Q4_0.gguf" --port 8080 -c 2048
   ```
3. Set AI Provider Mode to **Local Qwen 0.8B** or **Hybrid**.

---

## 🔒 Privacy & Data Policies

- **Metadata Only**: AI queries transmit only path attributes, byte sizes, and timestamps. CleanScope **never** inspects, reads, or transmits the contents of your files.
- **Zero Telemetry**: No cloud telemetry, tracking IDs, or remote usage collection.
- **Local Persistence**: All settings, scan reports, and caches are stored locally under `%LOCALAPPDATA%\CleanScope\`.

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE). Built with Tauri 2, Rust, React, TypeScript, and Tailwind CSS.
