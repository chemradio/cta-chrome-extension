(function () {
    if (window.__DomKillerDestroy) {
        window.__DomKillerDestroy();
    }

    // ─── State ────────────────────────────────────────────────────────────────

    let currentElement = null;

    const STYLE_ID   = "__dk-style";
    const BANNER_ID  = "__dk-banner";
    const COLOR      = "#FF0055";

    const MOVEMENT_THRESHOLD = 8;
    const HOVER_DEBOUNCE_MS  = 100;
    const SCROLL_LOCK_MS     = 400;

    let lastCommittedX    = -9999;
    let lastCommittedY    = -9999;
    let pendingX          = 0;
    let pendingY          = 0;
    let hoverDebounceTimer = null;
    let scrollLockTimer    = null;
    let isScrollLocked     = false;
    let originalWindowOpen = null;

    // Remembers, per parent element, which child the user ascended from — so a
    // later wheel-down returns to that child instead of always firstElementChild.
    // Lets the user overshoot upward and walk back down the same branch.
    const descentMemory = new WeakMap();

    // ─── Styles ───────────────────────────────────────────────────────────────

    if (!document.getElementById(STYLE_ID)) {
        const style = document.createElement("style");
        style.id = STYLE_ID;
        style.textContent = `
            @keyframes __DkGlow {
                0%   { box-shadow: 0 0 5px 2px ${COLOR}; }
                50%  { box-shadow: 0 0 18px 6px ${COLOR}; }
                100% { box-shadow: 0 0 5px 2px ${COLOR}; }
            }
            .__dk-highlighted {
                outline: 2px solid ${COLOR} !important;
                animation: __DkGlow 1s infinite;
                cursor: crosshair !important;
            }
            /* Disable iframe interaction so ad clicks bubble to our document
               handlers instead of navigating inside the frame. */
            iframe, frame, object, embed {
                pointer-events: none !important;
            }
            /* Kill anchor navigation defaults across the page. */
            a { -webkit-user-drag: none !important; }
            #${BANNER_ID} {
                position: fixed !important;
                top: 0 !important;
                left: 0 !important;
                right: 0 !important;
                z-index: 2147483647 !important;
                background: ${COLOR} !important;
                color: #fff !important;
                font: 700 12px/1 "Arial Narrow", Arial, sans-serif !important;
                letter-spacing: 0.06em !important;
                text-align: center !important;
                padding: 6px 12px !important;
                pointer-events: none !important;
                text-transform: uppercase !important;
            }
        `;
        document.head.appendChild(style);
    }

    // ─── In-page instruction banner ───────────────────────────────────────────

    if (!document.getElementById(BANNER_ID)) {
        const banner = document.createElement("div");
        banner.id = BANNER_ID;
        banner.textContent = "Manual element removal — Hover to target · Click to remove · Wheel to change depth · ESC to stop";
        document.documentElement.appendChild(banner);
    }

    // ─── Highlight ────────────────────────────────────────────────────────────

    function highlight(el) {
        if (currentElement) currentElement.classList.remove("__dk-highlighted");
        currentElement = el;
        if (currentElement) currentElement.classList.add("__dk-highlighted");
    }

    // ─── Event handlers ───────────────────────────────────────────────────────

    function onMouseMove(e) {
        pendingX = e.clientX;
        pendingY = e.clientY;

        if (isScrollLocked) return;

        const dx = e.clientX - lastCommittedX;
        const dy = e.clientY - lastCommittedY;
        if (Math.sqrt(dx * dx + dy * dy) < MOVEMENT_THRESHOLD) return;

        clearTimeout(hoverDebounceTimer);
        hoverDebounceTimer = setTimeout(() => {
            const el = document.elementFromPoint(pendingX, pendingY);
            if (el && el !== document.documentElement && el !== document.body && el.id !== BANNER_ID) {
                highlight(el);
                lastCommittedX = pendingX;
                lastCommittedY = pendingY;
            }
        }, HOVER_DEBOUNCE_MS);
    }

    function onWheel(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();

        if (!currentElement) return;

        isScrollLocked = true;
        clearTimeout(scrollLockTimer);
        scrollLockTimer = setTimeout(() => {
            isScrollLocked = false;
            lastCommittedX = pendingX;
            lastCommittedY = pendingY;
        }, SCROLL_LOCK_MS);

        if (e.deltaY < 0) {
            const parent = currentElement.parentElement;
            if (parent && parent !== document.documentElement) {
                descentMemory.set(parent, currentElement);
                highlight(parent);
            }
        } else {
            const remembered = descentMemory.get(currentElement);
            const target = (remembered && remembered.parentElement === currentElement)
                ? remembered
                : currentElement.firstElementChild;
            if (target) highlight(target);
        }
    }

    function blockEvent(e) {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
    }

    function onPointerDown(e) {
        // Block mousedown/pointerdown so ad handlers that navigate on press
        // (before click fires) never run.
        blockEvent(e);
    }

    // Catch-all for events that can trigger navigation we don't otherwise
    // handle (middle-click, touch, drag, context menu, form submit).
    function onAuxOrTouch(e) {
        blockEvent(e);
    }

    function onClick(e) {
        blockEvent(e);

        if (!currentElement) return;

        const element = currentElement;
        currentElement = null;
        element.classList.remove("__dk-highlighted");

        // Walk up to the nearest ancestor <a> and remove that instead so the
        // whole link block disappears, not just the inner node the cursor hit.
        const link = element.closest("a");
        const target = link ?? element;

        // Persisting click-removed selectors to userFilters is disabled:
        // the generalized selector often matched different nodes on re-apply
        // than what the user removed by hand. Will be redesigned separately.

        target.remove();
    }

    // ─── Selector capture ─────────────────────────────────────────────────────

    // Short, generalizing selector. Prefers stable hooks (testid, aria-label,
    // id) and falls back to tag + first couple of classes. Goal: catch similar
    // ads on reload without being so specific it brittle-breaks on re-renders.
    function computeSelector(el) {
        if (!el || el.nodeType !== 1) return null;

        for (const a of [
            "data-testid",
            "data-test-id",
            "data-test",
            "data-qa",
            "data-cy",
        ]) {
            if (el.hasAttribute(a)) {
                const v = el.getAttribute(a);
                if (v) return `[${a}="${cssEscape(v)}"]`;
            }
        }

        if (el.hasAttribute("aria-label")) {
            const v = el.getAttribute("aria-label");
            if (v && v.length < 60) {
                return `${el.tagName.toLowerCase()}[aria-label="${cssEscape(v)}"]`;
            }
        }

        // Skip ids that look auto-generated (long digit runs / uuid-ish).
        if (el.id && !/\d{4,}/.test(el.id) && !/^[a-f0-9-]{16,}$/i.test(el.id)) {
            return `#${cssEscape(el.id)}`;
        }

        if (el.classList.length) {
            const classes = Array.from(el.classList)
                .slice(0, 2)
                .map((c) => `.${cssEscape(c)}`)
                .join("");
            return `${el.tagName.toLowerCase()}${classes}`;
        }

        return el.tagName.toLowerCase();
    }

    function cssEscape(s) {
        return typeof CSS !== "undefined" && CSS.escape
            ? CSS.escape(s)
            : String(s).replace(/(["\\\]])/g, "\\$1");
    }

    async function persistUserFilter(selector) {
        try {
            const host = location.hostname.toLowerCase();
            const { userFilters } = await chrome.storage.local.get("userFilters");
            const map = userFilters ?? {};
            const list = map[host] ?? [];
            if (!list.includes(selector)) {
                list.push(selector);
                map[host] = list;
                await chrome.storage.local.set({ userFilters: map });
                console.log(`DOM-killer saved: ${host} → ${selector}`);
            }
        } catch (e) {
            console.warn("DOM-killer persist failed:", e);
        }
    }

    function onKeyDown(e) {
        if (e.key === "Escape") {
            destroy();
            chrome.runtime.sendMessage({ action: "domKillerEnded" });
        }
    }

    // ─── Cleanup ──────────────────────────────────────────────────────────────

    function destroy() {
        clearTimeout(hoverDebounceTimer);
        clearTimeout(scrollLockTimer);
        document.removeEventListener("mousemove",   onMouseMove,   true);
        document.removeEventListener("pointerdown", onPointerDown, true);
        document.removeEventListener("mousedown",   onPointerDown, true);
        document.removeEventListener("mouseup",     onAuxOrTouch,  true);
        document.removeEventListener("click",       onClick,       true);
        document.removeEventListener("auxclick",    onAuxOrTouch,  true);
        document.removeEventListener("dblclick",    onAuxOrTouch,  true);
        document.removeEventListener("contextmenu", onAuxOrTouch,  true);
        document.removeEventListener("touchstart",  onAuxOrTouch,  true);
        document.removeEventListener("touchend",    onAuxOrTouch,  true);
        document.removeEventListener("dragstart",   onAuxOrTouch,  true);
        document.removeEventListener("submit",      onAuxOrTouch,  true);
        document.removeEventListener("wheel",       onWheel,       true);
        document.removeEventListener("keydown",     onKeyDown,     true);

        if (originalWindowOpen) {
            window.open = originalWindowOpen;
            originalWindowOpen = null;
        }

        if (currentElement) {
            currentElement.classList.remove("__dk-highlighted");
            currentElement = null;
        }

        document.getElementById(STYLE_ID)?.remove();
        document.getElementById(BANNER_ID)?.remove();
        delete window.__DomKillerDestroy;
    }

    window.__DomKillerDestroy = destroy;

    // ─── Attach ───────────────────────────────────────────────────────────────

    document.addEventListener("mousemove",   onMouseMove,   { capture: true });
    document.addEventListener("pointerdown", onPointerDown, { capture: true });
    document.addEventListener("mousedown",   onPointerDown, { capture: true });
    document.addEventListener("mouseup",     onAuxOrTouch,  { capture: true });
    document.addEventListener("click",       onClick,       { capture: true });
    document.addEventListener("auxclick",    onAuxOrTouch,  { capture: true });
    document.addEventListener("dblclick",    onAuxOrTouch,  { capture: true });
    document.addEventListener("contextmenu", onAuxOrTouch,  { capture: true });
    document.addEventListener("touchstart",  onAuxOrTouch,  { capture: true, passive: false });
    document.addEventListener("touchend",    onAuxOrTouch,  { capture: true, passive: false });
    document.addEventListener("dragstart",   onAuxOrTouch,  { capture: true });
    document.addEventListener("submit",      onAuxOrTouch,  { capture: true });
    document.addEventListener("wheel",       onWheel,       { capture: true, passive: false });
    document.addEventListener("keydown",     onKeyDown,     { capture: true });

    // Stub window.open so any handler that beats us (script registered a
    // capture listener earlier than us) still can't pop a new tab.
    originalWindowOpen = window.open;
    window.open = function () { return null; };
})();
