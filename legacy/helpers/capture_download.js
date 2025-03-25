export function captureScreenshot(tabId, screenshotName, clipOptions = {}) {
    chrome.debugger.sendCommand(
        { tabId: tabId },
        "Page.captureScreenshot",
        { format: "png", clip: clipOptions },
        (result) => {
            if (result && result.data) {
                downloadScreenshot(result.data, screenshotName);
            }
        }
    );
}
