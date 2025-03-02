export function captureScreenshot(tabId, screenshotName) {
    chrome.debugger.sendCommand(
        { tabId: tabId },
        "Page.captureScreenshot",
        {},
        (result) => {
            if (result && result.data) {
                downloadScreenshot(result.data, screenshotName);
            }
        }
    );
}

export function downloadScreenshot(base64Data, screenshotName) {
    const url = "data:image/png;base64," + base64Data;
    chrome.downloads.download(
        { url: url, filename: screenshotName + ".png" },
        () => {
            console.log("Screenshot downloaded.");
        }
    );
}
