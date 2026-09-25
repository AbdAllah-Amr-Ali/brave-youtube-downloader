@echo off
title Brave YouTube Downloader - 1-Click Installer
cd /d "%~dp0"
echo ====================================================================
echo    🚀 Brave YouTube Downloader - 1-Click Auto Installer
echo ====================================================================
echo.

if exist "%~dp0install.ps1" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
) else if exist "%~dp0installer\install.ps1" (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\install.ps1"
) else (
    powershell.exe -NoProfile -ExecutionPolicy Bypass -Command "irm https://raw.githubusercontent.com/AbdAllah-Amr-Ali/brave-youtube-downloader/main/install.ps1 | iex"
)

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation encountered an issue.
    pause
)
