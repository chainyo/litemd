# editor-markdown Specification

## Purpose
TBD - created by archiving change add-initial-lite-md-specs. Update Purpose after archive.
## Requirements
### Requirement: Core Markdown editing primitives
LiteMD MUST allow users to toggle bold, italics, underline, strikethrough, headings (H1–H6), and bullet lists via toolbar actions and keyboard shortcuts.

#### Scenario: Apply formatting via shortcut
- **WHEN** text is selected and the user triggers the matching shortcut (e.g., Cmd+B for bold)
- **THEN** LiteMD wraps the selection with the correct Markdown syntax and keeps the cursor position stable

#### Scenario: Toggle bullet list
- **WHEN** the cursor is on a line and the bullet list action is triggered
- **THEN** the line converts to a Markdown bullet without disrupting adjacent lines

### Requirement: Live Markdown preview
LiteMD SHALL render a live Markdown preview alongside the editor with sanitized HTML output.

#### Scenario: Preview updates promptly
- **WHEN** the user edits a file containing headings, emphasis, or lists
- **THEN** the preview updates within 100ms of the edit reflecting valid Markdown rendering

#### Scenario: Sanitize embedded HTML
- **WHEN** the Markdown includes raw HTML or script tags
- **THEN** LiteMD sanitizes the preview so no scripts execute and unsafe HTML is stripped or escaped

#### Scenario: Plain text fallback
- **WHEN** the loaded file is plain text or preview is disabled
- **THEN** LiteMD shows the content unrendered without injecting Markdown-specific formatting

