const genericAds = [
	// 'iframe'
	"[data-testid='StandardAd']",
	'.ad',
	'#google_ads_top_frame',
	"[aria-label='Advertisement']",
	"div[id^='adfox_']",
	'.adsbygoogle',
	'#adv',
	"div[id^='yandex_rtb_']",
	'.cookie',
	"div[class^='ad']",
	"[id^='google_ads']",
];

export const removeAds = (dbAds = []) => {
	if (dbAds) {
		removeDbAds(dbAds);
	}
	removeGenericAds();
	removeScripts();
};

const removeDbAds = (dbAds) => {
	for (const ad of dbAds) {
		let elements = document.querySelectorAll(ad);
		if (!elements) {
			continue;
		}
		for (const element of elements) {
			element.parentElement.removeChild(element);
		}
	}
};

const removeGenericAds = () => {
	for (const ad of genericAds) {
		let elements = document.querySelectorAll(ad);
		if (!elements) {
			continue;
		}
		for (const element of elements) {
			element.parentElement.removeChild(element);
		}
	}
};

const removeScripts = () => {
	iframes = document.querySelectorAll('script');
	if (iframes) {
		for (const iframe of iframes) {
			iframe.parentElement.removeChild(iframe);
		}
	}
};
