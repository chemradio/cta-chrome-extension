export const downloadScreenshot = (base64Data, screenshotName) => {
    const url = "data:image/png;base64," + base64Data;
    chrome.downloads.download(
        { url: url, filename: screenshotName + ".png" },
        () => {
            console.log("Screenshot downloaded.");
        }
    );
};
