#!/usr/bin/env python3
"""
Chromium Native Messaging Host for Brave YouTube yt-dlp Downloader.
Handles communication between the browser extension and local yt-dlp CLI.
"""

import sys
import os
import json
import struct
import shutil
import subprocess
import threading
import re

# On Windows, enforce binary mode for stdin and stdout
if sys.platform == "win32":
    import msvcrt
    try:
        msvcrt.setmode(sys.stdin.fileno(), os.O_BINARY)
        msvcrt.setmode(sys.stdout.fileno(), os.O_BINARY)
    except Exception:
        pass

def find_executable(name, fallback_paths=None):
    """Find executable on PATH or in common fallback locations."""
    path = shutil.which(name)
    if path and os.path.isfile(path):
        return path
    if fallback_paths:
        for p in fallback_paths:
            if os.path.isfile(p):
                return p
    return None

HOST_DIR = os.path.dirname(os.path.abspath(__file__))

YTDLP_PATHS = [
    os.path.join(HOST_DIR, "bin", "yt-dlp.exe"),
    os.path.join(HOST_DIR, "..", "bin", "yt-dlp.exe"),
    os.path.expandvars(r"%LOCALAPPDATA%\BraveYtDlpExtension\bin\yt-dlp.exe"),
    r"C:\FFmpeg\bin\yt-dlp.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\Python\Python314\Scripts\yt-dlp.exe"),
    os.path.expandvars(r"%APPDATA%\Python\Python314\Scripts\yt-dlp.exe"),
    os.path.expandvars(r"%USERPROFILE%\yt-dlp.exe"),
]

FFMPEG_PATHS = [
    os.path.join(HOST_DIR, "bin", "ffmpeg.exe"),
    os.path.join(HOST_DIR, "..", "bin", "ffmpeg.exe"),
    os.path.expandvars(r"%LOCALAPPDATA%\BraveYtDlpExtension\bin\ffmpeg.exe"),
    r"C:\FFmpeg\bin\ffmpeg.exe",
    r"C:\ProgramData\chocolatey\bin\ffmpeg.exe",
]

NODE_PATHS = [
    os.path.join(HOST_DIR, "bin", "node.exe"),
    os.path.join(HOST_DIR, "..", "bin", "node.exe"),
    os.path.expandvars(r"%LOCALAPPDATA%\BraveYtDlpExtension\bin\node.exe"),
    r"C:\Program Files\nodejs\node.exe",
    os.path.expandvars(r"%LOCALAPPDATA%\Programs\nodejs\node.exe"),
]

YTDLP_BIN = find_executable("yt-dlp", YTDLP_PATHS) or "yt-dlp"
FFMPEG_BIN = find_executable("ffmpeg", FFMPEG_PATHS) or "ffmpeg"
NODE_BIN = find_executable("node", NODE_PATHS)

stdout_lock = threading.Lock()
active_process = None
active_process_lock = threading.Lock()
is_cancelling = False

def kill_active_process():
    """Immediately kills the active yt-dlp and ffmpeg processes on Windows."""
    global active_process, is_cancelling
    is_cancelling = True
    with active_process_lock:
        if active_process is not None:
            try:
                subprocess.run(
                    ["taskkill", "/F", "/T", "/PID", str(active_process.pid)],
                    capture_output=True
                )
            except Exception:
                try:
                    active_process.kill()
                except Exception:
                    pass
            active_process = None

def read_message():
    """Reads a message from standard input (Chromium Native Messaging format)."""
    raw_length = sys.stdin.buffer.read(4)
    if not raw_length or len(raw_length) < 4:
        return None
    message_length = struct.unpack("@I", raw_length)[0]
    raw_data = sys.stdin.buffer.read(message_length)
    if not raw_data or len(raw_data) < message_length:
        return None
    return json.loads(raw_data.decode("utf-8"))

def send_message(message_content):
    """Sends a message to standard output with thread locking."""
    with stdout_lock:
        try:
            encoded = json.dumps(message_content).encode("utf-8")
            sys.stdout.buffer.write(struct.pack("@I", len(encoded)))
            sys.stdout.buffer.write(encoded)
            sys.stdout.buffer.flush()
        except Exception:
            pass

def get_default_download_dir():
    """Returns default YouTube downloads directory."""
    user_profile = os.environ.get("USERPROFILE") or os.path.expanduser("~")
    downloads = os.path.join(user_profile, "Downloads", "YouTube")
    return downloads

def handle_ping():
    """Check CLI tools availability and return versions."""
    ytdlp_ver = "not found"
    ffmpeg_ver = "not found"
    ytdlp_ok = False
    ffmpeg_ok = False

    try:
        proc = subprocess.run([YTDLP_BIN, "--version"], capture_output=True, text=True, timeout=5)
        if proc.returncode == 0:
            ytdlp_ver = proc.stdout.strip()
            ytdlp_ok = True
    except Exception as e:
        ytdlp_ver = f"Error: {e}"

    try:
        proc = subprocess.run([FFMPEG_BIN, "-version"], capture_output=True, text=True, timeout=5)
        if proc.returncode == 0:
            first_line = proc.stdout.splitlines()[0] if proc.stdout else ""
            ffmpeg_ver = first_line.strip()
            ffmpeg_ok = True
    except Exception as e:
        ffmpeg_ver = f"Error: {e}"

    send_message({
        "type": "ping_response",
        "status": "ok" if ytdlp_ok else "missing_ytdlp",
        "ytdlp": {
            "path": YTDLP_BIN,
            "version": ytdlp_ver,
            "available": ytdlp_ok
        },
        "ffmpeg": {
            "path": FFMPEG_BIN,
            "version": ffmpeg_ver,
            "available": ffmpeg_ok
        },
        "default_download_dir": get_default_download_dir()
    })

def build_format_args(quality, custom_format=None):
    """
    Builds yt-dlp format selector arguments based on user quality request:
    - best: max quality video + best audio
    - 1080p, 720p, 480p, 360p, 240p, 144p: best video with height <= target + best audio
    - audio_mp3: extract audio to mp3
    - audio_m4a: extract audio to m4a
    - audio_best: best audio
    """
    if custom_format:
        return ["-f", custom_format]

    quality = str(quality).lower().strip()

    if quality == "best":
        return ["-f", "bestvideo+bestaudio/best"]
    elif quality == "1080p":
        return ["-f", "bestvideo[height<=1080]+bestaudio/best[height<=1080]"]
    elif quality == "720p":
        return ["-f", "bestvideo[height<=720]+bestaudio/best[height<=720]"]
    elif quality == "480p":
        return ["-f", "bestvideo[height<=480]+bestaudio/best[height<=480]"]
    elif quality == "360p":
        return ["-f", "bestvideo[height<=360]+bestaudio/best[height<=360]"]
    elif quality == "240p":
        return ["-f", "bestvideo[height<=240]+bestaudio/best[height<=240]"]
    elif quality == "144p":
        return ["-f", "bestvideo[height<=144]+bestaudio/best[height<=144]"]
    elif quality == "audio_mp3" or quality == "mp3":
        return ["-x", "--audio-format", "mp3", "--audio-quality", "0"]
    elif quality == "audio_m4a" or quality == "m4a":
        return ["-x", "--audio-format", "m4a"]
    elif quality == "audio_best":
        return ["-x"]
    else:
        # Fallback to best
        return ["-f", "bestvideo+bestaudio/best"]

PROGRESS_REGEX = re.compile(
    r"\[download\]\s+([0-9.]+)%\s+of\s+(?:~?\s*)?([0-9.]+[a-zA-Z]+|\S+)\s+at\s+([0-9.]+[a-zA-Z]+/s|\S+)\s+ETA\s+(\S+)"
)

def pick_download_folder(initial_dir):
    """Opens a native Windows folder picker dialog on top of the browser."""
    try:
        import tkinter as tk
        from tkinter import filedialog

        root = tk.Tk()
        root.withdraw()
        root.wm_attributes("-topmost", 1)
        root.focus_force()

        if not initial_dir or not os.path.isdir(initial_dir):
            initial_dir = get_default_download_dir()
            try:
                os.makedirs(initial_dir, exist_ok=True)
            except Exception:
                initial_dir = os.path.expanduser("~")

        chosen = filedialog.askdirectory(
            parent=root,
            initialdir=initial_dir,
            title="Select Folder to Save YouTube Video"
        )
        root.destroy()
        return chosen if chosen else None
    except Exception as e:
        return None

def handle_download(msg):
    """Executes yt-dlp to download a video and streams progress back to the extension."""
    url = msg.get("url")
    if not url:
        send_message({"type": "error", "message": "No URL provided for download."})
        return

    quality = msg.get("quality", "best")
    custom_format = msg.get("custom_format")
    ask_folder = msg.get("ask_folder", True)
    download_dir = msg.get("download_dir")

    if ask_folder:
        send_message({
            "type": "status_update",
            "status": "asking_folder",
            "message": "Select download folder..."
        })
        initial_dir = download_dir if (download_dir and os.path.isdir(download_dir)) else get_default_download_dir()
        chosen = pick_download_folder(initial_dir)
        if not chosen:
            send_message({"type": "cancelled", "message": "Download cancelled by user."})
            return
        download_dir = chosen
        send_message({"type": "folder_selected", "folder": download_dir})
    elif not download_dir:
        download_dir = get_default_download_dir()

    # Ensure output directory exists
    try:
        os.makedirs(download_dir, exist_ok=True)
    except Exception as e:
        send_message({"type": "error", "message": f"Could not create download folder: {e}"})
        return

    output_template = os.path.join(download_dir, "%(title)s [%(id)s].%(ext)s")

    cmd = [
        YTDLP_BIN,
        "--newline",
        "--progress",
        "--no-playlist",
        "--retries", "3",
        "--fragment-retries", "3",
        "-o", output_template,
    ]

    # Add Node.js runtime to solve YouTube cipher challenges and avoid 403 Forbidden
    if NODE_BIN and os.path.isfile(NODE_BIN):
        cmd.extend(["--js-runtimes", f"node:{NODE_BIN}"])

    # Add ffmpeg location if detected
    if os.path.isfile(FFMPEG_BIN):
        ffmpeg_dir = os.path.dirname(FFMPEG_BIN)
        cmd.extend(["--ffmpeg-location", ffmpeg_dir])

    # Format arguments
    cmd.extend(build_format_args(quality, custom_format))

    # Target URL
    cmd.append(url)

    send_message({
        "type": "started",
        "url": url,
        "quality": quality,
        "download_dir": download_dir
    })

    global active_process, is_cancelling
    is_cancelling = False

    PERCENT_REGEX = re.compile(r"\[download\]\s+([0-9.]+)%")
    SPEED_REGEX = re.compile(r"at\s+([0-9.]+[a-zA-Z]+/s|\S+/s)")
    ETA_REGEX = re.compile(r"ETA\s+(\S+)")
    TOTAL_REGEX = re.compile(r"of\s+(?:~?\s*)?([0-9.]+[a-zA-Z]+)")

    last_percent = ""
    last_error = ""

    try:
        proc = subprocess.Popen(
            cmd,
            stdin=subprocess.DEVNULL,
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
            text=True,
            bufsize=1,
            universal_newlines=True
        )

        with active_process_lock:
            active_process = proc

        while True:
            if is_cancelling:
                break
            line = proc.stdout.readline()
            if not line and proc.poll() is not None:
                break
            line_str = line.strip()
            if not line_str or is_cancelling:
                continue

            if "ERROR:" in line_str or "HTTP Error" in line_str:
                last_error = line_str

            # If extraction is happening before downloading
            if "[youtube]" in line_str or "[info]" in line_str:
                if not is_cancelling:
                    send_message({
                        "type": "status_update",
                        "status": "extracting",
                        "message": "Extracting..."
                    })

            # Check for progress percentage
            pct_match = PERCENT_REGEX.search(line_str)
            if pct_match:
                percent = pct_match.group(1)
                speed_match = SPEED_REGEX.search(line_str)
                eta_match = ETA_REGEX.search(line_str)
                total_match = TOTAL_REGEX.search(line_str)

                speed = speed_match.group(1) if speed_match else ""
                eta = eta_match.group(1) if eta_match else ""
                total_size = total_match.group(1) if total_match else ""

                if percent != last_percent and not is_cancelling:
                    last_percent = percent
                    send_message({
                        "type": "progress",
                        "percent": float(percent),
                        "total_size": total_size,
                        "speed": speed,
                        "eta": eta,
                        "status": "downloading"
                    })
            elif "[Merger]" in line_str or "merging" in line_str.lower():
                if not is_cancelling:
                    send_message({
                        "type": "status_update",
                        "status": "merging",
                        "message": "Merging video and audio..."
                    })
            elif "[ExtractAudio]" in line_str or "extracting audio" in line_str.lower():
                if not is_cancelling:
                    send_message({
                        "type": "status_update",
                        "status": "extracting_audio",
                        "message": "Converting audio..."
                    })

        return_code = proc.wait()

        with active_process_lock:
            active_process = None

        if is_cancelling:
            send_message({
                "type": "cancelled",
                "message": "Download cancelled by user."
            })
            return

        if return_code == 0:
            send_message({
                "type": "completed",
                "status": "success",
                "url": url,
                "download_dir": download_dir,
                "message": "Download completed successfully!"
            })
        else:
            err_msg = last_error if last_error else f"yt-dlp exited with code {return_code}"
            send_message({
                "type": "error",
                "status": "failed",
                "message": err_msg
            })

    except Exception as e:
        with active_process_lock:
            active_process = None
        if not is_cancelling:
            send_message({
                "type": "error",
                "message": f"Execution error: {str(e)}"
            })

video_sizes_cache = {}

def calculate_format_sizes(data):
    """Calculates approximate file sizes for each target resolution."""
    formats = data.get("formats", [])
    duration = data.get("duration", 0)
    audio_formats = [f for f in formats if f.get("vcodec") == "none" and f.get("acodec") != "none"]
    best_audio = max(audio_formats, key=lambda f: f.get("abr") or 0) if audio_formats else None
    audio_size = 0
    if best_audio:
        audio_size = best_audio.get("filesize") or best_audio.get("filesize_approx") or 0
        if not audio_size and best_audio.get("abr") and duration:
            audio_size = int((best_audio.get("abr") * 1000 / 8) * duration)

    res_map = {
        "1080p": 1080,
        "720p": 720,
        "480p": 480,
        "360p": 360,
        "240p": 240,
        "144p": 144
    }

    results = {"audio_mp3": audio_size}
    video_formats = [f for f in formats if f.get("vcodec") != "none" and f.get("height")]
    available_heights = sorted(list(set(f.get("height") for f in video_formats)), reverse=True)
    max_h = available_heights[0] if available_heights else 0

    for key, target_h in res_map.items():
        matching = [f for f in video_formats if f.get("height") <= target_h]
        if matching:
            best_v = max(matching, key=lambda f: (f.get("height") or 0, f.get("tbr") or 0))
            v_size = best_v.get("filesize") or best_v.get("filesize_approx")
            if not v_size and best_v.get("tbr") and duration:
                v_size = int((best_v.get("tbr") * 1000 / 8) * duration)
            results[key] = (v_size or 0) + audio_size

    if max_h:
        best_v = max(video_formats, key=lambda f: (f.get("height") or 0, f.get("tbr") or 0))
        v_size = best_v.get("filesize") or best_v.get("filesize_approx")
        if not v_size and best_v.get("tbr") and duration:
            v_size = int((best_v.get("tbr") * 1000 / 8) * duration)
        results["best"] = (v_size or 0) + audio_size

    return results

def handle_get_sizes(msg):
    """Fetches video format metadata and calculates sizes for each resolution."""
    url = msg.get("url")
    if not url:
        send_message({"type": "sizes_response", "url": url, "sizes": {}})
        return

    if url in video_sizes_cache:
        send_message({"type": "sizes_response", "url": url, "sizes": video_sizes_cache[url]})
        return

    try:
        cmd = [
            YTDLP_BIN,
            "--no-playlist",
            "-J"
        ]
        if NODE_BIN and os.path.isfile(NODE_BIN):
            cmd.extend(["--js-runtimes", f"node:{NODE_BIN}"])
        cmd.append(url)

        proc = subprocess.run(
            cmd,
            stdin=subprocess.DEVNULL,
            capture_output=True,
            text=True,
            encoding="utf-8"
        )
        if proc.returncode == 0:
            data = json.loads(proc.stdout)
            sizes = calculate_format_sizes(data)
            video_sizes_cache[url] = sizes
            send_message({"type": "sizes_response", "url": url, "sizes": sizes})
        else:
            send_message({"type": "sizes_response", "url": url, "sizes": {}})
    except Exception:
        send_message({"type": "sizes_response", "url": url, "sizes": {}})

def main():
    while True:
        try:
            msg = read_message()
            if msg is None:
                kill_active_process()
                break

            action = msg.get("action")
            if action == "ping":
                handle_ping()
            elif action == "cancel":
                kill_active_process()
                send_message({
                    "type": "cancelled",
                    "message": "Download cancelled by user."
                })
            elif action == "get_sizes":
                t = threading.Thread(target=handle_get_sizes, args=(msg,), daemon=True)
                t.start()
            elif action == "download":
                # Spawn download in background thread so main thread can process 'cancel'
                t = threading.Thread(target=handle_download, args=(msg,), daemon=True)
                t.start()
            else:
                send_message({"type": "error", "message": f"Unknown action '{action}'"})
        except Exception as e:
            kill_active_process()
            send_message({"type": "error", "message": f"Host exception: {str(e)}"})
            break

if __name__ == "__main__":
    main()
