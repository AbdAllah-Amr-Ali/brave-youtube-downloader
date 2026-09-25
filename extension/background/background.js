/**
 * Background Service Worker for Brave YouTube yt-dlp Downloader
 * Communicates with the Native Messaging Host 'com.ytdlp.brave_downloader'
 */

const NATIVE_HOST = "com.ytdlp.brave_downloader";

// Active download sessions: url -> { port, tabId }
const activeDownloads = new Map();

// Helper to get saved settings
async function getSettings() {
  const defaults = {
    defaultQuality: "best",
    downloadDir: "",
    showNotifications: true,
    alwaysAskFolder: true
  };
  return new Promise((resolve) => {
    chrome.storage.local.get(defaults, (items) => {
      resolve(items);
    });
  });
}

// Handle messages from content script or popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "ping_host") {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, { action: "ping" }, (response) => {
      if (chrome.runtime.lastError) {
        sendResponse({
          success: false,
          error: chrome.runtime.lastError.message
        });
      } else {
        sendResponse({
          success: true,
          data: response
        });
      }
    });
    return true; // Asynchronous response
  }

  if (request.action === "start_download") {
    const tabId = sender.tab ? sender.tab.id : null;
    startDownload(request, tabId, sendResponse);
    return true; // Asynchronous response
  }

  if (request.action === "cancel_download") {
    const url = request.url;
    const session = activeDownloads.get(url);
    if (session) {
      try {
        session.port.postMessage({ action: "cancel", url: url });
      } catch (e) {}
      setTimeout(() => {
        if (activeDownloads.has(url)) {
          try { session.port.disconnect(); } catch (e) {}
          activeDownloads.delete(url);
        }
      }, 600);
    }
    sendResponse({ success: true, message: "Cancel signal sent." });
    return false;
  }

  if (request.action === "get_sizes") {
    chrome.runtime.sendNativeMessage(NATIVE_HOST, { action: "get_sizes", url: request.url }, (response) => {
      if (chrome.runtime.lastError || !response || !response.sizes) {
        sendResponse({ success: false });
      } else {
        sendResponse({ success: true, sizes: response.sizes });
      }
    });
    return true; // Asynchronous response
  }

  if (request.action === "get_status") {
    const active = activeDownloads.get(request.url);
    sendResponse({ isDownloading: !!active });
    return false;
  }
});

async function startDownload(req, tabId, sendResponse) {
  const settings = await getSettings();
  const quality = req.quality || settings.defaultQuality || "best";
  const downloadDir = req.download_dir || settings.downloadDir || "";
  const askFolder = req.ask_folder !== undefined ? req.ask_folder : (settings.alwaysAskFolder !== false);
  const url = req.url;

  if (!url) {
    sendResponse({ success: false, error: "Missing video URL." });
    return;
  }

  try {
    const port = chrome.runtime.connectNative(NATIVE_HOST);

    activeDownloads.set(url, { port, tabId });

    port.onMessage.addListener((msg) => {
      // Remember selected folder for future downloads
      if (msg.type === "folder_selected" && msg.folder) {
        chrome.storage.local.set({ downloadDir: msg.folder });
      }

      // Forward progress or status to content script tab
      if (tabId) {
        chrome.tabs.sendMessage(tabId, {
          action: "download_update",
          url: url,
          data: msg
        }).catch(() => {
          // Tab might have navigated or closed
        });
      }

      if (msg.type === "cancelled") {
        activeDownloads.delete(url);
        port.disconnect();
      } else if (msg.type === "completed") {
        if (settings.showNotifications) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon128.png"),
            title: "Download Complete! 🎉",
            message: `Successfully downloaded video (${quality}).`
          });
        }
        activeDownloads.delete(url);
        port.disconnect();
      } else if (msg.type === "error") {
        if (settings.showNotifications) {
          chrome.notifications.create({
            type: "basic",
            iconUrl: chrome.runtime.getURL("icons/icon128.png"),
            title: "Download Failed ❌",
            message: msg.message || "An error occurred with yt-dlp."
          });
        }
        activeDownloads.delete(url);
        port.disconnect();
      }
    });

    port.onDisconnect.addListener(() => {
      const err = chrome.runtime.lastError ? chrome.runtime.lastError.message : "Disconnected";
      if (activeDownloads.has(url)) {
        activeDownloads.delete(url);
        if (tabId) {
          chrome.tabs.sendMessage(tabId, {
            action: "download_update",
            url: url,
            data: { type: "error", message: `Native host disconnected: ${err}` }
          }).catch(() => {});
        }
      }
    });

    // Send download command to host
    port.postMessage({
      action: "download",
      url: url,
      quality: quality,
      download_dir: downloadDir,
      ask_folder: askFolder
    });

    sendResponse({ success: true, message: "Download started." });

  } catch (err) {
    sendResponse({ success: false, error: err.message });
  }
}
