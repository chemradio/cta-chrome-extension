export function enableEmulation(tabId, deviceMetrics = {}) {
    return new Promise((resolve, reject) => {
        chrome.debugger.sendCommand(
            { tabId },
            "Emulation.setDeviceMetricsOverride",
            deviceMetrics,
            () => {
                if (chrome.runtime.lastError)
                    return reject(chrome.runtime.lastError);
                console.log("Device emulation enabled on tab:", tabId);
                resolve();
            }
        );
    });
}
