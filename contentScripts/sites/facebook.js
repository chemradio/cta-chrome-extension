// Facebook Auto Mode module.
//
// Returns a capture plan on window.__ctaAutoCapturePending:
//   { mode: "element", xpath } — capture a specific post / story / group post
//   { mode: "page" }           — fall through to full-page capture
//
// Logged-out state is detected via the email/pass inputs. Logged-in flows
// prefer the role="dialog" overlay post, then video permalink, then group
// post article. Profile pages target document.body with a small zoom bump.

(() => {
    const SEE_MORE_SELECTORS = [
        '[class="x1ey2m1c xds687c x17qophe xixxii4 x13vifvy x1h0vfkc"]',
        '[class="__fb-light-mode x1qjc9v5 x9f619 x78zum5 xdt5ytf xl56j7k x1c4vz4f xg6iff7"]',
        '[class="x1cy8zhl x9f619 x78zum5 xl56j7k x2lwn1j xeuugli x47corl x1x97wu9 xbr3nou xurb0ha x1sxyh0 x3v4vwv x1dzdb2q"]',
    ];

    const GROUP_POST_DETECTORS = [
        'div[data-pagelet="GroupInlineComposer"]',
        'div[data-pagelet="GroupFeed"]',
    ];
    const POST_DETECTORS = [
        '[data-ad-preview="message"]',
        '[data-ad-comet-preview="message"]',
        '[data-ad-rendering-role="story_message"]',
        '[data-pagelet="WatchPermalinkVideo"]',
    ];
    const STORY_DETECTORS = [
        '[data-pagelet="StoriesContentPane"]',
        '[data-pagelet="StoriesCardMedia"]',
    ];
    const PROFILE_DETECTORS = [
        '[data-pagelet="ProfileTilesFeed_1"]',
        '[data-pagelet="ProfileTabs"]',
        '[data-pagelet="ProfileActions"]',
    ];

    const delay = (ms) => new Promise((r) => setTimeout(r, ms));
    const matchAny = (selectors) =>
        selectors.some((s) => document.querySelector(s));

    const isLoggedIn = () =>
        !document.querySelector('input[name="email"]') &&
        !document.querySelector('input[name="pass"]');

    const getPageType = () => {
        if (matchAny(GROUP_POST_DETECTORS)) return "groupPost";
        if (matchAny(PROFILE_DETECTORS)) return "profile";
        if (matchAny(STORY_DETECTORS)) return "story";
        if (matchAny(POST_DETECTORS)) return "post";
        return "unknown";
    };

    const removeSeeMore = () => {
        for (const selector of SEE_MORE_SELECTORS) {
            document.querySelectorAll(selector).forEach((el) => el.remove());
        }
    };

    // Comment-As toolbar: walk up 8 levels from the "Available Voices" anchor
    // to the wrapper section. The legacy depth was 8 parents and the section
    // structure hasn't changed.
    const removeCommentAs = () => {
        document
            .querySelectorAll('[aria-label="Available Voices"]')
            .forEach((el) => {
                let ancestor = el;
                for (let i = 0; i < 8 && ancestor.parentElement; i++) {
                    ancestor = ancestor.parentElement;
                }
                ancestor.remove();
            });
    };

    const removeBanner = () => {
        document.querySelector('[role="banner"]')?.remove();
        const main = document.querySelector('[role="main"]');
        if (!main) return;
        let el = main;
        for (let i = 0; i < 4 && el.parentElement; i++) el = el.parentElement;
        el.style.position = "relative";
        el.style.top = "0px";
    };

    const getDialogPostLogged = () => {
        const dialogs = document.querySelectorAll('[role="dialog"]');
        for (const d of dialogs) {
            const article = d.querySelector('[role="article"]');
            if (article) return article;
        }
        return null;
    };

    const getDialogPostUnlogged = () => {
        const selectors = [
            '[class="html-div xdj266r x11i5rnm xat24cr x1mh8g0r xexx8yu x4uap5 x18d9i69 xkhd6sd"]',
        ];
        for (const selector of selectors) {
            const el = document.querySelector(selector);
            if (el) return el;
        }
        return null;
    };

    const getVideoPost = () =>
        document.querySelector('[data-pagelet="WatchPermalinkVideo"]')
            ?.parentElement?.parentElement ?? null;

    const getGroupPost = () => document.querySelector('div[role="article"]');

    // Story playback is paused before capture. The pause button only exists
    // once the story is playing, so we click "View story" first (if shown),
    // wait ~1s for the player to come up, then pause.
    const getStoryElement = async () => {
        const pane = document.querySelector('[data-pagelet="StoriesContentPane"]');
        if (pane) {
            const viewBtn = pane.querySelector('[role="button"]');
            viewBtn?.click();
            await delay(1000);
            const pauseBtn = pane.querySelector('[aria-label="Pause"]');
            pauseBtn?.click();
        }
        return document.querySelector('[data-pagelet="StoriesCardMedia"]');
    };

    window.__ctaAutoCapturePending = (async () => {
        try {
            document.body.style.fontFamily = "'Roboto', sans-serif";
            const pageType = getPageType();
            const logged = isLoggedIn();
            console.log(`[CTA Auto/facebook] page=${pageType} logged=${logged}`);

            if (pageType === "groupPost") {
                removeCommentAs();
                removeSeeMore();
                const el = getGroupPost();
                if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
            }

            if (pageType === "story") {
                const el = await getStoryElement();
                if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
            }

            if (pageType === "post") {
                removeSeeMore();
                if (logged) {
                    removeCommentAs();
                    const el =
                        getDialogPostLogged() ||
                        getVideoPost() ||
                        getGroupPost();
                    if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
                } else {
                    const el = getDialogPostUnlogged();
                    if (el) return { mode: "element", xpath: window.__ctaBuildXPath(el) };
                }
            }

            if (pageType === "profile") {
                removeBanner();
                removeCommentAs();
                removeSeeMore();
                document.body.style.zoom = "120%";
                return { mode: "page" };
            }

            return { mode: "page" };
        } catch (e) {
            console.warn("[CTA Auto/facebook]", e);
            return { mode: "page" };
        }
    })();
})();
