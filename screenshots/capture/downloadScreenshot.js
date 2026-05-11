export const downloadScreenshot = (base64Data, screenshotName) =>
    new Promise((resolve, reject) => {
        if (!base64Data) {
            return reject(new Error("Empty screenshot data"));
        }
        chrome.downloads.download(
            {
                url: "data:image/png;base64," + base64Data,
                filename: screenshotName + ".png",
            },
            (downloadId) => {
                const err = chrome.runtime.lastError;
                if (err) return reject(new Error(err.message));
                if (downloadId == null) {
                    return reject(new Error("Download did not start"));
                }
                resolve(downloadId);
            }
        );
    });
