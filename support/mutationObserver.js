// Background-side timeout safety net. The watcher's own MAX_WAIT_MS is 5s;
// this is the deadline if the message itself never arrives (page crash,
// navigation, devtools intercept, etc.). Must be > watcher MAX_WAIT_MS.
const SETTLE_TIMEOUT_MS = 8000;

export const injectMutationWatcher = (tabId) =>
    chrome.scripting.executeScript({
        target: { tabId },
        files: ["contentScripts/mutationWatcher.js"],
    });

export const waitForMutationSettle = (tabId, timeoutMs = SETTLE_TIMEOUT_MS) =>
    new Promise((resolve) => {
        let settled = false;
        const finish = (reason) => {
            if (settled) return;
            settled = true;
            chrome.runtime.onMessage.removeListener(listener);
            clearTimeout(timer);
            if (reason === "timeout") {
                console.warn(
                    `mutation settle timed out after ${timeoutMs}ms on tab ${tabId} — proceeding anyway`
                );
            }
            resolve();
        };
        const listener = (message, sender) => {
            if (
                message?.type === "MUTATIONS_FINISHED" &&
                sender?.tab?.id === tabId
            ) {
                finish("message");
            }
        };
        chrome.runtime.onMessage.addListener(listener);
        const timer = setTimeout(() => finish("timeout"), timeoutMs);
    });
