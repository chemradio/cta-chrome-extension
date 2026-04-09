const layoutInputs = document.querySelectorAll('input[name="layout"]');
const widthInput   = document.getElementById("width");
const heightInput  = document.getElementById("height");
const statusEl     = document.getElementById("status");

const presets = {
    horizontal: { width: 1920, height: 1080 },
    vertical:   { width: 1920, height: 7000 },
    fullpage:   { width: 1920, height: null },
    custom:     null,
};

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
            if (chrome.runtime.lastError) {
                heightInput.value = 9999;
                setStatus("Could not measure page height", "error", 3000);
                return;
            }
            heightInput.value = Math.min(response.pageHeight, 9999);
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
            if (chrome.runtime.lastError) reject(chrome.runtime.lastError);
            else resolve(response);
        });
    });

// ─── Button handlers ──────────────────────────────────────────────────────────

document.getElementById("capture-page").addEventListener("click", () => {
    setStatus("Capturing page…");
    sendMessage({ action: "capturePage", settings: getSettings() })
        .then(() => setStatus("Done — check Downloads", "ok", 4000))
        .catch((e) => setStatus(e.message ?? "Error", "error", 5000));
});

document.getElementById("capture-element").addEventListener("click", () => {
    setStatus("Click an element on the page…", "busy");
    sendMessage({ action: "captureElement", settings: getSettings() })
        .catch((e) => setStatus(e.message ?? "Error", "error", 5000));
});

document.getElementById("manual-cleanup").addEventListener("click", () => {
    setStatus("Cleaning up…");
    sendMessage({ action: "manualCleanup" })
        .then(() => setStatus("Cleanup done", "ok", 3000))
        .catch((e) => setStatus(e.message ?? "Error", "error", 5000));
});

// ─── Init ─────────────────────────────────────────────────────────────────────

layoutInputs.forEach((input) =>
    input.addEventListener("change", updateResolutionInputs)
);
widthInput.addEventListener("input",  checkCustomResolution);
heightInput.addEventListener("input", checkCustomResolution);

updateResolutionInputs();
