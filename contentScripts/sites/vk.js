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

    const firstMatch = (selectors) => {
        for (const s of selectors) {
            try {
                if (document.querySelector(s)) return s;
            } catch {}
        }
        return null;
    };

    let detectorHit = null;
    let targetSelector = null;
    const getPageType = () => {
        let s;
        if ((s = firstMatch(POST_DETECTORS)))    { detectorHit = s; return "post"; }
        if ((s = firstMatch(PROFILE_DETECTORS))) { detectorHit = s; return "profile"; }
        return "unknown";
    };

    const removeBanners = () => {
        let n = 0;
        for (const selector of BANNER_SELECTORS) {
            const el = document.querySelector(selector);
            if (el) { el.remove(); n++; }
        }
        return n;
    };

    const getPostElement = () => {
        for (const selector of POST_SELECTORS) {
            const el = document.querySelector(selector);
            if (el) { targetSelector = selector; return el; }
        }
        return null;
    };

    window.__AutoCapturePending = (async () => {
        try {
            const pageType = getPageType();
            if (window.__SiteOptions?.detectOnly) {
                return { mode: "detect", pageType };
            }
            console.log(`[Auto/vk] page=${pageType} via=${detectorHit ?? "none"}`);

            const banners = removeBanners();
            console.log(`[Auto/vk] cleanup: BANNERS=${banners}`);

            if (pageType === "post") {
                const el = getPostElement();
                console.log(`[Auto/vk] target=${el ? `post via=${targetSelector}` : "MISS"}`);
                if (el) return { mode: "element", xpath: window.__BuildXPath(el) };
            }
            if (pageType === "profile") {
                return { mode: "page" };
            }
            return { mode: "page" };
        } catch (e) {
            console.warn("[Auto/vk]", e);
            return { mode: "page" };
        }
    })();
})();
