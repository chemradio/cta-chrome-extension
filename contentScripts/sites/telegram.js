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

    const matchAny = (selectors) =>
        selectors.some((s) => document.querySelector(s));

    const getPageType = () => {
        if (matchAny(PROFILE_DETECTORS)) return "profile";
        if (matchAny(POST_DETECTORS) || document.querySelector("iframe"))
            return "post";
        return "unknown";
    };

    const stripIframeChrome = () => {
        const iframe = document.querySelector("iframe");
        if (!iframe) return null;

        let doc;
        try {
            doc = iframe.contentWindow?.document;
        } catch {
            return iframe; // cross-origin — still target the iframe as-is
        }
        if (!doc) return iframe;

        doc.querySelector(".tgme_widget_message_user")?.remove();
        doc.querySelector(".tgme_widget_message_bubble_tail")?.remove();

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

        return iframe;
    };

    window.__ctaAutoCapturePending = (async () => {
        try {
            const pageType = getPageType();
            console.log(`[CTA Auto/telegram] page=${pageType}`);

            if (pageType === "post") {
                const iframe = stripIframeChrome();
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
