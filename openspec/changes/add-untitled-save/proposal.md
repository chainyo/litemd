# Change: Add save flow for untitled documents

## Why
Users cannot save a new/blank document because no file path is tracked, so Save does nothing. They expect Save to prompt for a location (defaulting to home) and begin tracking the new file.

## What Changes
- Add a Save flow that prompts for a destination when no file is tracked, defaulting to the user's home directory with an untitled filename.
- Persist the chosen path so subsequent saves write without re-prompting.
- Surface cancel and error handling without losing in-memory edits.

## Impact
- Affected specs: manage-files
- Affected code: Tauri file commands, renderer save action/keybinding, file path display
