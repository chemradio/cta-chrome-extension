const layoutInputs   = document.querySelectorAll('input[name="layout"]');
const widthInput     = document.getElementById("width");
const heightInput    = document.getElementById("height");
const statusEl       = document.getElementById("status");
const popupEl        = document.querySelector(".popup");
const captureLabelEl = document.getElementById("capture-label");
const captureHintEl  = document.getElementById("capture-hint");

const presets = {
    horizontal: { width: 1920, height: 1080 },
    vertical:   { width: 1920, height: 7000 },
    fullpage:   { width: 1920, height: null },
    custom:     null,
};

// ─── Capture overlay ──────────────────────────────────────────────────────────

function showCapturing(label, hint = "") {
    captureLabelEl.textContent = label;
    captureHintEl.textContent  = hint;
    captureHintEl.hidden       = !hint;
    popupEl.classList.add("is-capturing");
}

function stopCapturing() {
    popupEl.classList.remove("is-capturing");
}

// ─── Status helper ────────────────────────────────────────────────────────────

let statusTimer = null;

function setStatus(msg, type = "busy", autoClear = 0) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
    clearTimeout(statusTimer);
    if (autoClear > 0) {
        statusTimer = setTimeout(() => {
            statusEl.textContent = "";
            statusEl.className = "status";
        }, autoClear);
    }
}

// ─── Resolution ───────────────────────────────────────────────────────────────

function getSelectedLayout() {
    return document.querySelector('input[name="layout"]:checked').value;
}

function updateResolutionInputs() {
    const layout = getSelectedLayout();

    if (layout === "custom") {
        widthInput.disabled  = false;
        heightInput.disabled = false;
        return;
    }

    if (layout === "fullpage") {
        widthInput.disabled  = true;
        heightInput.disabled = true;
        widthInput.value     = 1920;
        heightInput.value    = "…";
        setStatus("Measuring page height…");
        chrome.runtime.sendMessage({ action: "getPageHeight" }, (response) => {
            if (chrome.runtime.lastError || !response || response.ok === false) {
                heightInput.value = 9999;
                setStatus("Could not measure page height", "error", 3000);
                return;
            }
            heightInput.value = Math.min(response.pageHeight ?? 9999, 9999);
            setStatus("");
        });
        return;
    }

    widthInput.disabled  = false;
    heightInput.disabled = false;
    const preset         = presets[layout];
    widthInput.value     = preset.width;
    heightInput.value    = preset.height;
}

function checkCustomResolution() {
    const layout = getSelectedLayout();
    if (layout === "custom" || layout === "fullpage") return;

    const preset = presets[layout];
    if (
        parseInt(widthInput.value)  !== preset.width ||
        parseInt(heightInput.value) !== preset.height
    ) {
        document.getElementById("custom").checked = true;
        widthInput.disabled  = false;
        heightInput.disabled = false;
    }
}

function getScaleFactor() {
    for (const s of document.getElementsByName("scale")) {
        if (s.checked) return parseInt(s.value);
    }
    return 2;
}

function getSettings() {
    return {
        layout:            getSelectedLayout(),
        width:             parseInt(widthInput.value)  || 1920,
        height:            parseInt(heightInput.value) || 1080,
        deviceScaleFactor: getScaleFactor(),
        cleanup:           document.getElementById("cleanup").checked,
    };
}

// ─── Messaging ────────────────────────────────────────────────────────────────

const sendMessage = (message) =>
    new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            if (response && response.ok === false) {
                return reject(new Error(response.error || "Request failed"));
            }
            resolve(response);
        });
    });

// ─── Button handlers ──────────────────────────────────────────────────────────

document.getElementById("capture-page").addEventListener("click", () => {
    showCapturing("Capturing page…");
    sendMessage({ action: "capturePage", settings: getSettings() })
        .then(() => { stopCapturing(); setStatus("Done — check Downloads", "ok", 4000); })
        .catch((e) => { stopCapturing(); setStatus(e.message ?? "Error", "error", 5000); });
});

document.getElementById("capture-element").addEventListener("click", () => {
    showCapturing("Select an element", "Move mouse to highlight\nScroll wheel to change depth");
    sendMessage({ action: "captureElement", settings: getSettings() })
        .catch((e) => { stopCapturing(); setStatus(e.message ?? "Error", "error", 5000); });
});

document.getElementById("capture-auto").addEventListener("click", () => {
    showCapturing("Auto-capturing…");
    sendMessage({ action: "autoCapture", settings: getSettings() })
        .then((res) => {
            stopCapturing();
            const label =
                res?.mode === "element"
                    ? `Auto: captured ${res.module} post`
                    : res?.mode === "page"
                    ? `Auto: full page for ${res.module}`
                    : "Auto: full page (no site module)";
            setStatus(`${label} — check Downloads`, "ok", 4000);
        })
        .catch((e) => { stopCapturing(); setStatus(e.message ?? "Error", "error", 5000); });
});

// Element capture result — fires if the popup is still open when capture ends.
chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action !== "elementCaptureResult") return false;
    stopCapturing();
    if (msg.ok) {
        setStatus("Done — check Downloads", "ok", 4000);
    } else {
        setStatus(msg.error || "Element capture failed", "error", 5000);
    }
    return false;
});

document.getElementById("manual-cleanup").addEventListener("click", () => {
    setStatus("Cleaning up…");
    sendMessage({ action: "manualCleanup" })
        .then(() => setStatus("Cleanup done", "ok", 3000))
        .catch((e) => setStatus(e.message ?? "Error", "error", 5000));
});

document.getElementById("remove-ads").addEventListener("click", () => {
    setStatus("Removing ads…");
    sendMessage({ action: "removeAds" })
        .then(() => setStatus("Ads removed", "ok", 3000))
        .catch((e) => setStatus(e.message ?? "Error", "error", 5000));
});

document.getElementById("dom-killer").addEventListener("click", () => {
    showCapturing("Manual removal", "Hover to target · Click to remove\nWheel to change depth · ESC to stop");
    sendMessage({ action: "domKiller" })
        .catch((e) => { stopCapturing(); setStatus(e.message ?? "Error", "error", 5000); });
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action !== "domKillerEnded") return false;
    stopCapturing();
    setStatus("Manual removal stopped", "ok", 3000);
    return false;
});

// ─── Init ─────────────────────────────────────────────────────────────────────

layoutInputs.forEach((input) =>
    input.addEventListener("change", updateResolutionInputs)
);
widthInput.addEventListener("input",  checkCustomResolution);
heightInput.addEventListener("input", checkCustomResolution);

updateResolutionInputs();
