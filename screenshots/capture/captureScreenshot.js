export const takeScreenshotClip = (tabId, clip = {}) => {
    // console.log("Taking screenshot...");
    // if (clip) console.log("clip params:", clip);
    // const devicePixelRatio = 1; // clip.devicePixelRatio || 1;
    // const clipParams = {
    //     x: parseInt(clip.x * devicePixelRatio) || 0,
    //     y: parseInt(clip.y * devicePixelRatio) || 0,
    //     width: parseInt(clip.width * devicePixelRatio) || 0,
    //     height: parseInt(clip.height * devicePixelRatio) || 0,
    // };
    // console.log("Clip params:", clipParams);

    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
            { tabId },
            "Page.captureScreenshot",
            {
                // clip: clipParams,
                clip: {
                    x: clip.x,
                    y: clip.y,
                    width: clip.width,
                    height: clip.height,
                    scale: 1,
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
