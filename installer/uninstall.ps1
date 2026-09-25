# ==============================================================================
# Brave YouTube Downloader - Uninstaller
# ==============================================================================

[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host ""
Write-Host " ==================================================================== " -ForegroundColor Yellow
Write-Host "       Brave YouTube yt-dlp Downloader - Uninstaller                 " -ForegroundColor Yellow
Write-Host " ==================================================================== " -ForegroundColor Yellow
Write-Host ""

$InstallDir = "$env:LOCALAPPDATA\BraveYtDlpExtension"
$braveReg = "HKCU:\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.ytdlp.brave_downloader"
$chromeReg = "HKCU:\Software\Google\Chrome\NativeMessagingHosts\com.ytdlp.brave_downloader"

Write-Host " Removing Windows Registry Native Messaging entries..." -ForegroundColor Cyan
if (Test-Path $braveReg) {
    Remove-Item -Path $braveReg -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✔ Brave registry key removed." -ForegroundColor Green
}
if (Test-Path $chromeReg) {
    Remove-Item -Path $chromeReg -Recurse -Force -ErrorAction SilentlyContinue
    Write-Host "  ✔ Google Chrome registry key removed." -ForegroundColor Green
}

Write-Host " Removing desktop shortcuts..." -ForegroundColor Cyan
$DesktopPath = [Environment]::GetFolderPath("Desktop")
$Shortcut1 = "$DesktopPath\Brave (YouTube Downloader).lnk"
$Shortcut2 = "$DesktopPath\Brave YouTube Downloader Folder.lnk"
if (Test-Path $Shortcut1) {
    Remove-Item -Path $Shortcut1 -Force -ErrorAction SilentlyContinue
    Write-Host "  ✔ 'Brave (YouTube Downloader)' shortcut removed." -ForegroundColor Green
}
if (Test-Path $Shortcut2) {
    Remove-Item -Path $Shortcut2 -Force -ErrorAction SilentlyContinue
    Write-Host "  ✔ Extension folder shortcut removed." -ForegroundColor Green
}

Write-Host " Terminating any active background host processes..." -ForegroundColor Cyan
Get-Process -Name "python" -ErrorAction SilentlyContinue | Where-Object { $_.Path -like "*BraveYtDlpExtension*" } | Stop-Process -Force -ErrorAction SilentlyContinue

Write-Host " Removing installation files at: $InstallDir..." -ForegroundColor Cyan
if (Test-Path $InstallDir) {
    try {
        Remove-Item -Path $InstallDir -Recurse -Force -ErrorAction Stop
        Write-Host "  ✔ Installation files removed." -ForegroundColor Green
    } catch {
        Write-Host "  ℹ Some files may be in use. Please close Brave and run again." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host " ✔ YouTube Downloader has been uninstalled." -ForegroundColor Green
Write-Host "   (Remember to remove the extension from brave://extensions if desired)" -ForegroundColor Gray
Write-Host ""
Write-Host " Press any key to finish..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
