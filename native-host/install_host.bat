@echo off
setlocal EnableDelayedExpansion

echo =======================================================
echo   Installing Brave YouTube yt-dlp Native Messaging Host
echo =======================================================
echo.

set "SCRIPT_DIR=%~dp0"
if "%SCRIPT_DIR:~-1%"=="\" set "SCRIPT_DIR=%SCRIPT_DIR:~0,-1%"

set "HOST_BAT=%SCRIPT_DIR%\host.bat"
set "MANIFEST_PATH=%SCRIPT_DIR%\com.ytdlp.brave_downloader.json"

set "HOST_BAT_ESCAPED=%HOST_BAT:\=\\%"

echo Updating manifest file with local path...
powershell -NoProfile -Command "$content = [System.IO.File]::ReadAllText('%MANIFEST_PATH%'); $newContent = $content -replace '\"path\":\s*\".*?\"', '\"path\": \"%HOST_BAT_ESCAPED%\"'; [System.IO.File]::WriteAllText('%MANIFEST_PATH%', $newContent, (New-Object System.Text.UTF8Encoding($false)))"

echo Registering Native Messaging Host in Windows Registry...

REM Register for Brave Browser
reg add "HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts\com.ytdlp.brave_downloader" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Registered for Brave Browser (HKCU\Software\BraveSoftware\Brave-Browser\NativeMessagingHosts)
) else (
    echo [WARNING] Could not write Brave registry key.
)

REM Register for Google Chrome / Chromium as well
reg add "HKCU\Software\Google\Chrome\NativeMessagingHosts\com.ytdlp.brave_downloader" /ve /t REG_SZ /d "%MANIFEST_PATH%" /f >nul 2>&1
if %ERRORLEVEL% equ 0 (
    echo [OK] Registered for Chrome/Chromium (HKCU\Software\Google\Chrome\NativeMessagingHosts)
)

echo.
echo =======================================================
echo   Installation Successful!
echo =======================================================
echo Manifest: %MANIFEST_PATH%
echo Host Bat: %HOST_BAT%
echo.
if "%~1"=="" pause
