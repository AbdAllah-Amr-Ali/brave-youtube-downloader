/**
 * Logic for extension options and diagnostics popup.
 */

document.addEventListener("DOMContentLoaded", () => {
  const statusIndicator = document.getElementById("status-indicator");
  const statusText = document.getElementById("status-text");
  const toolDetails = document.getElementById("tool-details");
  const ytdlpVersion = document.getElementById("ytdlp-version");
  const ffmpegVersion = document.getElementById("ffmpeg-version");
  const btnTestConn = document.getElementById("btn-test-conn");

  const defaultQuality = document.getElementById("default-quality");
  const downloadDir = document.getElementById("download-dir");
  const alwaysAskFolder = document.getElementById("always-ask-folder");
  const showNotifications = document.getElementById("show-notifications");
  const btnSave = document.getElementById("btn-save");
  const saveFeedback = document.getElementById("save-feedback");

  // Load saved preferences
  chrome.storage.local.get(
    {
      defaultQuality: "best",
      downloadDir: "",
      alwaysAskFolder: true,
      showNotifications: true
    },
    (items) => {
      defaultQuality.value = items.defaultQuality || "best";
      downloadDir.value = items.downloadDir || "";
      alwaysAskFolder.checked = items.alwaysAskFolder !== false;
      showNotifications.checked = items.showNotifications !== false;
    }
  );

  // Ping native host function
  function testConnection() {
    statusIndicator.className = "indicator";
    statusText.textContent = "Connecting to host...";
    toolDetails.style.display = "none";

    chrome.runtime.sendMessage({ action: "ping_host" }, (response) => {
      if (chrome.runtime.lastError || !response || !response.success) {
        const err = response ? response.error : chrome.runtime.lastError.message;
        statusIndicator.className = "indicator error";
        statusText.textContent = "Host disconnected";
        toolDetails.style.display = "block";
        ytdlpVersion.textContent = "Error";
        ffmpegVersion.textContent = err || "Please run install_host.bat";
        return;
      }

      const data = response.data;
      if (data && data.status === "ok") {
        statusIndicator.className = "indicator connected";
        statusText.textContent = "Connected to yt-dlp";
        toolDetails.style.display = "block";
        ytdlpVersion.textContent = data.ytdlp ? data.ytdlp.version : "Found";
        ffmpegVersion.textContent = data.ffmpeg && data.ffmpeg.available ? "Available" : "Not found";

        if (!downloadDir.value && data.default_download_dir) {
          downloadDir.placeholder = data.default_download_dir;
        }
      } else {
        statusIndicator.className = "indicator error";
        statusText.textContent = "yt-dlp not detected";
        toolDetails.style.display = "block";
        ytdlpVersion.textContent = "Missing";
        ffmpegVersion.textContent = "-";
      }
    });
  }

  btnTestConn.addEventListener("click", testConnection);

  // Save settings
  btnSave.addEventListener("click", () => {
    const quality = defaultQuality.value;
    const dir = downloadDir.value.trim();
    const askFolder = alwaysAskFolder.checked;
    const notify = showNotifications.checked;

    chrome.storage.local.set(
      {
        defaultQuality: quality,
        downloadDir: dir,
        alwaysAskFolder: askFolder,
        showNotifications: notify
      },
      () => {
        saveFeedback.textContent = "Preferences saved successfully!";
        setTimeout(() => {
          saveFeedback.textContent = "";
        }, 2500);
      }
    );
  });

  // Automatically check connection on popup load
  testConnection();
});
