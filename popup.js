document.addEventListener("DOMContentLoaded", () => {
    const layoutInputs = document.querySelectorAll('input[name="layout"]');
    const widthInput = document.getElementById("width");
    const heightInput = document.getElementById("height");
    const scaleSlider = document.getElementById("scale");
    const scaleValue = document.getElementById("scale-value");
    const capturePageBtn = document.getElementById("capture-page");
    const captureElementBtn = document.getElementById("capture-element");

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

    // Update scale factor display
    scaleSlider.addEventListener("input", () => {
        scaleValue.textContent = `${scaleSlider.value}x`;
    });

    // Initial setup
    updateResolutionInputs();

    // Button click handlers (placeholders)
    capturePageBtn.addEventListener("click", () => {
        const settings = getSettings();
        console.log("Capture Page:", settings);
        // Add chrome.tabs.captureVisibleTab here
    });

    captureElementBtn.addEventListener("click", () => {
        const settings = getSettings();
        console.log("Capture Element:", settings);
        // Add element-specific capture logic here
    });

    // Gather settings
    function getSettings() {
        const selectedLayout = document.querySelector(
            'input[name="layout"]:checked'
        ).value;
        return {
            layout: selectedLayout,
            resolution: `${widthInput.value}x${heightInput.value}`,
            scale: scaleSlider.value,
            cleanup: document.getElementById("cleanup").checked,
        };
    }
});
