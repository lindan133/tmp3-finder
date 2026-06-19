# Repository metadata (for maintainers)

Suggested GitHub **About** settings (edit manually in the repo UI — GitHub does not read this file automatically):

- **Website:** https://kankstudio.ru
- **Topics:** tauri, jackbox, trivia-murder-party-3, tmp3, windows, desktop-app, rust, helper-tool

## Social preview

Upload `.github/social-preview.png` via:

**Settings → General → Social preview → Upload an image**

## Pin repository

On your GitHub profile, pin `tmp3-finder` if this is a showcase project.

## Enable Discussions

**Settings → General → Features → Discussions → On**

Discussion templates are already in `.github/DISCUSSION_TEMPLATE/`.

## Release checklist (v1.1.0+)

1. Bump `package.json`, `src-tauri/tauri.conf.json`, `src-tauri/Cargo.toml`, `src/version.ts`
2. Update `CHANGELOG.md` and README download links
3. `npm test` and `npm run dist` (requires [Rust](https://rustup.rs/))
4. Commit, push, tag: `git tag 1.1.0 && git push origin 1.1.0`
5. GitHub Actions **Release** workflow uploads `release/TMP3-Finder-Portable.exe` and `release/TMP3-Finder-Setup-*.exe`

Tag formats accepted by CI: `1.1.0` or `v1.1.0`.
