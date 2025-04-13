(() => {
    const cleanupDB = {
        "www.facebook.com": {
            static: [
                '[class="x1ey2m1c xds687c x17qophe xixxii4 x13vifvy x1h0vfkc"]',
                '[class="__fb-light-mode x1qjc9v5 x9f619 x78zum5 xdt5ytf xl56j7k x1c4vz4f xg6iff7"]',
                '[class="x1cy8zhl x9f619 x78zum5 xl56j7k x2lwn1j xeuugli x47corl x1x97wu9 xbr3nou xurb0ha x1sxyh0 x3v4vwv x1dzdb2q"]',
            ],
            funcs: [
                () => {
                    let banner = document.querySelector('[role="banner"]');
                    if (banner) banner.remove();
                    let main = document.querySelector('[role="main"]');
                    let secondary =
                        main.parentElement.parentElement.parentElement
                            .parentElement;
                    secondary.style.position = "relative";
                    secondary.style.top = "0px";
                },
                () => {
                    let myImages = document.querySelectorAll(
                        '[aria-label="Available Voices"]'
                    );
                    if (myImages.length > 0) {
                        myImages.forEach((image) => {
                            image.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.parentElement.remove();
                        });
                    }
                },
            ],
        },
        "www.instagram.com": {
            static: [],
            funcs: [
                () => {
                    const commentAs = postElement.querySelector(
                        'section[class="x5ur3kl x178xt8z x1roi4f4 x2lah0s xvs91rp xl56j7k x17ydfre x1n2onr6 x1qiirwl xh8yej3 x1ejq31n xd10rxx x1sy0etr x17r0tee x3hdcf8 x180j4jr x18dplov x1ub4b5r"]'
                    );
                    commentAs?.remove();
                    postElement.firstElementChild.style.border = "0px";
                },
                () => {
                    targetSelectors = ["[class='x1n2onr6 xzkaem6']"];
                    for (const selector of targetSelectors) {
                        const element = document.querySelector(selector);
                        if (element) {
                            element.remove();
                        }
                    }
                },
            ],
        },
        "t.me": {
            static: [],
            funcs: [
                () => {
                    iframe = document.querySelector("iframe");
                    iframe.style.padding = "0px";

                    avatar = iframe.contentWindow.document.querySelector(
                        ".tgme_widget_message_user"
                    );
                    if (avatar) avatar.remove();
                    element = iframe.contentWindow.document.querySelector(
                        ".tgme_widget_message_bubble"
                    );
                    element.style.border = "0";
                    element.style.borderRadius = "0px";
                    element.style.margin = "0px";

                    iframe.style.padding = "0px";
                    iframe.style.margin = "0px";
                    iframe.style.border = "0px";
                    // remove the small tail leading to author profile picture
                    bubbleTail = iframe.contentWindow.document.querySelector(
                        ".tgme_widget_message_bubble_tail"
                    );
                    if (bubbleTail)
                        bubbleTail.parentNode.removeChild(bubbleTail);

                    // remove the inner padding of the message bubble to iframe
                    messageWidget =
                        iframe.contentWindow.document.querySelector(
                            ".js-widget_message"
                        );
                    messageWidget.style.padding = "0px";

                    const parent1 = iframe.parentElement;
                    const parent2 = parent1.parentElement;

                    [parent1, parent2].forEach((element) => {
                        if (element) {
                            element.style.padding = "0px";
                            element.style.margin = "0px";
                            element.style.border = "0px";
                        }
                    });
                },
            ],
        },
        "x.com": {
            static: [
                'a[href="/chemradio"]',
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
        universal: { static: [], funcs: [] },
    };

    const hostname = window.location.hostname;
    const targetStatics = [
        ...(cleanupDB[hostname]?.static || []),
        ...(cleanupDB.universal?.static || []),
    ];
    const targetFuncs = [
        ...(cleanupDB[hostname]?.funcs || []),
        ...(cleanupDB.universal?.funcs || []),
    ];

    targetStatics.forEach((selector) => {
        document.querySelectorAll(selector).forEach((element) => {
            if (element) {
                element.remove();
            }
        });
    });

    targetFuncs.forEach((func) => {
        try {
            func();
        } catch (error) {
            // console.error("Error executing function:", error);
        }
    });
})();
