# PlayFool Desktop

Music + video player for Windows, built on NW.js with a React 19 UI and a yt-dlp-powered backend bundled into the same process.

## Stack

- **Runtime:** NW.js 0.92 (Chromium + Node) — `package.json` has `node-main: server.js` and `main: index.html`
- **UI:** React 19 + react-router-dom + react-icons + react-scripts (CRA-style)
- **Audio engine:** Howler.js
- **Backend (in-process):** Express running inside NW.js node-main; yt-dlp + ffmpeg shelled out via `child_process`
- **Installer:** Inno Setup (`installer.iss`) bundles `nwjs-dist`, ffmpeg, and the React build
- **CI:** GitHub Actions (`.github/workflows/build.yml`) — triggers on `v*` tag push, builds Windows installer

## Commands

- Dev React only: `npm start`
- Full app (build + launch NW): `npm run desktop`
- Build React: `npm run build`
- Just NW: `npm run nw`
- No tests configured

## Release flow

1. Bump `APP_VERSION` in `src/components/Tour.js`
2. Local commit
3. Tag `v1.9.X`
4. Push tag → CI builds + uploads installer as a GitHub release artifact
5. Auto-update flow inside the app picks up the new tag

## Files that matter

- `server.js` — node-main backend: yt-dlp endpoints, file scanning, lyrics fetch, popup window control, NW.Tray (when added), tunnel/sync endpoints
- `src/components/Sidebar.js` — version display + sync icon + heart button
- `src/components/SyncDialog.js` — cloud sync UI (calls `/api/cloud-sync/run`)
- `src/components/Player.js` — main playback bar
- `src/pages/Popup*.js` — secondary windows (Lyrics, EQ, Queue) opened by `nw.Window.open`
- `installer.iss` — Inno Setup script
- `error-config.json` — Discord webhook for error reporting (gitignored, injected at build time)

## Conventions

- Always bump `APP_VERSION` in `Tour.js` AND ensure version aligns with the next tag (mismatch shows wrong version in UI)
- Sidecar `.lrc.meta.json` files track which lrclib match was served (for "Wrong lyrics" feature)
- yt-dlp / ffmpeg binaries live in `ffmpeg/` and `yt-dlp/` and must be packaged by the installer
- Keep `index.html` paths relative (`./` not `/`) so file:// loading works inside NW

## Don't

- Add `transparent: true` to `package.json` window config — it conflicts with the OS frame and causes double-titlebar
- Run `expo prebuild` here (this is NW.js, not Expo)
- Ship without bumping `APP_VERSION` — auto-update misfires

## Deploy

CI pushes to GitHub Releases on tag. No Railway / cloud deploy for the desktop app itself.
