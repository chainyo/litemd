# Change: Seed LiteMD core specs

## Why
LiteMD has no OpenSpec coverage yet. We need an initial set of requirements to guide implementation of file handling, editor behavior, and the CLI launcher described in `openspec/project.md`.

## What Changes
- Add baseline capabilities for file management, Markdown editing/rendering, and the `lmd` CLI launcher
- Capture startup and offline expectations for the macOS app shell
- Provide implementation tasks to anchor the first development cycle

## Impact
- Affected specs: app-launch, manage-files, editor-markdown, cli-launch
- Affected code: Tauri file commands, React editor shell and preview, CLI wrapper binary
