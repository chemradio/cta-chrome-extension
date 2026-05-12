(function () {
    // Guard against double-injection: if a previous instance is running, clean it up first.
    // window is the shared isolated-world window, so this persists across executeScript calls.
    if (window.__ctaHighlighterDestroy) {
        window.__ctaHighlighterDestroy();
    }

    // ─── State ────────────────────────────────────────────────────────────────

    let deviceMetrics = null;
    let screenshotSuffix = null;
    let currentElement = null;

    const STYLE_ID = "__cta-hl-style";

    // Hover is committed only after the pointer has moved at least this many px
    // from the last committed position AND been still for HOVER_DEBOUNCE_MS.
    // Keeps hand tremor from jumping the selection.
    const MOVEMENT_THRESHOLD = 8;
    const HOVER_DEBOUNCE_MS  = 100;
    // After a wheel event, hover updates are frozen for this long so the user
    // doesn't need to hold the mouse perfectly still while scrolling the tree.
    const SCROLL_LOCK_MS     = 400;

    let lastCommittedX   = -9999;
    let lastCommittedY   = -9999;
    let pendingX         = 0;
    let pendingY         = 0;
    let hoverDebounceTimer = null;
    let scrollLockTimer    = null;
    let isScrollLocked     = false;

    // ─── Receive device metrics sent by background after injection ────────────

    const metricsListener = (message) => {
        if (message.action === "sendDeviceMetrics") {
            deviceMetrics = message.deviceMetrics;
            screenshotSuffix = message.screenshotSuffix;
        }
    };
    chrome.runtime.onMessage.addListener(metricsListener);

    // ─── Highlight styles ─────────────────────────────────────────────────────

    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            @keyframes __ctaGlow {
                0%   { box-shadow: 0 0 5px 2px #0ECAE3; }
                50%  { box-shadow: 0 0 18px 6px #0ECAE3; }
                100% { box-shadow: 0 0 5px 2px #0ECAE3; }
            }
            .__cta-highlighted {
                outline: 2px solid #0ECAE3 !important;
                animation: __ctaGlow 1s infinite;
                cursor: crosshair !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ─── XPath ────────────────────────────────────────────────────────────────

    function getXPath(element) {
        if (element.id) {
            const id = element.id;
            // XPath string literals can't contain both quote types — fall through
            // to positional XPath for exotic IDs that contain both.
            if (!id.includes('"')) return `//*[@id="${id}"]`;
            if (!id.includes("'")) return `//*[@id='${id}']`;
        }
        if (element === document.body) return "/html/body";
        if (element === document.documentElement) return "/html";
        if (!element.parentNode) return null;

        let ix = 0;
        const siblings = element.parentNode.childNodes;
        for (let i = 0; i < siblings.length; i++) {
            const sibling = siblings[i];
            if (sibling === element) {
                const parentPath = getXPath(element.parentNode);
                if (!parentPath) return null;
                return `${parentPath}/${element.tagName.toLowerCase()}[${ix + 1}]`;
            }
            if (sibling.nodeType === 1 && sibling.tagName === element.tagName) {
                ix++;
            }
        }
        return null;
    }

    // ─── Highlight ────────────────────────────────────────────────────────────

    function highlight(el) {
        if (currentElement) currentElement.classList.remove("__cta-highlighted");
        currentElement = el;
        if (currentElement) currentElement.classList.add("__cta-highlighted");
    }

    // ─── Event handlers ───────────────────────────────────────────────────────

    function onMouseMove(e) {
        // Always track position so the post-lock threshold is relative to
        // where the mouse actually is when the lock expires.
        pendingX = e.clientX;
        pendingY = e.clientY;

        if (isScrollLocked) return;

        const dx = e.clientX - lastCommittedX;
        const dy = e.clientY - lastCommittedY;
        if (Math.sqrt(dx * dx + dy * dy) < MOVEMENT_THRESHOLD) return;

        clearTimeout(hoverDebounceTimer);
        hoverDebounceTimer = setTimeout(() => {
            const el = document.elementFromPoint(pendingX, pendingY);
            if (el && el !== document.documentElement && el !== document.body) {
                highlight(el);
                lastCommittedX = pendingX;
                lastCommittedY = pendingY;
            }
        }, HOVER_DEBOUNCE_MS);
    }

    function onWheel(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!currentElement) return;

        // Freeze hover tracking while the user scrolls the DOM tree.
        isScrollLocked = true;
        clearTimeout(scrollLockTimer);
        scrollLockTimer = setTimeout(() => {
            isScrollLocked = false;
            // Anchor threshold to current mouse position so a small drift to
            // click doesn't overwrite the scroll-navigated element.
            lastCommittedX = pendingX;
            lastCommittedY = pendingY;
        }, SCROLL_LOCK_MS);

        if (e.deltaY < 0) {
            // Scroll up → parent element
            const parent = currentElement.parentElement;
            if (parent && parent !== document.documentElement) {
                highlight(parent);
            }
        } else {
            // Scroll down → first child element
            const firstChild = currentElement.firstElementChild;
            if (firstChild) highlight(firstChild);
        }
    }

    function onClick(e) {
        e.preventDefault();
        e.stopPropagation();

        if (!currentElement) return;

        const element = currentElement;

        // Remove highlight before computing xpath so any class-based xpath
        // doesn't capture our own decoration.
        element.classList.remove("__cta-highlighted");

        const xpath = getXPath(element);

        destroy();

        chrome.runtime.sendMessage({
            action: "elementClicked",
            xpath,
            deviceMetrics,
            screenshotSuffix,
        });
    }

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    function destroy() {
        clearTimeout(hoverDebounceTimer);
        clearTimeout(scrollLockTimer);
        document.removeEventListener("mousemove", onMouseMove, true);
        document.removeEventListener("click", onClick, true);
        document.removeEventListener("wheel", onWheel, true);
        chrome.runtime.onMessage.removeListener(metricsListener);

        if (currentElement) {
            currentElement.classList.remove("__cta-highlighted");
            currentElement = null;
        }

        document.getElementById(STYLE_ID)?.remove();
        delete window.__ctaHighlighterDestroy;
    }

    window.__ctaHighlighterDestroy = destroy;

    // ─── Attach (capture phase so we intercept before page handlers) ──────────

    document.addEventListener("mousemove", onMouseMove, { capture: true });
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("wheel", onWheel, { capture: true, passive: false });
})();
