# CleanScope

<div align="center">
  <h3>Windows Disk Analysis & Deterministic Safe Cleanup</h3>
  <p><strong>A high-speed, explainable disk analyzer for Windows power users and developers.</strong></p>
  <p>
    <img src="https://img.shields.io/badge/Platform-Windows%2010%20%7C%2011-blue?style=flat-square" alt="Platform">
    <img src="https://img.shields.io/badge/Backend-Rust%20%2F%20Tauri%202-orange?style=flat-square" alt="Backend">
    <img src="https://img.shields.io/badge/Frontend-React%20%2F%20TypeScript%20%2F%20Tailwind-blueviolet?style=flat-square" alt="Frontend">
    <img src="https://img.shields.io/badge/Diagnostics-Gemini%20%7C%20Local%20Qwen-emerald?style=flat-square" alt="Diagnostics">
    <img src="https://img.shields.io/badge/Safety-Deterministic%20Guarantees-success?style=flat-square" alt="Safety">
  </p>
</div>

---

## Why CleanScope?

Traditional cleanup tools use vague labels like *"Junk"* or *"System Boost"* and delete files without explainability, process lock verification, or safety bounds.

**CleanScope** is designed with **Deterministic Safety and Transparent Explainability**:
1. **Verifiable Explainability**: Every discovered item explicitly answers 4 fundamental questions before deletion.
2. **Deterministic Safety Engine as the Final Authority**: AI models assist with technical diagnostics and inquiry, but **cannot override deterministic safety rules** or authorize the deletion of protected Windows paths.
3. **Windows Recycle Bin by Default**: Cleanups route items to the Windows Recycle Bin (`SHFileOperationW`) with full undo capability.
4. **Active Process Lock Detection**: Uses the Windows Restart Manager API to detect active process locks and avoid deleting files in active use.

---

## Key Features

- **High-Speed Atomic Directory Pruning**: Traverses entire disposable trees (`node_modules`, `.next`, `target`, `bin`/`obj`, `__pycache__`, browser caches, crash dumps) as atomic units in a single pass without choking on millions of nested files.
- **The 4 Fundamental Questions**:
  - `1. What is this item?`
  - `2. Why is it on my computer?`
  - `3. Is anything currently using it?`
  - `4. What happens if I remove it?`
- **Technical Explainability & Diagnostic Workspace**:
  - Ask custom questions directly to Gemini models or local `llama.cpp` (`Qwen 0.8B`).
  - Diagnose exact build systems, frameworks, and recreation paths (e.g., `npm install`, `cargo build`, browser auto-rebuild).
- **Multi-Drive Full-Disk Scanning**: Discovers candidates across `C:\`, `D:\`, `E:\`, `F:\` and all fixed drives up to 12 directory levels deep.
- **Two-Pass Duplicate Detection**: Exact byte-size clustering followed by 4KB partial header checks and cryptographic SHA-256 validation.
- **Large File Detection**: Automatically surfaces standalone files 100 MB or larger across all drives.
- **Developer & Application Storage Analyzers**: Dedicated inspection views for dev ecosystems (Node, Rust, Python, Gradle, Docker, NuGet, Go) and popular desktop applications.
- **Protected Boundaries Inspector**: Built-in transparency modal showing exactly which Windows system paths are excluded from scanning and why, accessible from any page.
- **Dark OLED Interface**: Built for technical users with a sleek dark palette (`#050505`), high-contrast typography, and crisp Lucide icons.

---

## What CleanScope Scans

| Category | Targets |
| :--- | :--- |
| **All Fixed Drives** | `C:\`, `D:\`, `E:\`, `F:\` — full directory trees, 12 levels deep |
| **Developer Ecosystems** | `node_modules`, `.next`, `target`, `bin/obj`, `__pycache__`, `.gradle`, `.nuget`, `.cargo`, `.docker` |
| **System Caches** | `%LOCALAPPDATA%\Temp`, `C:\Windows\Temp`, browser caches, GPU shader caches, crash dumps |
| **Large Files** | Standalone files >= 100 MB (ISOs, VMDKs, archives) |
| **Duplicates** | Exact SHA-256 binary duplicate groups across all drives |

## What CleanScope Never Touches

| Protected Boundary | Reason |
| :--- | :--- |
| `C:\Windows\System32`, `SysWOW64`, `WinSxS` | Core operating system binaries |
| `C:\boot`, `pagefile.sys`, `hiberfil.sys`, `swapfile.sys` | Boot infrastructure and virtual memory |
| `*\System Volume Information`, `*\Recovery` | System restore and recovery partitions |
| `*\$Recycle.Bin` | Windows Recycle Bin containers |
| Registry hives (`SAM`, `SYSTEM`, `SECURITY`, `NTUSER.DAT`) | Security and credentials databases |
| Drive roots (`C:\`, `D:\`, etc.) | Partition mount points |

---

## Safety Architecture

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
[ Deterministic Rules ]     [ Diagnostic Reasoning ]
- Instant offline cache     - Gemini Flash / Local LLM
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

## Direct Download & Installation

To install and run CleanScope directly on your Windows PC:

1. Go to the [Releases](https://github.com/HimanshuSingh213/CleanScope-App/releases) page on GitHub.
2. Download the latest installer:
   - **`CleanScope_x64-setup.exe`**: Standard Windows installer (recommended).
   - **`cleanscope.exe`**: Standalone portable binary (run directly without installing).
3. Launch the application and click **Start Storage Scan**.

---

## System Requirements

| Component | Minimum | Recommended |
| :--- | :--- | :--- |
| **Operating System** | Windows 10 (64-bit, 2004+) | Windows 11 (64-bit) |
| **Processor** | Dual-Core x86_64 @ 2.0 GHz | Quad-Core (Core i5 / Ryzen 5+) |
| **Memory (RAM)** | 2 GB | 4 GB+ for fast multi-threaded scanning |
| **Disk Type** | Any HDD / SSD (100 MB free) | NVMe / SSD for ultra-fast scanning |
| **Runtime** | Microsoft Edge WebView2 *(included with Windows 10/11)* | Evergreen WebView2 |

---

## Building from Source

### Prerequisites
- Windows 10 (64-bit, Version 2004+) or Windows 11
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (stable toolchain)
- MinGW / UCRT64 GCC (if building with GNU toolchain)

### Local Development

```powershell
# 1. Clone the repository
git clone https://github.com/HimanshuSingh213/CleanScope-App.git
cd CleanScope-App

# 2. Install dependencies
npm install

# 3. Start development desktop app
npm run dev:app
```

### Building the Release Executable (`.exe`)

```powershell
npm run tauri build
```

Output executables will be at:
- **Portable `.exe`**: `src-tauri/target/release/cleanscope.exe`
- **Windows Installer**: `src-tauri/target/release/bundle/nsis/CleanScope_x64-setup.exe`

---

## Technical Diagnostics Configuration (Optional)

CleanScope works fully offline by default with no AI features — the safety engine and candidate detection are entirely rule-based and require no network access.

AI diagnostics are optional and provide human-readable explanations for ambiguous candidates:

### Google Gemini Cloud (Easiest)
1. Open CleanScope and go to **Settings -> AI Explanation & Ambiguity Analysis**.
2. Paste your Google Gemini API key (free tier available at [aistudio.google.com](https://aistudio.google.com)).
3. Select a model (e.g. `gemini-2.5-flash-lite`) and click **Test Connection**.

### Local LLM via `llama.cpp` (Fully Offline)
CleanScope does **not** auto-start or bundle a local model — you need to run the server yourself before enabling this mode.

1. Download `llama-server.exe` from the [llama.cpp releases](https://github.com/ggml-org/llama.cpp/releases) page.
2. Download the model: `Qwen2.5-0.8B-Instruct-Q4_0.gguf` from Hugging Face.
3. Start the server manually in a terminal:
   ```powershell
   llama-server.exe -m "C:\path\to\Qwen2.5-0.8B-Instruct-Q4_0.gguf" --port 8080 -c 2048
   ```
4. In CleanScope **Settings**, set the AI Provider Mode to **Local Qwen 0.8B** or **Hybrid** and set the server URL to `http://127.0.0.1:8080`.

---

## Privacy & Data

- **Metadata Only**: Diagnostic queries transmit only path attributes, byte sizes, and timestamps — never file contents.
- **Zero Telemetry**: No cloud telemetry, tracking IDs, or remote usage collection.
- **Local Persistence**: All settings, scan reports, and caches stored locally under `%LOCALAPPDATA%\CleanScope\`.

---

## Contributing

Contributions, bug reports, performance enhancements, and new knowledge rules are welcome.
See [CONTRIBUTING.md](./CONTRIBUTING.md) for architecture principles, local setup, and pull request guidelines.

Created and maintained by **[Himanshu Singh](https://github.com/HimanshuSingh213)**.
