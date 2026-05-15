// Localizes the popup DOM. Chrome resolves the locale from the browser UI
// language against the _locales/ folder (en, ru); see manifest "default_locale".
//
// Markup-driven: elements carry one of four data attributes —
//   data-i18n        → textContent
//   data-i18n-html   → innerHTML  (for strings that contain markup)
//   data-i18n-title  → title attribute
//   data-i18n-ph     → placeholder attribute
// Runs once at load; popup.js may override individual strings afterwards.
(function () {
    const msg = (key) => chrome.i18n.getMessage(key) || "";

    const apply = (attr, fn) => {
        for (const el of document.querySelectorAll(`[${attr}]`)) {
            const key = el.getAttribute(attr);
            const value = msg(key);
            if (value) fn(el, value);
        }
    };

    apply("data-i18n",       (el, v) => { el.textContent = v; });
    apply("data-i18n-html",  (el, v) => { el.innerHTML = v; });
    apply("data-i18n-title", (el, v) => { el.title = v; });
    apply("data-i18n-ph",    (el, v) => { el.placeholder = v; });
})();
