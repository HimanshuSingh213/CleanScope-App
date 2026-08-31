# CleanScope — Agent Workspace Rules

Please refer to [AGENTS.md](./AGENTS.md) and [CleanScope_MASTER_SPEC.md](./CleanScope_MASTER_SPEC.md) for complete architecture, safety principles, technology stack, and engineering rules.

Key highlights:
- **Theme**: Deep dark OLED (`#050505`).
- **No Emoji**: Use Lucide icons instead.
- **Safety Engine**: Deterministic rules have final authority. AI never executes deletion directly.
- **Recycle Bin**: All cleanup moves items to Windows Recycle Bin by default after pre-validation.
- **Local AI**: Single model Qwen3.5-0.8B Q4_0 GGUF via llama.cpp.
