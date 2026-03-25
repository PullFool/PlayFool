# PlayFool

Desktop Music & Video Player with YouTube integration.

Made by **PullFool**

## Download

Get the latest release from [Releases](https://github.com/PullFool/PlayFool/releases/latest)

| Platform | File |
|----------|------|
| Windows 10/11 (64-bit) | `PlayFool-Windows.zip` |
| macOS (Intel) | `PlayFool-macOS.zip` |

## Install

### Windows
1. Download `PlayFool-Windows.zip`
2. Extract to any folder
3. Run `PlayFool.exe`

### macOS
macOS blocks apps from unknown developers. To install, open **Terminal** and paste this command:

```bash
cd ~/Downloads && unzip -o PlayFool-macOS.zip -d PlayFool && xattr -cr PlayFool/PlayFool.app && open PlayFool/PlayFool.app
```

Or manually:
1. Download `PlayFool-macOS.zip`
2. Extract the zip
3. Open **Terminal** and run: `xattr -cr /path/to/PlayFool.app`
4. Double-click `PlayFool.app` to open

## Features

- YouTube search, video preview, and audio streaming
- Download as MP3 (music) or MP4 (video) with quality selection
- Scan your PC for existing music and video files
- Music library with drag & drop upload
- Playlist creation and management
- Synced lyrics (auto-fetched, saved offline)
- Video player with show/hide panel
- Shuffle, repeat, seek, volume controls
- Works offline after downloading songs

## Tech Stack

- **Frontend:** React with CSS Modules
- **Backend:** Node.js / Express
- **Desktop:** NW.js
- **YouTube:** yt-dlp (bundled)
- **Audio conversion:** ffmpeg (bundled)
