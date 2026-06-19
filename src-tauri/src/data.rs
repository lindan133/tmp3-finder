use std::path::{Path, PathBuf};

use chrono::Utc;
use serde::{Deserialize, Serialize};
use serde_json::Value;
use sha2::{Digest, Sha256};

use crate::steam::get_best_steam_path;

pub const DEFAULT_CONTENT_PATH: &str = r"C:\Program Files (x86)\Steam\steamapps\common\Trivia Murder Party 3 Demo\TMP3\Content\TMP3\LooseData\Content";
pub const DEFAULT_HOTKEY: &str = "CommandOrControl+Shift+F";

const DATA_FILES: [&str; 4] = [
    "TMP3TriviaQuestion.json",
    "TMP3FinalRoundGrouping.json",
    "TMP3SubjectiveQuestion.json",
    "VO.json",
];

const REQUIRED_FILES: [&str; 2] = [
    "TMP3TriviaQuestion.json",
    "TMP3FinalRoundGrouping.json",
];

const OPTIONAL_FILES: [&str; 2] = [
    "TMP3SubjectiveQuestion.json",
    "VO.json",
];

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub content_path: String,
    pub always_on_top: bool,
    pub sound_on_match: bool,
    pub auto_copy_on_match: bool,
    pub theme: String,
    pub hotkey: String,
    pub language: String,
    pub onboarding_complete: bool,
    #[serde(default)]
    pub last_mode: Option<String>,
    #[serde(default = "default_copy_format")]
    pub copy_format: String,
    #[serde(default = "default_trivia_difficulty")]
    pub trivia_difficulty_filter: String,
    #[serde(default)]
    pub minimize_to_tray: bool,
    #[serde(default)]
    pub start_with_windows: bool,
    #[serde(default = "default_window_opacity")]
    pub window_opacity: u8,
    #[serde(default = "default_true")]
    pub vo_copy_full_line: bool,
    #[serde(default = "default_true")]
    pub auto_check_updates: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window_width: Option<u32>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub window_height: Option<u32>,
}

fn default_copy_format() -> String {
    "answerOnly".to_string()
}

fn default_trivia_difficulty() -> String {
    "all".to_string()
}

fn default_window_opacity() -> u8 {
    100
}

fn default_true() -> bool {
    true
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            content_path: DEFAULT_CONTENT_PATH.to_string(),
            always_on_top: false,
            sound_on_match: true,
            auto_copy_on_match: false,
            theme: "dark".to_string(),
            hotkey: DEFAULT_HOTKEY.to_string(),
            language: "en".to_string(),
            onboarding_complete: false,
            last_mode: None,
            copy_format: default_copy_format(),
            trivia_difficulty_filter: default_trivia_difficulty(),
            minimize_to_tray: false,
            start_with_windows: false,
            window_opacity: default_window_opacity(),
            vo_copy_full_line: true,
            auto_check_updates: true,
            window_width: None,
            window_height: None,
        }
    }
}

#[derive(Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct PathFiles {
    pub trivia: bool,
    pub final_round: bool,
    pub subjective: bool,
    pub vo: bool,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PathCheckResult {
    pub ok: bool,
    pub content_path: String,
    pub files: PathFiles,
    pub missing_required: Vec<String>,
    pub missing_optional: Vec<String>,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppConfig {
    pub content_path: String,
    pub default_path: String,
    pub settings: AppSettings,
}

#[derive(Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct StaleResult {
    pub stale: bool,
    pub fingerprint: Option<String>,
}

pub struct DataService {
    config_path: PathBuf,
    cache_dir: PathBuf,
}

impl DataService {
    pub fn new(config_path: PathBuf, cache_dir: PathBuf) -> Self {
        Self {
            config_path,
            cache_dir,
        }
    }

    pub fn load_settings(&self) -> AppSettings {
        let Ok(raw) = std::fs::read_to_string(&self.config_path) else {
            return AppSettings::default();
        };

        let Ok(value) = serde_json::from_str::<Value>(&raw) else {
            return AppSettings::default();
        };

        let mut settings: AppSettings = serde_json::from_value(value.clone()).unwrap_or_default();
        settings.onboarding_complete = if value.get("onboardingComplete").is_some() {
            value
                .get("onboardingComplete")
                .and_then(|v| v.as_bool())
                .unwrap_or(false)
        } else {
            true
        };
        if settings.hotkey.trim().is_empty() {
            settings.hotkey = DEFAULT_HOTKEY.to_string();
        }
        if settings.language.trim().is_empty() {
            settings.language = "en".to_string();
        }
        settings.window_opacity = settings.window_opacity.clamp(70, 100);
        if settings.copy_format.trim().is_empty() {
            settings.copy_format = default_copy_format();
        }
        if settings.trivia_difficulty_filter.trim().is_empty() {
            settings.trivia_difficulty_filter = default_trivia_difficulty();
        }
        settings
    }

    pub fn save_settings(&self, partial: &Value) -> Result<AppSettings, String> {
        let current = self.load_settings();
        let mut merged = serde_json::to_value(current).map_err(|e| e.to_string())?;
        merge_json(&mut merged, partial);
        let settings: AppSettings = serde_json::from_value(merged).map_err(|e| e.to_string())?;

        if let Some(parent) = self.config_path.parent() {
            std::fs::create_dir_all(parent).map_err(|e| e.to_string())?;
        }
        let json = serde_json::to_string_pretty(&settings).map_err(|e| e.to_string())?;
        std::fs::write(&self.config_path, json).map_err(|e| e.to_string())?;
        Ok(settings)
    }

    pub async fn load_config(&self) -> Result<AppConfig, String> {
        let mut settings = self.load_settings();
        if !self.check_path(&settings.content_path) {
            if let Some(best) = get_best_steam_path() {
                settings.content_path = best;
            }
        }

        Ok(AppConfig {
            content_path: settings.content_path.clone(),
            default_path: get_best_steam_path().unwrap_or_else(|| DEFAULT_CONTENT_PATH.to_string()),
            settings,
        })
    }

    pub fn inspect_path(&self, content_path: &str) -> PathCheckResult {
        let path = PathBuf::from(content_path);
        let files = PathFiles {
            trivia: file_exists(&path, "TMP3TriviaQuestion.json"),
            final_round: file_exists(&path, "TMP3FinalRoundGrouping.json"),
            subjective: file_exists(&path, "TMP3SubjectiveQuestion.json"),
            vo: file_exists(&path, "VO.json"),
        };

        let missing_required = REQUIRED_FILES
            .iter()
            .filter(|name| {
                !match **name {
                    "TMP3TriviaQuestion.json" => files.trivia,
                    "TMP3FinalRoundGrouping.json" => files.final_round,
                    _ => false,
                }
            })
            .map(|s| s.to_string())
            .collect();

        let missing_optional = OPTIONAL_FILES
            .iter()
            .filter(|name| {
                !match **name {
                    "TMP3SubjectiveQuestion.json" => files.subjective,
                    "VO.json" => files.vo,
                    _ => false,
                }
            })
            .map(|s| s.to_string())
            .collect();

        PathCheckResult {
            ok: files.trivia && files.final_round,
            content_path: content_path.to_string(),
            files,
            missing_required,
            missing_optional,
        }
    }

    pub fn check_path(&self, content_path: &str) -> bool {
        self.inspect_path(content_path).ok
    }

    pub async fn load_data(
        &self,
        content_path: Option<String>,
        force_refresh: bool,
    ) -> Result<Value, String> {
        let settings = self.load_settings();
        let language = settings.language.as_str();
        let path = content_path.unwrap_or(settings.content_path);
        let inspection = self.inspect_path(&path);

        if !inspection.ok {
            return Err(warn_text(
                language,
                "missingRequired",
                &inspection.missing_required.join(", "),
            ));
        }

        let fingerprint = self.build_fingerprint(&path)?;

        if force_refresh {
            self.clear_cache(&path);
        } else if let Some(cached) = self.read_cache(&path, &fingerprint)? {
            let mut data = cached;
            if let Some(load_info) = data.get_mut("loadInfo").and_then(|v| v.as_object_mut()) {
                load_info.insert(
                    "loadedAt".to_string(),
                    Value::String(Utc::now().to_rfc3339()),
                );
                load_info.insert("fromCache".to_string(), Value::Bool(true));
                load_info.insert(
                    "fingerprint".to_string(),
                    Value::String(fingerprint.clone()),
                );
            }
            return Ok(data);
        }

        let mut data = self.load_data_from_disk(&path, &inspection, language)?;
        if let Some(load_info) = data.get_mut("loadInfo").and_then(|v| v.as_object_mut()) {
            load_info.insert(
                "fingerprint".to_string(),
                Value::String(fingerprint.clone()),
            );
        }
        self.write_cache(&path, &fingerprint, &data)?;
        Ok(data)
    }

    pub fn check_database_stale(
        &self,
        content_path: &str,
        loaded_fingerprint: Option<&str>,
    ) -> Result<StaleResult, String> {
        let Some(loaded) = loaded_fingerprint else {
            return Ok(StaleResult {
                stale: false,
                fingerprint: None,
            });
        };

        let settings = self.load_settings();
        let path = if content_path.is_empty() {
            settings.content_path
        } else {
            content_path.to_string()
        };
        let fingerprint = self.build_fingerprint(&path)?;
        Ok(StaleResult {
            stale: fingerprint != loaded,
            fingerprint: Some(fingerprint),
        })
    }

    fn load_data_from_disk(
        &self,
        path: &str,
        inspection: &PathCheckResult,
        language: &str,
    ) -> Result<Value, String> {
        let mut warnings = Vec::new();
        let base = PathBuf::from(path);

        let trivia_raw = read_json_file(&base.join("TMP3TriviaQuestion.json"))?;
        let final_raw = read_json_file(&base.join("TMP3FinalRoundGrouping.json"))?;
        let subjective_result =
            load_optional_json(&base, "TMP3SubjectiveQuestion.json", language, true);
        let vo_result = load_optional_json(&base, "VO.json", language, false);

        let trivia = sanitize_trivia(content_array(&trivia_raw, "TMP3TriviaQuestion.json")?);
        let final_round =
            sanitize_final_round(content_array(&final_raw, "TMP3FinalRoundGrouping.json")?);

        if trivia.is_empty() {
            return Err(warn_text(language, "invalidTrivia", ""));
        }
        if final_round.is_empty() {
            return Err(warn_text(language, "invalidFinalRound", ""));
        }

        if let Some(w) = subjective_result.warning {
            warnings.push(w);
        }
        if let Some(w) = vo_result.warning {
            warnings.push(w);
        }
        if !inspection.files.subjective {
            warnings.push(warn_text(
                language,
                "optionalMissing",
                "TMP3SubjectiveQuestion.json",
            ));
        }
        if !inspection.files.vo {
            warnings.push(warn_text(
                language,
                "optionalMissing",
                "VO.json",
            ));
        }

        let edition = if path.to_lowercase().contains("demo") {
            "demo"
        } else {
            "full"
        };

        Ok(serde_json::json!({
            "trivia": trivia,
            "finalRound": final_round,
            "subjective": subjective_result.items,
            "vo": vo_result.items,
            "counts": {
                "trivia": trivia.len(),
                "finalRound": final_round.len(),
                "subjective": subjective_result.items.len(),
                "vo": vo_result.items.len(),
            },
            "loadInfo": {
                "files": inspection.files,
                "warnings": warnings,
                "loadedAt": Utc::now().to_rfc3339(),
                "edition": edition,
                "fromCache": false,
            }
        }))
    }

    fn build_fingerprint(&self, content_path: &str) -> Result<String, String> {
        let base = PathBuf::from(content_path);
        let mut parts = Vec::new();
        for filename in DATA_FILES {
            let file_path = base.join(filename);
            match std::fs::metadata(&file_path) {
                Ok(meta) => {
                    parts.push(format!(
                        "{}:{}:{}",
                        filename,
                        meta.modified()
                            .ok()
                            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                            .map(|d| d.as_millis())
                            .unwrap_or(0),
                        meta.len()
                    ));
                }
                Err(_) => parts.push(format!("{filename}:missing")),
            }
        }
        Ok(parts.join("|"))
    }

    fn cache_paths(&self, content_path: &str) -> (PathBuf, PathBuf) {
        let id = cache_id(content_path);
        (
            self.cache_dir.join(format!("{id}.json")),
            self.cache_dir.join(format!("{id}.meta.json")),
        )
    }

    fn read_cache(&self, content_path: &str, fingerprint: &str) -> Result<Option<Value>, String> {
        let (data_path, meta_path) = self.cache_paths(content_path);
        let meta_raw = match std::fs::read_to_string(meta_path) {
            Ok(raw) => raw,
            Err(_) => return Ok(None),
        };
        let meta: Value = serde_json::from_str(&meta_raw).map_err(|e| e.to_string())?;
        if meta.get("fingerprint").and_then(|v| v.as_str()) != Some(fingerprint) {
            return Ok(None);
        }
        let data_raw = match std::fs::read_to_string(data_path) {
            Ok(raw) => raw,
            Err(_) => return Ok(None),
        };
        let data: Value = serde_json::from_str(&data_raw).map_err(|e| e.to_string())?;
        Ok(Some(data))
    }

    fn write_cache(&self, content_path: &str, fingerprint: &str, data: &Value) -> Result<(), String> {
        std::fs::create_dir_all(&self.cache_dir).map_err(|e| e.to_string())?;
        let (data_path, meta_path) = self.cache_paths(content_path);
        std::fs::write(
            &data_path,
            serde_json::to_string(data).map_err(|e| e.to_string())?,
        )
        .map_err(|e| e.to_string())?;
        std::fs::write(
            &meta_path,
            serde_json::json!({
                "fingerprint": fingerprint,
                "cachedAt": Utc::now().to_rfc3339(),
            })
            .to_string(),
        )
        .map_err(|e| e.to_string())?;
        Ok(())
    }

    fn clear_cache(&self, content_path: &str) {
        let (data_path, meta_path) = self.cache_paths(content_path);
        let _ = std::fs::remove_file(data_path);
        let _ = std::fs::remove_file(meta_path);
    }
}

struct OptionalLoad {
    items: Vec<Value>,
    warning: Option<String>,
}

fn merge_json(base: &mut Value, patch: &Value) {
    if let (Some(base_obj), Some(patch_obj)) = (base.as_object_mut(), patch.as_object()) {
        for (key, value) in patch_obj {
            base_obj.insert(key.clone(), value.clone());
        }
    }
}

fn cache_id(content_path: &str) -> String {
    let mut hasher = Sha256::new();
    hasher.update(content_path.to_lowercase().as_bytes());
    hex::encode(hasher.finalize())
}

fn file_exists(base: &Path, filename: &str) -> bool {
    base.join(filename).exists()
}

fn strip_bom(text: &str) -> &str {
    text.strip_prefix('\u{feff}').unwrap_or(text)
}

fn read_json_file(path: &Path) -> Result<Value, String> {
    let raw = std::fs::read_to_string(path).map_err(|e| e.to_string())?;
    serde_json::from_str(strip_bom(&raw))
        .map_err(|e| format!("{}: invalid JSON ({e})", path.display()))
}

fn content_array(value: &Value, label: &str) -> Result<Vec<Value>, String> {
    value
        .get("content")
        .and_then(|v| v.as_array())
        .cloned()
        .ok_or_else(|| format!("{label}: expected content array"))
}

fn load_optional_json(base: &Path, filename: &str, language: &str, subjective: bool) -> OptionalLoad {
    match read_json_file(&base.join(filename)) {
        Ok(raw) => match content_array(&raw, filename) {
            Ok(items) => {
                let sanitized = if subjective {
                    sanitize_subjective(items)
                } else {
                    sanitize_vo(items)
                };
                OptionalLoad {
                    items: sanitized,
                    warning: None,
                }
            }
            Err(message) => OptionalLoad {
                items: vec![],
                warning: Some(message),
            },
        },
        Err(err) => {
            if err.contains("os error 2") || err.contains("NotFound") || err.contains("cannot find")
            {
                OptionalLoad {
                    items: vec![],
                    warning: Some(warn_text(language, "fileNotFound", filename)),
                }
            } else {
                OptionalLoad {
                    items: vec![],
                    warning: Some(err),
                }
            }
        }
    }
}

fn sanitize_trivia(items: Vec<Value>) -> Vec<Value> {
    items
        .into_iter()
        .filter(|item| {
            item.get("id").and_then(|v| v.as_str()).is_some()
                && item.get("question").and_then(|v| v.as_str()).is_some()
        })
        .filter_map(|mut item| {
            let choices = item
                .get("choices")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter(|c| c.get("text").and_then(|v| v.as_str()).is_some())
                .collect::<Vec<_>>();
            if choices.is_empty() {
                return None;
            }
            if let Some(obj) = item.as_object_mut() {
                obj.insert("choices".to_string(), Value::Array(choices));
            }
            Some(item)
        })
        .collect()
}

fn sanitize_final_round(items: Vec<Value>) -> Vec<Value> {
    items
        .into_iter()
        .filter(|item| {
            item.get("id").and_then(|v| v.as_str()).is_some()
                && item.get("categoryName").and_then(|v| v.as_str()).is_some()
        })
        .filter_map(|mut item| {
            let choices = item
                .get("choices")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default();
            if choices.is_empty() {
                return None;
            }
            if let Some(obj) = item.as_object_mut() {
                obj.insert("choices".to_string(), Value::Array(choices));
            }
            Some(item)
        })
        .collect()
}

fn sanitize_subjective(items: Vec<Value>) -> Vec<Value> {
    items
        .into_iter()
        .filter(|item| {
            item.get("id").and_then(|v| v.as_str()).is_some()
                && item.get("question").and_then(|v| v.as_str()).is_some()
        })
        .filter_map(|mut item| {
            let choices = item
                .get("choices")
                .and_then(|v| v.as_array())
                .cloned()
                .unwrap_or_default()
                .into_iter()
                .filter(|c| c.get("text").and_then(|v| v.as_str()).is_some())
                .collect::<Vec<_>>();
            if choices.len() < 2 {
                return None;
            }
            if let Some(obj) = item.as_object_mut() {
                obj.insert("choices".to_string(), Value::Array(choices));
                if let Some(intro) = obj.get_mut("intro") {
                    if let Some(intro_obj) = intro.as_object_mut() {
                        if let Some(versions) = intro_obj.get_mut("versions") {
                            if let Some(arr) = versions.as_array_mut() {
                                *arr = arr
                                    .iter()
                                    .filter(|v| v.get("subtitle").and_then(|s| s.as_str()).is_some())
                                    .cloned()
                                    .collect();
                            }
                        }
                    }
                }
            }
            Some(item)
        })
        .collect()
}

fn sanitize_vo(items: Vec<Value>) -> Vec<Value> {
    items
        .into_iter()
        .filter(|item| {
            item.get("id").and_then(|v| v.as_str()).is_some()
                && item.get("name").and_then(|v| v.as_str()).is_some()
        })
        .map(|mut item| {
            if let Some(obj) = item.as_object_mut() {
                if let Some(audio) = obj.get_mut("audio") {
                    if let Some(audio_obj) = audio.as_object_mut() {
                        if let Some(versions) = audio_obj.get_mut("versions") {
                            if let Some(arr) = versions.as_array_mut() {
                                *arr = arr
                                    .iter()
                                    .filter(|v| {
                                        v.get("subtitle").and_then(|s| s.as_str()).is_some()
                                            || v.get("file").and_then(|s| s.as_str()).is_some()
                                    })
                                    .cloned()
                                    .collect();
                            }
                        }
                    }
                }
            }
            item
        })
        .collect()
}

fn warn_text(language: &str, key: &str, arg: &str) -> String {
    let ru = language == "ru";
    match key {
        "fileNotFound" if ru => format!("{arg} не найден"),
        "fileNotFound" => format!("{arg} not found"),
        "optionalMissing" if ru => format!("{arg} не найден (опционально)"),
        "optionalMissing" => format!("{arg} not found (optional)"),
        "invalidTrivia" if ru => "TMP3TriviaQuestion.json не содержит валидных вопросов".to_string(),
        "invalidTrivia" => "TMP3TriviaQuestion.json contains no valid questions".to_string(),
        "invalidFinalRound" if ru => {
            "TMP3FinalRoundGrouping.json не содержит валидных категорий".to_string()
        }
        "invalidFinalRound" => {
            "TMP3FinalRoundGrouping.json contains no valid categories".to_string()
        }
        "missingRequired" if ru => format!("Не найдены обязательные файлы: {arg}"),
        "missingRequired" => format!("Required files missing: {arg}"),
        _ => key.to_string(),
    }
}
