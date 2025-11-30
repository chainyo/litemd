## ADDED Requirements
### Requirement: Sticky compact editor controls
LiteMD MUST provide a compact sticky control layout that keeps file context and formatting actions accessible while scrolling.

#### Scenario: Top navbar with file context
- **WHEN** a file is loaded or an untitled document is being edited
- **THEN** a slim navbar pinned to the top-left of the viewport shows the current file path (or "Untitled") and icon-only buttons for open, save, preview/markdown mode toggle, and theme toggle that remain visible while scrolling

#### Scenario: Vertical markdown toolbar
- **WHEN** the editor surface is visible
- **THEN** a vertical icon-only toolbar anchored near the middle left of the viewport exposes the core formatting actions (bold, italic, underline, strikethrough, headings, bullet list) and stays fixed during document scrolling

## MODIFIED Requirements
### Requirement: Live Markdown preview
LiteMD SHALL render Markdown inline within the single scrollable editor surface when preview mode is enabled by default, sanitizing HTML output without a separate preview pane.

#### Scenario: Inline preview surface
- **WHEN** the app loads with preview on or the user toggles preview on while editing a Markdown file
- **THEN** the single editor scroll area shows the rendered Markdown output in place while allowing edits and updates within 100ms of changes, without showing a second pane

#### Scenario: Plain text or preview off
- **WHEN** preview mode is toggled off or the file is detected as plain text
- **THEN** the same scroll area displays the raw text or Markdown without rendering, preserving cursor position and scroll context

#### Scenario: Sanitize embedded HTML
- **WHEN** the Markdown contains raw HTML or script tags
- **THEN** the inline rendering sanitizes the content so scripts do not execute and unsafe HTML is removed or escaped
