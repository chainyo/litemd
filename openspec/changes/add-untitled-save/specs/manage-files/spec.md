## MODIFIED Requirements
### Requirement: Persist edits
LiteMD MUST save edited content to the tracked path and, when no path is tracked, prompt the user for a destination before saving.

#### Scenario: Save existing file
- **WHEN** the user modifies content with a tracked file path and invokes Save (e.g., Cmd+S or Save button)
- **THEN** LiteMD writes the buffer to disk at the tracked path and leaves the buffer intact

#### Scenario: Save new file prompts for path
- **WHEN** no file is tracked and the user invokes Save
- **THEN** LiteMD opens a save dialog defaulting to the user's home directory with an Untitled.md suggestion and, if a path is chosen, writes the buffer there and begins tracking that file

#### Scenario: Save dialog canceled
- **WHEN** the save dialog is dismissed without choosing a path
- **THEN** LiteMD leaves the buffer unchanged, keeps the file as untitled, and does not show an error

#### Scenario: Save failure handling
- **WHEN** a disk write fails because of permissions or a locked file
- **THEN** LiteMD surfaces an error, leaves the in-memory buffer unchanged, and does not truncate the existing file
