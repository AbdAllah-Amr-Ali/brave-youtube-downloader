@echo off
title Brave YouTube Downloader - 1-Click Installer
cd /d "%~dp0"
echo ====================================================================
echo      Brave YouTube Downloader - Auto-Installer Launcher
echo ====================================================================
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0installer\install.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation encountered an issue.
    echo Please make sure you have an active internet connection.
    pause
)
