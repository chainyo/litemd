# Change: Refactor editor UI for inline preview and sticky controls

## Why
- Current UI uses a side-by-side editor and preview, which the user does not want.
- Controls for file path, preview toggle, and formatting should stay visible while scrolling.
- Preview should render inline in a single scrollable surface instead of a separate pane.

## What Changes
- Replace the split editor/preview with a single scrollable surface that renders Markdown inline when preview mode is on by default.
- Add a compact sticky navbar showing the current file path and icon-only buttons for open, save, preview/markdown mode toggle, and theme toggle.
- Add a vertical, sticky, icon-only Markdown formatting toolbar pinned to the mid-left of the viewport.
- Preserve sanitized rendering and plain-text fallback when preview is off or the file is not Markdown.

## Impact
- Affected specs: editor-markdown
- Affected code: src/App.tsx, src/App.css (layout, preview behavior, control placement), related UI/state helpers
