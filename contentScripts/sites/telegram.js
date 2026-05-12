// Telegram (t.me) Auto Mode module.
//
// On a single-post page (t.me/<channel>/<n>) Telegram serves an embed-style
// widget inside an iframe. We strip the surrounding chrome (avatar, bubble
// tail, padding/borders) and target the iframe itself for element capture.
// On channel-landing pages we fall through to a zoomed full-page capture.
//
// Iframe contentDocument access requires same-origin. The t.me widget iframe
// loads from t.me, so this works on t.me itself; if it ever throws we just
// fall through.

(() => {
    const POST_DETECTORS = [
        '[class="tgme_page_widget_actions_wrap"]',
        '[class="tgme_page_widget_actions"]',
        '[class="tgme_page_widget_wrap"]',
        '[class="tgme_page tgme_page_post"]',
    ];
    const PROFILE_DETECTORS = [
        ".tgme_channel_info",
        ".tgme_header_info",
        ".tgme_header_right_column",
    ];

    const firstMatch = (selectors) => {
        for (const s of selectors) {
            try {
                if (document.querySelector(s)) return s;
            } catch {}
        }
        return null;
    };

    let detectorHit = null;
    const getPageType = () => {
        let s;
        if ((s = firstMatch(PROFILE_DETECTORS))) { detectorHit = s; return "profile"; }
        if ((s = firstMatch(POST_DETECTORS)))    { detectorHit = s; return "post"; }
        if (document.querySelector("iframe"))    { detectorHit = "iframe"; return "post"; }
        return "unknown";
    };

    // Returns { iframe, sameOrigin, removed } so the caller can log why a strip
    // may have been a no-op (cross-origin) vs. selectors actually rotting.
    const stripIframeChrome = () => {
        const iframe = document.querySelector("iframe");
        if (!iframe) return { iframe: null, sameOrigin: false, removed: 0 };

        let doc;
        try {
            doc = iframe.contentWindow?.document;
        } catch {
            return { iframe, sameOrigin: false, removed: 0 };
        }
        if (!doc) return { iframe, sameOrigin: false, removed: 0 };

        let removed = 0;
        const user = doc.querySelector(".tgme_widget_message_user");
        if (user) { user.remove(); removed++; }
        const tail = doc.querySelector(".tgme_widget_message_bubble_tail");
        if (tail) { tail.remove(); removed++; }

        const bubble = doc.querySelector(".tgme_widget_message_bubble");
        if (bubble) {
            bubble.style.border = "0";
            bubble.style.borderRadius = "0";
            bubble.style.margin = "0";
        }
        const widget = doc.querySelector(".js-widget_message");
        if (widget) widget.style.padding = "0";

        [iframe, iframe.parentElement, iframe.parentElement?.parentElement]
            .filter(Boolean)
            .forEach((el) => {
                el.style.padding = "0";
                el.style.margin = "0";
                el.style.border = "0";
            });

        return { iframe, sameOrigin: true, removed };
    };

    window.__ctaAutoCapturePending = (async () => {
        try {
            const pageType = getPageType();
            console.log(
                `[CTA Auto/telegram] page=${pageType} via=${detectorHit ?? "none"}`
            );

            if (pageType === "post") {
                const { iframe, sameOrigin, removed } = stripIframeChrome();
                console.log(
                    `[CTA Auto/telegram] iframe=${!!iframe} sameOrigin=${sameOrigin} stripped=${removed}`
                );
                console.log(`[CTA Auto/telegram] target=${iframe ? "iframe" : "MISS"}`);
                if (iframe)
                    return {
                        mode: "element",
                        xpath: window.__ctaBuildXPath(iframe),
                    };
            }
            if (pageType === "profile") {
                document.body.style.zoom = "130%";
                return { mode: "page" };
            }
            return { mode: "page" };
        } catch (e) {
            console.warn("[CTA Auto/telegram]", e);
            return { mode: "page" };
        }
    })();
})();
