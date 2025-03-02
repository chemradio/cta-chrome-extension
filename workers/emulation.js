export function enableEmulation(tabId, x, y, scaleFactor) {
    console.log("Enabling emulation.");
    chrome.debugger.sendCommand(
        { tabId: tabId },
        "Emulation.setDeviceMetricsOverride",
        {
            width: x,
            height: y,
            deviceScaleFactor: scaleFactor,
            mobile: false,
        },
        () => {}
    );
    console.log("Emulation enabled.");
}

export function disableEmulation(tabId) {
    console.log("Disabling emulation.");
    chrome.debugger.sendCommand(
        { tabId: tabId },
        "Emulation.clearDeviceMetricsOverride",
        {},
        () => {}
    );
    console.log("Emulation disabled.");
}
