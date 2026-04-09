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

    function onMouseOver(e) {
        const target = e.target;
        if (
            target &&
            target !== document.documentElement &&
            target !== document.body
        ) {
            highlight(target);
        }
        e.stopPropagation();
    }

    function onMouseOut(e) {
        if (e.target && e.target !== currentElement) {
            e.target.classList.remove("__cta-highlighted");
        }
    }

    function onWheel(e) {
        e.preventDefault();
        e.stopPropagation();
        if (!currentElement) return;

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

        // Remove highlight BEFORE measuring so the outline doesn't affect dimensions
        element.classList.remove("__cta-highlighted");

        // Absolute page coordinates (CSS pixels, scroll-offset adjusted)
        // CDP Page.captureScreenshot clip uses page-absolute coordinates:
        // x=0,y=0 means top-left of the document regardless of scroll position.
        const rect = element.getBoundingClientRect();
        const elementRect = {
            x: Math.floor(rect.left + window.scrollX),
            y: Math.floor(rect.top + window.scrollY),
            width: Math.ceil(rect.width),
            height: Math.ceil(rect.height),
        };

        const xpath = getXPath(element);

        destroy();

        chrome.runtime.sendMessage({
            action: "elementClicked",
            xpath,
            elementRect,
            deviceMetrics,
            screenshotSuffix,
        });
    }

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    function destroy() {
        document.removeEventListener("mouseover", onMouseOver, true);
        document.removeEventListener("mouseout", onMouseOut, true);
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

    document.addEventListener("mouseover", onMouseOver, { capture: true });
    document.addEventListener("mouseout", onMouseOut, { capture: true });
    document.addEventListener("click", onClick, { capture: true });
    document.addEventListener("wheel", onWheel, { capture: true, passive: false });
})();
