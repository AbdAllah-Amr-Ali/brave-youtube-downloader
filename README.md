# Brave YouTube Downloader (yt-dlp Native Extension)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2FAbdAllah-Amr-Ali%2Fbrave-youtube-downloader)

A high-performance, 100% local hardware browser extension for **Brave** (and Chromium browsers) that injects a native-styled download button directly beneath YouTube videos. Powered by your computer's local `yt-dlp` and `FFmpeg` engines.

---

## Key Features

- ⚡ **100% Local Hardware Execution**: Downloads go straight from YouTube CDN to your local drive without slow third-party web converters, rate-limits, or compression loss.
- 🎬 **All Resolutions (144p to 4K)**:
  - 🎬 Best Video (MAX Quality)
  - 🎬 1080p Full HD
  - 🎬 720p HD
  - 🎬 480p Standard
  - 🎬 360p Low
  - 🎬 240p Very Low
  - 🎬 144p Minimum
  - 🎵 Audio Only (Lossless extraction to MP3)
- 📊 **Live File Size Estimator**: Shows exact estimated file size beside every resolution (e.g. `~52 MB`, `~36 MB`) right in the dropdown before downloading.
- 📁 **Native Folder Picker**: Pops up a native Windows folder selector on every download, letting you choose where to save each video.
- 🛑 **Instant Cancel (✕)**: Terminate any in-progress download instantly with full child-process termination (`taskkill /F /T`).
- 🛡️ **Anti-403 Protection**: Built-in JS runtime integration (`node.exe`) solves YouTube's n-sig cipher challenge without 403 Forbidden errors.
- 🔒 **Total Privacy**: Zero analytics, zero logging, zero telemetry.

## ⚡ Instant Installation (Choose Any Method)

### Method 1: Instant One-Line Command (No files to download, No extraction)
Paste into **Windows PowerShell** or **Windows Terminal**:
```powershell
irm https://raw.githubusercontent.com/AbdAllah-Amr-Ali/brave-youtube-downloader/main/install.ps1 | iex
```
*Or from Command Prompt / Run Dialog (`Win + R`):*
```cmd
powershell -c "irm https://raw.githubusercontent.com/AbdAllah-Amr-Ali/brave-youtube-downloader/main/install.ps1 | iex"
```

### Method 2: 1-Click `.bat` Installer (No ZIP extraction)
1. Download **[`Install-Brave-Downloader.bat`](https://raw.githubusercontent.com/AbdAllah-Amr-Ali/brave-youtube-downloader/main/install.bat)**.
2. Double-click it. It automatically downloads the latest package, installs `yt-dlp`, `FFmpeg`, standalone `Node.js`, configures registry keys, and opens Brave!

### Method 3: Full Setup ZIP Bundle
1. Download `Brave-YouTube-Downloader-Setup.zip`.
2. Extract and run `Install.bat`.

---

### What the Automated Installer Does:
- Auto-detects or downloads official **`yt-dlp.exe`** to `%LOCALAPPDATA%\BraveYtDlpExtension\bin\`.
- Auto-detects or downloads **`ffmpeg.exe`** and **`ffprobe.exe`**.
- Auto-downloads standalone **`node.exe`** for anti-403 deciphering.
- Generates Native Messaging Host manifests and registers Windows Registry keys for **Brave** and **Chrome**.
- Automatically copies the extension directory path to your clipboard and opens `brave://extensions`.
- In Brave, turn ON **Developer mode** and click **Load unpacked** (paste the clipboard path). Done!

---

## Product Landing Website

A modern, responsive landing website is included in `website/` with an interactive YouTube simulator, feature highlights, and 1-click downloads:

- **Launch Website**: Double-click **`serve_website.bat`** (or run `python website/serve.py`).
- Website will automatically open on **`http://localhost:8080`**.
- Includes:
  - Interactive simulator where users can click the download button, view file sizes, test folder selection, and cancel downloads.
  - Direct 1-click download button for `Brave-YouTube-Downloader-Setup.zip`.
  - PowerShell 1-click terminal install snippets.
  - Interactive FAQ accordion.

---

## Project Structure

```
brave-yt-dlp-extension/
├── Install.bat                    # 1-Click root installer
├── Uninstall.bat                  # 1-Click root uninstaller
├── serve_website.bat              # 1-Click website preview launcher
├── package_release.py             # Packaging script producing distributable zip
├── dist/
│   └── Brave-YouTube-Downloader-Setup.zip # Standalone distributable bundle
├── installer/
│   ├── Install.bat                # Batch launcher with execution policy bypass
│   ├── install.ps1                # Auto-installer (downloads dependencies & registers registry)
│   ├── Uninstall.bat              # Batch uninstaller
│   └── uninstall.ps1              # Uninstaller script
├── website/
│   ├── index.html                 # Modern responsive product landing page
│   ├── serve.py                   # Local web server
│   ├── css/style.css              # Dark theme Brave & YouTube styling
│   ├── js/main.js                 # Interactive simulator & clipboard actions
│   ├── assets/                    # Icons and badges
│   └── downloads/
│       └── Brave-YouTube-Downloader-Setup.zip
├── extension/
│   ├── manifest.json              # MV3 configuration with deterministic ID
│   ├── content/                   # Content script & upward menu styling
│   ├── background/                # Service worker & native host bridge
│   ├── popup/                     # Options & connection diagnostic UI
│   └── icons/                     # Extension icons (16, 48, 128)
└── native-host/
    ├── host.py                    # Python host communicating via Chromium stdio
    ├── host.bat                   # Batch wrapper
    ├── com.ytdlp.brave_downloader.json # Native messaging manifest
    ├── install_host.bat           # Registry installer
    └── uninstall_host.bat         # Registry uninstaller
```

---

## How to Uninstall

Double-click **`Uninstall.bat`**. It terminates running host processes, removes the registry keys, and deletes the installed files cleanly.
