# Project Context

## Purpose
LiteMD is an ultra-lightweight macOS desktop editor for Markdown and plain text. It opens files instantly, renders Markdown cleanly, and supports a minimal set of editing primitives: bold, italics, underline, strikethrough, headings, and bullet lists. The goal is fast load times, zero bloat, and a distraction-free workspace.

LiteMD must also support a macOS-style terminal command similar to `open -e file.md`. The CLI entry point should look like: lmd path/to/file.md
It should work with any text file not only markdown.


This launches LiteMD with the file loaded.

## Tech Stack
- Frontend: TypeScript, React 19 (Vite), Zustand, Tailwind CSS v4, shadcn-inspired components, react-hook-form, react-i18next, Lucide Icons
- Backend: Tauri 2 (Rust)
- Tooling: Bun, Biome (format/lint/check), cargo fmt/clippy/test
- Target OS: macOS

## Project Conventions

### Code Style

**TypeScript**
- strict mode
- Biome for formatting/linting
- two-space indentation
- `@/` imports for internal modules
- UI primitives under `src/components/ui`
- Tailwind utilities for layout; shared tokens in `src/App.css`

**Rust**
- cargo fmt formatting
- cargo clippy warnings must be cleared
- Tauri commands return structured errors (thiserror) and emit events when needed

### Architecture Patterns
- Renderer: React SPA bundled by Tauri
- State: Zustand stores split by domain (editor, file, settings)
- UI: Tailwind + headless components
- File Access: handled by Rust commands; frontend never touches raw FS
- Markdown Rendering: lightweight renderer with safe HTML transform
- i18n: react-i18next with JSON namespaces
- IPC: typed invoke/emit bridge
- CLI Integration: small Rust binary or symlink placed in PATH providing `lmd <path>` and forwarding to the Tauri app via deep link or file-open handler

### Testing Strategy

**Frontend**
- vitest + react-testing-library
- snapshot tests for Markdown rendering
- sanity tests for Zustand stores

**Backend**
- unit tests for file I/O
- integration smoke tests for Tauri commands
- clippy compliance

### Git Workflow
- trunk-based: `main` always stable
- feature branches: `feat/*`, `fix/*`, `chore/*`
- concise conventional commits
- PRs must pass Biome checks and cargo tests/clippy

## Domain Context
- LiteMD focuses on fast Markdown viewing/editing, not long-term note management
- Must load any text file immediately
- Terminal launching (`lmd file.md`) is a core workflow
- Must feel native to macOS (shortcuts, titlebar integration, smooth rendering)

## Important Constraints
- startup < 100ms
- minimal bundle size
- no unnecessary dependencies
- safe handling of arbitrary text files
- CLI wrapper must support absolute and relative paths
- fully offline

## External Dependencies
- Lucide Icons
- react-hook-form
- react-i18next
- Tauri runtime (Rust)
- Optional tiny Rust CLI helper (`lmd`) for launching files into LiteMD

