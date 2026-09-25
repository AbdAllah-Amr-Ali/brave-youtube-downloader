@echo off
echo =========================================================
echo   Uninstalling Brave YouTube yt-dlp Native Messaging Host
echo =========================================================
echo.

reg delete "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.ytdlp.brave_downloader" /f >nul 2>&1
echo [OK] Removed Brave Browser registry key.

reg delete "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.ytdlp.brave_downloader" /f >nul 2>&1
echo [OK] Removed Chrome registry key.

echo.
echo Host uninstalled successfully.
echo.
pause
