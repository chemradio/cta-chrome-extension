(function () {
    // Tear down any previous instance from an earlier injection on this page.
    // Without this, a leaked observer can fire MUTATIONS_FINISHED later and
    // resolve the *next* capture's wait prematurely.
    if (window.__MutationCleanup) {
        try { window.__MutationCleanup(); } catch {}
    }

    const DEBOUNCE_MS = 800;
    const MAX_WAIT_MS = 5000;

    let debounceTimer = null;
    let maxWaitTimer = null;
    let alive = true;

    function cleanup() {
        alive = false;
        clearTimeout(debounceTimer);
        clearTimeout(maxWaitTimer);
        observer.disconnect();
        if (window.__MutationCleanup === cleanup) {
            delete window.__MutationCleanup;
        }
    }

    function done() {
        if (!alive) return;
        cleanup();
        chrome.runtime.sendMessage({ type: "MUTATIONS_FINISHED" });
    }

    const observer = new MutationObserver(() => {
        if (!alive) return;
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(done, DEBOUNCE_MS);
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: false, // too noisy
    });

    maxWaitTimer = setTimeout(done, MAX_WAIT_MS);
    window.__MutationCleanup = cleanup;
})();
