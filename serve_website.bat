@echo off
title Brave YouTube Downloader - Preview Website
cd /d "%~dp0website"
echo Starting website server on http://localhost:8080...
python serve.py
pause
