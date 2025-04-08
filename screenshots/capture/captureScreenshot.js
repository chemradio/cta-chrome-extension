export const takeScreenshotClip = (tabId, clip = {}) => {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
            { tabId },
            "Page.captureScreenshot",
            {
                clip: {
                    x: clip.x || 0,
                    y: clip.y || 0,
                    width: clip.width || 0,
                    height: clip.height || 0,
                    scale: clip.scale || 1,
                },
            },
            (result) => {
                if (chrome.runtime.lastError)
                    return reject(chrome.runtime.lastError);
                console.log("Screenshot captured");
                resolve(result.data);
            }
        );
    });
};
