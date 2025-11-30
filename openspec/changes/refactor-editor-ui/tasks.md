## 1. Implementation
- [x] 1.1 Rework the layout to add a slim sticky navbar with file path display plus icon-only open, save, preview/markdown toggle, and theme toggle actions that stay visible on scroll.
- [x] 1.2 Add a vertical, sticky, icon-only Markdown formatting toolbar anchored mid-left that wires to existing formatting handlers.
- [x] 1.3 Replace the split editor/preview with a single scrollable surface that renders Markdown inline when preview mode is on by default and falls back to raw text when off or non-Markdown.
- [x] 1.4 Update styling to support the sticky bars and inline preview while preserving sanitized rendering and responsive behavior.
- [x] 1.5 Validate the change with `openspec validate refactor-editor-ui --strict` and smoke test editing/preview toggles, open/save actions, and formatting shortcuts. (Validated with `openspec validate --strict` and npm tests; UI smoke to verify in app.)
