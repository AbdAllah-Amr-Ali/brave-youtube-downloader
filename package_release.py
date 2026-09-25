#!/usr/bin/env python3
"""
Packages Brave YouTube Downloader into a distributable Setup ZIP archive.
Copies the zip into both dist/ and website/downloads/.
"""

import os
import shutil
import zipfile

PROJECT_ROOT = os.path.dirname(os.path.abspath(__file__))
DIST_DIR = os.path.join(PROJECT_ROOT, "dist")
WEBSITE_DOWNLOADS = os.path.join(PROJECT_ROOT, "website", "downloads")
ZIP_NAME = "Brave-YouTube-Downloader-Setup.zip"

os.makedirs(DIST_DIR, exist_ok=True)
os.makedirs(WEBSITE_DOWNLOADS, exist_ok=True)

readme_content = """====================================================================
           Brave YouTube yt-dlp Downloader - 1-Click Setup
====================================================================

HOW TO INSTALL IN 10 SECONDS:
1. Double-click "Install.bat"
2. The installer will automatically:
   - Check & install required dependencies (yt-dlp, FFmpeg, Node)
   - Set up the Native Messaging Host
   - Register Brave & Chrome Registry keys
   - Open Brave extensions page (brave://extensions)
3. In Brave, turn ON "Developer mode" (top-right switch).
4. Click "Load unpacked" (top-left) and select the extension folder
   (the installer automatically copies the path to your clipboard
    and opens the folder for you!).
5. Done! Enjoy seamless 4K/1080p downloads with file sizes directly in YouTube!

HOW TO UNINSTALL:
- Run "Uninstall.bat" anytime to cleanly remove registry keys and files.
====================================================================
"""

def create_package():
    temp_dir = os.path.join(DIST_DIR, "setup_temp")
    if os.path.exists(temp_dir):
        shutil.rmtree(temp_dir)
    os.makedirs(temp_dir)

    print("Building package directory structure...")

    # Copy installer files
    shutil.copy2(os.path.join(PROJECT_ROOT, "installer", "Install.bat"), temp_dir)
    shutil.copy2(os.path.join(PROJECT_ROOT, "installer", "install.ps1"), temp_dir)
    shutil.copy2(os.path.join(PROJECT_ROOT, "installer", "Uninstall.bat"), temp_dir)
    shutil.copy2(os.path.join(PROJECT_ROOT, "installer", "uninstall.ps1"), temp_dir)

    # Write README
    with open(os.path.join(temp_dir, "README.txt"), "w", encoding="utf-8") as f:
        f.write(readme_content)

    # Copy extension
    ext_dest = os.path.join(temp_dir, "extension")
    shutil.copytree(os.path.join(PROJECT_ROOT, "extension"), ext_dest)

    # Copy native-host
    host_dest = os.path.join(temp_dir, "native-host")
    shutil.copytree(os.path.join(PROJECT_ROOT, "native-host"), host_dest)

    # Zip everything
    dist_zip = os.path.join(DIST_DIR, ZIP_NAME)
    print(f"Creating archive: {dist_zip}...")
    with zipfile.ZipFile(dist_zip, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(temp_dir):
            for file in files:
                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, temp_dir)
                zipf.write(full_path, rel_path)

    # Copy to website downloads
    web_zip = os.path.join(WEBSITE_DOWNLOADS, ZIP_NAME)
    shutil.copy2(dist_zip, web_zip)
    print(f"Copied to website downloads: {web_zip}")

    # Cleanup temp
    shutil.rmtree(temp_dir)
    zip_size_mb = os.path.getsize(dist_zip) / (1024 * 1024)
    print(f"Package successfully created! ({zip_size_mb:.2f} MB)")
    return dist_zip

if __name__ == "__main__":
    create_package()
