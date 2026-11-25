/* ==========================================================================
   Lonely 2 — PS4 Exploit Host Site Controller (God of War Edition)
   ========================================================================== */

(function () {
  "use strict";

  // DOM Elements
  const output = document.getElementById("console");
  const runBtn = document.getElementById("runBtn");
  const autoJbToggle = document.getElementById("autoJbToggle");
  const fwChip = document.getElementById("fwChip");
  const fwText = document.getElementById("fwText");
  const statusText = document.getElementById("statusText");
  const statusLed = document.getElementById("statusLed");
  const elfldrChip = document.getElementById("elfldrChip");
  const elfldrLed = document.getElementById("elfldrLed");
  const elfldrText = document.getElementById("elfldrText");
  const cacheChip = document.getElementById("cacheChip");
  const cacheLed = document.getElementById("cacheLed");
  const cacheText = document.getElementById("cacheText");
  const resetCacheBtn = document.getElementById("resetCacheBtn");
  const resetCacheLed = document.getElementById("resetCacheLed");
  const resetCacheText = document.getElementById("resetCacheText");
  const glassToggleBtn = document.getElementById("glassToggleBtn");

  /* --------------------------------------------------------------------------
     1. Status Helpers & Safe Console Logging
     -------------------------------------------------------------------------- */
  function writeLog(message, type = "info") {
    if (!output) return;

    let line = document.createElement("div");
    if (type === "error") {
      line.className = "log-error";
    } else if (type === "success") {
      line.className = "log-success";
    } else {
      line.className = "log-info";
    }

    let marker = "*";
    if (type === "error") marker = "-";
    else if (type === "info" || type === "success") marker = "+";

    line.textContent = `[${marker}] ${message}`;
    output.appendChild(line);

    // Keep internal scroll at bottom without moving parent window scroll position
    const prevWindowY = window.pageYOffset || document.documentElement.scrollTop || 0;
    output.scrollTop = output.scrollHeight;
    if ((window.pageYOffset || document.documentElement.scrollTop || 0) !== prevWindowY) {
      window.scrollTo(0, prevWindowY);
    }
  }

  function setStatus(text, state = "normal") {
    if (statusText) statusText.textContent = text;
    if (statusLed) {
      statusLed.className = "led";
      if (state === "running") statusLed.classList.add("led-yellow");
      else if (state === "success") statusLed.classList.add("led-green");
      else if (state === "error") statusLed.classList.add("led-red");
    }
  }

  function updateElfldrStatus(online) {
    if (elfldrLed) {
      elfldrLed.className = "led " + (online ? "led-green" : "led-yellow");
    }
    if (elfldrText) {
      elfldrText.textContent = "ELFLDR :9021 " + (online ? "(LISTENING)" : "(WAITING)");
    }
  }

  window.writeLog = writeLog;
  window.setStatus = setStatus;

  /* --------------------------------------------------------------------------
     2. God of War Favor Success Notification Popup
     -------------------------------------------------------------------------- */
  function showJbSuccessPopup(subtitle) {
    const popup = document.getElementById("jb-success-popup");
    if (!popup) return;
    if (subtitle) {
      const subEl = popup.querySelector(".jb-popup-subtitle");
      if (subEl) subEl.innerHTML = subtitle;
    }
    popup.classList.add("jb-popup-show");

    if (window._jbPopupTimer) clearTimeout(window._jbPopupTimer);
    window._jbPopupTimer = setTimeout(() => {
      closeJbSuccessPopup();
    }, 7000);
  }

  function closeJbSuccessPopup() {
    const popup = document.getElementById("jb-success-popup");
    if (popup) {
      popup.classList.remove("jb-popup-show");
    }
  }

  window.showJbSuccessPopup = showJbSuccessPopup;
  window.closeJbSuccessPopup = closeJbSuccessPopup;

  /* --------------------------------------------------------------------------
     3. Firmware Auto-Detection & Override
     -------------------------------------------------------------------------- */
  function detectFirmware() {
    try {
      const ua = navigator.userAgent;
      const match = /PlayStation\s+(\d+)[/ ](\d+)\.(\d+)/.exec(ua);
      if (match) {
        const con = match[1];
        const maj = match[2];
        const min = parseInt(match[3], 16).toString(16).padStart(2, "0");
        const fwStr = `PS${con} FW ${maj}.${min}`;
        if (fwText) {
          fwText.textContent = `${fwStr} (SUPPORTED)`;
          if (fwChip) {
            fwChip.style.borderColor = "var(--gow-frost)";
            fwChip.style.color = "var(--gow-frost)";
          }
        }
        writeLog(`Detected console platform: ${fwStr}`, "info");
      } else {
        // Fallback for PC or unknown browser
        const stored = localStorage.getItem("lonely_fw_override");
        if (stored) {
          window.fw_override = stored;
          if (fwText) fwText.textContent = `FW ${stored} (OVERRIDE)`;
        } else {
          if (fwText) fwText.textContent = "FW 9.00 – 12.02+";
        }
      }
    } catch (_) {}
  }

  if (fwChip) {
    fwChip.addEventListener("click", () => {
      const supported = ["9.00", "9.03", "9.04", "9.50", "9.60", "10.00", "10.01", "10.50", "10.70", "10.71", "11.00", "11.02", "11.50", "11.52", "12.00", "12.02"];
      const current = window.fw_override || (fwText ? fwText.textContent : "Auto");
      const choice = prompt(`Manual Firmware Override:\nCurrent: ${current}\n\nEnter target version (e.g. 9.00, 11.00, 12.02, or 'auto'):`);
      if (choice) {
        const clean = choice.trim().toLowerCase();
        if (clean === "auto") {
          delete window.fw_override;
          localStorage.removeItem("lonely_fw_override");
          detectFirmware();
          writeLog("Firmware set to Auto-Detect.", "info");
        } else if (supported.includes(clean)) {
          window.fw_override = clean;
          localStorage.setItem("lonely_fw_override", clean);
          if (fwText) fwText.textContent = `FW ${clean} (OVERRIDE)`;
          writeLog(`Firmware manually overridden to FW ${clean}.`, "success");
        } else {
          alert(`Firmware ${choice} entered. Range: 9.00 – 12.02+. Setting as manual override.`);
          window.fw_override = clean;
          localStorage.setItem("lonely_fw_override", clean);
          if (fwText) fwText.textContent = `FW ${clean} (OVERRIDE)`;
        }
      }
    });
  }

  detectFirmware();

  /* --------------------------------------------------------------------------
     4. Background Glass Opacity Manager (Presets: 25%, 50%, 75%, 95%)
     -------------------------------------------------------------------------- */
  const OPACITY_PRESETS = [
    { label: "25% (CLEAR)", panelOpacity: "0.25", bgDim: "0.15" },
    { label: "50% (BALANCED)", panelOpacity: "0.50", bgDim: "0.28" },
    { label: "75% (DEEP)", panelOpacity: "0.75", bgDim: "0.45" },
    { label: "95% (SOLID)", panelOpacity: "0.95", bgDim: "0.75" }
  ];

  let currentOpacityIdx = 1; // Default to 50% Balanced

  function applyOpacityPreset(idx, save = true) {
    currentOpacityIdx = (idx + OPACITY_PRESETS.length) % OPACITY_PRESETS.length;
    const preset = OPACITY_PRESETS[currentOpacityIdx];

    document.documentElement.style.setProperty("--panel-opacity", preset.panelOpacity);
    document.documentElement.style.setProperty("--bg-dim-opacity", preset.bgDim);

    if (glassToggleBtn) {
      glassToggleBtn.textContent = `◐ GLASS: ${preset.label}`;
    }

    if (save) {
      localStorage.setItem("lonely_panel_opacity_idx", String(currentOpacityIdx));
    }
  }

  const savedOpacityIdx = localStorage.getItem("lonely_panel_opacity_idx");
  if (savedOpacityIdx !== null && !isNaN(parseInt(savedOpacityIdx, 10))) {
    applyOpacityPreset(parseInt(savedOpacityIdx, 10), false);
  } else {
    applyOpacityPreset(1, false);
  }

  if (glassToggleBtn) {
    glassToggleBtn.addEventListener("click", () => {
      applyOpacityPreset(currentOpacityIdx + 1, true);
    });
  }

  /* --------------------------------------------------------------------------
     5. Exploit Lifecycle & Auto-Run Countdown
     -------------------------------------------------------------------------- */
  let autoRunTimer = null;

  async function executeExploit() {
    if (runBtn) {
      runBtn.disabled = true;
      runBtn.textContent = "EXPLOITING...";
      runBtn.classList.remove("btn-success");
    }
    setStatus("EXPLOIT: RUNNING...", "running");
    writeLog("Starting God of War PS4 exploit pipeline...", "info");

    try {
      if (typeof window.runExploit === "function") {
        await window.runExploit();
      } else {
        throw new Error("Core exploit runner (runExploit) not loaded.");
      }
    } catch (err) {
      setStatus("EXPLOIT FAILED", "error");
      writeLog(`Exploit error: ${err.message}`, "error");
      if (runBtn) {
        runBtn.disabled = false;
        runBtn.textContent = "RETRY EXPLOIT";
      }
    }
  }

  window.onElfldrReady = function () {
    setStatus("REALM: MIDGARD (ONLINE)", "success");
    updateElfldrStatus(true);
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.textContent = "JAILBROKEN";
      runBtn.classList.add("btn-success");
    }
    showJbSuccessPopup("Kernel Conquered &bull; Midgard Secured");
  };

  // Auto-Run Countdown Logic
  const autoJbPref = localStorage.getItem("lonely_ps4_autojb");
  const isAutoRun = autoJbPref === null ? true : autoJbPref === "true";

  if (autoJbToggle) {
    autoJbToggle.checked = isAutoRun;
    autoJbToggle.addEventListener("change", (e) => {
      localStorage.setItem("lonely_ps4_autojb", String(e.target.checked));
      if (!e.target.checked && autoRunTimer) {
        clearInterval(autoRunTimer);
        autoRunTimer = null;
        if (runBtn) runBtn.textContent = "⚔ RUN EXPLOIT ⚔";
        writeLog("Auto-run disabled by user.", "info");
      }
    });
  }

  if (isAutoRun && runBtn) {
    let countdown = 3;
    writeLog(`Auto-run enabled. Starting in ${countdown}s... (Click button to cancel)`, "info");
    runBtn.textContent = `STARTING IN ${countdown}s (CANCEL)`;

    const cancelAutoRun = () => {
      if (autoRunTimer) {
        clearInterval(autoRunTimer);
        autoRunTimer = null;
        runBtn.textContent = "⚔ RUN EXPLOIT ⚔";
        writeLog("Auto-run cancelled by user.", "info");
      }
    };

    runBtn.addEventListener("click", cancelAutoRun, { once: true });

    autoRunTimer = setInterval(() => {
      countdown--;
      if (countdown > 0) {
        runBtn.textContent = `STARTING IN ${countdown}s (CANCEL)`;
      } else {
        clearInterval(autoRunTimer);
        autoRunTimer = null;
        runBtn.removeEventListener("click", cancelAutoRun);
        executeExploit();
      }
    }, 1000);
  }

  if (runBtn) {
    runBtn.addEventListener("click", () => {
      if (!autoRunTimer && !runBtn.disabled && runBtn.textContent !== "JAILBROKEN") {
        executeExploit();
      }
    });
  }

  /* --------------------------------------------------------------------------
     6. Offline Cache & Service Worker Registration
     -------------------------------------------------------------------------- */
  function initOfflineCache() {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("./sw.js")
        .then((reg) => {
          if (cacheLed) cacheLed.className = "led led-green";
          if (cacheText) cacheText.textContent = "CACHE READY";

          reg.onupdatefound = () => {
            const installing = reg.installing;
            if (installing) {
              installing.onstatechange = () => {
                if (installing.state === "installed") {
                  if (navigator.serviceWorker.controller) {
                    writeLog("New cache update available! Refresh or Reset Cache to apply.", "info");
                  } else {
                    writeLog("Offline cache installed successfully! Host is ready offline.", "success");
                  }
                }
              };
            }
          };
        })
        .catch(() => {
          checkAppCacheFallback();
        });
    } else {
      checkAppCacheFallback();
    }
  }

  function checkAppCacheFallback() {
    if (window.applicationCache) {
      const ac = window.applicationCache;
      ac.addEventListener("cached", () => {
        if (cacheLed) cacheLed.className = "led led-green";
        if (cacheText) cacheText.textContent = "CACHE READY";
        writeLog("ApplicationCache installed completely.", "success");
      });
      ac.addEventListener("noupdate", () => {
        if (cacheLed) cacheLed.className = "led led-green";
        if (cacheText) cacheText.textContent = "CACHE READY";
      });
      ac.addEventListener("downloading", () => {
        if (cacheLed) cacheLed.className = "led led-yellow";
        if (cacheText) cacheText.textContent = "CACHING...";
      });
      ac.addEventListener("error", () => {
        if (cacheLed) cacheLed.className = "led led-red";
        if (cacheText) cacheText.textContent = "CACHE OFFLINE";
      });
    }
  }

  if (cacheChip) {
    cacheChip.addEventListener("click", () => {
      initOfflineCache();
      writeLog("Checking offline cache status...", "info");
    });
  }

  if (resetCacheBtn) {
    resetCacheBtn.addEventListener("click", async () => {
      if (resetCacheText) resetCacheText.textContent = "RESETTING...";
      if (resetCacheLed) resetCacheLed.className = "led led-yellow";
      writeLog("Clearing offline caches and service worker...", "info");

      try {
        if ("caches" in window) {
          const keys = await caches.keys();
          for (const key of keys) {
            await caches.delete(key);
          }
        }

        if ("serviceWorker" in navigator) {
          const regs = await navigator.serviceWorker.getRegistrations();
          for (const reg of regs) {
            await reg.unregister();
          }
        }

        const opacityPref = localStorage.getItem("lonely_panel_opacity_idx");
        const autoJb = localStorage.getItem("lonely_ps4_autojb");
        const fwOver = localStorage.getItem("lonely_fw_override");

        localStorage.clear();
        sessionStorage.clear();

        if (opacityPref !== null) localStorage.setItem("lonely_panel_opacity_idx", opacityPref);
        if (autoJb !== null) localStorage.setItem("lonely_ps4_autojb", autoJb);
        if (fwOver !== null) localStorage.setItem("lonely_fw_override", fwOver);

        if (resetCacheText) resetCacheText.textContent = "CLEARED!";
        if (resetCacheLed) resetCacheLed.className = "led led-green";
        writeLog("Cache cleared! Reloading fresh from server...", "success");

        setTimeout(() => {
          const baseUrl = window.location.origin + window.location.pathname;
          window.location.replace(baseUrl + "?nocache=" + Date.now());
        }, 700);
      } catch (err) {
        writeLog(`Failed to reset cache: ${err.message}`, "error");
        if (resetCacheText) resetCacheText.textContent = "RESET ERROR";
        if (resetCacheLed) resetCacheLed.className = "led led-red";
      }
    });
  }

  initOfflineCache();

  /* --------------------------------------------------------------------------
     7. Armory Filter & Live Search
     -------------------------------------------------------------------------- */
  function initArmoryFilterAndSearch() {
    const tabs = document.querySelectorAll("#realmTabs .realm-tab");
    const cards = document.querySelectorAll("#payloadGrid .payload-card");
    const searchInput = document.getElementById("payloadSearchInput");

    let currentFilter = "all";
    let searchQuery = "";

    function updateGrid() {
      cards.forEach((card) => {
        const realm = card.getAttribute("data-realm");
        const text = card.textContent.toLowerCase();

        const matchesRealm = currentFilter === "all" || realm === currentFilter;
        const matchesSearch = !searchQuery || text.includes(searchQuery);

        if (matchesRealm && matchesSearch) {
          card.style.display = "flex";
        } else {
          card.style.display = "none";
        }
      });
    }

    tabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        tabs.forEach((t) => t.classList.remove("active"));
        tab.classList.add("active");
        currentFilter = tab.getAttribute("data-filter") || "all";
        updateGrid();
      });
    });

    if (searchInput) {
      searchInput.addEventListener("input", (e) => {
        searchQuery = e.target.value.trim().toLowerCase();
        updateGrid();
      });
    }
  }

  initArmoryFilterAndSearch();

  /* --------------------------------------------------------------------------
     8. Payload Dispatching to Port 9021
     -------------------------------------------------------------------------- */
  async function dispatchBytesTo9021(bytes, name) {
    writeLog(`Dispatching ${name} (${bytes.length} bytes) to ELFLDR on port 9021...`, "info");
    
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("POST", "http://127.0.0.1:9021/", true);
      xhr.setRequestHeader("Content-Type", "application/octet-stream");
      xhr.timeout = 10000;

      xhr.onload = () => {
        writeLog(`Successfully delivered ${name} to port 9021!`, "success");
        showJbSuccessPopup(`${name} Dispatched &bull; Payload Active`);
        resolve();
      };

      xhr.onerror = () => {
        const err = new Error("Connection to port 9021 failed. Make sure exploit is running.");
        writeLog(err.message, "error");
        reject(err);
      };

      xhr.ontimeout = () => {
        const err = new Error("Port 9021 connection timed out.");
        writeLog(err.message, "error");
        reject(err);
      };

      xhr.send(bytes);
    });
  }

  window.dispatchBytesTo9021 = dispatchBytesTo9021;

  // Handle Payload Card Buttons
  const sendButtons = document.querySelectorAll("#payloadGrid .btn-send");
  sendButtons.forEach((btn) => {
    btn.addEventListener("click", async () => {
      const payloadFile = btn.getAttribute("data-payload");
      const action = btn.getAttribute("data-action");

      if (action === "clean") {
        writeLog("Clean mode active: ELFLDR is listening on port 9021 without injecting payloads.", "info");
        showJbSuccessPopup("Clean Boot Active &bull; Port 9021 Ready");
        return;
      }

      if (action === "netcat") {
        alert("Remote Netcat Payload Loader:\\n\\nOnce jailbroken, you can send any payload from your PC/phone using Netcat:\\n\\nnc <PS4_IP> 9021 < payload.bin\\n\\nOr use Valkyrie Forge below to load files directly from your browser!");
        return;
      }

      if (action === "klog") {
        writeLog("Kernel logger active. Real-time exploit events are being written to this console.", "info");
        return;
      }

      if (!payloadFile) return;

      btn.setAttribute("data-state", "sending");
      btn.textContent = "SENDING...";

      try {
        // Try fetching from payloads/ or src/ps4/
        let resp = await fetch(`./payloads/${payloadFile}`, { cache: "no-store" });
        if (!resp.ok) {
          resp = await fetch(`./src/ps4/${payloadFile}`, { cache: "no-store" });
        }

        if (!resp.ok) {
          throw new Error(`File '${payloadFile}' not found on host. Please drop it into Valkyrie Forge below to dispatch directly!`);
        }

        const buf = await resp.arrayBuffer();
        await dispatchBytesTo9021(new Uint8Array(buf), payloadFile);

        btn.setAttribute("data-state", "sent");
        btn.textContent = "SENT";
        setTimeout(() => {
          btn.removeAttribute("data-state");
          btn.textContent = "SEND";
        }, 4000);
      } catch (err) {
        writeLog(err.message, "error");
        btn.setAttribute("data-state", "failed");
        btn.textContent = "FAILED";
        setTimeout(() => {
          btn.removeAttribute("data-state");
          btn.textContent = "SEND";
        }, 3000);
      }
    });
  });

  /* --------------------------------------------------------------------------
     9. Valkyrie Forge: Custom Payload Drag & Drop / File Picker
     -------------------------------------------------------------------------- */
  function initCustomPayloadDrop() {
    const dropZone = document.getElementById("customDropZone");
    const fileInput = document.getElementById("customFileInput");
    const statusEl = document.getElementById("customDropStatus");

    if (!dropZone || !fileInput) return;

    function updateStatus(text, isError = false) {
      if (statusEl) {
        statusEl.textContent = text;
        statusEl.style.color = isError ? "var(--gow-crimson-bright)" : "var(--gow-frost)";
      }
    }

    async function handleFile(file) {
      if (!file) return;
      updateStatus(`Forging ${file.name} (${Math.round(file.size / 1024)} KB)...`);
      writeLog(`[Valkyrie Forge] Reading custom payload: ${file.name}...`, "info");

      try {
        const arrayBuffer = await file.arrayBuffer();
        const bytes = new Uint8Array(arrayBuffer);

        updateStatus(`Dispatching ${file.name} to 127.0.0.1:9021...`);
        await dispatchBytesTo9021(bytes, file.name);

        updateStatus(`⚔ ${file.name} dispatched successfully!`);
        writeLog(`[Valkyrie Forge] Successfully delivered ${file.name} to ELFLDR on port 9021!`, "success");
      } catch (err) {
        updateStatus(`Failed: ${err.message}`, true);
        writeLog(`[Valkyrie Forge] Payload dispatch failed: ${err.message}`, "error");
      }
    }

    dropZone.addEventListener("click", () => {
      fileInput.click();
    });

    fileInput.addEventListener("change", (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleFile(e.target.files[0]);
      }
    });

    dropZone.addEventListener("dragover", (e) => {
      e.preventDefault();
      dropZone.classList.add("drop-active");
    });

    dropZone.addEventListener("dragleave", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drop-active");
    });

    dropZone.addEventListener("drop", (e) => {
      e.preventDefault();
      dropZone.classList.remove("drop-active");
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        handleFile(e.dataTransfer.files[0]);
      }
    });
  }

  initCustomPayloadDrop();
})();
