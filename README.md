# TMP3 Finder

<p align="center">
  <img src="docs/tmp3-banner.png" alt="Trivia Murder Party 3" width="420">
</p>

A compact desktop helper for **[Trivia Murder Party 3](https://store.steampowered.com/app/3048060/Trivia_Murder_Party_3/)** — search correct answers from your local game JSON files.

Made with ❤️ by [kankstudio.ru](https://kankstudio.ru/).

> **Disclaimer:** Unofficial fan tool. Not affiliated with Jackbox Games. Does not distribute game content. Use only with files from your own legal TMP3 installation.

## Features

- **Auto mode** — detects question type automatically
- **Question** — standard trivia with one correct answer
- **Final Round** — categories and correct list items
- **Subjective** — choices without a single “correct” answer
- **Lines** — search host VO lines and clip names
- **Pin** — always-on-top window
- **Global hotkey** — show / hide the app (default `Ctrl+Shift+F`)
- **Database cache** — fast restarts
- **Dark & light theme**
- **Auto-copy** on exact match (optional)
- **English & Russian UI** — English by default; switch in Settings → Language

## Download (Windows)

Pre-built binaries can be attached to [GitHub Releases](https://github.com/lindan133/tmp3-finder/releases). After building locally, check the `release/` folder:

| File | Description |
|------|-------------|
| `TMP3-Finder-Portable.exe` | Portable, no install |
| `TMP3-Finder-Setup-1.0.0.exe` | NSIS installer |

### Build from source

```bash
npm install
npm run dist
```

> If the project lives in OneDrive, the build writes to `C:/Temp/tmp3-release` first, then copies artifacts into `release/` (avoids EPERM errors).

Or double-click `build.bat` on Windows.

### Run without Node.js

Double-click `release/TMP3-Finder-Portable.exe` or `start.bat`.

## Development

```bash
npm install
npm run dev
```

Opens the Electron window.

```bash
npm run dev:web
```

Browser + local API (`server.mjs`) — development only.

## Usage

1. Install TMP3 on Steam (Demo or full edition).
2. Open Finder — the Content path is usually detected automatically.
3. Pick a mode from the **☰ menu** or leave **Auto**.
4. Type question text, an answer, a category, or a host line.
5. Click an answer to copy it to the clipboard.

Settings: **☰ → Settings**.

## Hotkeys

| Key | Action |
|-----|--------|
| `Ctrl+Shift+F` | Show / hide window (configurable) |
| `Ctrl+1` … `Ctrl+5` | Modes: Auto, Question, Final Round, Subjective, Lines |
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

## Project structure

```
electron/          Electron main process, data loading, Steam paths
src/               React UI, search, i18n
build/             App icon
scripts/           Release copy helper
```

## Tests

```bash
npm test
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Development (Electron) |
| `npm run build` | Build frontend |
| `npm run dist` | Portable + installer |
| `npm run dist:portable` | Portable only |
| `npm run dist:setup` | Installer only |

## License

[MIT](LICENSE) — see [LICENSE](LICENSE) for details.

The logo font (`BalterUnOff.otf`) is included for UI branding; redistribution terms are separate from the app license.

---

## Русский

Компактный помощник для **[Trivia Murder Party 3](https://store.steampowered.com/app/3048060/Trivia_Murder_Party_3/)** — быстрый поиск ответов по локальным JSON-файлам игры.

### Возможности

- Авто-режим, вопросы, финальный раунд, субъективные вопросы, реплики VO
- Pin, глобальный хоткей, кэш базы, тёмная/светлая тема
- **Язык:** английский по умолчанию; русский — в **Настройки → Язык**

### Сборка и запуск

```bash
npm install
npm run dev      # разработка
npm run dist     # portable + установщик
```

### Дисклеймер

Неофициальный инструмент. Не связан с Jackbox Games и не распространяет контент игры. Используйте только файлы из вашей легальной установки TMP3.
