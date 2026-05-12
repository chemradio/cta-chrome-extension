// X.com / Twitter Auto Mode module.
//
// Post pages target the focused tweet article. Profile pages strip account
// chrome (Trending sidebar, account menu) and fall through to a zoomed
// full-page capture.

(() => {
    const PERSONAL_SELECTORS = [
        '[aria-label="Trending"]',
        '[aria-label="Account menu"]',
        '[class="css-175oi2r r-1h8ys4a r-1mmae3n"]',
        '[class="css-175oi2r r-1bimlpy r-f8sm7e r-m5arl1 r-16y2uox r-14gqq1x"]',
        '[class="css-175oi2r r-1bimlpy r-f8sm7e r-m5arl1 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af"]',
    ];

    const POST_SELECTORS = [
        "article[tabindex='-1']",
        'article[role="article"]',
        '[data-testid="tweet"]',
    ];

    const PROFILE_DETECTORS = [
        '[data-testid="UserDescription"]',
        '[aria-label="Profile timelines"]',
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
        if ((s = firstMatch(PROFILE_DETECTORS))) { detectorHit = s; return "profile"; }
        if ((s = firstMatch(POST_SELECTORS)))    { detectorHit = s; return "post"; }
        if (document.querySelector('[aria-label="Timeline: Conversation"]')) {
            detectorHit = '[aria-label="Timeline: Conversation"]';
            return "post";
        }
        return "unknown";
    };

    const removePersonal = () => {
        let n = 0;
        for (const selector of PERSONAL_SELECTORS) {
            const matches = document.querySelectorAll(selector);
            n += matches.length;
            matches.forEach((el) => el.remove());
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

    window.__ctaAutoCapturePending = (async () => {
        try {
            const pageType = getPageType();
            console.log(`[CTA Auto/x] page=${pageType} via=${detectorHit ?? "none"}`);

            const personal = removePersonal();
            console.log(`[CTA Auto/x] cleanup: PERSONAL=${personal}`);

            if (pageType === "post") {
                window.scrollTo(0, 0);
                const el = getPostElement();
                console.log(`[CTA Auto/x] target=${el ? `post via=${targetSelector}` : "MISS"}`);
                if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
            }
            if (pageType === "profile") {
                document.body.style.zoom = "120%";
                return { mode: "page" };
            }
            return { mode: "page" };
        } catch (e) {
            console.warn("[CTA Auto/x]", e);
            return { mode: "page" };
        }
    })();
})();
