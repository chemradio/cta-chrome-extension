export function enableEmulation(tabId, deviceMetrics) {
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

export function clearEmulation(tabId) {
    return new Promise((resolve) => {
        chrome.debugger.sendCommand(
            { tabId },
            "Emulation.clearDeviceMetricsOverride",
            {},
            () => {
                // Swallow errors — if the debugger is already gone this is a no-op.
                void chrome.runtime.lastError;
                resolve();
            }
        );
    });
}
