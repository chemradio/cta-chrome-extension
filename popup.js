const layoutInputs = document.querySelectorAll('input[name="layout"]');
const widthInput = document.getElementById("width");
const heightInput = document.getElementById("height");
const scaleSlider = document.getElementById("scale");
const scaleValue = document.getElementById("scale-value");
const capturePageBtn = document.getElementById("capture-page");
const captureElementBtn = document.getElementById("capture-element");
const manualCleanupBtn = document.getElementById("manual-cleanup");

// Preset resolutions
const presets = {
    horizontal: { width: 1920, height: 1080 },
    vertical: { width: 1920, height: 7000 },
    fullpage: { width: 300, height: 300 },
    custom: { width: 4000, height: 4000 },
};

// Update resolution inputs based on layout
function updateResolutionInputs() {
    const selectedLayout = document.querySelector(
        'input[name="layout"]:checked'
    ).value;
    if (selectedLayout == "custom") {
        widthInput.disabled = false;
        heightInput.disabled = false;
    } else if (selectedLayout == "fullpage") {
        widthInput.disabled = true;
        heightInput.disabled = true;
    } else {
        widthInput.disabled = false;
        heightInput.disabled = false;
        const preset = presets[selectedLayout];
        widthInput.value = preset.width;
        heightInput.value = preset.height;
    }
}

// Switch to custom layout if width/height changes
function checkCustomResolution() {
    const selectedLayout = document.querySelector(
        'input[name="layout"]:checked'
    ).value;
    if (selectedLayout !== "custom") {
        const preset = presets[selectedLayout];
        if (
            parseInt(widthInput.value) !== preset.width ||
            parseInt(heightInput.value) !== preset.height
        ) {
            document.getElementById("custom").checked = true;
        }
    }
}

// Event listeners for layout changes
layoutInputs.forEach((input) => {
    input.addEventListener("change", updateResolutionInputs);
});

// Event listeners for resolution changes
widthInput.addEventListener("input", checkCustomResolution);
heightInput.addEventListener("input", checkCustomResolution);

// Initial setup
updateResolutionInputs();

// Button click handlers (placeholders)
capturePageBtn.addEventListener("click", () => {
    const settings = getSettings();
    console.log("Capture Page:", settings);
    sendMessageToBackground({ action: "capturePage", settings })
        .then((response) => {
            console.log("Response from background:", response);
        })
        .catch((error) => {
            console.error("Error sending message to background:", error);
        });
});

captureElementBtn.addEventListener("click", () => {
    const settings = getSettings();
    console.log("Capture Element:", settings);
    sendMessageToBackground({ action: "captureElement", settings })
        .then((response) => {
            console.log("Response from background:", response);
        })
        .catch((error) => {
            console.error("Error sending message to background:", error);
        });
});

manualCleanupBtn.addEventListener("click", () => {
    sendMessageToBackground({ action: "manualCleanup" })
        .then((response) => {
            console.log("Response from background:", response);
        })
        .catch((error) => {
            console.error("Error sending message to background:", error);
        });
});

// Gather settings
function getSettings() {
    const selectedLayout = document.querySelector(
        'input[name="layout"]:checked'
    ).value;

    let scaleValue;
    const scales = document.getElementsByName("scale");
    for (const s of scales) {
        if (s.checked) {
            scaleValue = s.value;
            break;
        }
    }
    const output = {
        layout: selectedLayout,
        width: parseInt(widthInput.value),
        height: parseInt(heightInput.value),
        deviceScaleFactor: parseInt(scaleValue),
        cleanup: document.getElementById("cleanup").checked,
    };
    return output;
}

const sendMessageToBackground = (message) => {
    return new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
            } else {
                resolve(response);
            }
        });
    });
};
