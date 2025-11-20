## ADDED Requirements
### Requirement: CLI launch with target file
LiteMD MUST provide an `lmd` command that accepts an absolute or relative path and opens the file in the desktop app.

#### Scenario: Launch with relative path
- **WHEN** a user runs `lmd ./notes/todo.md` for an existing file
- **THEN** LiteMD opens with that file loaded and ready for editing

#### Scenario: Launch with absolute path containing spaces
- **WHEN** a user runs `lmd "/Users/demo/Documents/My Notes.md"`
- **THEN** LiteMD opens the specified file without errors or losing the path

#### Scenario: Missing file error
- **WHEN** the CLI receives a path that does not exist
- **THEN** it prints a concise error, exits with a non-zero status, and does not launch LiteMD
