const layoutInputs   = document.querySelectorAll('input[name="layout"]');
const widthInput     = document.getElementById("width");
const heightInput    = document.getElementById("height");
const statusEl       = document.getElementById("status");
const popupEl        = document.querySelector(".popup");
const captureLabelEl = document.getElementById("capture-label");
const captureHintEl  = document.getElementById("capture-hint");

const presets = {
    horizontal: { width: 1920, height: 1080 },
    horizontal4k: { width: 3840, height: 2160 },
    vertical:   { width: 1920, height: 7000 },
    fullpage:   { width: 1920, height: null },
    custom:     null,
};

// ─── Capture overlay ──────────────────────────────────────────────────────────

function showCapturing(label, hint = "") {
    captureLabelEl.textContent = label;
    captureHintEl.textContent  = hint;
    captureHintEl.hidden       = !hint;
    popupEl.classList.add("is-capturing");
}

function stopCapturing() {
    popupEl.classList.remove("is-capturing");
}

// ─── Status helper ────────────────────────────────────────────────────────────

let statusTimer = null;

function setStatus(msg, type = "busy", autoClear = 0) {
    statusEl.textContent = msg;
    statusEl.className = `status ${type}`;
    clearTimeout(statusTimer);
    if (autoClear > 0) {
        statusTimer = setTimeout(() => {
            statusEl.textContent = "";
            statusEl.className = "status";
        }, autoClear);
    }
}

// ─── Resolution ───────────────────────────────────────────────────────────────

function getSelectedLayout() {
    return document.querySelector('input[name="layout"]:checked').value;
}

function updateResolutionInputs() {
    const layout = getSelectedLayout();

    if (layout === "custom") {
        widthInput.disabled  = false;
        heightInput.disabled = false;
        return;
    }

    if (layout === "fullpage") {
        widthInput.disabled  = true;
        heightInput.disabled = true;
        widthInput.value     = 1920;
        heightInput.value    = "…";
        setStatus("Measuring page height…");
        chrome.runtime.sendMessage({ action: "getPageHeight" }, (response) => {
            if (chrome.runtime.lastError || !response || response.ok === false) {
                heightInput.value = 9999;
                setStatus("Could not measure page height", "error", 3000);
                return;
            }
            heightInput.value = Math.min(response.pageHeight ?? 9999, 9999);
            setStatus("");
        });
        return;
    }

    widthInput.disabled  = false;
    heightInput.disabled = false;
    const preset         = presets[layout];
    widthInput.value     = preset.width;
    heightInput.value    = preset.height;
}

function checkCustomResolution() {
    const layout = getSelectedLayout();
    if (layout === "custom" || layout === "fullpage") return;

    const preset = presets[layout];
    if (
        parseInt(widthInput.value)  !== preset.width ||
        parseInt(heightInput.value) !== preset.height
    ) {
        document.getElementById("custom").checked = true;
        widthInput.disabled  = false;
        heightInput.disabled = false;
    }
}

function getScaleFactor() {
    for (const s of document.getElementsByName("scale")) {
        if (s.checked) return parseInt(s.value);
    }
    return 2;
}

function getSettings() {
    return {
        layout:            getSelectedLayout(),
        width:             parseInt(widthInput.value)  || 1920,
        height:            parseInt(heightInput.value) || 1080,
        deviceScaleFactor: getScaleFactor(),
    };
}

// ─── Messaging ────────────────────────────────────────────────────────────────

const sendMessage = (message) =>
    new Promise((resolve, reject) => {
        chrome.runtime.sendMessage(message, (response) => {
            if (chrome.runtime.lastError) {
                return reject(new Error(chrome.runtime.lastError.message));
            }
            if (response && response.ok === false) {
                return reject(new Error(response.error || "Request failed"));
            }
            resolve(response);
        });
    });

// ─── Button handlers ──────────────────────────────────────────────────────────

document.getElementById("capture-page").addEventListener("click", () => {
    showCapturing("Capturing page…");
    sendMessage({ action: "capturePage", settings: getSettings() })
        .then(() => { stopCapturing(); setStatus("Done — check Downloads", "ok", 4000); })
        .catch((e) => { stopCapturing(); setStatus(e.message ?? "Error", "error", 5000); });
});

document.getElementById("capture-element").addEventListener("click", async () => {
    showCapturing("Select an element", "Move mouse to highlight\nScroll wheel to change depth");
    try {
        // Await injection so the highlighter is listening before we close the popup.
        // Closing immediately afterward avoids the two-click trap: if the popup is
        // open when the user clicks the page, Chrome dismisses the popup and swallows
        // that first click — it never reaches the highlighter's listener.
        await sendMessage({ action: "captureElement", settings: getSettings() });
        window.close();
    } catch (e) {
        stopCapturing();
        setStatus(e.message ?? "Error", "error", 5000);
    }
});

document.getElementById("capture-auto").addEventListener("click", () => {
    showCapturing("Auto-capturing…");
    sendMessage({ action: "autoCapture", settings: getSettings() })
        .then((res) => {
            stopCapturing();
            const label =
                res?.mode === "element"
                    ? `Auto: captured ${res.module} post`
                    : res?.mode === "page"
                    ? `Auto: full page for ${res.module}`
                    : "Auto: full page (no site module)";
            setStatus(`${label} — check Downloads`, "ok", 4000);
        })
        .catch((e) => { stopCapturing(); setStatus(e.message ?? "Error", "error", 5000); });
});

// Element capture result — fires if the popup is still open when capture ends.
chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action !== "elementCaptureResult") return false;
    stopCapturing();
    if (msg.ok) {
        setStatus("Done — check Downloads", "ok", 4000);
    } else {
        setStatus(msg.error || "Element capture failed", "error", 5000);
    }
    return false;
});

document.getElementById("manual-cleanup").addEventListener("click", () => {
    setStatus("Cleaning up…");
    sendMessage({ action: "manualCleanup" })
        .then((res) => {
            const s = res?.stats;
            if (!s) {
                setStatus("Cleanup done", "ok", 3000);
                return;
            }
            const { removed = 0, sources = {} } = s;
            const breakdown =
                `easylist:${sources.easylist ?? 0} ` +
                `bundled:${sources.bundled ?? 0} ` +
                `user:${sources.user ?? 0} ` +
                `user-global:${sources.userGlobal ?? 0}`;
            setStatus(`Removed ${removed} nodes (${breakdown})`, "ok", 5000);
        })
        .catch((e) => setStatus(e.message ?? "Error", "error", 5000));
});

document.getElementById("dom-killer").addEventListener("click", async () => {
    showCapturing("Manual removal", "Hover to target · Click to remove\nWheel to change depth · ESC to stop");
    try {
        // Same one-click fix as capture-element: close the popup once the
        // content script is listening, so the user's first click on the page
        // reaches the kill handler instead of being swallowed by popup dismissal.
        await sendMessage({ action: "domKiller" });
        window.close();
    } catch (e) {
        stopCapturing();
        setStatus(e.message ?? "Error", "error", 5000);
    }
});

// ─── Hidden expert UI: triple-click the header to reveal Export ──────────────

const exportBtn        = document.getElementById("export-filters");
const clearDomainBtn   = document.getElementById("clear-domain-filters");
const clearGlobalBtn   = document.getElementById("clear-global-filters");
const disableBundledCb = document.getElementById("disable-bundled");

chrome.storage.local.get("bundledFiltersDisabled").then(({ bundledFiltersDisabled }) => {
    disableBundledCb.checked = !!bundledFiltersDisabled;
});

disableBundledCb.addEventListener("change", () => {
    const disabled = disableBundledCb.checked;
    chrome.storage.local.set({ bundledFiltersDisabled: disabled });
    setStatus(
        disabled ? "Bundled filters disabled" : "Bundled filters enabled",
        "ok",
        2000
    );
});
const viewNormal       = document.getElementById("view-normal");
const viewExpert       = document.getElementById("view-expert");
const filterHostEl     = document.getElementById("filter-host");
const filterInput      = document.getElementById("filter-input");
const filterAddBtn     = document.getElementById("filter-add");
const filterListEl     = document.getElementById("filter-list");
const filterListGlobal = document.getElementById("filter-list-global");
const filterPreview    = document.getElementById("filter-preview");
const filterParentCb   = document.getElementById("filter-parent");
const scopeInputs      = document.getElementsByName("filter-scope");

function getScope() {
    for (const r of scopeInputs) if (r.checked) return r.value;
    return "host";
}
const modeToggleInput  = document.getElementById("mode-toggle-input");
const modeToggleLabel  = document.getElementById("mode-toggle-label");

function setMode(expert) {
    viewExpert.hidden = !expert;
    viewNormal.hidden = expert;
    modeToggleInput.checked = expert;
    modeToggleLabel.textContent = expert ? "EXPERT" : "NORMAL";
    popupEl.classList.toggle("is-expert", expert);
    helpContentNormal.hidden = expert;
    helpContentExpert.hidden = !expert;
    if (expert) refreshFilterList();
}

// ─── Help view ────────────────────────────────────────────────────────────────

const helpToggleBtn      = document.getElementById("help-toggle");
const helpView           = document.getElementById("view-help");
const helpContentNormal  = document.getElementById("help-content-normal");
const helpContentExpert  = document.getElementById("help-content-expert");

function setHelp(open) {
    popupEl.classList.toggle("is-helping", open);
    helpView.hidden = !open;
    helpToggleBtn.textContent = open ? "×" : "?";
    helpToggleBtn.title = open ? "Close help" : "Help";
}

helpToggleBtn.addEventListener("click", () => {
    setHelp(!popupEl.classList.contains("is-helping"));
});

modeToggleInput.addEventListener("change", () => {
    const expert = modeToggleInput.checked;
    setMode(expert);
    setStatus(expert ? "Expert mode on" : "Expert mode off", "ok", 1500);
});

// ─── Manual user-filter management ────────────────────────────────────────────

function isValidCssSelector(sel) {
    try {
        document.createDocumentFragment().querySelector(sel);
        return true;
    } catch {
        return false;
    }
}

const cssEsc = (s) =>
    CSS && CSS.escape ? CSS.escape(s) : String(s).replace(/(["\\\]])/g, "\\$1");

// Accepts a CSS selector OR an HTML-fragment shape and returns a CSS selector.
// Recognized fragment shapes:
//   class="foo bar"          → .foo.bar
//   id="main"                → #main
//   data-testid="tweet"      → [data-testid="tweet"]
//   <div class="foo" data-x="y">  → div.foo[data-x="y"]
//   div class="foo"          → div.foo
// Anything that doesn't look like a fragment (no angle brackets, no name="value")
// is passed through untouched so plain CSS selectors keep working.
function normalizeSelector(raw) {
    const s = String(raw ?? "").trim();
    if (!s) return "";

    const hasAngle = /^</.test(s) || />\s*$/.test(s);
    const hasAttrPair = /([a-zA-Z_:][\w:.-]*)\s*=\s*"[^"]*"/.test(s);
    if (!hasAngle && !hasAttrPair) return s;

    let body = s.replace(/^<\s*/, "").replace(/\s*\/?>\s*$/, "").trim();

    let tag = "";
    const tagMatch = body.match(/^([a-zA-Z][\w-]*)(?=\s|$)/);
    if (tagMatch) {
        tag = tagMatch[1].toLowerCase();
        body = body.slice(tagMatch[0].length).trim();
    }

    const attrs = {};
    for (const m of body.matchAll(/([a-zA-Z_:][\w:.-]*)\s*=\s*"([^"]*)"/g)) {
        attrs[m[1]] = m[2];
    }

    let out = tag;
    if (attrs.id) {
        out += `#${cssEsc(attrs.id)}`;
        delete attrs.id;
    }
    if (attrs.class) {
        for (const c of attrs.class.split(/\s+/).filter(Boolean)) {
            out += `.${cssEsc(c)}`;
        }
        delete attrs.class;
    }
    for (const [k, v] of Object.entries(attrs)) {
        out += `[${k}="${v.replace(/(["\\])/g, "\\$1")}"]`;
    }

    return out || s;
}

function wrapParent(sel) {
    return filterParentCb.checked && sel ? `*:has(> ${sel})` : sel;
}

function updatePreview() {
    const raw = filterInput.value;
    const normalized = wrapParent(normalizeSelector(raw));
    const differs = normalized && normalized !== raw.trim();
    const valid = normalized ? isValidCssSelector(normalized) : true;

    if (!raw.trim()) {
        filterPreview.hidden = true;
        filterPreview.classList.remove("invalid");
        filterInput.classList.remove("invalid");
        return;
    }

    filterInput.classList.toggle("invalid", !valid);
    filterPreview.classList.toggle("invalid", !valid);

    if (!valid) {
        filterPreview.hidden = false;
        filterPreview.textContent = "Invalid CSS selector";
        return;
    }
    if (differs) {
        filterPreview.hidden = false;
        filterPreview.innerHTML = "";
        const arrow = document.createElement("span");
        arrow.className = "arrow";
        arrow.textContent = "→";
        const sel = document.createElement("span");
        sel.textContent = normalized;
        filterPreview.append(arrow, sel);
    } else {
        filterPreview.hidden = true;
    }
}

function renderListInto(ulEl, selectors, scope) {
    ulEl.innerHTML = "";
    for (const sel of selectors) {
        const li = document.createElement("li");
        const span = document.createElement("span");
        span.className = "sel";
        span.textContent = sel;
        span.title = sel;
        const btn = document.createElement("button");
        btn.className = "remove";
        btn.type = "button";
        btn.textContent = "×";
        btn.title = "Remove";
        btn.addEventListener("click", () => removeFilter(sel, scope));
        li.append(span, btn);
        ulEl.appendChild(li);
    }
}

function renderFilterList(host, selectors, globalSelectors) {
    filterHostEl.textContent = host || "(no host)";
    renderListInto(filterListEl,     selectors,       "host");
    renderListInto(filterListGlobal, globalSelectors, "global");
}

function refreshFilterList() {
    sendMessage({ action: "listUserFilters" })
        .then((res) =>
            renderFilterList(
                res?.host,
                res?.selectors ?? [],
                res?.globalSelectors ?? []
            )
        )
        .catch((e) => setStatus(e.message ?? "Error", "error", 4000));
}

function addFilter() {
    const sel = wrapParent(normalizeSelector(filterInput.value));
    if (!sel) return;
    if (!isValidCssSelector(sel)) {
        filterInput.classList.add("invalid");
        setStatus("Invalid CSS selector", "error", 3000);
        return;
    }
    filterInput.classList.remove("invalid");
    const scope = getScope();
    sendMessage({ action: "addUserFilter", selector: sel, scope })
        .then((res) => {
            renderFilterList(
                res?.host,
                res?.selectors ?? [],
                res?.globalSelectors ?? []
            );
            filterInput.value = "";
            updatePreview();
            const where = scope === "global" ? "all hosts" : "this host";
            setStatus(
                res?.added ? `Added to ${where}: ${sel}` : "Already present",
                "ok",
                2500
            );
        })
        .catch((e) => setStatus(e.message ?? "Error", "error", 4000));
}

function removeFilter(sel, scope) {
    sendMessage({ action: "removeUserFilter", selector: sel, scope })
        .then((res) => {
            renderFilterList(
                res?.host,
                res?.selectors ?? [],
                res?.globalSelectors ?? []
            );
            setStatus(`Removed: ${sel}`, "ok", 2500);
        })
        .catch((e) => setStatus(e.message ?? "Error", "error", 4000));
}

filterAddBtn.addEventListener("click", addFilter);
filterInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") addFilter();
});
filterInput.addEventListener("input", updatePreview);
filterParentCb.addEventListener("change", updatePreview);

clearDomainBtn.addEventListener("click", () => {
    const ok = confirm(
        "Clear all per-host (domain) user filters?\n\n" +
        "Host-scoped selectors you collected via DOM-killer will be removed " +
        "from this browser. Global, bundled and EasyList filters are not affected."
    );
    if (!ok) return;
    setStatus("Clearing…");
    sendMessage({ action: "clearDomainFilters" })
        .then((res) => {
            const n = res?.selectorCount ?? 0;
            const h = res?.hostCount ?? 0;
            setStatus(
                n === 0
                    ? "No domain filters to clear"
                    : `Cleared ${n} selectors across ${h} hosts`,
                "ok",
                4000
            );
            refreshFilterList();
        })
        .catch((e) => setStatus(e.message ?? "Error", "error", 5000));
});

clearGlobalBtn.addEventListener("click", () => {
    const ok = confirm(
        "Clear all global user filters?\n\n" +
        "Selectors that apply to all hosts will be removed from this " +
        "browser. Domain, bundled and EasyList filters are not affected."
    );
    if (!ok) return;
    setStatus("Clearing…");
    sendMessage({ action: "clearGlobalFilters" })
        .then((res) => {
            const n = res?.selectorCount ?? 0;
            setStatus(
                n === 0
                    ? "No global filters to clear"
                    : `Cleared ${n} global selectors`,
                "ok",
                4000
            );
            refreshFilterList();
        })
        .catch((e) => setStatus(e.message ?? "Error", "error", 5000));
});

exportBtn.addEventListener("click", () => {
    setStatus("Exporting…");
    sendMessage({ action: "exportFilters" })
        .then((res) => {
            const n = res?.selectorCount ?? 0;
            const h = res?.hostCount ?? 0;
            if (n === 0) {
                setStatus("No user filters to export", "ok", 3000);
            } else {
                setStatus(`Exported ${n} selectors across ${h} hosts`, "ok", 4000);
            }
        })
        .catch((e) => setStatus(e.message ?? "Error", "error", 5000));
});

chrome.runtime.onMessage.addListener((msg) => {
    if (msg?.action !== "domKillerEnded") return false;
    stopCapturing();
    setStatus("Manual removal stopped", "ok", 3000);
    return false;
});

// ─── Init ─────────────────────────────────────────────────────────────────────

layoutInputs.forEach((input) =>
    input.addEventListener("change", updateResolutionInputs)
);
widthInput.addEventListener("input",  checkCustomResolution);
heightInput.addEventListener("input", checkCustomResolution);

updateResolutionInputs();

// If the popup was re-opened by the element-click handoff, show the
// "Capturing…" overlay immediately. The session flag is set in
// elementClickListener.js and cleared when capture finishes; the
// elementCaptureResult listener above will then call stopCapturing().
chrome.storage.session.get("elementCaptureInProgress", (data) => {
    if (data?.elementCaptureInProgress) {
        showCapturing("Capturing element…");
    }
});
