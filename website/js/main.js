/**
 * Brave YouTube Downloader Landing Website
 * Interactive Simulator, Clipboard Actions, and FAQ Accordion
 */

document.addEventListener("DOMContentLoaded", () => {
  // 1. Copy PowerShell Commands
  setupCopyButtons();

  // 2. Interactive Simulator
  setupSimulator();

  // 3. FAQ Accordion
  setupFaqAccordion();
});

function setupCopyButtons() {
  const copyCmdBtn = document.getElementById("copyCmdBtn");
  const copyFeedback = document.getElementById("copyFeedback");
  const installCommand = document.getElementById("installCommand");
  const termTabs = document.querySelectorAll(".term-tab");

  // Tab switching
  termTabs.forEach((tab) => {
    tab.addEventListener("click", () => {
      termTabs.forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      const cmd = tab.getAttribute("data-cmd");
      if (cmd && installCommand) {
        installCommand.textContent = cmd;
      }
    });
  });

  if (copyCmdBtn && installCommand) {
    copyCmdBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(installCommand.textContent.trim()).then(() => {
        copyFeedback.textContent = "Copied! ✓";
        setTimeout(() => {
          copyFeedback.textContent = "Copy";
        }, 2000);
      });
    });
  }

  const copyPsSnippetBtn = document.getElementById("copyPsSnippetBtn");
  const copyPsFeedback = document.getElementById("copyPsFeedback");
  const psCodeSnippet = document.getElementById("psCodeSnippet");

  if (copyPsSnippetBtn && psCodeSnippet) {
    copyPsSnippetBtn.addEventListener("click", () => {
      navigator.clipboard.writeText(psCodeSnippet.textContent.trim()).then(() => {
        copyPsFeedback.textContent = "Copied! ✓";
        setTimeout(() => {
          copyPsFeedback.textContent = "Copy";
        }, 2000);
      });
    });
  }
}

function setupSimulator() {
  const simBtnGroup = document.getElementById("simBtnGroup");
  const simMainBtn = document.getElementById("simMainBtn");
  const simArrowBtn = document.getElementById("simArrowBtn");
  const simBtnText = document.getElementById("simBtnText");
  const simDropdown = document.getElementById("simDropdown");
  const simFolderModal = document.getElementById("simFolderModal");
  const simCloseModal = document.getElementById("simCloseModal");
  const simModalCancelBtn = document.getElementById("simModalCancelBtn");
  const simModalSaveBtn = document.getElementById("simModalSaveBtn");
  const demoWrapper = document.getElementById("demoWrapper");

  let isSimDownloading = false;
  let simDownloadTimer = null;
  let selectedQuality = "Best Video (~142 MB)";

  // SVG Icons
  const ARROW_SVG = `<svg class="sim-icon-arrow" viewBox="0 0 24 24"><path d="M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z"/></svg>`;
  const CANCEL_SVG = `<svg class="sim-icon-arrow" viewBox="0 0 24 24"><path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/></svg>`;

  function toggleDropdown() {
    if (isSimDownloading) {
      cancelDownload();
      return;
    }
    const isOpen = simDropdown.classList.contains("show");
    if (isOpen) {
      closeDropdown();
    } else {
      openDropdown();
    }
  }

  function openDropdown() {
    simDropdown.classList.add("show");
    simBtnGroup.classList.add("dropdown-open");
  }

  function closeDropdown() {
    simDropdown.classList.remove("show");
    simBtnGroup.classList.remove("dropdown-open");
  }

  function showFolderModal(quality) {
    selectedQuality = quality;
    closeDropdown();
    simFolderModal.classList.add("show");
  }

  function hideFolderModal() {
    simFolderModal.classList.remove("show");
  }

  function startDownload() {
    hideFolderModal();
    isSimDownloading = true;
    simBtnGroup.className = "sim-btn-group downloading";
    simArrowBtn.innerHTML = CANCEL_SVG;
    simArrowBtn.title = "Cancel active download";
    simBtnText.textContent = "Starting...";

    let progress = 0;
    simDownloadTimer = setInterval(() => {
      progress += Math.floor(Math.random() * 18) + 12;
      if (progress >= 100) {
        clearInterval(simDownloadTimer);
        simBtnText.textContent = "Merging...";
        setTimeout(() => {
          simBtnText.textContent = "✓ Done!";
          simBtnGroup.className = "sim-btn-group success";
          simArrowBtn.innerHTML = ARROW_SVG;
          simArrowBtn.title = "Select Resolution";
          setTimeout(resetSimulator, 3500);
        }, 1000);
      } else {
        simBtnText.textContent = `${progress}% (18.4 MB/s)`;
      }
    }, 450);
  }

  function cancelDownload() {
    if (simDownloadTimer) clearInterval(simDownloadTimer);
    simBtnText.textContent = "Cancelled";
    setTimeout(resetSimulator, 1000);
  }

  function resetSimulator() {
    isSimDownloading = false;
    if (simDownloadTimer) clearInterval(simDownloadTimer);
    simBtnGroup.className = "sim-btn-group";
    simBtnText.textContent = "Download";
    simArrowBtn.innerHTML = ARROW_SVG;
    simArrowBtn.title = "Select Resolution";
  }

  // Event Listeners
  if (simArrowBtn) {
    simArrowBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      toggleDropdown();
    });
  }

  if (simMainBtn) {
    simMainBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      if (isSimDownloading) {
        cancelDownload();
      } else {
        showFolderModal("Best Video (~142 MB)");
      }
    });
  }

  // Dropdown Items Click
  const simItems = document.querySelectorAll(".sim-item");
  simItems.forEach((item) => {
    item.addEventListener("click", (e) => {
      e.stopPropagation();
      const label = item.querySelector(".sim-label").textContent;
      const size = item.querySelector(".sim-size").textContent;
      showFolderModal(`${label} (${size})`);
    });
  });

  // Modal Buttons
  if (simCloseModal) simCloseModal.addEventListener("click", hideFolderModal);
  if (simModalCancelBtn) simModalCancelBtn.addEventListener("click", hideFolderModal);
  if (simModalSaveBtn) simModalSaveBtn.addEventListener("click", startDownload);

  // Close dropdown when clicking outside
  document.addEventListener("click", (e) => {
    if (demoWrapper && !demoWrapper.contains(e.target)) {
      closeDropdown();
    }
  });
}

function setupFaqAccordion() {
  const faqItems = document.querySelectorAll(".faq-item");
  faqItems.forEach((item) => {
    const questionBtn = item.querySelector(".faq-question");
    questionBtn.addEventListener("click", () => {
      const isActive = item.classList.contains("active");
      // Close other items
      faqItems.forEach((other) => other.classList.remove("active"));
      if (!isActive) {
        item.classList.add("active");
      }
    });
  });
}
