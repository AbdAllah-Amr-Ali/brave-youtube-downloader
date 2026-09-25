/**
 * Content script injected into YouTube video and shorts pages.
 * Renders native-styled download button and quality selector.
 */

(function () {
  const BUTTON_WRAPPER_ID = "yt-dlp-download-wrapper";
  let currentVideoUrl = "";
  let isDownloading = false;

  // SVG Icons
  const DOWNLOAD_ICON_SVG = `
    <svg class="yt-dlp-icon" viewBox="0 0 24 24">
      <path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/>
    </svg>
  `;

  const CHEVRON_ICON_SVG = `
    <svg class="yt-dlp-icon-chevron" viewBox="0 0 24 24">
      <path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/>
    </svg>
  `;

  const CANCEL_ICON_SVG = `
    <svg class="yt-dlp-icon-cancel" viewBox="0 0 24 24">
      <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
    </svg>
  `;

  // Resolution options with labels, badges, and heights
  const QUALITY_OPTIONS = [
    { id: "best", label: "Best Video", badge: "MAX", height: 9999, icon: "🎬" },
    { id: "1080p", label: "Full HD", badge: "1080p", height: 1080, icon: "🎬" },
    { id: "720p", label: "HD", badge: "720p", height: 720, icon: "🎬" },
    { id: "480p", label: "Standard", badge: "480p", height: 480, icon: "🎬" },
    { id: "360p", label: "Low", badge: "360p", height: 360, icon: "🎬" },
    { id: "240p", label: "Very Low", badge: "240p", height: 240, icon: "🎬" },
    { id: "144p", label: "Minimum", badge: "144p", height: 144, icon: "🎬" },
    { id: "divider" },
    { id: "audio_mp3", label: "Audio Only", badge: "MP3", height: 0, icon: "🎵" }
  ];

  const videoSizesCache = new Map();

  function isWatchPage() {
    return window.location.pathname === "/watch" || window.location.pathname.startsWith("/shorts/");
  }

  function getCleanVideoId() {
    if (window.location.pathname.startsWith("/shorts/")) {
      return window.location.pathname.split("/")[2] || "";
    }
    const params = new URLSearchParams(window.location.search);
    return params.get("v") || "";
  }

  function getCleanVideoUrl() {
    if (window.location.pathname.startsWith("/shorts/")) {
      const shortsId = window.location.pathname.split("/")[2];
      return `https://www.youtube.com/watch?v=${shortsId}`;
    }
    const params = new URLSearchParams(window.location.search);
    const videoId = params.get("v");
    return videoId ? `https://www.youtube.com/watch?v=${videoId}` : window.location.href;
  }

  function formatBytes(bytes) {
    if (!bytes || bytes <= 0) return "";
    const mb = bytes / (1024 * 1024);
    if (mb >= 1000) {
      return `~${(mb / 1024).toFixed(1)} GB`;
    } else if (mb >= 10) {
      return `~${Math.round(mb)} MB`;
    } else if (mb >= 1) {
      return `~${mb.toFixed(1)} MB`;
    } else {
      return `~${Math.round(bytes / 1024)} KB`;
    }
  }

  function applySizesToDropdown(sizes) {
    if (!sizes) return;
    const dropdown = document.getElementById(DROPDOWN_ID);
    if (!dropdown) return;

    for (const [key, val] of Object.entries(sizes)) {
      const sizeEl = dropdown.querySelector(`.quality-size[data-size-quality="${key}"]`);
      if (sizeEl) {
        if (typeof val === "string") {
          sizeEl.textContent = val;
        } else if (typeof val === "number" && val > 0) {
          sizeEl.textContent = formatBytes(val);
        } else {
          sizeEl.textContent = "";
        }
      }
    }
  }

  function parsePlayerResponse(pr) {
    if (!pr || !pr.streamingData || !pr.streamingData.adaptiveFormats) return;
    const videoId = pr.videoDetails?.videoId || getCleanVideoId();
    const adaptive = pr.streamingData.adaptiveFormats;

    // Best audio format
    const audioFormats = adaptive.filter((f) => f.mimeType && f.mimeType.startsWith("audio/"));
    let bestAudio = null;
    for (const af of audioFormats) {
      if (!bestAudio || (af.bitrate || 0) > (bestAudio.bitrate || 0)) {
        bestAudio = af;
      }
    }
    let audioBytes = 0;
    if (bestAudio) {
      if (bestAudio.contentLength) {
        audioBytes = parseInt(bestAudio.contentLength, 10);
      } else if (bestAudio.averageBitrate && bestAudio.approxDurationMs) {
        audioBytes = Math.round((bestAudio.averageBitrate / 8) * (parseInt(bestAudio.approxDurationMs, 10) / 1000));
      }
    }

    // Video formats by height
    const heightSizes = {};
    for (const f of adaptive) {
      if (!f.mimeType || !f.mimeType.startsWith("video/")) continue;
      const h = f.height;
      if (!h) continue;
      let vBytes = 0;
      if (f.contentLength) {
        vBytes = parseInt(f.contentLength, 10);
      } else if (f.averageBitrate && f.approxDurationMs) {
        vBytes = Math.round((f.averageBitrate / 8) * (parseInt(f.approxDurationMs, 10) / 1000));
      }
      if (vBytes > 0) {
        if (!heightSizes[h] || vBytes > heightSizes[h]) {
          heightSizes[h] = vBytes;
        }
      }
    }

    const availableHeights = Object.keys(heightSizes).map(Number).sort((a, b) => b - a);
    const maxH = availableHeights.length > 0 ? availableHeights[0] : 0;
    const sizes = {};

    QUALITY_OPTIONS.forEach((opt) => {
      if (opt.id === "divider") return;
      if (opt.id === "audio_mp3") {
        sizes[opt.id] = audioBytes;
      } else if (opt.id === "best") {
        sizes[opt.id] = maxH > 0 ? (heightSizes[maxH] + audioBytes) : 0;
      } else {
        const targetH = opt.height;
        const valid = availableHeights.filter((h) => h <= targetH);
        if (valid.length > 0) {
          const matchedH = valid[0];
          sizes[opt.id] = heightSizes[matchedH] + audioBytes;
        } else {
          sizes[opt.id] = 0;
        }
      }
    });

    if (videoId) {
      videoSizesCache.set(videoId, sizes);
    }
    applySizesToDropdown(sizes);
  }

  function checkScriptsForPlayerResponse() {
    const scripts = document.querySelectorAll("script");
    for (let i = 0; i < scripts.length; i++) {
      const txt = scripts[i].textContent;
      if (txt && txt.includes("ytInitialPlayerResponse")) {
        const m = txt.match(/ytInitialPlayerResponse\s*=\s*({.+?});/);
        if (m && m[1]) {
          try {
            const data = JSON.parse(m[1]);
            parsePlayerResponse(data);
            return;
          } catch(e) {}
        }
      }
    }
  }

  function injectPlayerResponseHook() {
    const scriptId = "yt-dlp-player-hook";
    if (document.getElementById(scriptId)) return;
    const script = document.createElement("script");
    script.id = scriptId;
    script.textContent = `
      (function() {
        function checkAndSend() {
          try {
            var pr = window.ytInitialPlayerResponse;
            if (!pr && window.ytplayer && window.ytplayer.config && window.ytplayer.config.args) {
              try { pr = JSON.parse(window.ytplayer.config.args.raw_player_response); } catch(e){}
            }
            var playerEl = document.getElementById("movie_player");
            if (!pr && playerEl && typeof playerEl.getPlayerResponse === "function") {
              pr = playerEl.getPlayerResponse();
            }
            if (pr && pr.streamingData) {
              window.postMessage({ type: "YTDLP_PLAYER_DATA", playerResponse: pr }, "*");
            }
          } catch(e) {}
        }
        window.addEventListener("yt-navigate-finish", function(e) {
          var pr = e && e.detail && e.detail.response && e.detail.response.playerResponse;
          if (pr && pr.streamingData) {
            window.postMessage({ type: "YTDLP_PLAYER_DATA", playerResponse: pr }, "*");
          } else {
            setTimeout(checkAndSend, 300);
            setTimeout(checkAndSend, 1000);
          }
        });
        checkAndSend();
        setTimeout(checkAndSend, 600);
        setTimeout(checkAndSend, 1500);
      })();
    `;
    (document.head || document.documentElement).appendChild(script);
  }

  window.addEventListener("message", (event) => {
    if (event.data && event.data.type === "YTDLP_PLAYER_DATA" && event.data.playerResponse) {
      parsePlayerResponse(event.data.playerResponse);
    }
  });

  function fetchSizesFromHost() {
    const videoId = getCleanVideoId();
    if (videoSizesCache.has(videoId)) return;

    chrome.runtime.sendMessage(
      {
        action: "get_sizes",
        url: getCleanVideoUrl()
      },
      (resp) => {
        if (resp && resp.success && resp.sizes) {
          if (videoId) videoSizesCache.set(videoId, resp.sizes);
          applySizesToDropdown(resp.sizes);
        }
      }
    );
  }

  const DROPDOWN_ID = "yt-dlp-floating-dropdown";

  function getOrCreateDropdown() {
    let dropdown = document.getElementById(DROPDOWN_ID);
    if (!dropdown) {
      dropdown = document.createElement("div");
      dropdown.id = DROPDOWN_ID;
      dropdown.className = "yt-dlp-dropdown";
      dropdown.innerHTML = `<div class="yt-dlp-menu-header">Video Resolutions</div>`;

      QUALITY_OPTIONS.forEach((opt) => {
        if (opt.id === "divider") {
          const div = document.createElement("div");
          div.className = "yt-dlp-menu-divider";
          dropdown.appendChild(div);
          return;
        }

        const item = document.createElement("div");
        item.className = "yt-dlp-menu-item";
        item.setAttribute("data-quality", opt.id);
        item.innerHTML = `
          <span>${opt.icon}</span>
          <span class="quality-label">${opt.label}</span>
          <span class="quality-size" data-size-quality="${opt.id}"></span>
          <span class="quality-badge">${opt.badge}</span>
        `;

        item.addEventListener("click", (e) => {
          e.stopPropagation();
          closeDropdown();
          triggerDownload(opt.id, `${opt.label} (${opt.badge})`);
        });

        dropdown.appendChild(item);
      });

      document.body.appendChild(dropdown);
    }

    const currentVid = getCleanVideoId();
    if (videoSizesCache.has(currentVid)) {
      applySizesToDropdown(videoSizesCache.get(currentVid));
    }

    return dropdown;
  }

  function updateDropdownPosition() {
    const group = document.getElementById("yt-dlp-btn-group");
    const dropdown = document.getElementById(DROPDOWN_ID);
    if (!group || !dropdown) return;

    const rect = group.getBoundingClientRect();
    const dropdownWidth = 280;

    // Place ABOVE button
    dropdown.style.top = "auto";
    dropdown.style.bottom = `${window.innerHeight - rect.top + 8}px`;

    // Ensure it doesn't overflow right edge of viewport
    let left = rect.left;
    if (left + dropdownWidth > window.innerWidth - 16) {
      left = rect.right - dropdownWidth;
    }
    dropdown.style.left = `${Math.max(10, left)}px`;
  }

  function openDropdown() {
    const dropdown = getOrCreateDropdown();
    const group = document.getElementById("yt-dlp-btn-group");
    updateDropdownPosition();
    dropdown.classList.add("show");
    if (group) group.classList.add("yt-dlp-dropdown-open");

    const videoId = getCleanVideoId();
    if (videoSizesCache.has(videoId)) {
      applySizesToDropdown(videoSizesCache.get(videoId));
    } else {
      checkScriptsForPlayerResponse();
      fetchSizesFromHost();
    }

    document.addEventListener("click", onDocumentClick, true);
    window.addEventListener("resize", closeDropdown);
    window.addEventListener("scroll", closeDropdown, { passive: true });
  }

  function closeDropdown() {
    const dropdown = document.getElementById(DROPDOWN_ID);
    const group = document.getElementById("yt-dlp-btn-group");
    if (dropdown) dropdown.classList.remove("show");
    if (group) group.classList.remove("yt-dlp-dropdown-open");

    document.removeEventListener("click", onDocumentClick, true);
    window.removeEventListener("resize", closeDropdown);
    window.removeEventListener("scroll", closeDropdown);
  }

  function onDocumentClick(e) {
    const dropdown = document.getElementById(DROPDOWN_ID);
    const menuBtn = document.getElementById("yt-dlp-menu-btn");
    if (dropdown && dropdown.contains(e.target)) return;
    if (menuBtn && menuBtn.contains(e.target)) return;
    closeDropdown();
  }

  function createButtonElement() {
    const wrapper = document.createElement("div");
    wrapper.id = BUTTON_WRAPPER_ID;

    wrapper.innerHTML = `
      <div class="yt-dlp-btn-group" id="yt-dlp-btn-group">
        <button class="yt-dlp-main-btn" id="yt-dlp-main-btn" title="Download with yt-dlp">
          ${DOWNLOAD_ICON_SVG}
          <span id="yt-dlp-btn-text">Download</span>
        </button>
        <button class="yt-dlp-menu-btn" id="yt-dlp-menu-btn" title="Select Resolution">
          ${CHEVRON_ICON_SVG}
        </button>
      </div>
    `;

    // Event listeners
    const mainBtn = wrapper.querySelector("#yt-dlp-main-btn");
    const menuBtn = wrapper.querySelector("#yt-dlp-menu-btn");

    mainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isDownloading) {
        triggerCancel();
        return;
      }
      closeDropdown();
      // Default to user's configured default or "best"
      chrome.storage.local.get({ defaultQuality: "best" }, (items) => {
        triggerDownload(items.defaultQuality || "best", "Best Video");
      });
    });

    menuBtn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (isDownloading) {
        triggerCancel();
        return;
      }
      const dropdown = document.getElementById(DROPDOWN_ID);
      const isOpen = dropdown && dropdown.classList.contains("show");
      if (isOpen) {
        closeDropdown();
      } else {
        openDropdown();
      }
    });

    return wrapper;
  }

  function triggerCancel() {
    const btnText = document.getElementById("yt-dlp-btn-text");
    if (btnText) btnText.textContent = "Cancelling...";
    chrome.runtime.sendMessage({
      action: "cancel_download",
      url: getCleanVideoUrl()
    });
  }

  function triggerDownload(quality, qualityLabel) {
    if (isDownloading) return;

    const url = getCleanVideoUrl();
    const btnText = document.getElementById("yt-dlp-btn-text");
    const btnGroup = document.getElementById("yt-dlp-btn-group");
    const mainBtn = document.getElementById("yt-dlp-main-btn");
    const menuBtn = document.getElementById("yt-dlp-menu-btn");

    isDownloading = true;
    if (btnText) btnText.textContent = "Select folder...";
    if (btnGroup) {
      btnGroup.className = "yt-dlp-btn-group downloading";
    }
    if (mainBtn) {
      mainBtn.title = "Click to cancel download";
    }
    if (menuBtn) {
      menuBtn.innerHTML = CANCEL_ICON_SVG;
      menuBtn.title = "Cancel download";
      menuBtn.classList.add("cancel-mode");
    }

    chrome.runtime.sendMessage(
      {
        action: "start_download",
        url: url,
        quality: quality
      },
      (response) => {
        if (!response || !response.success) {
          isDownloading = false;
          if (btnText) btnText.textContent = "Error";
          if (btnGroup) {
            btnGroup.className = "yt-dlp-btn-group error";
            btnGroup.title = response ? response.error : "Failed to connect to host";
          }
          setTimeout(resetButton, 4000);
        }
      }
    );
  }

  function resetButton() {
    isDownloading = false;
    const btnText = document.getElementById("yt-dlp-btn-text");
    const btnGroup = document.getElementById("yt-dlp-btn-group");
    const mainBtn = document.getElementById("yt-dlp-main-btn");
    const menuBtn = document.getElementById("yt-dlp-menu-btn");

    if (btnText) btnText.textContent = "Download";
    if (btnGroup) {
      btnGroup.className = "yt-dlp-btn-group";
      btnGroup.removeAttribute("title");
    }
    if (mainBtn) {
      mainBtn.title = "Download with yt-dlp";
    }
    if (menuBtn) {
      menuBtn.innerHTML = CHEVRON_ICON_SVG;
      menuBtn.title = "Select Resolution";
      menuBtn.classList.remove("cancel-mode");
    }
  }

  // Listen for progress / completion updates from background service worker
  chrome.runtime.onMessage.addListener((message) => {
    if (message.action !== "download_update") return;

    const data = message.data;
    const btnText = document.getElementById("yt-dlp-btn-text");
    const btnGroup = document.getElementById("yt-dlp-btn-group");

    if (!btnText || !btnGroup) return;

    if (data.type === "cancelled") {
      resetButton();
      return;
    } else if (data.type === "status_update") {
      if (data.status === "asking_folder") {
        btnText.textContent = "Select folder...";
      } else if (data.status === "extracting") {
        btnText.textContent = "Extracting...";
      } else if (data.status === "merging") {
        btnText.textContent = "Merging...";
      } else if (data.status === "extracting_audio") {
        btnText.textContent = "Converting...";
      }
    } else if (data.type === "started") {
      btnText.textContent = "Starting...";
    } else if (data.type === "progress") {
      const pct = Math.round(data.percent || 0);
      btnText.textContent = `${pct}% (${data.speed || ""})`;
    } else if (data.type === "completed") {
      btnText.textContent = "✓ Done!";
      btnGroup.className = "yt-dlp-btn-group success";
      setTimeout(resetButton, 5000);
    } else if (data.type === "error") {
      btnText.textContent = "❌ Error";
      btnGroup.className = "yt-dlp-btn-group error";
      btnGroup.title = data.message || "Download failed";
      setTimeout(resetButton, 5000);
    }
  });

  function findTargetContainer() {
    // 1. YouTube standard watch page actions container
    const targets = [
      "#top-level-buttons-computed",
      "ytd-watch-metadata #actions-inner #top-level-buttons-computed",
      "#actions #top-level-buttons-computed",
      "#actions-inner",
      "#owner",
      "ytd-reel-player-overlay-renderer #actions"
    ];

    for (const selector of targets) {
      const el = document.querySelector(selector);
      if (el && el.offsetParent !== null) {
        return el;
      }
    }
    return null;
  }

  function injectButton() {
    if (!isWatchPage()) return;

    const existing = document.getElementById(BUTTON_WRAPPER_ID);
    const target = findTargetContainer();

    if (!target) return;

    if (existing) {
      // If parent changed or existing is detached
      if (!target.contains(existing)) {
        target.prepend(existing);
      }
      return;
    }

    const btnWrapper = createButtonElement();
    target.prepend(btnWrapper);
  }

  function handleNavigation() {
    closeDropdown();
    injectPlayerResponseHook();
    const newUrl = getCleanVideoUrl();
    if (newUrl !== currentVideoUrl) {
      currentVideoUrl = newUrl;
      resetButton();
    }
    setTimeout(checkScriptsForPlayerResponse, 500);
    setTimeout(injectButton, 300);
    setTimeout(injectButton, 1000);
  }

  // Observer to handle YouTube dynamic DOM updates
  const observer = new MutationObserver(() => {
    if (isWatchPage() && !document.getElementById(BUTTON_WRAPPER_ID)) {
      injectButton();
    }
  });

  observer.observe(document.documentElement, {
    childList: true,
    subtree: true
  });

  // YouTube SPA event hooks
  window.addEventListener("yt-navigate-finish", handleNavigation);
  window.addEventListener("spfdone", handleNavigation);
  window.addEventListener("popstate", handleNavigation);

  // Initial injection attempt
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", handleNavigation);
  } else {
    handleNavigation();
  }
})();
