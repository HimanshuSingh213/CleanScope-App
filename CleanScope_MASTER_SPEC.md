# CleanScope — Master Product & Engineering Specification

## 0. Purpose

Build **CleanScope**, a premium Windows desktop application for intelligent disk analysis and safe cleanup.

CleanScope should feel like a modern developer product — closer to **Vercel / Linear / Raycast / modern Next.js dashboards** than a traditional PC-cleaner utility.

The product must answer four questions for every cleanup candidate:

1. **What exactly is this?**
2. **Why is it on my computer?**
3. **Is anything currently using it?**
4. **What happens if I remove it?**

The application must never equate "old", "large", or "unknown" with "safe to delete".

The application should use deterministic Windows safety rules as the final authority, while AI is used for classification, explanation, contextual analysis, and uncertainty reduction.

---

# 1. Non-Negotiable Product Principles

## Safety first

- Never allow unrestricted filesystem deletion.
- Never allow an LLM to directly authorize deletion.
- Never permanently delete by default.
- Prefer moving selected items to the Windows Recycle Bin.
- Show the exact paths, sizes, categories, risks, and consequences before deletion.
- Detect files and directories currently in use where technically possible.
- Detect running applications associated with candidate files.
- Protect Windows/system/boot paths by default.
- Treat unknown executables, DLLs, databases, configuration stores, credentials, and personal-data locations conservatively.
- Never follow symlinks/junctions/reparse points in a way that creates uncontrolled recursive traversal.
- Handle access-denied files gracefully.
- Never hide uncertainty.

## Explainability

Every candidate should have an evidence-based explanation.

Bad:

> "This looks unnecessary."

Good:

> "This is a browser cache directory. It belongs to an installed browser, has not been modified for 31 days, and is not currently locked. The application can recreate the cache automatically after deletion."

## AI boundaries

AI may:

- classify
- summarize
- explain
- rank ambiguity
- identify likely application ownership
- infer probable cleanup implications

AI must not:

- directly delete files
- override deterministic protection rules
- mark protected paths as safe
- see file contents by default
- silently upload user data

The deterministic safety engine always has the final authority.

---

# 2. Recommended Technology Stack

## Desktop shell

**Tauri 2**

Reason: lightweight Windows desktop application, Rust backend, web frontend, and good fit for filesystem-heavy software.

## Frontend

- React
- TypeScript
- Tailwind CSS
- shadcn/ui or similarly accessible headless primitives
- Lucide icons or another consistent line-icon set
- TanStack Query/state tooling only where actually useful

Do not introduce unnecessary frontend infrastructure.

## Backend

Rust.

Rust should own:

- filesystem scanning
- metadata collection
- protected-path checks
- process checks
- file-in-use checks
- classification rules
- candidate scoring
- hashing
- duplicate detection
- deletion queue
- Recycle Bin integration
- local application storage
- communication with AI providers

## Persistence

Do NOT start with SQLite.

Use an application-data directory:

```text
%LOCALAPPDATA%\\CleanScope\\
```

Recommended structure:

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
└── logs/
```

Persist metadata and summaries, not user file contents.

Keep the persistence layer abstract so SQLite can be introduced later without redesigning the rest of the application.

---

# 3. AI Architecture

CleanScope must use exactly **one local model** for the local-AI path, chosen for speed and broad hardware compatibility rather than maximum reasoning capability.

## Local model: Qwen3.5-0.8B

Use **Qwen3.5-0.8B** as the single local LLM, preferably the **Q4_0 GGUF** build for the personal-use application. The official GGUF repository provides a Q4_0 artifact of about 563 MB and supports llama.cpp. citeturn404814search3turn404814search9

Why this model:

- Small enough to be practical on low-end Windows machines.
- Fast enough for short metadata-classification jobs.
- Small download footprint compared with 3B/4B/7B models.
- Suitable for short structured outputs rather than long-form reasoning.
- Can run completely locally.

Do not make a 2B, 4B, 7B, or larger model a dependency. The goal is a **single, lightweight local model for every machine**.

## Local runtime

Use **llama.cpp** as the inference runtime. It provides GGUF execution, Windows binaries, an OpenAI-compatible local server, multiple hardware backends, quantization support, and CPU/GPU hybrid execution. citeturn404814search0turn404814search4

The user should not need to install Ollama, Python, CUDA, or another AI framework manually. The production application should manage the local runtime itself.

Preferred production architecture:

```text
CleanScope.exe
    │
    ├── React UI
    ├── Rust core
    ├── safety engine
    ├── cleanup engine
    └── CleanScope AI worker
             │
             ▼
          llama.cpp
             │
             ▼
      Qwen3.5-0.8B Q4_0
```

The AI worker should be an isolated local process where practical. If the model crashes or exhausts memory, the scanner and UI must remain operational.

The model should be loaded **on demand** for ambiguous analysis, not kept resident for the entire lifetime of the application. Unload it after analysis when practical to release memory.

During development, an external local llama.cpp/Ollama server may be used for convenience, but the final application should not require either one to be separately installed. llama.cpp exposes prebuilt binaries and local-server operation suitable for this architecture. citeturn404814search0

## Hardware behavior

Do not maintain multiple local models. The same Qwen3.5-0.8B Q4_0 model is used everywhere.

The application should adapt runtime settings instead:

- Low available RAM: use fewer model threads, short context, smaller candidate batches, and unload aggressively.
- Adequate RAM: use more CPU threads where beneficial.
- Compatible GPU: use an available llama.cpp GPU backend when beneficial.
- Memory pressure: temporarily disable local AI and continue with deterministic analysis.

AI is an enhancement, never a prerequisite for scanning or cleanup.

## AI workload

Never send every scanned file to the LLM. Rust performs the broad scan and deterministic classification first. The local model only receives **ambiguous candidate metadata**.

Example:

```text
1,000,000 filesystem entries
        ↓
Rust scanner
        ↓
protected / irrelevant / obvious cases
        ↓
small candidate set
        ↓
Qwen3.5-0.8B
        ↓
classification + explanation
        ↓
human review where uncertainty remains
```

The model should process small batches of structured metadata, preferably dozens of candidates rather than thousands in one prompt.

## AI boundaries

AI may:

- classify likely file/folder role
- identify probable cache/build/log/installer/dependency patterns
- produce concise explanations
- summarize likely consequences
- estimate classification confidence
- identify missing context that warrants review

AI must never:

- delete, move, rename, or modify files
- execute commands
- change permissions
- override deterministic protection rules
- declare a protected path safe
- inspect file contents by default

## Optional Gemini escalation

Gemini may exist as an **optional second-stage cloud analysis feature**, but the application must remain fully useful without it. It is not another local model.

Use Gemini only for genuinely ambiguous cases after deterministic analysis and the local Qwen model have failed to reach a useful confidence level.

Cloud escalation requirements:

- Batch candidate metadata.
- Never make one API request per file.
- Cache previous analysis using candidate fingerprints.
- Respect quota/rate limits.
- Fall back to local/deterministic analysis when unavailable.
- Provide a visible cloud-analysis toggle.
- Default to metadata-only transmission.
- Never upload file contents by default.

## Privacy defaults

Default:

```text
Local AI: enabled when available
Cloud AI: optional
Send file contents: OFF
Send metadata only: ON
```

Metadata can include:

- filename
- extension
- normalized path category
- size
- timestamps
- file attributes
- application association
- process association
- in-use/lock state
- deterministic classification
- candidate fingerprint

Do not send the contents of documents, photos, passwords, databases, source files, or arbitrary binaries to AI merely to classify cleanup candidates.

# 4. Core Classification Model

Each candidate should have a structured record similar to:

```ts
interface FileCandidate {
  id: string;
  path: string;
  name: string;
  extension?: string;
  sizeBytes: number;
  createdAt?: string;
  modifiedAt?: string;
  accessedAt?: string;

  category:
    | 'temporary'
    | 'cache'
    | 'log'
    | 'crash-data'
    | 'installer'
    | 'developer-cache'
    | 'build-output'
    | 'duplicate'
    | 'large-file'
    | 'old-file'
    | 'application-data'
    | 'personal-data'
    | 'system-data'
    | 'unknown';

  riskLevel: 'safe' | 'review' | 'protected' | 'unknown';

  confidence: number;

  inUse: boolean;
  owningProcess?: string;
  relatedApplication?: string;

  deleteEffect: string;
  explanation: string;

  aiProvider?: 'none' | 'local' | 'gemini';
  fingerprint?: string;
}
```

The actual implementation may use enums/types better suited to Rust, but preserve this conceptual model.

---

# 5. Risk Model

## Green — Safe / Verified

Examples:

- known application cache
- known browser cache
- known temporary files
- known crash dumps
- known thumbnail caches
- well-understood disposable build artifacts

Still show evidence and consequences.

## Yellow — Review

Examples:

- developer dependency caches
- old installers
- old archives
- build directories
- large files
- duplicate files
- application remnants
- unknown but non-protected directories

Require explicit selection.

## Red — Protected

Examples:

- Windows system paths
- boot-related files
- critical system DLLs
- protected application files
- security infrastructure
- unknown executables in sensitive paths
- critical configuration stores

Do not allow one-click deletion.

## Gray — Unknown

No confident classification.

The default action is KEEP.

---

# 6. Scanner Design

## First scan

The first scanner must be fast, cancellable, robust, and read-only.

It should collect:

- path
- file/folder type
- size
- extension
- timestamps
- attributes
- parent directory
- access status
- reparse-point status where relevant

## Scanner rules

- Use concurrent traversal carefully; avoid overwhelming the drive.
- Stream progress events to the UI.
- Never freeze the UI.
- Support cancellation immediately.
- Gracefully skip access-denied locations.
- Track skipped/error counts.
- Do not automatically hash every file.
- Do not read file bodies unless required by a later explicitly enabled feature.

## Performance strategy

For duplicates:

```text
same file size
   ↓
small partial hash
   ↓
strong/full hash only for remaining collisions
```

For AI:

```text
all files
   ↓
fast deterministic classification
   ↓
interesting candidates only
   ↓
local AI
   ↓
hard cases only → Gemini
```

---

# 7. Process and In-Use Detection

The app should try to answer:

> "Is this currently being used?"

For each candidate where feasible:

- detect sharing/locking problems
- associate open/active processes where the Windows APIs permit
- detect whether the owning application is currently running
- distinguish directory-level uncertainty from confidently unused data

Example UI:

```text
Currently in use
chrome.exe is using 14 files in this location.
Some files will be skipped unless Chrome is closed.
```

Never pretend that an in-use check is a perfect guarantee. Filesystem state can change between inspection and deletion.

---

# 8. Application Knowledge

Maintain a curated knowledge base for common applications and developer ecosystems.

Examples:

- Chrome / Edge / Firefox caches
- VS Code / JetBrains caches
- npm / pnpm / Yarn caches
- Cargo registry/cache
- pip cache
- NuGet cache
- Gradle/Maven caches
- Android build artifacts
- Docker data where safely detectable
- common crash/log directories
- old installers
- AI coding-tool caches and logs where identifiable

The knowledge base should be data-driven, not scattered through hardcoded conditionals.

Example conceptual record:

```json
{
  "id": "npm-cache",
  "application": "npm",
  "patterns": ["..."],
  "category": "developer-cache",
  "risk": "review",
  "deleteEffect": "Packages may be downloaded again."
}
```

---

# 9. Cleanup Semantics

The default destructive operation should be:

```text
Selected files
   ↓
Validation pass
   ↓
Move to Windows Recycle Bin
   ↓
Cleanup report
```

Before execution, revalidate every selected candidate because filesystem state may have changed since scanning.

Re-check:

- path still exists
- path still refers to the expected item
- protected status
- in-use state
- fingerprint/metadata where appropriate

Do not blindly delete based on stale scan results.

If the application cannot validate an item, skip it and explain why.

---

# 10. Cleanup Review UX

Before cleanup, show a review panel:

```text
Cleanup Review

142 items selected
34.8 GB total

24.3 GB  Verified disposable
 8.7 GB  Review items
 1.8 GB  Skipped / uncertain

Potential effects
• Browser caches may be rebuilt.
• Developer dependencies may be downloaded again.
• Build folders may require rebuilding.
• 7 files are currently in use.
• No Windows system paths are included.

[ Cancel ]   [ Clean 33.0 GB ]
```

The final button must explicitly state the operation and amount.

Never use vague labels such as:

- "Optimize Now"
- "Fix Everything"
- "Delete Junk"

Prefer:

- "Clean 33.0 GB"
- "Remove 142 selected items"

---

# 11. UI/UX Direction

## Overall visual language

The application must look **premium, restrained, technical, and calm**.

Reference qualities:

- Vercel
- Next.js ecosystem dashboards
- Linear
- Raycast
- modern developer tooling

Do NOT imitate logos, proprietary assets, or exact layouts. Use the design language as inspiration only.

## Theme

Primary theme: **deep dark OLED**.

The interface should be nearly black, with subtle elevated surfaces.

Suggested palette:

```text
Background:       #050505
Surface:          #0A0A0A
Surface raised:   #101010
Border subtle:    #1A1A1A
Border active:    #2A2A2A
Primary text:     #F5F5F5
Secondary text:   #A1A1AA
Muted text:       #71717A
```

Semantic accents should be restrained:

```text
Safe:             muted green
Review:           muted amber
Protected:        muted red
Information:      muted blue
AI:               subtle violet/indigo accent
```

Do not use neon gradients everywhere.

Do not use colorful gaming-style UI.

Do not use emoji.

Use icons only where they materially improve recognition.

## Typography

Use a modern sans-serif system stack.

Prefer:

```css
font-family:
  Inter,
  ui-sans-serif,
  system-ui,
  -apple-system,
  BlinkMacSystemFont,
  "Segoe UI",
  sans-serif;
```

Use strong typographic hierarchy rather than oversized decoration.

Numbers representing storage amounts should have strong visual emphasis.

---

# 12. Dashboard

The dashboard is the primary screen.

Suggested structure:

```text
┌─────────────────────────────────────────────────────────────┐
│ CleanScope                                  Scan   Settings │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Storage overview                                            │
│                                                             │
│  742 GB used                         258 GB free             │
│  ████████████████████████████░░░░░░                        │
│                                                             │
│  Potential cleanup                                          │
│                                                             │
│  34.8 GB                                                    │
│  Based on verified and reviewable candidates                │
│                                                             │
│  [ Run Smart Scan ]                                         │
│                                                             │
├─────────────────────────────────────────────────────────────┤
│ Cleanup categories                                          │
│                                                             │
│ Temporary data                    8.2 GB     Safe            │
│ Application caches                9.6 GB     Safe            │
│ Developer data                    7.8 GB     Review          │
│ Old installers                    3.4 GB     Review          │
│ Large files                       5.8 GB     Review          │
│ Protected/system                 42.1 GB     Protected       │
└─────────────────────────────────────────────────────────────┘
```

The real design should be more polished and spacious than the ASCII representation.

---

# 13. Navigation

Use a compact left sidebar or elegant top navigation.

Recommended sections:

- Overview
- Smart Scan
- Large Files
- Duplicates
- Applications
- Developer Storage
- Cleanup History
- Settings

Do not overpopulate navigation.

---

# 14. Smart Scan Experience

When scanning:

```text
Smart Scan

Scanning C:\

1,248,392 files analyzed
683.2 GB examined
2.4 million filesystem entries considered

Current area
Users\\...\\AppData\\Local

────────────── progress ──────────────

Scan speed: 18,420 files/s
Skipped: 2,381
Potential cleanup discovered: 29.4 GB

[ Cancel Scan ]
```

Animations should be subtle and purposeful.

Use:

- soft progress transitions
- number interpolation
- skeletons
- opacity/translate transitions
- gentle hover states

Avoid:

- bouncing UI
- excessive particles
- flashy loading animations
- fake scanning progress

The UI must display real progress from the scanner.

---

# 15. Candidate Detail Panel

Every cleanup candidate needs a high-quality detail panel.

Example:

```text
Chrome Cache

2.4 GB
C:\Users\...\Chrome\User Data\Cache

Classification
Application cache

Why is this here?
Chrome stores temporary web resources here to improve loading speed.

Current status
Not currently in use

Last modified
31 days ago

What happens if removed?
Chrome can recreate the cache automatically. The next few page loads
may be slightly slower while the cache rebuilds.

Evidence
✓ Known Chrome cache location
✓ Cache file patterns match
✓ No active lock detected
✓ Not a protected path

Risk
LOW

Confidence
98%

[ Keep ]          [ Open Folder ]       [ Select for Cleanup ]
```

---

# 16. Warning UX

Warnings should be specific, not generic.

Bad:

> "Deleting this may be dangerous."

Good:

> "This directory is associated with an installed development tool and was modified 2 days ago. Removing it may force the tool to recreate indexes or download dependencies. Review before cleanup."

For active usage:

> "This folder is currently used by chrome.exe. 14 files are locked. Cleanable files can still be selected, but locked files will be skipped unless the application is closed."

For unknown items:

> "CleanScope cannot establish that this item is disposable. It is large, but size alone is not evidence that deletion is safe."

---

# 17. AI Explanation UI

AI should not dominate the application.

Instead, show compact labels:

```text
AI-assisted analysis
Confidence 92%
```

Allow expansion:

```text
Why this classification?

The folder matches a known developer cache pattern and contains
reproducible package artifacts. It has not changed recently.

AI conclusion: likely disposable cache
Recommendation: review
```

Show the provider in advanced details if desired:

```text
Analyzed by: Local AI
```

or:

```text
Analyzed by: Gemini
```

Do not make the product feel like an AI chatbot.

---

# 18. First-Run Experience

First run should be short.

Suggested flow:

```text
Welcome to CleanScope

Understand your storage before removing anything.

[ Start First Scan ]
```

Then a privacy screen:

```text
Privacy-first by default

CleanScope analyzes filesystem metadata locally.

AI can optionally help with ambiguous items.

Default:
• File contents are not uploaded.
• Protected locations are excluded from cloud analysis.
• Cleanup requires your confirmation.

[ Continue ]
```

No lengthy onboarding carousel.

---

# 19. Settings

Settings should include:

## General

- launch behavior
- default scan locations
- animation intensity
- notifications

## Safety

- require confirmation before cleanup
- use Recycle Bin
- skip items in use
- protected-path policy
- minimum confidence for one-click safe cleanup

## AI

```text
Provider
○ Local only
● Hybrid
○ Gemini only for ambiguous cases

Local model
[ configured model ]

Gemini API key
[ *************** ]

Privacy
☑ Metadata only
☑ Do not send protected-path information
☐ Allow file-content analysis for explicitly selected items
```

## History

- retention period
- clear scan history
- clear AI cache
- clear cleanup history

---

# 20. Cleanup History

Show previous cleanups:

```text
August 31, 2026

34.2 GB reclaimed
137 items removed
5 items skipped

View report
```

A report should include:

- timestamp
- selected items count
- successfully moved items
- skipped items
- failure reasons
- total bytes processed

Do not store full file contents.

---

# 21. Storage Visualization

Include an elegant storage breakdown.

Use restrained charts, not huge colorful pie charts.

Preferred:

- horizontal storage bars
- compact treemap when useful
- drill-down rows
- sparklines for history

Categories may include:

- Windows/system
- applications
- games
- user files
- developer data
- cache/temp
- unknown

Unknown should remain visible rather than being silently assigned somewhere else.

---

# 22. Large Files

Large file discovery should be independent from "junk" detection.

A 20 GB video is large but not junk.

UI should explicitly distinguish:

```text
Large does not mean unnecessary.
```

Candidate details should include:

- size
- location
- modified date
- file type
- likely purpose
- duplicate status if known
- recommendation

Actions:

- Open
- Open Folder
- Select
- Keep

Do not default-select large files.

---

# 23. Duplicate Detection

Duplicates should be shown with grouping:

```text
Duplicate group
3 files
4.8 GB total
3.2 GB recoverable

✓ C:\Projects\archive\build.zip
✓ D:\Downloads\build.zip
✓ C:\Users\...\Desktop\build.zip
```

Always preserve at least one copy.

Never assume which duplicate the user wants to keep without a clear reason.

---

# 24. Developer Storage

Create a dedicated view because developers accumulate large reproducible caches.

Examples:

```text
Developer Storage

npm / pnpm / Yarn       18.2 GB
Docker                   13.1 GB
IDE caches                7.4 GB
Python caches             4.8 GB
Cargo                     4.1 GB
Gradle / Maven             3.8 GB
Build artifacts            9.7 GB
AI coding tools             4.2 GB
Other                      5.3 GB
```

Each category should explain:

- why it exists
- whether it can be regenerated
- what will happen after cleanup
- whether an associated project/application is active

---

# 25. Empty / Error / Edge States

Design all states intentionally.

Examples:

## No cleanup found

```text
Your storage looks clean.

No high-confidence disposable data was found.
```

## Scan permission problem

```text
Some locations could not be inspected.

CleanScope skipped 1,284 items because Windows denied access.
```

## Incomplete scan

```text
Scan stopped.

Results are partial and should not be treated as a complete storage report.
```

## AI unavailable

```text
Cloud analysis unavailable.

CleanScope will continue using local rules and local AI.
```

## Local model unavailable

```text
Local AI unavailable.

Deterministic analysis is still active. Ambiguous items will be marked for review.
```

---

# 26. Animation System

Animations should feel like a high-quality web product running natively on Windows.

Use:

- 120–220ms micro-interactions
- 180–300ms panel transitions
- ease-out entrances
- subtle spring only where useful
- transform/opacity animations rather than expensive layout animations

Animate:

- cards appearing
- scan numbers changing
- panel transitions
- hover/focus states
- cleanup completion

Do not animate continuously unless it communicates active scanning.

Respect reduced-motion preferences.

---

# 27. Component Design System

Build reusable components:

```text
AppShell
Sidebar
TopBar
StorageSummary
ScanProgress
CategoryRow
RiskBadge
ConfidenceBadge
CandidateTable
CandidateDetailPanel
CleanupReviewModal
WarningBanner
EvidenceList
AIExplanation
EmptyState
ErrorState
HistoryCard
SettingsSection
ProviderSelector
```

Do not duplicate styles across pages.

Use a coherent spacing scale and tokenized colors.

---

# 28. Accessibility

Minimum requirements:

- keyboard navigable
- visible focus states
- sufficient text contrast
- accessible dialogs
- accessible tables/lists
- no information conveyed only through color
- support reduced motion
- descriptive icon labels/tooltips

Do not sacrifice accessibility for aesthetics.

---

# 29. Security Requirements

Treat the application like security-sensitive desktop software.

Implement:

- strict path validation
- canonicalization before protected-path checks
- protection against traversal
- protection against junction/reparse-point abuse
- race-condition-aware validation before deletion
- least-privilege design
- avoid requiring administrator access unless a feature genuinely requires it
- safe argument handling across Tauri commands
- no shell command construction from untrusted paths
- no arbitrary command execution from scanned filenames
- strict JSON parsing for AI outputs
- AI output treated as untrusted text

Never execute scanned files.

Never use a filename or path as executable content.

---

# 30. AI Output Contract

Require strict structured output.

Example:

```json
{
  "category": "developer-cache",
  "confidence": 0.94,
  "risk": "review",
  "explanation": "This appears to be reproducible package cache data.",
  "possible_effect": "Dependencies may need to be downloaded again.",
  "recommendation": "review"
}
```

Validate against a schema.

Reject malformed or unsupported AI responses.

Never concatenate AI output directly into commands.

---

# 31. Logging

Logs belong under:

```text
%LOCALAPPDATA%\\CleanScope\\logs\\
```

Logs should help diagnose:

- scan errors
- skipped paths
- AI failures
- cleanup failures
- performance problems

Do not log sensitive file contents.

Avoid logging entire personal paths when unnecessary; consider redaction in diagnostic exports.

---

# 32. Internal Implementation Order

The coding agent is instructed to build the **full product in one implementation pass** rather than waiting for the user to request milestones individually.

The following phases are an **internal dependency order**, not separate user-facing delivery requests. The agent should implement all phases, resolve integration problems, and finish with a runnable personal-use application.

## 32.1 Foundation

- Tauri 2 application
- React/TypeScript frontend
- Tailwind-based design system
- Rust application core
- local application-data storage
- configuration and logging

## 32.2 Scanner

- drive/folder selection
- recursive enumeration
- real-time progress
- cancellation
- metadata collection
- permission/error handling
- reparse-point protection
- incremental candidate processing

## 32.3 Deterministic analyzer

Implement protected-path detection and classification for:

- temporary files
- application caches
- logs
- crash dumps
- thumbnail/cache data
- installers
- archives
- developer caches
- build output
- package-manager caches
- old files
- large files
- duplicate candidates
- unknown data

## 32.4 Process and safety layer

- running application detection
- file-in-use checks where technically possible
- process association
- revalidation immediately before cleanup
- risk scoring
- hard protected paths

## 32.5 Cleanup

- selection
- category selection
- detailed pre-cleanup review
- consequence display
- Recycle Bin integration
- skipped-file reporting
- cleanup history
- undo guidance through Recycle Bin

## 32.6 Duplicate and storage analysis

- size grouping
- staged hashing
- duplicate groups
- largest files
- storage-by-category visualization
- developer storage analysis

## 32.7 Local AI

- llama.cpp runtime integration
- Qwen3.5-0.8B Q4_0 model management
- on-demand model loading
- structured JSON output
- candidate fingerprinting
- AI explanation cache
- graceful failure when AI cannot start

## 32.8 Optional Gemini

- API configuration
- cloud toggle
- batch analysis
- rate-limit handling
- cloud-result cache
- metadata-only transmission
- fallback to local analysis

## 32.9 Final UI/UX

- dashboard
- smart scan experience
- candidate detail drawer
- review flow
- warnings
- settings
- history
- storage visualization
- developer storage view
- empty/error states
- accessibility
- animation polish

The final result should be runnable end-to-end, not a sequence of disconnected prototypes.

# 33. Testing Strategy

Every safety-sensitive subsystem must have tests.

Test:

- protected path detection
- path canonicalization
- symlink/junction behavior
- access-denied paths
- long paths
- Unicode filenames
- spaces and special characters
- locked files
- files changing during scan
- file deleted during scan
- duplicate detection correctness
- Recycle Bin behavior
- stale candidate validation
- malformed AI response
- AI provider unavailable
- Gemini rate limit
- local model unavailable

Create fixture directories for safe testing.

Never test destructive functionality against the user's real system directories.

---

# 34. Coding-Agent Working Rules

The coding agent must build the entire CleanScope product for **personal use** in the current project.

Unlike a staged product-development engagement, do not stop after the scanner or ask the user to request the next phase. Use the internal implementation order in Section 32, implement the integrated product, and then run builds/tests and fix integration issues.

Rules:

1. Build the complete application end-to-end.
2. Use real filesystem data; never leave fake scan data in the finished application.
3. Keep safety logic independent from AI.
4. Never allow AI to perform filesystem mutations.
5. Use Qwen3.5-0.8B Q4_0 as the single local model.
6. Use llama.cpp for local inference.
7. Do not require the user to install Ollama/Python/CUDA manually.
8. Keep Gemini optional.
9. If local AI or Gemini fails, the product must still function.
10. Move selected items to the Windows Recycle Bin rather than permanently deleting by default.
11. Revalidate every selected item immediately before cleanup.
12. Protect system paths, boot data, credentials, user documents, and other high-risk data by default.
13. Handle access-denied, locked, disappearing, and changing files gracefully.
14. Never follow junctions/reparse points recursively without explicit safety handling.
15. Keep persisted data under `%LOCALAPPDATA%\CleanScope\`.
16. Store metadata/history, not user file contents.
17. Cache AI classifications using stable candidate fingerprints.
18. Never make one cloud AI request per file.
19. Use strict structured-output validation for AI responses.
20. If an AI response is malformed or uncertain, fall back to review/keep.
21. Never use emoji anywhere in the UI.
22. Use professional line icons rather than emoji.
23. Maintain the deep OLED visual system throughout the application.
24. Use restrained motion and avoid distracting animation.
25. Do not add unnecessary dependencies.
26. Prefer native Windows/Rust facilities where appropriate.
27. Run the full build and relevant tests after integrating all major subsystems.
28. Fix compile errors, runtime crashes, obvious race conditions, and broken states before considering the application complete.

# 35. Master Coding Prompt

Use the following prompt as the primary instruction to the coding agent. It is intentionally written for **full implementation in one pass** because this is a personal-use application and the user wants the complete product rather than milestone-by-milestone delivery.

---

You are the lead engineer responsible for building the complete Windows desktop application **CleanScope** in this repository.

Do not build a demo. Do not build a sequence of partial prototypes. Implement the full integrated personal-use product described below, including the scanner, analyzer, safety engine, cleanup workflow, local AI, optional Gemini integration, persistence, history, and polished UI.

You may use an internal dependency order, but you must continue through all required subsystems in this task. After implementation, build/test the complete application and fix integration failures.

## Product

CleanScope is an intelligent Windows storage analyzer and safe cleanup assistant.

It scans selected Windows locations, identifies temporary/cache/log/build/installer/developer/duplicate/large/old data, explains exactly what each candidate is, determines whether it appears to be in use, estimates the consequences of removal, and lets the user review and move selected items to the Windows Recycle Bin.

This is personal-use software. Prioritize reliability, transparency, safety, speed, and a premium interface over multi-user enterprise concerns or product-launch infrastructure.

## Core principle

Never equate old, large, unfamiliar, or unused-looking with safe to delete.

Use this architecture:

```text
Windows filesystem
      ↓
Rust scanner
      ↓
Deterministic analysis + safety rules
      ↓
Candidate ranking
      ↓
Qwen3.5-0.8B local AI for ambiguous analysis
      ↓
Optional Gemini escalation
      ↓
Human review
      ↓
Immediate revalidation
      ↓
Windows Recycle Bin
```

The deterministic safety engine has final authority. AI cannot override it.

# Local AI specification

Use exactly one local model across all machines:

**Qwen3.5-0.8B Q4_0 GGUF**.

The official GGUF repository provides the Q4_0 file at approximately 563 MB and documents llama.cpp usage. citeturn404814search3turn404814search9

Use **llama.cpp** as the local inference runtime. It supports Windows distribution, GGUF models, local server operation, multiple hardware backends, quantization, and CPU/GPU hybrid execution. citeturn404814search0turn404814search4

The user should not be required to install Ollama, Python, CUDA, or any other AI system. Manage the runtime/model from CleanScope itself.

Prefer a separate AI worker process so an inference failure cannot crash the scanner/UI. Load the model only when ambiguous analysis is needed and unload it afterward when practical.

Qwen receives structured filesystem metadata, not arbitrary file contents. It must return strict JSON conforming to a schema validated by Rust.

The model can classify and explain; it cannot perform or authorize filesystem mutations.

# Optional Gemini

Implement Gemini as an optional cloud escalation layer behind an `AIProvider` abstraction.

Only send candidates that remain genuinely ambiguous after deterministic analysis and local Qwen analysis.

Use batching, caching, configurable request limits, graceful rate-limit handling, and metadata-only transmission by default.

If Gemini is unavailable, CleanScope continues normally.

# Persistence

Do not use SQLite for the initial implementation.

Use:

```text
%LOCALAPPDATA%\CleanScope\
```

with:

```text
CleanScope/
├── settings.json
├── scan-history/
├── ai-cache/
├── cleanup-history/
├── known-apps.json
├── models/
└── logs/
```

Persist metadata, settings, classifications, fingerprints, scan summaries, and cleanup records. Never persist file contents.

# Scanner requirements

Implement real Windows scanning with:

- drive selection
- folder selection
- recursive traversal
- cancellation
- progress events
- file/folder counts
- bytes scanned
- scan speed
- skipped/error counts
- timestamps
- extension/type
- file attributes
- safe handling of Unicode and special names
- long path handling where possible
- permission failures without application crash
- explicit reparse-point/junction behavior

Do not recursively traverse arbitrary reparse points in a way that could produce uncontrolled traversal.

# Classification requirements

Create deterministic classifiers for at least:

- temporary data
- browser/application caches
- logs
- crash dumps
- thumbnail caches
- installers
- archives
- developer caches
- package-manager caches
- build output
- generated artifacts
- stale application leftovers
- duplicate files
- very large files
- old files
- personal data
- system data
- unknown data

Use multiple signals rather than one filename rule.

# Risk system

Every candidate receives one of:

**GREEN — Verified / low-risk cleanup**

High-confidence disposable data with strong evidence.

**YELLOW — Review required**

Likely removable but user intent or consequences matter.

**RED — Protected**

System-critical, security-sensitive, personal-data-sensitive, application-critical, or otherwise high-risk data.

**GRAY — Unknown**

Insufficient evidence. Never present as automatically safe.

# In-use/process analysis

Attempt to determine:

- whether the file/folder is currently changing
- whether it is locked/in use where technically possible
- which process/application is associated
- whether the parent application is currently running

If an item is in use, show it explicitly and skip or require an appropriate safe workflow rather than pretending deletion is safe.

# Cleanup

Never permanently delete by default.

Preferred behavior:

```text
selected items
      ↓
pre-cleanup review
      ↓
revalidate paths + state
      ↓
move to Recycle Bin
      ↓
report success/skips/failures
```

Immediately before cleanup, re-check that the candidate still exists, still matches the expected fingerprint/metadata where practical, is not now protected, and is not now in use.

Provide a final review showing:

- number of items
- total size
- green/yellow composition
- protected/skipped items
- exact or expandable paths
- potential consequences
- currently running applications that matter

# Candidate explanation UX

For each item, show:

```text
What it is
Why it exists
Where it is
Size
Age
Currently in use?
Associated application/process
Risk
Confidence
Evidence
What happens if removed
Recommendation
```

Use professional language. Never say merely “junk”.

Examples of desired explanations:

“Application cache. This data is generated by the installed application to speed up repeated operations. The cache can normally be recreated after deletion.”

“Developer build output. This appears to be generated output from a project. Deleting it should not remove source code, but the project may need to rebuild.”

“Unknown database file. The application cannot establish its role with sufficient confidence. It has therefore been excluded from automatic cleanup.”

# UI/UX

Build the entire interface in a **deep dark OLED theme**.

Visual inspiration: Vercel, Next.js, Linear, Raycast, modern developer dashboards. Do not copy any product exactly.

## Visual language

- near-black OLED background
- subtle graphite surfaces
- low-contrast borders
- white/high-gray primary text
- muted secondary text
- sparse semantic accents only
- elegant numerical typography
- crisp line icons
- generous whitespace
- restrained gradients
- compact but readable information density

No emoji anywhere.

No cartoon artwork.
No gamification.
No fake “hacker” aesthetic.
No excessive neon.
No glossy Windows 7-era controls.

## Motion

Use subtle 120–300 ms transitions.

Use motion for:

- panel transitions
- selection state
- scan progress
- disclosure/expand-collapse
- success confirmation
- route/page transitions

Do not animate every element. Respect reduced-motion preferences.

## Main dashboard

Create a strong visual hierarchy:

```text
CleanScope                             Settings

Storage
████████████████████████████░░░░░░

421 GB used      258 GB free

Potential cleanup
48.7 GB

Verified cleanup     24.8 GB
Review recommended   11.3 GB
Protected            112.7 GB
Unknown                2.1 GB

[ Scan ]              [ Review Cleanup ]
```

Use real values from the scanner.

## Navigation

Recommended main sections:

- Overview
- Smart Scan
- Large Files
- Duplicates
- Applications
- Developer Storage
- Cleanup History
- Settings

Keep navigation visually light.

## Scan screen

During scanning show:

- real progress where measurable
- current path
- items scanned
- bytes scanned
- scan speed
- estimated remaining work only when defensible
- skipped/error count
- cancel action

Do not fabricate percentage values. If exact percentage is not known, use an honest indeterminate/progress state.

## Candidate list

Each candidate row should show:

- checkbox
- item name
- location
- size
- category
- risk indicator
- confidence
- in-use state
- expandable reason

Support sorting by size, risk, category, age, confidence, and path.

## Detail drawer

Clicking an item opens a right-side or modal detail panel containing the complete explanation and evidence.

## Cleanup review

Before deletion, show a dedicated review screen with a strong summary:

```text
Review cleanup

137 items
34.5 GB

24.8 GB verified
9.7 GB review

Potential consequences
• caches may rebuild
• build outputs may need regeneration
• 7 items currently unavailable

[ Cancel ]        [ Move to Recycle Bin ]
```

The final action must not be misleadingly labeled “Delete Everything”.

# AI explanation UI

For AI-assisted items, show a subtle label such as:

`AI-assisted analysis`

and expose the reason/evidence used.

Show local/cloud provenance in details:

`Rules`
`Local AI`
`Gemini`

Never imply that AI confidence is equivalent to safety authorization.

# Settings

Include:

- scan locations
- protected paths
- excluded paths
- cleanup behavior
- Recycle Bin preference
- local AI on/off
- AI model status
- Gemini on/off
- Gemini API key storage
- metadata-only cloud setting
- AI request limits
- history retention
- clear application data
- logging level
- reduced motion

# First run

Create a restrained onboarding flow:

1. Explain what CleanScope scans.
2. Explain that AI is optional and local-first.
3. Explain that protected data is not automatically cleaned.
4. Explain that cleanup goes to Recycle Bin.
5. Let the user start a scan.

Do not overwhelm the user with technical LLM terminology on first run.

# Safety and security

Test and guard against:

- Windows system directories
- boot/system files
- user profile root mistakes
- junctions/reparse points
- symlink recursion
- path traversal
- Unicode normalization surprises
- long paths
- access-denied files
- locked files
- files changing during scans
- files disappearing before cleanup
- stale scan results
- malformed local-AI JSON
- local model crashes
- Gemini rate limits
- cloud unavailable

Never log secret material or raw personal file contents. Redact sensitive path information in diagnostic exports where feasible.

# Testing

Create fixture-based tests for:

- temp files
- cache directories
- installers
- build folders
- duplicate files
- unknown files
- protected locations
- junctions
- Unicode names
- locked files
- race conditions
- disappearing files
- malformed AI outputs
- Recycle Bin operations

Do not use the real Windows system directories as automated destructive test fixtures.

# Final execution requirements

After implementing the complete product:

1. Install/build all required dependencies.
2. Build the Tauri application.
3. Run the available tests.
4. Fix compile errors.
5. Fix obvious runtime errors.
6. Verify scanner-to-UI event flow.
7. Verify deterministic classification.
8. Verify Recycle Bin cleanup with test fixtures.
9. Verify local Qwen inference and graceful AI failure.
10. Verify history/AI cache storage.
11. Verify optional Gemini configuration path without requiring an API key.
12. Verify the UI contains no emoji.
13. Verify all major screens use the OLED design system consistently.
14. Leave the repository in a runnable state.

Do not stop after creating scaffolding.
Do not leave major features as TODO placeholders.
Do not replace real functionality with mock data.

---

# 36. Definition of Done for the Personal-Use Product

The product is complete only when a user can launch CleanScope and use the full workflow without manually assembling external AI infrastructure.

Required capabilities:

1. Launch the Windows application.
2. Select a drive or folder.
3. Run a real scan.
4. See live scan progress and real counts.
5. Analyze storage by category.
6. Identify safe/review/protected/unknown items.
7. Open any candidate and understand exactly what it is.
8. See whether it appears to be in use.
9. See associated process/application when detectable.
10. See the likely consequence of removing it.
11. Receive deterministic and, where useful, local-AI explanations.
12. Select individual items or whole categories.
13. Review the exact cleanup set before action.
14. Revalidate the cleanup set.
15. Move selected items to the Windows Recycle Bin.
16. Report successful, skipped, failed, and in-use items.
17. View cleanup history.
18. View previous scan summaries.
19. Reuse cached AI analysis when candidate fingerprints have not changed.
20. Run without Gemini.
21. Run without local AI if the model cannot start.
22. Keep system/protected/uncertain data out of automatic cleanup.
23. Use one lightweight local model: Qwen3.5-0.8B Q4_0.
24. Manage local inference through llama.cpp rather than requiring a separate AI runtime installation.
25. Maintain the deep OLED/Vercel-style UI with no emoji.

# 37. Final Product Personality

CleanScope should communicate:

**Precision over hype.**

**Evidence over guesses.**

**Safety over automation.**

**Clarity over clutter.**

**A professional storage tool rather than a gimmicky “PC cleaner”.**

The application should feel fast, calm, intelligent, and trustworthy.
