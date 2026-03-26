# PlayFool

Desktop Music & Video Player for Windows and macOS.

Search, preview, and download music and videos from YouTube. Play your local library with playlists, lyrics, and more.

**Made by PullFool**

## Download

Get the latest release from [Releases](https://github.com/PullFool/PlayFool/releases/latest)

| Platform | File | Description |
|----------|------|-------------|
| Windows (Installer) | `PlayFool-Setup.exe` | Recommended - installs with shortcuts |
| Windows (Portable) | `PlayFool-Windows-Portable.zip` | No install needed - extract and run |
| macOS (Intel) | `PlayFool-macOS.zip` | See instructions below |

## Install

### Windows

1. Download `PlayFool-Setup.exe` from Releases
2. Run the installer and follow the setup wizard
3. Launch PlayFool from the Start Menu or Desktop

> **Note:** Windows SmartScreen may show "Windows protected your PC" because the app is not code-signed. This is normal for indie/open-source apps. Click **"More info"** then **"Run anyway"** to proceed safely.

### macOS

Download `PlayFool-macOS.zip`, then open **Terminal** and run:

```bash
cd ~/Downloads && unzip -o PlayFool-macOS.zip -d PlayFool && xattr -cr PlayFool/PlayFool.app && open PlayFool/PlayFool.app
```

Or manually:
1. Extract the zip
2. Right-click `PlayFool.app` > **Open** (not double-click)
3. Click **"Open"** on the security dialog

## Features

- YouTube search, video preview (with audio), and download
- MP3 download with quality selection
- MP4 video download with quality selection
- Local music and video library
- Scan your PC for existing music and videos
- Playlist creation and management
- Synced lyrics (auto-fetched, saved offline)
- Video player panel with show/hide toggle
- Shuffle, repeat, seek, volume controls
- Keyboard shortcuts
- System tray (minimize to tray)
- Drag & drop music upload
- Works offline after downloading songs

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| `Space` | Play / Pause |
| `Ctrl + Right Arrow` | Next track |
| `Ctrl + Left Arrow` | Previous track |
| `Ctrl + Up Arrow` | Volume up |
| `Ctrl + Down Arrow` | Volume down |
| `Ctrl + Q` | Quit app |

Media keys on your keyboard also work (Play/Pause, Next, Previous).

## Tech Stack

- **Frontend:** React with CSS Modules
- **Backend:** Node.js / Express
- **Desktop:** NW.js
- **YouTube:** yt-dlp (bundled)
- **Audio conversion:** ffmpeg (bundled)
- **Lyrics:** lrclib.net API

## Development

```bash
# Install dependencies
npm install

# Run in development mode
npm start

# Run as desktop app
npm run nw

# Build for production
npm run build
```

## License

MIT
