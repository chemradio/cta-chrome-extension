(() => {
    const cleanupDB = {
        "www.facebook.com": {
            static: [
                // Floating/sticky overlays
                '[class="x1ey2m1c xds687c x17qophe xixxii4 x13vifvy x1h0vfkc"]',
                '[class="__fb-light-mode x1qjc9v5 x9f619 x78zum5 xdt5ytf xl56j7k x1c4vz4f xg6iff7"]',
                '[class="x1cy8zhl x9f619 x78zum5 xl56j7k x2lwn1j xeuugli x47corl x1x97wu9 xbr3nou xurb0ha x1sxyh0 x3v4vwv x1dzdb2q"]',
            ],
            funcs: [
                () => {
                    // Remove top navigation banner
                    const banner = document.querySelector('[role="banner"]');
                    if (banner) banner.remove();
                },
                () => {
                    // Un-stick the main content area
                    const main = document.querySelector('[role="main"]');
                    if (!main) return;
                    let el = main;
                    for (let i = 0; i < 4; i++) {
                        if (!el.parentElement) break;
                        el = el.parentElement;
                    }
                    el.style.position = "relative";
                    el.style.top = "0px";
                },
                () => {
                    // Remove "Available Voices" comment toolbar items
                    document
                        .querySelectorAll('[aria-label="Available Voices"]')
                        .forEach((el) => {
                            let ancestor = el;
                            for (let i = 0; i < 8; i++) {
                                if (!ancestor.parentElement) break;
                                ancestor = ancestor.parentElement;
                            }
                            ancestor.remove();
                        });
                },
            ],
        },

        "www.instagram.com": {
            static: [],
            funcs: [
                () => {
                    // Remove the comment section sidebar panel
                    document
                        .querySelectorAll('[class="x1n2onr6 xzkaem6"]')
                        .forEach((el) => el.remove());
                },
                () => {
                    // Remove "Comment as" section from posts
                    document
                        .querySelectorAll(
                            'section[class*="x1roi4f4"], section[class*="x5ur3kl"]'
                        )
                        .forEach((el) => el.remove());
                },
            ],
        },

        "t.me": {
            static: [],
            funcs: [
                () => {
                    const iframe = document.querySelector("iframe");
                    if (!iframe) return;

                    const doc = iframe.contentWindow?.document;
                    if (!doc) return;

                    // Remove avatar / author bubble
                    doc.querySelector(".tgme_widget_message_user")?.remove();

                    // Remove the bubble tail (triangular pointer to avatar)
                    doc.querySelector(".tgme_widget_message_bubble_tail")?.remove();

                    // Strip bubble borders and rounding
                    const bubble = doc.querySelector(
                        ".tgme_widget_message_bubble"
                    );
                    if (bubble) {
                        bubble.style.border = "0";
                        bubble.style.borderRadius = "0";
                        bubble.style.margin = "0";
                    }

                    // Strip inner widget padding
                    const widget = doc.querySelector(".js-widget_message");
                    if (widget) widget.style.padding = "0";

                    // Strip padding from iframe wrapper elements
                    [iframe, iframe.parentElement, iframe.parentElement?.parentElement]
                        .filter(Boolean)
                        .forEach((el) => {
                            el.style.padding = "0";
                            el.style.margin = "0";
                            el.style.border = "0";
                        });
                },
            ],
        },

        "x.com": {
            static: [
                '[aria-label="Trending"]',
                '[aria-label="Account menu"]',
                '[class="css-175oi2r r-1h8ys4a r-1mmae3n"]',
                '[class="css-175oi2r r-1bimlpy r-f8sm7e r-m5arl1 r-16y2uox r-14gqq1x"]',
                '[class="css-175oi2r r-1bimlpy r-f8sm7e r-m5arl1 r-1p0dtai r-1d2f490 r-u8s1d r-zchlnj r-ipm5af"]',
            ],
            funcs: [],
        },

        "vk.com": {
            static: [],
            funcs: [],
        },

        universal: {
            static: [],
            funcs: [],
        },
    };

    const hostname = window.location.hostname;

    const selectors = [
        ...(cleanupDB[hostname]?.static ?? []),
        ...(cleanupDB.universal?.static ?? []),
    ];

    const funcs = [
        ...(cleanupDB[hostname]?.funcs ?? []),
        ...(cleanupDB.universal?.funcs ?? []),
    ];

    selectors.forEach((selector) => {
        try {
            document.querySelectorAll(selector).forEach((el) => el.remove());
        } catch (e) {
            // Invalid selector — skip silently
        }
    });

    funcs.forEach((fn) => {
        try {
            fn();
        } catch (e) {
            // Site-specific cleanup failure — skip silently
        }
    });
})();
