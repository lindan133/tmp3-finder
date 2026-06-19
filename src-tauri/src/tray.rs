use tauri::menu::{Menu, MenuItem};
use tauri::tray::{MouseButton, MouseButtonState, TrayIconBuilder, TrayIconEvent};
use tauri::{AppHandle, Manager, Wry};

pub const TRAY_ID: &str = "main-tray";

struct TrayLabels {
    show: &'static str,
    quit: &'static str,
    tooltip: &'static str,
}

fn labels(language: &str) -> TrayLabels {
    if language == "ru" {
        TrayLabels {
            show: "Показать Finder",
            quit: "Выход",
            tooltip: "TMP3 Finder",
        }
    } else {
        TrayLabels {
            show: "Show Finder",
            quit: "Quit",
            tooltip: "TMP3 Finder",
        }
    }
}

pub struct TrayMenuState {
    pub show_item: MenuItem<Wry>,
    pub quit_item: MenuItem<Wry>,
}

pub fn setup_tray(app: &AppHandle, language: &str) -> Result<(), Box<dyn std::error::Error>> {
    let l = labels(language);
    let show_item = MenuItem::with_id(app, "tray-show", l.show, true, None::<&str>)?;
    let quit_item = MenuItem::with_id(app, "tray-quit", l.quit, true, None::<&str>)?;
    let menu = Menu::with_items(app, &[&show_item, &quit_item])?;

    let icon = app
        .default_window_icon()
        .ok_or("Missing default window icon")?
        .clone();

    let _tray = TrayIconBuilder::with_id(TRAY_ID)
        .icon(icon)
        .menu(&menu)
        .tooltip(l.tooltip)
        .on_menu_event(|app, event| match event.id.as_ref() {
            "tray-show" => crate::show_main_window(app),
            "tray-quit" => app.exit(0),
            _ => {}
        })
        .on_tray_icon_event(|tray, event| {
            if let TrayIconEvent::Click {
                button: MouseButton::Left,
                button_state: MouseButtonState::Up,
                ..
            } = event
            {
                let app = tray.app_handle();
                crate::toggle_main_window(&app);
            }
        })
        .build(app)?;

    app.manage(TrayMenuState {
        show_item,
        quit_item,
    });

    Ok(())
}

pub fn update_tray_language(app: &AppHandle, language: &str) -> Result<(), String> {
    let l = labels(language);
    let Some(state) = app.try_state::<TrayMenuState>() else {
        return Ok(());
    };

    state
        .show_item
        .set_text(l.show)
        .map_err(|e| e.to_string())?;
    state
        .quit_item
        .set_text(l.quit)
        .map_err(|e| e.to_string())?;

    if let Some(tray) = app.tray_by_id(TRAY_ID) {
        tray.set_tooltip(Some(l.tooltip))
            .map_err(|e| e.to_string())?;
    }

    Ok(())
}
