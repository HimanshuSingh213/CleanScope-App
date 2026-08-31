# Contributing to CleanScope

> **Note**: CleanScope is a **vibecoded application built primarily for personal use**, designed to solve disk clutter safely and intelligently on Windows. While built to satisfy personal workflows and developer environments, contributions, bug fixes, performance improvements, and rule additions from the community are welcome!

---

## Non-Negotiable Architectural Principles

Before contributing, please review our core development rules defined in [`AGENTS.md`](./AGENTS.md) and [`CleanScope_MASTER_SPEC.md`](./CleanScope_MASTER_SPEC.md):

### 1. Deterministic Safety is the Final Authority
- **No Unrestricted Deletion**: AI classification is purely advisory for explanation and ambiguity ranking. AI is **never** allowed to authorize filesystem deletion directly or mark Windows system/boot paths as safe.
- **Protected Paths**: Windows system directories (`System32`, `SysWOW64`, `WinSxS`, drivers, registry hives, boot files, `$Recycle.Bin`, `pagefile.sys`) are unconditionally protected by hardcoded Rust safety rules.
- **Pre-Validation**: Every selected file is re-validated immediately before deletion (existence, active file locks, protected status).
- **Windows Recycle Bin Default**: Cleanup moves items to the Windows Recycle Bin (`SHFileOperationW` with `FOF_ALLOWUNDO`) so users can restore files if needed.

### 2. Explainability (The 4 Fundamental Questions)
Every candidate discovered by CleanScope must answer:
1. *What exactly is this?*
2. *Why is it on my computer?*
3. *Is anything currently using it?*
4. *What happens if I remove it?*

Never use vague labels like "junk", "temp stuff", or "optimize system".

### 3. UI & Aesthetic Standards
- **Deep Dark OLED Theme**: `#050505` background, `#0A0A0A` surface, `#101010` raised surface, `#1A1A1A` subtle border.
- **NO EMOJI ANYWHERE**: Never use emoji in UI labels, buttons, badges, logs, or error messages. Use crisp **Lucide line icons** exclusively.
- **Restrained Micro-interactions**: Smooth 120–220ms transitions, no bouncy or cartoonish animations.

### 4. High-Speed Atomic Pruning
- If you add support for new tool or bundler caches (e.g. a new JS bundler, compiler, or package manager), add its directory name to `match_atomic_disposable_dir` in [`src-tauri/src/knowledge.rs`](./src-tauri/src/knowledge.rs).
- This ensures the scanner calculates the directory size in one fast pass and prunes traversing into thousands of inner files.

---

## Local Development Workflow

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (stable toolchain)
- PowerShell (Windows 10 / 11)

### 1. Clone the Repository
```bash
git clone https://github.com/your-username/CleanScope.git
cd CleanScope
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Start Development Server
Run the provided development launcher:

```powershell
.\start-dev.ps1
```
*(or run `npm run dev:app` / `npm run dev` for web frontend only)*

### 4. Running Tests & Quality Checks
Ensure all tests and builds pass cleanly:

```powershell
# Frontend TypeScript and build verification
npm run build

# Backend Rust compile & safety rule verification
$env:PATH = "C:\Users\Himanshu Singh\.cargo\bin;C:\msys64\ucrt64\bin;$env:PATH"
$env:CARGO_TARGET_DIR = "C:\Users\Himanshu Singh\AppData\Local\Temp\cargo-target-cleanscope"
cargo check --tests --manifest-path "src-tauri/Cargo.toml"
```

---

## Submitting Pull Requests

1. **Fork the repository** and create a feature branch (`git checkout -b feature/amazing-feature`).
2. **Commit your changes** with clear, descriptive commit messages.
3. **Ensure strict typing**: Zero TypeScript errors (`npm run build`) and zero Rust compiler warnings.
4. **Adhere to the no-emoji rule**: Double check that no emojis were introduced in UI strings, alerts, or icons.
5. **Open a Pull Request** describing what changes you made and which safety rules were validated.

Thank you for helping make CleanScope safer and faster!
