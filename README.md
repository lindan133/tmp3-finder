# TMP3 Finder

[![CI](https://github.com/lindan133/tmp3-finder/actions/workflows/ci.yml/badge.svg)](https://github.com/lindan133/tmp3-finder/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/lindan133/tmp3-finder)](https://github.com/lindan133/tmp3-finder/releases/latest)
[![License](https://img.shields.io/github/license/lindan133/tmp3-finder)](LICENSE)
[![Windows](https://img.shields.io/badge/platform-Windows-blue)](https://github.com/lindan133/tmp3-finder/releases/latest)

<p align="center">
  <img src="docs/tmp3-banner.png" alt="Trivia Murder Party 3" width="420">
</p>

A compact desktop helper for **[Trivia Murder Party 3 Demo](https://store.steampowered.com/app/3048060/Trivia_Murder_Party_3/)** — search correct answers from your local game JSON files.

Made with ❤️ by [kankstudio.ru](https://kankstudio.ru/).

> **Disclaimer:** Unofficial fan tool. Not affiliated with Jackbox Games. Does not distribute game content. Use only with files from your own legal TMP3 Demo installation.

## Screenshots

<p align="center">
  <img src="docs/screenshots/main.png" alt="TMP3 Finder main window" width="360">
  &nbsp;
  <img src="docs/screenshots/settings.png" alt="TMP3 Finder settings" width="360">
</p>

## Download (Windows)

[![Latest release](https://img.shields.io/github/v/release/lindan133/tmp3-finder?label=download)](https://github.com/lindan133/tmp3-finder/releases/latest)

| File | Description |
|------|-------------|
| [**TMP3-Finder-Portable.exe**](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Portable.exe) | Portable — no install, ~10 MB |
| [**TMP3-Finder-Setup-1.2.0.exe**](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Setup-1.2.0.exe) | NSIS installer (~2 MB) |
| [**TMP3-Finder-Setup-1.2.0.msi**](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Setup-1.2.0.msi) | MSI installer (IT / enterprise) |

> **Note:** Installer filenames include the version. Open [Releases](https://github.com/lindan133/tmp3-finder/releases/latest) for the current files.

**Requirements:** Windows 10/11 with [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (preinstalled on most systems).

**Latest:** v1.2.0 — tray, in-app updates, MSI, signed builds (when certificate configured). See [CHANGELOG.md](CHANGELOG.md).

### Build from source

```bash
npm install
npm run dist
```

First build downloads Rust crates and may take several minutes.

**Prerequisites:** [Node.js 20+](https://nodejs.org/), [Rust](https://rustup.rs/) (`rustup` adds `cargo` to PATH).

Or double-click `build.bat` on Windows.

## Features

- **Question** — standard trivia with one correct answer
- **Final Round** — categories and correct list items (answers sorted A→Z)
- **Subjective** — choices without a single “correct” answer
- **Lines** — search host VO lines and clip names
- **Smart search** — fuzzy matching, confidence %, top 3 results, cross-mode hints
- **Pin** — always-on-top window
- **Global hotkey** — show / hide the app (default `Ctrl+Shift+F`)
- **Database cache** — fast restarts; **Ctrl+R** reloads without opening Settings
- **Dark & light theme**
- **Auto-copy** on exact match (optional)
- **English & Russian UI** — including tray menu; switch in Settings → Language
- **In-app updates** — check, download, and install from Settings
- **System tray** — minimize to tray on close (optional)

## Usage

1. Install [Trivia Murder Party 3 Demo](https://store.steampowered.com/app/3048060/Trivia_Murder_Party_3/) on Steam.
2. Open Finder — the Content path is usually detected automatically.
3. Pick a mode from the **☰ menu**.
4. Type question text, an answer, a category, or a host line.
5. Click an answer to copy it to the clipboard (`Enter` / `Ctrl+Enter` also copy the top result).

Settings: **☰ → Settings**.

## Hotkeys

| Key | Action |
|-----|--------|
| `Ctrl+Shift+F` | Show / hide window (configurable) |
| `Ctrl+1` … `Ctrl+4` | Modes: Question, Final Round, Subjective, Lines |
| `Ctrl+R` | Reload database from disk |
| `Esc` | Close menu / settings or clear search |

## Content path

Default (Demo):

```
C:\Program Files (x86)\Steam\steamapps\common\Trivia Murder Party 3 Demo\TMP3\Content\TMP3\LooseData\Content
```

Change it in **Settings → Content folder path**.

Required files:

| File | Required |
|------|----------|
| `TMP3TriviaQuestion.json` | Yes |
| `TMP3FinalRoundGrouping.json` | Yes |
| `TMP3SubjectiveQuestion.json` | No |
| `VO.json` | No |

## Development

```bash
npm install
npm run dev
```

Opens the Tauri window (Vite on port 5173 + Rust backend). First run compiles Rust — wait 1–3 minutes.

## Project structure

```
src-tauri/         Tauri / Rust backend (data, settings, hotkeys, tray, updater)
src/               React UI, search, i18n
build/             App icon
docs/              README banner and screenshots
scripts/           Build, signing, release helpers
```

## Tests

```bash
npm test
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development (Tauri) |
| `npm run build` | Build frontend only |
| `npm run dist` | Portable + NSIS + MSI + updater manifest |

## Changelog

See [CHANGELOG.md](CHANGELOG.md).

## Contributing

- [Report a bug](https://github.com/lindan133/tmp3-finder/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/lindan133/tmp3-finder/issues/new?template=feature_request.yml)
- [Start a discussion](https://github.com/lindan133/tmp3-finder/discussions)

## License

[MIT](LICENSE) — see [LICENSE](LICENSE) for details.

The logo font (`BalterUnOff.otf`) is included for UI branding; redistribution terms are separate from the app license.

---

## Русский

Компактный помощник для **[Trivia Murder Party 3 Demo](https://store.steampowered.com/app/3048060/Trivia_Murder_Party_3/)** — быстрый поиск ответов по локальным JSON-файлам игры.

### Скачать

[![Последний релиз](https://img.shields.io/github/v/release/lindan133/tmp3-finder?label=скачать)](https://github.com/lindan133/tmp3-finder/releases/latest)

- [Portable .exe](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Portable.exe) — без установки, ~10 МБ
- [Установщик .exe](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Setup-1.2.0.exe)
- [Установщик .msi](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Setup-1.2.0.msi)

**Нужно:** Windows 10/11 и WebView2 (обычно уже есть в системе).

### Возможности

- Вопросы, финальный раунд, субъективные вопросы, реплики VO
- Умный поиск с процентом совпадения, топ-3, подсказки при неверном режиме
- Pin, прозрачность при Pin, глобальный хоткей, кэш базы, **Ctrl+R**
- Трей (сворачивание при закрытии), автозапуск с Windows
- Проверка и установка обновлений из приложения
- Тёмная/светлая тема; **язык RU/EN** (включая меню трея)

### Как пользоваться

1. Установите [TMP3 Demo в Steam](https://store.steampowered.com/app/3048060/Trivia_Murder_Party_3/).
2. Откройте Finder — путь к Content обычно определяется автоматически.
3. Выберите режим через **☰**.
4. Введите текст вопроса, ответа, категории или реплики.
5. Клик по ответу — копирование в буфер.

Настройки: **☰ → Settings (Настройки)**.

### Сборка

```bash
npm install
npm run dev      # разработка (Tauri)
npm run dist     # portable + NSIS + MSI
```

Первый раз нужен [Rust](https://rustup.rs/); сборка может занять несколько минут.

### Дисклеймер

Неофициальный инструмент. Не связан с Jackbox Games и не распространяет контент игры. Используйте только файлы из вашей легальной установки TMP3 Demo.
