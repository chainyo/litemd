# manage-files Specification

## Purpose
TBD - created by archiving change add-initial-lite-md-specs. Update Purpose after archive.
## Requirements
### Requirement: Open local text files
LiteMD SHALL open existing Markdown or plain text files from absolute or relative paths via a Tauri command, preserving encoding and line endings.

#### Scenario: Load existing file
- **WHEN** a user selects a Markdown or plain text file up to 10MB via file picker or CLI
- **THEN** LiteMD loads the full contents into the editor and tracks the source path for saving

#### Scenario: Missing or unreadable file
- **WHEN** the requested path does not exist or lacks read permissions
- **THEN** LiteMD shows a non-blocking error and does not crash or overwrite other files

### Requirement: Persist edits
LiteMD MUST save edited content back to the tracked path through a Tauri command triggered by an explicit save action.

#### Scenario: Save success
- **WHEN** the user modifies content and invokes Save (e.g., Cmd+S or Save button)
- **THEN** LiteMD writes the buffer to disk at the tracked path and leaves the buffer intact

#### Scenario: Save failure handling
- **WHEN** a disk write fails because of permissions or a locked file
- **THEN** LiteMD surfaces an error, leaves the in-memory buffer unchanged, and does not truncate the existing file

