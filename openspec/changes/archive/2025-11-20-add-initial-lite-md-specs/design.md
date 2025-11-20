## Context
- LiteMD targets a fast, offline macOS Markdown/text editor with a `lmd <path>` launcher.
- Current codebase is a Tauri + React template with no spec coverage; we need initial requirements before building.

## Goals / Non-Goals
- Goals: define startup expectations, safe file access via Tauri, core editing/preview behavior, and CLI launch flow.
- Non-Goals: sync across devices, collaboration, plugins, or multi-window management.

## Decisions
- Tauri commands own file access; the renderer never touches the filesystem directly.
- Markdown preview must sanitize HTML to avoid script execution; fall back to plain text for unknown formats.
- CLI wrapper remains a small Rust binary (or symlink) that forwards absolute/relative paths to the app.

## Risks / Trade-offs
- Startup under 100ms may require aggressive lazy loading; track with instrumentation and minimal deps.
- Sanitization may strip niche HTML features; prioritize safety over full HTML fidelity.
- File writes must avoid data loss on errors; buffer content should stay in memory until confirmed persisted.

## Migration Plan
- Start from the current template; no legacy data to migrate.

## Open Questions
- Should autosave be enabled by default, and at what cadence?
- Do we need a toggle to hide/show the preview for distraction-free editing?
