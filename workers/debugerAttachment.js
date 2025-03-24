export function attachDebugger(tabId) {
    return new Promise((resolve, reject) => {
        chrome.debugger.attach({ tabId }, "1.3", () => {
            if (chrome.runtime.lastError)
                return reject(chrome.runtime.lastError);
            console.log("Debugger attached to tab:", tabId);
            resolve();
        });
    });
}

export function detachDebugger(tabId) {
    chrome.debugger.detach({ tabId }, () => {
        console.log("Debugger detached from tab:", tabId);
    });
}
