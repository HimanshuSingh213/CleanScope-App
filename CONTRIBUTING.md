# Contributing to CleanScope

> **Project Ownership & Maintainership**: CleanScope is created, owned, and maintained by **Himanshu Singh** ([@HimanshuSingh213](https://github.com/HimanshuSingh213)). Community contributions, bug fixes, performance optimizations, and rule additions are warmly welcomed and reviewed by the maintainer.

---

## Non-Negotiable Architectural Principles

Before contributing, please review these core rules — they are enforced in code review:

### 1. Deterministic Safety is the Final Authority
- **No Unrestricted Deletion**: AI is purely advisory for explanation and ambiguity ranking. AI is **never** allowed to authorize filesystem deletion or mark Windows system/boot paths as safe.
- **Protected Paths**: Windows system directories (`System32`, `SysWOW64`, `WinSxS`, registry hives, boot files, `$Recycle.Bin`, `pagefile.sys`) are unconditionally protected by hardcoded Rust safety rules. These cannot be overridden.
- **Pre-Validation**: Every selected file is re-validated immediately before deletion (existence check, active lock check, protected status check).
- **Windows Recycle Bin Default**: All cleanup operations move items to the Windows Recycle Bin (`SHFileOperationW` with `FOF_ALLOWUNDO`) so users can restore files if needed. Permanent deletion is never the default.

### 2. Explainability (The 4 Fundamental Questions)
Every candidate discovered by CleanScope must answer:
1. *What exactly is this?*
2. *Why is it on my computer?*
3. *Is anything currently using it?*
4. *What happens if I remove it?*

Never use vague labels like "junk", "temp stuff", or "optimize system".

### 3. UI & Aesthetic Standards
- **Deep Dark OLED Theme**: `#050505` background, `#0A0A0A` surface, `#101010` raised surface, `#1A1A1A` subtle border.
- **No Emoji Anywhere**: Never use emoji in UI labels, buttons, badges, logs, or error messages. Use **Lucide line icons** exclusively.
- **Restrained Micro-interactions**: Smooth 120–220ms transitions. No bouncy or cartoonish animations.

### 4. High-Speed Atomic Pruning
- If adding support for new tool or bundler caches (e.g. a new JS bundler, compiler, or package manager), add its directory name to `match_atomic_disposable_dir` in [`src-tauri/src/knowledge.rs`](./src-tauri/src/knowledge.rs).
- This ensures the scanner calculates the directory size in one fast pass and avoids traversing into millions of inner files.

---

## Local Development Workflow

### Prerequisites
- [Node.js](https://nodejs.org/) (v18+)
- [Rust](https://rustup.rs/) (stable toolchain)
- PowerShell (Windows 10 / 11)

### 1. Clone the Repository
```bash
git clone https://github.com/HimanshuSingh213/CleanScope-App.git
cd CleanScope-App
```

### 2. Install Frontend Dependencies
```bash
npm install
```

### 3. Start Development Server
```powershell
npm run dev:app
```
*(or run `npm run dev` for web frontend preview only)*

### 4. Quality Checks Before Submitting
```powershell
# Frontend — must pass with zero TypeScript errors
npm run build

# Backend — must pass with zero compiler warnings
cargo check --manifest-path "src-tauri/Cargo.toml"
```

---

## Submitting Pull Requests

1. **Fork the repository** and create a feature branch (`git checkout -b feature/my-change`).
2. **Commit your changes** with clear, descriptive commit messages.
3. **Ensure strict typing**: Zero TypeScript errors and zero Rust compiler warnings.
4. **No emoji**: Double check that no emojis were introduced anywhere in the UI.
5. **Open a Pull Request** describing what you changed and which safety rules were considered. All pull requests are reviewed by the maintainer ([@HimanshuSingh213](https://github.com/HimanshuSingh213)).

Thank you for helping make CleanScope safer and faster!
