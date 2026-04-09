(function () {
    // How long (ms) after the last mutation before we declare the page settled.
    // Lower = faster captures; higher = safer for slow/animated pages.
    const DEBOUNCE_MS = 800;

    // Hard deadline — always resolve after this long even if mutations are ongoing
    const MAX_WAIT_MS = 5000;

    let debounceTimer = null;
    let maxWaitTimer = null;

    function done() {
        clearTimeout(debounceTimer);
        clearTimeout(maxWaitTimer);
        observer.disconnect();
        chrome.runtime.sendMessage({ type: "MUTATIONS_FINISHED" });
    }

    const observer = new MutationObserver(() => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(done, DEBOUNCE_MS);
    });

    observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        characterData: false, // characterData changes are too noisy
    });

    maxWaitTimer = setTimeout(done, MAX_WAIT_MS);
})();
