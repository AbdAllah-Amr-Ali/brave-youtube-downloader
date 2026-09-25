@echo off
REM Native Messaging Host wrapper for Brave YouTube yt-dlp Downloader
REM -u flag ensures binary unbuffered stdin/stdout
python -u "%~dp0host.py" %*
