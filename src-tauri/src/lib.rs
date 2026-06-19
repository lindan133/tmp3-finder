mod data;
mod hotkey;
mod steam;

use std::sync::Mutex;
use std::time::{Duration, Instant};

use data::{AppConfig, AppSettings, DataService, PathCheckResult, StaleResult, DEFAULT_HOTKEY};
use serde_json::Value;
use steam::find_steam_installs;
use tauri::{
    AppHandle, Emitter, Manager, State, WebviewWindow,
};
use tauri_plugin_global_shortcut::{GlobalShortcutExt, ShortcutState};
use tauri_plugin_dialog::DialogExt;

struct AppState {
    data: DataService,
    hotkey: Mutex<String>,
    resize_debounce: Mutex<Option<Instant>>,
}

fn toggle_main_window(app: &AppHandle) {
    let Some(window) = app.get_webview_window("main") else {
        return;
    };

    let visible = window.is_visible().unwrap_or(false);
    let focused = window.is_focused().unwrap_or(false);

    if visible && focused {
        let _ = window.hide();
        return;
    }

    let _ = window.show();
    let _ = window.unminimize();
    let _ = window.set_focus();
    let _ = window.emit("focus-search", ());
}

fn apply_window_settings(window: &WebviewWindow, settings: &AppSettings) {
    let _ = window.set_always_on_top(settings.always_on_top);

    if let (Some(width), Some(height)) = (settings.window_width, settings.window_height) {
        let _ = window.set_size(tauri::Size::Logical(tauri::LogicalSize {
            width: width as f64,
            height: height as f64,
        }));
    }
}

fn register_hotkey(app: &AppHandle, accel: &str) -> Result<(), String> {
    let shortcut = hotkey::parse_hotkey(accel).ok_or_else(|| "Invalid hotkey".to_string())?;
    app.global_shortcut()
        .register(shortcut)
        .map_err(|e| e.to_string())
}

fn unregister_hotkey(app: &AppHandle, accel: &str) {
    if let Some(shortcut) = hotkey::parse_hotkey(accel) {
        let _ = app.global_shortcut().unregister(shortcut);
    }
}

fn schedule_resize_save(app: AppHandle, state: &AppState) {
    let mut debounce = state.resize_debounce.lock().unwrap();
    *debounce = Some(Instant::now());
    drop(debounce);

    let app_handle = app.clone();
    tauri::async_runtime::spawn(async move {
        tokio::time::sleep(Duration::from_millis(500)).await;
        let Some(state_ptr) = app_handle.try_state::<AppState>() else {
            return;
        };
        let should_save = {
            let debounce = state_ptr.resize_debounce.lock().unwrap();
            debounce
                .map(|started| started.elapsed() >= Duration::from_millis(500))
                .unwrap_or(false)
        };
        if !should_save {
            return;
        }

        let Some(window) = app_handle.get_webview_window("main") else {
            return;
        };
        let Ok(size) = window.inner_size() else {
            return;
        };
        let Ok(scale) = window.scale_factor() else {
            return;
        };

        let width = (size.width as f64 / scale).round() as u32;
        let height = (size.height as f64 / scale).round() as u32;
        let _ = state_ptr.data.save_settings(&serde_json::json!({
            "windowWidth": width,
            "windowHeight": height,
        }));
    });
}

#[tauri::command]
async fn get_config(state: State<'_, AppState>) -> Result<AppConfig, String> {
    state.data.load_config().await
}

#[tauri::command]
fn get_settings(state: State<'_, AppState>) -> AppSettings {
    state.data.load_settings()
}

#[tauri::command]
async fn save_settings(
    partial: Value,
    state: State<'_, AppState>,
    app: AppHandle,
) -> Result<Value, String> {
    let previous = state.data.load_settings();
    let hotkey_changed = partial
        .get("hotkey")
        .and_then(|v| v.as_str())
        .is_some();

    if hotkey_changed {
        let next_hotkey = partial
            .get("hotkey")
            .and_then(|v| v.as_str())
            .unwrap_or(DEFAULT_HOTKEY);
        unregister_hotkey(&app, state.hotkey.lock().unwrap().as_str());
        if register_hotkey(&app, next_hotkey).is_err() {
            let _ = register_hotkey(&app, &previous.hotkey);
            let restored = state
                .data
                .save_settings(&serde_json::json!({ "hotkey": previous.hotkey }))?;
            let mut value = serde_json::to_value(restored).map_err(|e| e.to_string())?;
            if let Some(obj) = value.as_object_mut() {
                obj.insert("hotkeyAssignFailed".to_string(), Value::Bool(true));
            }
            return Ok(value);
        }
        *state.hotkey.lock().unwrap() = next_hotkey.to_string();
    }

    let settings = state.data.save_settings(&partial)?;

    if let Some(window) = app.get_webview_window("main") {
        apply_window_settings(&window, &settings);
    }

    let _ = app.emit("settings-changed", &settings);
    Ok(serde_json::to_value(settings).map_err(|e| e.to_string())?)
}

#[tauri::command]
fn check_path(content_path: String, state: State<'_, AppState>) -> PathCheckResult {
    state.data.inspect_path(&content_path)
}

#[tauri::command]
async fn load_data(
    content_path: Option<String>,
    force_refresh: Option<bool>,
    state: State<'_, AppState>,
) -> Result<Value, String> {
    state
        .data
        .load_data(content_path, force_refresh.unwrap_or(false))
        .await
}

#[tauri::command]
fn check_database_stale(
    content_path: String,
    loaded_fingerprint: Option<String>,
    state: State<'_, AppState>,
) -> Result<StaleResult, String> {
    state
        .data
        .check_database_stale(&content_path, loaded_fingerprint.as_deref())
}

#[tauri::command]
fn get_steam_installs() -> Vec<steam::SteamInstall> {
    find_steam_installs()
}

#[tauri::command]
async fn pick_folder(app: AppHandle, language: Option<String>) -> Result<Option<String>, String> {
    let title = if language.as_deref() == Some("ru") {
        "Выберите папку Content"
    } else {
        "Select Content folder"
    };

    Ok(app
        .dialog()
        .file()
        .set_title(title)
        .blocking_pick_folder()
        .map(|path| path.to_string()))
}

#[tauri::command]
async fn open_external(url: String) -> Result<(), String> {
    if url.starts_with("http://") || url.starts_with("https://") {
        tauri_plugin_opener::open_url(&url, None::<&str>).map_err(|e| e.to_string())?;
        Ok(())
    } else {
        Err("Unsupported URL".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .plugin(
            tauri_plugin_global_shortcut::Builder::new()
                .with_handler(|app, _shortcut, event| {
                    if event.state == ShortcutState::Pressed {
                        toggle_main_window(app);
                    }
                })
                .build(),
        )
        .setup(|app| {
            if cfg!(debug_assertions) {
                app.handle().plugin(
                    tauri_plugin_log::Builder::default()
                        .level(log::LevelFilter::Info)
                        .build(),
                )?;
            }

            let config_dir = app
                .path()
                .app_config_dir()
                .map_err(|e| e.to_string())?;
            let cache_dir = app.path().app_cache_dir().map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&config_dir).map_err(|e| e.to_string())?;
            std::fs::create_dir_all(&cache_dir).map_err(|e| e.to_string())?;

            let data = DataService::new(config_dir.join("config.json"), cache_dir.join("cache"));
            let settings = data.load_settings();
            let hotkey = settings.hotkey.clone();

            app.manage(AppState {
                data,
                hotkey: Mutex::new(hotkey.clone()),
                resize_debounce: Mutex::new(None),
            });

            let app_handle = app.handle().clone();
            if let Some(window) = app.get_webview_window("main") {
                apply_window_settings(&window, &settings);

                let resize_app = app_handle.clone();
                window.on_window_event(move |event| {
                    if let tauri::WindowEvent::Resized(_) = event {
                        if let Some(state) = resize_app.try_state::<AppState>() {
                            schedule_resize_save(resize_app.clone(), &state);
                        }
                    }
                    if let tauri::WindowEvent::Focused(true) = event {
                        let _ = resize_app.emit("window-focus", ());
                    }
                });
            }

            if let Err(err) = register_hotkey(app.handle(), &hotkey) {
                log::warn!("Failed to register global hotkey: {err}");
            }
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            get_config,
            get_settings,
            save_settings,
            check_path,
            load_data,
            check_database_stale,
            get_steam_installs,
            pick_folder,
            open_external,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
