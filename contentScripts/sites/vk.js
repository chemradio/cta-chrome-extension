// VK Auto Mode module.
//
// Post pages (wall posts / wk-summary etc.) target the post container.
// Profile pages remove floating banners and fall through to a zoomed
// full-page capture.

(() => {
    const POST_DETECTORS = [
        '[id="wk_summary"]',
        '[id="wk_content"]',
        ".post_content",
        ".post_info",
        "._post_content",
    ];
    const PROFILE_DETECTORS = [
        ".ProfileInfo",
        ".ProfileHeader__actions",
        '[id="profile_skeleton"]',
    ];
    const POST_SELECTORS = [
        '[id="wl_post"]',
        '[id="wk_content"]',
        "._post_content",
    ];
    const BANNER_SELECTORS = [
        '[id="page_bottom_banners_root"]',
        ".PageBottomBanner__in",
        '[id="box_layer_bg"]',
        '[id="box_layer_wrap"]',
    ];

    const getPageType = () => {
        if (POST_DETECTORS.some((s) => document.querySelector(s)))
            return "post";
        if (PROFILE_DETECTORS.some((s) => document.querySelector(s)))
            return "profile";
        return "unknown";
    };

    const removeBanners = () => {
        for (const selector of BANNER_SELECTORS) {
            document.querySelector(selector)?.remove();
        }
    };

    const getPostElement = () => {
        for (const selector of POST_SELECTORS) {
            const el = document.querySelector(selector);
            if (el) return el;
        }
        return null;
    };

    window.__ctaAutoCapturePending = (async () => {
        try {
            const pageType = getPageType();
            console.log(`[CTA Auto/vk] page=${pageType}`);

            removeBanners();

            if (pageType === "post") {
                const el = getPostElement();
                if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
            }
            if (pageType === "profile") {
                document.body.style.zoom = "120%";
                return { mode: "page" };
            }
            return { mode: "page" };
        } catch (e) {
            console.warn("[CTA Auto/vk]", e);
            return { mode: "page" };
        }
    })();
})();
