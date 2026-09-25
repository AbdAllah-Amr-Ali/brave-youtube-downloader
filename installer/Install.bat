@echo off
title Brave YouTube Downloader - 1-Click Installer
cd /d "%~dp0"
echo ====================================================================
echo      Brave YouTube Downloader - Auto-Installer Launcher
echo ====================================================================
echo Starting installer with PowerShell execution bypass...
echo.

powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"

if %ERRORLEVEL% NEQ 0 (
    echo.
    echo [ERROR] Installation encountered an issue.
    echo Please make sure you have an active internet connection.
    pause
)
