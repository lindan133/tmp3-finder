# TMP3 Finder

**Search every correct answer in [Trivia Murder Party 3 Demo](https://store.steampowered.com/app/3048060/Trivia_Murder_Party_3/) — instantly, locally, offline.**  
_A ~10 MB desktop companion. Reads your game JSON — never the cloud._

<p align="center">
  <a href="https://github.com/lindan133/tmp3-finder/actions/workflows/ci.yml"><img src="https://github.com/lindan133/tmp3-finder/actions/workflows/ci.yml/badge.svg" alt="CI"></a>
  <a href="https://github.com/lindan133/tmp3-finder/releases/latest"><img src="https://img.shields.io/github/v/release/lindan133/tmp3-finder?label=release" alt="Release"></a>
  <a href="LICENSE"><img src="https://img.shields.io/github/license/lindan133/tmp3-finder" alt="License"></a>
  <img src="https://img.shields.io/badge/platform-Windows-0078D6?logo=windows&logoColor=white" alt="Windows">
  <img src="https://img.shields.io/badge/Tauri-2.0-FFC131?logo=tauri&logoColor=black" alt="Tauri">
  <img src="https://img.shields.io/badge/Rust-backend-orange?logo=rust&logoColor=white" alt="Rust">
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black" alt="React">
  <img src="https://img.shields.io/badge/Demo-only-8B4513" alt="Demo only">
</p>

<p align="center">
  <b>English</b> · <a href="READMEs/ru-RU.md">Русский</a>
</p>

<p align="center">
  <a href="https://github.com/lindan133/tmp3-finder/releases/latest"><img src="https://img.shields.io/github/v/release/lindan133/tmp3-finder?label=download%20%E2%86%93&style=for-the-badge" alt="Download"></a>
  &nbsp;
  <a href="https://kankstudio.ru"><img src="https://img.shields.io/badge/kankstudio.ru-homepage-111?style=for-the-badge" alt="kankstudio.ru"></a>
</p>

<p align="center">
  <img src="docs/tmp3-banner.png" alt="Trivia Murder Party 3 Demo — TMP3 Finder" width="640">
</p>

<p align="center">
  <img src="docs/screenshots/main.png" alt="TMP3 Finder main window" width="320">
  &nbsp;&nbsp;
  <img src="docs/screenshots/settings.png" alt="TMP3 Finder settings" width="320">
</p>

<p align="center">
  <b>An unofficial fan tool from <a href="https://kankstudio.ru">kankstudio.ru</a></b><br>
  <sub>Not affiliated with Jackbox Games · Does not distribute game content</sub>
</p>

---

**The Final Round category just appeared. Four correct answers. The timer is already ticking.**

TMP3 Finder loads your local TMP3 Demo question database, runs fuzzy search across four game modes, and puts the right answer on your clipboard in one click — or one keystroke. Summon the window with **`Ctrl+Shift+F`**, pin it above the game, minimize to tray when you're done.

> **The goal isn't a flashy cheat overlay — it's to get the correct answer into your clipboard before the round moves on.**

---

## ✨ Features

> [!NOTE]
> **Demo only.** Built for the [TMP3 Demo on Steam](https://store.steampowered.com/app/3048060/Trivia_Murder_Party_3/). You need a legal local install — Finder reads JSON from your Content folder, nothing else.

> [!TIP]
> **Want the fastest path?** Download [TMP3-Finder-Portable.exe](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Portable.exe), run it, and the Steam Content path is usually detected automatically.

### 🔍 Four search modes

Switch between **Question**, **Final Round**, **Subjective**, and **VO / Lines**. Each mode searches the right JSON schema — trivia answers, category lists, subjective choices, or host voice lines.

### 🧠 Smart matching

Fuzzy search with confidence %, exact/fuzzy badges, top 3 results, and cross-mode hints when your query fits another mode better. Final Round answers sort **A→Z**; item search copies a **single** matched answer.

### 📋 Copy-first UX

Click a result card, press **`Enter`**, or **`Ctrl+Enter`** to copy the top hit. Optional auto-copy on exact match. Configurable formats: answer only, or question + answer.

<table>
<tr>
<td width="50%">

**📌 Always on top**  
Pin the window over your game. Optional opacity slider (70–100%) when pinned.

</td>
<td width="50%">

**⌨️ Global hotkey**  
Show / hide with **`Ctrl+Shift+F`** (configurable). Mode shortcuts **`Ctrl+1`…`4`**.

</td>
</tr>
<tr>
<td>

**🔄 Live database**  
JSON cache for fast restarts. **`Ctrl+R`** reloads when game files change — no Settings dive required.

</td>
<td>

**🌐 EN / RU UI**  
English by default; Russian in Settings → Language. Tray menu localized too.

</td>
</tr>
<tr>
<td>

**🔔 System tray**  
Close to tray instead of quitting. Left-click tray icon toggles the window.

</td>
<td>

**⬆️ In-app updates**  
Check on startup; install from Settings when a signed update is available.

</td>
</tr>
<tr>
<td>

**🌓 Themes**  
Dark and light. Compact layout tuned for a small always-on-top window.

</td>
<td>

**🎯 Trivia filters**  
Optional difficulty filter: All / Easy / Medium / Hard.

</td>
</tr>
</table>

---

## 🚀 Quick Start

### 1. Download

Pick a build from **[Releases](https://github.com/lindan133/tmp3-finder/releases/latest)**:

| File | Best for |
|------|----------|
| [**TMP3-Finder-Portable.exe**](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Portable.exe) | No install — just run (~10 MB) |
| [**TMP3-Finder-Setup-1.2.0.exe**](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Setup-1.2.0.exe) | NSIS installer (~2 MB) |
| [**TMP3-Finder-Setup-1.2.0.msi**](https://github.com/lindan133/tmp3-finder/releases/latest/download/TMP3-Finder-Setup-1.2.0.msi) | IT / enterprise deployment |

> **Requirements:** Windows 10/11 + [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) (preinstalled on most systems).

### 2. Install TMP3 Demo

Get **[Trivia Murder Party 3 Demo](https://store.steampowered.com/app/3048060/Trivia_Murder_Party_3/)** on Steam. Finder needs the local Content JSON files from that install.

### 3. Open Finder

Run Portable or the installer. On first launch, onboarding helps you confirm the **Content** path. Default Demo location:

```
C:\Program Files (x86)\Steam\steamapps\common\Trivia Murder Party 3 Demo\TMP3\Content\TMP3\LooseData\Content
```

Change anytime in **☰ → Settings → Content folder path**.

### 4. Search & copy

1. Pick a mode from **☰** (or use **`Ctrl+1`…`4`**).
2. Type question text, an answer, a category, or a host line.
3. Click a result — or press **`Enter`** — to copy.

Enable **Pin** for always-on-top. Enable **minimize to tray** if you want the window to hide instead of closing.

---

## ⌨️ Hotkeys

| Key | Action |
|-----|--------|
| **`Ctrl+Shift+F`** | Show / hide window (configurable) |
| **`Ctrl+1`** | Question mode |
| **`Ctrl+2`** | Final Round mode |
| **`Ctrl+3`** | Subjective mode |
| **`Ctrl+4`** | VO / Lines mode |
| **`Ctrl+R`** | Reload database from disk |
| **`Enter`** | Copy top result |
| **`Ctrl+Enter`** | Copy top result |
| **`Esc`** | Close menu / settings, or clear search |

---

## 📁 Content files

| File | Required |
|------|----------|
| `TMP3TriviaQuestion.json` | ✅ Yes |
| `TMP3FinalRoundGrouping.json` | ✅ Yes |
| `TMP3SubjectiveQuestion.json` | Optional |
| `VO.json` | Optional |

> [!IMPORTANT]
> Finder **never** ships or downloads game content. It only reads files already on your machine from your own TMP3 Demo installation.

---

## 🔧 Under the Hood

### Tauri + Rust backend

- Loads and caches game JSON with content fingerprinting (stale-database banner when files change)
- Auto-detects Steam Demo install paths
- Global hotkey, system tray, autostart, window opacity, updater hooks
- Settings persisted in app config dir

### React frontend

- Fuzzy search engine with stop-word filtering, multi-word scoring, and mode-specific ranking
- i18n: English + Russian
- Vitest unit tests for search logic

### Size

| Runtime | Portable size |
|---------|----------------|
| Electron (legacy) | ~73 MB |
| **Tauri (current)** | **~10 MB** |

---

## 🛠️ Development

### Prerequisites

- [Node.js 20+](https://nodejs.org/)
- [Rust](https://rustup.rs/) (`rustup` adds `cargo` to PATH)
- Windows 10/11 (target platform)

### Commands

```bash
# Install dependencies
npm install

# Dev — Tauri + Vite (first run compiles Rust, ~1–3 min)
npm run dev

# Tests
npm test

# Production build → release/
npm run dist
```

Or on Windows: double-click **`build.bat`**.

| Script | Description |
|--------|-------------|
| `npm run dev` | Development (Tauri) |
| `npm run build` | Frontend only |
| `npm run dist` | Portable + NSIS + MSI + `latest.json` |

### Project layout

```
src-tauri/     Rust backend — data, settings, tray, updater, hotkeys
src/           React UI, search engine, i18n
scripts/       Tauri wrapper, release copy, signing helpers
docs/          Banner & screenshots
build/         App icon
```

See [CHANGELOG.md](CHANGELOG.md) for version history. Maintainer notes: [.github/REPOSITORY_SETUP.md](.github/REPOSITORY_SETUP.md).

---

## 🤝 Contributing

- [Report a bug](https://github.com/lindan133/tmp3-finder/issues/new?template=bug_report.yml)
- [Request a feature](https://github.com/lindan133/tmp3-finder/issues/new?template=feature_request.yml)
- [Start a discussion](https://github.com/lindan133/tmp3-finder/discussions)

Pull requests welcome for search tuning, i18n, and UX polish. Please open an issue first for large changes.

---

<p align="center">
  <b>Stop guessing. Start finding.</b>
</p>

<p align="center">
  <sub>MIT License · <a href="LICENSE">LICENSE</a> · Logo font <code>BalterUnOff.otf</code> — separate redistribution terms</sub>
</p>
