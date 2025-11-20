use std::{
    env,
    path::{Path, PathBuf},
    process::Command,
};

fn main() {
    if let Err(error) = run_cli() {
        eprintln!("lmd: {error}");
        std::process::exit(1);
    }
}

fn run_cli() -> Result<(), String> {
    let raw_path = env::args()
        .nth(1)
        .ok_or_else(|| "Usage: lmd <path>".to_string())?;

    let target = validate_target(&raw_path)?;
    let app_binary = locate_app_binary()?;

    let status = Command::new(app_binary)
        .arg("--file")
        .arg(target.as_os_str())
        .status()
        .map_err(|err| format!("Failed to launch LiteMD: {err}"))?;

    if !status.success() {
        return Err(format!(
            "LiteMD exited with status code {:?}",
            status.code()
        ));
    }

    Ok(())
}

fn validate_target(raw_path: &str) -> Result<PathBuf, String> {
    let resolved = resolve_to_absolute(raw_path)?;

    if !resolved.exists() {
        return Err(format!("File not found: {}", resolved.display()));
    }

    let canonical = resolved
        .canonicalize()
        .map_err(|err| format!("Unable to read path: {err}"))?;

    if canonical.is_dir() {
        return Err(format!("Path is a directory: {}", canonical.display()));
    }

    Ok(canonical)
}

fn resolve_to_absolute(raw_path: &str) -> Result<PathBuf, String> {
    let path = PathBuf::from(raw_path);
    if path.is_absolute() {
        return Ok(path);
    }

    let cwd =
        env::current_dir().map_err(|err| format!("Unable to read cwd: {err}"))?;
    Ok(cwd.join(path))
}

fn locate_app_binary() -> Result<PathBuf, String> {
    let exe = env::current_exe()
        .map_err(|err| format!("Unable to locate CLI binary: {err}"))?;

    let parent = exe
        .parent()
        .ok_or_else(|| "Unable to locate LiteMD binary near CLI".to_string())?;

    let binary_name = format!("litemd{}", std::env::consts::EXE_SUFFIX);
    Ok(parent.join(binary_name))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs;

    fn create_temp_file(name: &str) -> PathBuf {
        let mut path = env::temp_dir();
        path.push(format!("{}_{}", name, std::process::id()));
        fs::write(&path, "test").expect("create temp file");
        path
    }

    #[test]
    fn resolves_relative_paths() {
        let temp_file = create_temp_file("lmd-relative.md");
        let temp_dir = temp_file.parent().unwrap().to_path_buf();
        let cwd = env::current_dir().expect("read cwd");
        env::set_current_dir(&temp_dir).expect("set cwd");

        let resolved = resolve_to_absolute(
            temp_file.file_name().unwrap().to_str().unwrap(),
        )
        .expect("resolve");
        assert_eq!(resolved.canonicalize().unwrap(), temp_file.canonicalize().unwrap());

        env::set_current_dir(cwd).expect("restore cwd");
        let _ = fs::remove_file(temp_file);
    }

    #[test]
    fn errors_on_missing_file() {
        let missing = "lmd-does-not-exist.txt";
        let result = validate_target(missing);
        assert!(result.is_err());
        assert!(result
            .unwrap_err()
            .contains("File not found"));
    }

    #[test]
    fn locates_companion_binary_name() {
        let candidate = locate_app_binary().expect("locate binary");
        let file_name = candidate.file_name().unwrap().to_string_lossy();
        assert!(file_name.starts_with("litemd"));
    }
}
