# ==============================================================================
# Brave YouTube Downloader - All-in-One Automated Installer
# Installs Native Host, Extension, yt-dlp, FFmpeg, and registers with Brave/Chrome
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$ErrorActionPreference = "Stop"

function Write-Banner {
    Clear-Host
    Write-Host ""
    Write-Host " ==================================================================== " -ForegroundColor Cyan
    Write-Host "       🚀 Brave YouTube yt-dlp Downloader - Auto-Installer           " -ForegroundColor Yellow -BackgroundColor Black
    Write-Host " ==================================================================== " -ForegroundColor Cyan
    Write-Host "  100% Local Hardware Downloads • 4K/1080p • MP3 • No 3rd-Party Ads   " -ForegroundColor Gray
    Write-Host ""
}

function Write-Step($stepNum, $text) {
    Write-Host " [$stepNum/5] " -ForegroundColor Cyan -NoNewline
    Write-Host "$text" -ForegroundColor White
}

function Write-Success($text) {
    Write-Host "       ✔ $text" -ForegroundColor Green
}

function Write-Info($text) {
    Write-Host "       ℹ $text" -ForegroundColor Yellow
}

function Write-ErrorMsg($text) {
    Write-Host "       ✖ $text" -ForegroundColor Red
}

Write-Banner

$ScriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Definition
$SourceExtension = Join-Path $ScriptRoot "..\extension"
$SourceNativeHost = Join-Path $ScriptRoot "..\native-host"

if (-not (Test-Path $SourceExtension)) {
    # If running from a packaged release folder
    $SourceExtension = Join-Path $ScriptRoot "extension"
    $SourceNativeHost = Join-Path $ScriptRoot "native-host"
}

$InstallDir = "$env:LOCALAPPDATA\BraveYtDlpExtension"
$BinDir = "$InstallDir\bin"
$ExtDir = "$InstallDir\extension"
$HostDir = "$InstallDir\native-host"

Write-Step "1" "Creating install directories at: $InstallDir"
New-Item -ItemType Directory -Force -Path $InstallDir | Out-Null
New-Item -ItemType Directory -Force -Path $BinDir | Out-Null
New-Item -ItemType Directory -Force -Path $ExtDir | Out-Null
New-Item -ItemType Directory -Force -Path $HostDir | Out-Null
Write-Success "Directories initialized."

Write-Host ""
Write-Step "2" "Checking & auto-installing required dependencies (yt-dlp, FFmpeg, Node)..."

# Helper for downloading with Progress
function Download-FileWithProgress($url, $destPath, $label) {
    Write-Host "       ⬇ Downloading $label..." -ForegroundColor Cyan
    try {
        [Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12 -bor [Net.SecurityProtocolType]::Tls13
        $webClient = New-Object System.Net.WebClient
        $webClient.DownloadFile($url, $destPath)
        Write-Success "$label downloaded successfully."
    } catch {
        Write-ErrorMsg "Failed to download $label from $url : $_"
        throw $_
    }
}

# 1. Check / Download yt-dlp
$ytdlpExe = "$BinDir\yt-dlp.exe"
$existingYtDlp = (Get-Command "yt-dlp.exe" -ErrorAction SilentlyContinue)
if (-not (Test-Path $ytdlpExe) -and $existingYtDlp) {
    $ytdlpExe = $existingYtDlp.Source
    Write-Success "Found existing yt-dlp on system PATH: $ytdlpExe"
} elseif (Test-Path $ytdlpExe) {
    Write-Success "yt-dlp is already present in bin folder."
} else {
    $ytdlpUrl = "https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe"
    Download-FileWithProgress $ytdlpUrl $ytdlpExe "yt-dlp.exe"
}

# 2. Check / Download FFmpeg
$ffmpegExe = "$BinDir\ffmpeg.exe"
$existingFfmpeg = (Get-Command "ffmpeg.exe" -ErrorAction SilentlyContinue)
if (-not (Test-Path $ffmpegExe) -and (Test-Path "C:\FFmpeg\bin\ffmpeg.exe")) {
    $ffmpegExe = "C:\FFmpeg\bin\ffmpeg.exe"
    Write-Success "Found existing FFmpeg: $ffmpegExe"
} elseif (-not (Test-Path $ffmpegExe) -and $existingFfmpeg) {
    $ffmpegExe = $existingFfmpeg.Source
    Write-Success "Found existing FFmpeg on system PATH: $ffmpegExe"
} elseif (Test-Path $ffmpegExe) {
    Write-Success "FFmpeg is already present in bin folder."
} else {
    Write-Info "FFmpeg is required for merging high-res video and audio."
    $ffmpegZip = "$InstallDir\ffmpeg_temp.zip"
    $ffmpegUrl = "https://github.com/GyanD/codexffmpeg/releases/download/7.1/ffmpeg-7.1-essentials_build.zip"
    try {
        Download-FileWithProgress $ffmpegUrl $ffmpegZip "FFmpeg Essentials package (~35MB)"
        Write-Info "Extracting FFmpeg binaries..."
        $extractTemp = "$InstallDir\ffmpeg_extract"
        Expand-Archive -Path $ffmpegZip -DestinationPath $extractTemp -Force
        $foundFfmpeg = Get-ChildItem -Path $extractTemp -Filter "ffmpeg.exe" -Recurse | Select-Object -First 1
        $foundFfprobe = Get-ChildItem -Path $extractTemp -Filter "ffprobe.exe" -Recurse | Select-Object -First 1
        if ($foundFfmpeg) {
            Copy-Item -Path $foundFfmpeg.FullName -Destination $BinDir -Force
        }
        if ($foundFfprobe) {
            Copy-Item -Path $foundFfprobe.FullName -Destination $BinDir -Force
        }
        Remove-Item -Path $ffmpegZip -Force -ErrorAction SilentlyContinue
        Remove-Item -Path $extractTemp -Recurse -Force -ErrorAction SilentlyContinue
        Write-Success "FFmpeg successfully installed into bin folder."
    } catch {
        Write-Info "Could not auto-download FFmpeg archive. Trying winget..."
        try {
            winget install Gyan.FFmpeg --silent --accept-package-agreements --accept-source-agreements
            Write-Success "FFmpeg installed via winget."
        } catch {
            Write-Info "Please install FFmpeg manually or place ffmpeg.exe in: $BinDir"
        }
    }
}

# 3. Check / Download Node.js standalone executable (Anti-403 cipher solver)
$nodeExe = "$BinDir\node.exe"
$existingNode = (Get-Command "node.exe" -ErrorAction SilentlyContinue)
if (-not (Test-Path $nodeExe) -and (Test-Path "C:\Program Files\nodejs\node.exe")) {
    $nodeExe = "C:\Program Files\nodejs\node.exe"
    Write-Success "Found existing Node.js: $nodeExe"
} elseif (-not (Test-Path $nodeExe) -and $existingNode) {
    $nodeExe = $existingNode.Source
    Write-Success "Found existing Node.js on system: $nodeExe"
} elseif (Test-Path $nodeExe) {
    Write-Success "Node.js standalone is already present in bin folder."
} else {
    Write-Info "Downloading standalone Node.js for YouTube anti-403 deciphering..."
    try {
        $nodeUrl = "https://nodejs.org/dist/v20.18.0/win-x64/node.exe"
        Download-FileWithProgress $nodeUrl $nodeExe "Node.js Standalone (node.exe)"
    } catch {
        Write-Info "Node download skipped. Standard downloads will continue."
    }
}

# 4. Check Python 3
$pythonCmd = (Get-Command "python.exe" -ErrorAction SilentlyContinue)
if (-not $pythonCmd) {
    Write-Info "Python not found on PATH. Attempting winget install..."
    try {
        winget install Python.Python.3.12 --silent --accept-package-agreements --accept-source-agreements
        Write-Success "Python installed via winget."
    } catch {
        Write-Info "Please ensure Python 3 is installed."
    }
} else {
    Write-Success "Found Python 3: $($pythonCmd.Source)"
}

Write-Host ""
Write-Step "3" "Deploying extension & native messaging host..."
Copy-Item -Path "$SourceExtension\*" -Destination $ExtDir -Recurse -Force
Copy-Item -Path "$SourceNativeHost\*" -Destination $HostDir -Recurse -Force

# Create robust host.bat inside $HostDir
$pythonExePath = if ($pythonCmd) { $pythonCmd.Source } else { "python.exe" }
$hostBatContent = @"
@echo off
setlocal
set PATH=%~dp0..\bin;%PATH%
"$pythonExePath" -u "%~dp0host.py" %*
"@
Set-Content -Path "$HostDir\host.bat" -Value $hostBatContent -Encoding ASCII

# Generate host manifest JSON with absolute path
$manifestJsonPath = "$HostDir\com.ytdlp.brave_downloader.json"
$manifestData = @{
    name = "com.ytdlp.brave_downloader"
    description = "Brave YouTube yt-dlp Native Messaging Host"
    path = "$HostDir\host.bat"
    type = "stdio"
    allowed_origins = @(
        "chrome-extension://mgmikjlcgaoaiodlmpelphcocnbodckd/"
    )
}
$manifestJson = $manifestData | ConvertTo-Json -Depth 5
Set-Content -Path $manifestJsonPath -Value $manifestJson -Encoding UTF8
Write-Success "Host manifest generated at: $manifestJsonPath"

Write-Host ""
Write-Step "4" "Registering Native Messaging Host in Windows Registry..."
$braveRegPath = "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.ytdlp.brave_downloader"
$chromeRegPath = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.ytdlp.brave_downloader"

New-Item -Path $braveRegPath -Force | Out-Null
Set-ItemProperty -Path $braveRegPath -Name "(Default)" -Value $manifestJsonPath | Out-Null
Write-Success "Brave Browser registry key registered."

New-Item -Path $chromeRegPath -Force | Out-Null
Set-ItemProperty -Path $chromeRegPath -Name "(Default)" -Value $manifestJsonPath | Out-Null
Write-Success "Google Chrome registry key registered."

Write-Host ""
Write-Step "5" "Configuring shortcuts and browser extension..."

# Create Desktop Shortcut for Extension Folder
$WshShell = New-Object -ComObject WScript.Shell
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$Shortcut = $WshShell.CreateShortcut("$DesktopPath\Brave YouTube Downloader Folder.lnk")
$Shortcut.TargetPath = "explorer.exe"
$Shortcut.Arguments = "`"$ExtDir`""
$Shortcut.Description = "Open Brave YouTube yt-dlp Extension Directory"
$Shortcut.Save()
Write-Success "Created Desktop helper shortcut."

Write-Host ""
Write-Host " ==================================================================== " -ForegroundColor Green
Write-Host "                    🎉 INSTALLATION COMPLETE!                         " -ForegroundColor Yellow -BackgroundColor Black
Write-Host " ==================================================================== " -ForegroundColor Green
Write-Host ""
Write-Host "  To enable the extension in Brave in 5 seconds:" -ForegroundColor White
Write-Host "   1. Open Brave and go to: " -ForegroundColor Gray -NoNewline
Write-Host "brave://extensions" -ForegroundColor Cyan
Write-Host "   2. Turn ON the " -ForegroundColor Gray -NoNewline
Write-Host "'Developer mode'" -ForegroundColor Yellow -NoNewline
Write-Host " switch at the top-right." -ForegroundColor Gray
Write-Host "   3. Click " -ForegroundColor Gray -NoNewline
Write-Host "'Load unpacked'" -ForegroundColor Yellow -NoNewline
Write-Host " and select this folder:" -ForegroundColor Gray
Write-Host "      $ExtDir" -ForegroundColor Cyan
Write-Host ""
Write-Host "  A File Explorer window will now open to that exact folder for you." -ForegroundColor Green
Write-Host ""

# Copy path to clipboard
try {
    Set-Clipboard -Value $ExtDir
    Write-Host "  [Folder path copied to your clipboard! Just paste into the folder dialog]" -ForegroundColor Yellow
} catch {}

# Open Extension folder in explorer
Start-Process "explorer.exe" -ArgumentList "`"$ExtDir`""

# Offer to open Brave extensions page
$braveExe = (Get-Command "brave.exe" -ErrorAction SilentlyContinue)
if ($braveExe) {
    Start-Process $braveExe.Source -ArgumentList "brave://extensions"
}

Write-Host ""
Write-Host " Press any key to finish..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
