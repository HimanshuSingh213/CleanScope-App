# CleanScope — Antigravity Agent Guidelines & Project Instructions

This project is **CleanScope**, a premium Windows desktop application for intelligent disk analysis and safe cleanup.
All development in this repository must strictly adhere to the specification defined in [CleanScope_MASTER_SPEC.md](./CleanScope_MASTER_SPEC.md).

---

## 1. Non-Negotiable Core Principles

1. **Safety First**:
   - Never allow unrestricted filesystem deletion.
   - Never allow an LLM to directly authorize or execute deletion.
   - Never permanently delete by default — prefer moving selected items to the **Windows Recycle Bin**.
   - Show exact paths, sizes, categories, risks, and consequences before deletion.
   - Detect files and directories currently in use where technically possible.
   - Protect Windows/system/boot paths unconditionally by default.
   - Revalidate every selected candidate immediately before cleanup execution (existence, locks, protected status).
   - Never follow symlinks/junctions/reparse points recursively without explicit safety bounds.

2. **Explainability**:
   - Every candidate must answer 4 questions:
     1. What exactly is this?
     2. Why is it on my computer?
     3. Is anything currently using it?
     4. What happens if I remove it?
   - Never use vague labels like "junk", "optimize", or "clean up everything".

3. **Deterministic Safety is the Final Authority**:
   - AI is used for classification, explanation, and ambiguity ranking.
   - AI must NEVER override deterministic safety rules or mark protected paths as safe.
   - AI receives structured metadata only (paths, sizes, timestamps, extensions, process locks) — never raw file contents by default.

4. **UI & Aesthetic Rules**:
   - **Deep Dark OLED Theme**: `#050505` background, `#0A0A0A` surface, `#101010` raised surface, `#1A1A1A` subtle border.
   - **NO EMOJI ANYWHERE**: Never use emoji in the UI, code labels, buttons, or banners. Use crisp Lucide line icons.
   - **Modern Developer Product Feel**: Restrained, calm, technical (Linear/Vercel/Raycast inspired).
   - **Micro-interactions**: 120–220ms subtle transitions, no flashy or cartoonish animations.

---

## 2. Tech Stack & Architecture

- **Desktop Shell**: Tauri 2
- **Backend Core**: Rust
  - Filesystem scanning & traversal (`walkdir`, `rayon`)
  - Metadata extraction, hashing & duplicate detection
  - Windows API integration (`windows-rs` / Win32 for in-use file detection, Restart Manager, Recycle Bin)
  - Deterministic safety engine & rule-based classification
  - Local AI worker manager & optional Gemini client
  - Persistence under `%LOCALAPPDATA%\CleanScope\`
- **Frontend**: React 18+ / Vite / TypeScript / Tailwind CSS
  - Lucide React icons
  - Accessible headless primitives
- **Local AI**: `Qwen3.5-0.8B-Instruct-Q4_0.gguf` via `llama.cpp` local runner
- **Cloud AI (Optional)**: Google Gemini API (metadata-only batch escalation for ambiguous candidates)

---

## 3. Risk Classification Model

- **GREEN (Safe / Verified)**: Known disposable caches, logs, temp files. Recreateable.
- **YELLOW (Review)**: Developer caches, old installers, archives, duplicates, large files, build artifacts. Requires explicit user review.
- **RED (Protected)**: Windows system directories, boot files, credentials, protected app stores. Never one-click cleanable.
- **GRAY (Unknown)**: Insufficient evidence. Default action is KEEP.

---

## 4. Application Storage Path

Use `%LOCALAPPDATA%\CleanScope\` with the following structure:
```text
CleanScope/
├── settings.json
├── scan-history/
│   └── YYYY-MM-DD-<id>.json
├── ai-cache/
│   └── <fingerprint>.json
├── cleanup-history/
│   └── YYYY-MM-DD-<id>.json
├── known-apps.json
├── models/
└── logs/
```

---

## 5. Development Guidelines for Antigravity (agy)

When working on tasks in this repository:
- Keep the frontend and backend strictly typed.
- Ensure all safety rules have robust test coverage.
- Never mock scan results in production paths; connect real Rust scanner events to the UI via Tauri IPC channels.
- Maintain full compatibility with Windows 10 & 11 filesystem mechanics.
