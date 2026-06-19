use std::path::{Path, PathBuf};

use serde::Serialize;

const CONTENT_SUFFIX: [&str; 5] = ["TMP3", "Content", "TMP3", "LooseData", "Content"];

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct SteamInstall {
    pub content_path: String,
    pub edition: String,
    pub label: String,
    pub game_folder: String,
}

struct GameInstall {
    folder: &'static str,
    edition: &'static str,
    label: &'static str,
}

const GAME_INSTALLS: [GameInstall; 1] = [GameInstall {
    folder: "Trivia Murder Party 3 Demo",
    edition: "demo",
    label: "Demo",
}];

fn path_exists(path: &Path) -> bool {
    path.exists()
}

fn is_valid_content_path(content_path: &Path) -> bool {
    path_exists(&content_path.join("TMP3TriviaQuestion.json"))
        && path_exists(&content_path.join("TMP3FinalRoundGrouping.json"))
}

fn steam_library_paths() -> Vec<PathBuf> {
    let mut libraries = Vec::new();
    let default_roots = [
        PathBuf::from(r"C:\Program Files (x86)\Steam"),
        PathBuf::from(r"C:\Program Files\Steam"),
        std::env::var("LOCALAPPDATA")
            .map(PathBuf::from)
            .unwrap_or_default()
            .join("Steam"),
    ];

    for root in default_roots {
        if root.as_os_str().is_empty() || !root.exists() {
            continue;
        }
        libraries.push(root.clone());

        let vdf_path = root.join("steamapps").join("libraryfolders.vdf");
        let Ok(raw) = std::fs::read_to_string(&vdf_path) else {
            continue;
        };

        for line in raw.lines() {
            let trimmed = line.trim();
            if let Some(rest) = trimmed.strip_prefix("\"path\"") {
                if let Some(start) = rest.find('"') {
                    let rest = &rest[start + 1..];
                    if let Some(end) = rest.find('"') {
                        let path = rest[..end].replace("\\\\", "\\");
                        libraries.push(PathBuf::from(path));
                    }
                }
            }
        }
    }

    libraries
}

pub fn find_steam_installs() -> Vec<SteamInstall> {
    let mut found = Vec::new();

    for library in steam_library_paths() {
        let common_root = library.join("steamapps").join("common");
        if !common_root.exists() {
            continue;
        }

        for game in &GAME_INSTALLS {
            let mut content_path = common_root.join(game.folder);
            for part in CONTENT_SUFFIX {
                content_path.push(part);
            }

            if !is_valid_content_path(&content_path) {
                continue;
            }

            found.push(SteamInstall {
                content_path: content_path.to_string_lossy().into_owned(),
                edition: game.edition.to_string(),
                label: game.label.to_string(),
                game_folder: game.folder.to_string(),
            });
        }
    }

    let mut unique = Vec::new();
    let mut seen = std::collections::HashSet::new();
    for item in found {
        let key = item.content_path.to_lowercase();
        if seen.insert(key) {
            unique.push(item);
        }
    }

    unique.sort_by(|a, b| {
        if a.edition == b.edition {
            a.label.cmp(&b.label)
        } else if a.edition == "full" {
            std::cmp::Ordering::Less
        } else {
            std::cmp::Ordering::Greater
        }
    });

    unique
}

pub fn get_best_steam_path() -> Option<String> {
    find_steam_installs()
        .into_iter()
        .next()
        .map(|item| item.content_path)
}
