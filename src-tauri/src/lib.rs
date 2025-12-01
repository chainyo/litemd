use std::{
    fs,
    io::Write,
    path::{Path, PathBuf},
    sync::Mutex,
    time::Instant,
};

use serde::Serialize;
use tauri::State;
use thiserror::Error;

const MAX_FILE_SIZE_BYTES: usize = 10 * 1024 * 1024;
const TEMP_EXTENSION: &str = "lmd.tmp";

#[derive(Debug, Serialize, Error)]
pub enum FileError {
    #[error("File not found: {0}")]
    NotFound(String),
    #[error("Path is a directory: {0}")]
    IsDirectory(String),
    #[error("File exceeds 10MB limit ({0} bytes)")]
    TooLarge(usize),
    #[error("File encoding is not UTF-8")]
    InvalidEncoding,
    #[error("No tracked file to save")]
    NoTrackedFile,
    #[error("Unable to update state")]
    StateUnavailable,
    #[error("Unable to write file: {0}")]
    WriteFailed(String),
    #[error("I/O error: {0}")]
    Io(String),
}

impl From<std::io::Error> for FileError {
    fn from(error: std::io::Error) -> Self {
        FileError::Io(error.to_string())
    }
}

#[derive(Debug, Serialize)]
pub struct OpenedFile {
    pub path: String,
    pub content: String,
    pub is_markdown: bool,
}

#[derive(Debug, Serialize)]
pub struct SaveResult {
    pub path: String,
}

#[derive(Debug)]
struct FileState {
    current_path: Mutex<Option<PathBuf>>,
    pending_initial: Mutex<Option<PathBuf>>,
}

#[derive(Debug)]
struct StartupState {
    started_at: Instant,
}

fn parse_initial_path_argument_from<I>(mut args: I) -> Option<PathBuf>
where
    I: Iterator<Item = String>,
{
    while let Some(arg) = args.next() {
        if arg == "--file" {
            return args.next().map(PathBuf::from);
        }

        if !arg.starts_with('-') {
            return Some(PathBuf::from(arg));
        }
    }
    None
}

fn parse_initial_path_argument() -> Option<PathBuf> {
    parse_initial_path_argument_from(std::env::args().skip(1))
}

fn resolve_existing(path: PathBuf) -> Result<PathBuf, FileError> {
    let absolute = if path.is_absolute() {
        path
    } else {
        std::env::current_dir().map_err(FileError::from)?.join(path)
    };

    let canonical = absolute
        .canonicalize()
        .map_err(|_| FileError::NotFound(absolute.display().to_string()))?;

    if canonical.is_dir() {
        return Err(FileError::IsDirectory(canonical.display().to_string()));
    }

    Ok(canonical)
}

fn store_current_path(state: &State<FileState>, resolved: PathBuf) -> Result<(), FileError> {
    let mut guard = state
        .current_path
        .lock()
        .map_err(|_| FileError::StateUnavailable)?;
    *guard = Some(resolved);
    Ok(())
}

fn load_file(target: PathBuf) -> Result<(OpenedFile, PathBuf), FileError> {
    let resolved = resolve_existing(target)?;
    let data = fs::read(&resolved).map_err(FileError::from)?;

    if data.len() > MAX_FILE_SIZE_BYTES {
        return Err(FileError::TooLarge(data.len()));
    }

    let content = String::from_utf8(data).map_err(|_| FileError::InvalidEncoding)?;
    let is_markdown = match resolved.extension().and_then(|ext| ext.to_str()) {
        Some(ext) => matches!(
            ext.to_ascii_lowercase().as_str(),
            "md" | "markdown" | "mdown" | "mkdn" | "mkd"
        ),
        None => false,
    };

    Ok((
        OpenedFile {
            path: resolved.display().to_string(),
            content,
            is_markdown,
        },
        resolved,
    ))
}

fn write_file_contents(target: &Path, contents: &str, allow_create: bool) -> Result<(), FileError> {
    if !allow_create && !target.exists() {
        return Err(FileError::NotFound(target.display().to_string()));
    }

    let temp_path = target.with_extension(TEMP_EXTENSION);
    let mut temp_file = fs::File::create(&temp_path).map_err(FileError::from)?;
    temp_file
        .write_all(contents.as_bytes())
        .map_err(|err| FileError::WriteFailed(err.to_string()))?;
    temp_file
        .sync_all()
        .map_err(|err| FileError::WriteFailed(err.to_string()))?;
    fs::rename(&temp_path, target).map_err(|err| FileError::WriteFailed(err.to_string()))?;

    Ok(())
}

#[tauri::command]
fn open_file(path: String, state: State<FileState>) -> Result<OpenedFile, FileError> {
    let (file, resolved) = load_file(PathBuf::from(path))?;
    store_current_path(&state, resolved)?;
    Ok(file)
}

#[tauri::command]
fn save_file(contents: String, state: State<FileState>) -> Result<SaveResult, FileError> {
    let path = {
        let guard = state
            .current_path
            .lock()
            .map_err(|_| FileError::StateUnavailable)?;
        guard.clone().ok_or(FileError::NoTrackedFile)?
    };

    write_file_contents(&path, &contents, false)?;

    Ok(SaveResult {
        path: path.display().to_string(),
    })
}

#[tauri::command]
fn save_file_as(
    path: String,
    contents: String,
    state: State<FileState>,
) -> Result<SaveResult, FileError> {
    let resolved = if Path::new(&path).is_absolute() {
        PathBuf::from(path)
    } else {
        std::env::current_dir().map_err(FileError::from)?.join(path)
    };

    write_file_contents(&resolved, &contents, true)?;

    let canonical = resolved
        .canonicalize()
        .map_err(|_| FileError::NotFound(resolved.display().to_string()))?;
    store_current_path(&state, canonical.clone())?;

    Ok(SaveResult {
        path: canonical.display().to_string(),
    })
}

#[tauri::command]
fn initial_file(state: State<FileState>) -> Result<Option<OpenedFile>, FileError> {
    let pending = {
        let mut guard = state
            .pending_initial
            .lock()
            .map_err(|_| FileError::StateUnavailable)?;
        guard.take()
    };

    match pending {
        Some(path) => {
            let (file, resolved) = load_file(path)?;
            store_current_path(&state, resolved)?;
            Ok(Some(file))
        }
        None => Ok(None),
    }
}

#[tauri::command]
fn mark_frontend_ready(state: State<StartupState>) -> u128 {
    state.started_at.elapsed().as_millis()
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let startup_state = StartupState {
        started_at: Instant::now(),
    };

    let initial_path = parse_initial_path_argument().and_then(|path| resolve_existing(path).ok());

    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(FileState {
            current_path: Mutex::new(None),
            pending_initial: Mutex::new(initial_path),
        })
        .manage(startup_state)
        .invoke_handler(tauri::generate_handler![
            open_file,
            save_file,
            save_file_as,
            initial_file,
            mark_frontend_ready
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn temp_path(name: &str) -> PathBuf {
        let mut path = std::env::temp_dir();
        let pid = std::process::id();
        let base = Path::new(name);
        let file_name = match (base.file_stem(), base.extension()) {
            (Some(stem), Some(ext)) => format!(
                "{}-{}.{}",
                stem.to_string_lossy(),
                pid,
                ext.to_string_lossy()
            ),
            (Some(stem), None) => format!("{}-{}", stem.to_string_lossy(), pid),
            _ => format!("{name}-{pid}"),
        };
        path.push(file_name);
        path
    }

    #[test]
    fn resolves_existing_path_and_rejects_missing() {
        let path = temp_path("lmd-open");
        fs::write(&path, "hello").expect("create temp file");

        let resolved = resolve_existing(path.clone()).expect("resolve existing");
        assert!(resolved.is_absolute());
        assert!(resolved.exists());

        let missing = temp_path("lmd-missing");
        let missing_result = resolve_existing(missing);
        assert!(matches!(missing_result, Err(FileError::NotFound(_))));

        let _ = fs::remove_file(path);
    }

    #[test]
    fn load_file_sets_markdown_flag() {
        let path = temp_path("lmd-markdown.md");
        fs::write(&path, "# Title\n\nDetails").expect("write md file");

        let (file, resolved) = load_file(path.clone()).expect("load file");
        assert_eq!(resolved, path.canonicalize().unwrap());
        assert!(file.is_markdown);
        assert!(file.content.contains("Title"));

        let _ = fs::remove_file(path);
    }

    #[test]
    fn write_file_replaces_content() {
        let path = temp_path("lmd-write.txt");
        fs::write(&path, "first").expect("seed file");

        write_file_contents(&path, "second line", false).expect("write content");
        let saved = fs::read_to_string(&path).expect("read content");
        assert_eq!(saved, "second line");
        assert!(
            !path.with_extension(TEMP_EXTENSION).exists(),
            "temp file should be cleaned up"
        );

        let _ = fs::remove_file(path);
    }

    #[test]
    fn write_file_allows_creation_when_enabled() {
        let path = temp_path("lmd-new-file.md");
        let _ = fs::remove_file(&path);

        write_file_contents(&path, "# New file", true).expect("write new file");
        let saved = fs::read_to_string(&path).expect("read new file");
        assert_eq!(saved, "# New file");

        let _ = fs::remove_file(path);
    }

    #[test]
    fn write_file_rejects_missing_path_when_disallowed() {
        let path = temp_path("lmd-missing-write.txt");
        let _ = fs::remove_file(&path);

        let result = write_file_contents(&path, "data", false);
        assert!(matches!(result, Err(FileError::NotFound(_))));
    }

    #[test]
    fn parses_initial_argument() {
        let args = vec![
            "app".to_string(),
            "--file".to_string(),
            "/tmp/demo.md".to_string(),
        ];
        let parsed = parse_initial_path_argument_from(args.into_iter().skip(1));
        assert_eq!(parsed, Some(PathBuf::from("/tmp/demo.md")));

        let alt = vec!["app".to_string(), "./notes.md".to_string()];
        let alt_parsed = parse_initial_path_argument_from(alt.into_iter().skip(1));
        assert_eq!(alt_parsed, Some(PathBuf::from("./notes.md")));
    }
}
