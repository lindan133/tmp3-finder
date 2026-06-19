# Changelog

All notable changes to TMP3 Finder are documented here.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.2.0] - 2026-06-19

### Added

- Final Round: copy single matched answer; highlight matched items
- Remember last search mode between sessions
- Smart copy options: question + answer, matched subjective choice, VO line vs clip name
- Trivia difficulty filter (All / Easy / Medium / Hard)
- Multi-word search prioritizes results matching all tokens
- Check for updates (GitHub Releases) with startup check option
- **In-app update install** via Tauri updater plugin
- System tray: minimize to tray on close, show/hide from tray (**EN/RU menu**)
- Start with Windows (optional)
- Window opacity slider when Pin is enabled (70–100%)
- **MSI installer** in GitHub Releases
- **Code signing** pipeline (optional, via GitHub secrets)
- Updater manifest (`latest.json`) for signed auto-updates

### Fixed

- Match confidence showed 93% on exact Final Round category matches (now 100%)

### Changed

- `npm run dist` produces portable + NSIS + MSI + `latest.json`

### Removed

- Electron shell, web dev server, and legacy build scripts

## [1.1.0] - 2026-06-18

### Added

- **Tauri** desktop runtime — portable build ~10 MB (was ~73 MB with Electron)
- Smart search UX: top 3 results, exact/fuzzy badges, match confidence %
- Cross-mode hint when query fits another search mode
- **Ctrl+R** — reload database from disk without opening Settings
- **Enter** / **Ctrl+Enter** — copy top result from keyboard
- Onboarding for first launch; stale-database banner when game files change
- Hidden scrollbar in main content area (scroll still works)

### Changed

- `npm run dev` and `npm run dist` use Tauri by default
- Final Round answers sorted alphabetically (A→Z)
- Fuzzy search tuned: stop words, higher thresholds, fewer false positives
- App scope: **Trivia Murder Party 3 Demo** only (UI and docs)
- Removed Auto search mode; four explicit modes (Question, Final Round, Subjective, Lines)

### Fixed

- Fuzzy matches on short tokens (e.g. `t` from “can't” matching unrelated words)
- Wrong-mode / false-positive results in search

## [1.0.0] - 2026-06-18

### Added

- Compact Electron desktop app for Trivia Murder Party 3 answer search
- Auto, Question, Final Round, Subjective, and VO search modes
- Fuzzy search with exact-match highlighting and optional auto-copy
- Steam install auto-detection and manual Content path configuration
- JSON database cache for faster restarts
- Configurable global show/hide hotkey (default `Ctrl+Shift+F`)
- Always-on-top pin, dark/light theme, optional match sound
- English UI by default; Russian locale in Settings → Language
- Portable `.exe` and NSIS installer builds for Windows
- Vitest search unit tests and GitHub Actions CI

### Notes

- Unofficial fan tool — not affiliated with Jackbox Games
- Requires a legal local TMP3 installation (Demo or full edition)

[1.2.0]: https://github.com/lindan133/tmp3-finder/releases/tag/1.2.0
[1.1.0]: https://github.com/lindan133/tmp3-finder/releases/tag/1.1.0
[1.0.0]: https://github.com/lindan133/tmp3-finder/releases/tag/1.0.0
