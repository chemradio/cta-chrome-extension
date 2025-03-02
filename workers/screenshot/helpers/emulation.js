export function enableEmulation(tabId, emulationProps) {
    console.log("Enabling emulation.");
    chrome.debugger.sendCommand(
        { tabId: tabId },
        "Emulation.setDeviceMetricsOverride",
        {
            width: emulationProps.width,
            height: emulationProps.height,
            deviceScaleFactor: emulationProps.scaleFactor,
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
