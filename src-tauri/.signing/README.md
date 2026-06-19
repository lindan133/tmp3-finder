# Updater signing keys

- **Public key** is embedded in `tauri.conf.json` (`plugins.updater.pubkey`).
- **Private key** (`tmp3-finder.key`) must never be committed — add it to GitHub secret `TAURI_SIGNING_PRIVATE_KEY`.

Generate a new key pair:

```bash
node scripts/tauri.mjs signer generate -w src-tauri/.signing/tmp3-finder.key -f --ci -p "YOUR_PASSWORD"
```

See `.github/REPOSITORY_SETUP.md` for CI secrets.
