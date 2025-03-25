export const takeScreenshotClip = (tabId, clip = {}) => {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
            { tabId },
            "Page.captureScreenshot",
            clip,
            (result) => {
                if (chrome.runtime.lastError)
                    return reject(chrome.runtime.lastError);
                console.log("Screenshot captured");
                resolve(result.data);
            }
        );
    });
};
