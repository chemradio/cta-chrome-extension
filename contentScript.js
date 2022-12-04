if (chrome.runtime) {
	chrome.runtime.onMessage.addListener((obj, sender, response) => {
		const { type, ads } = obj;
		if (type === 'ready') {
			removeAds(ads);
		} else {
			removeAds();
		}
	});
}

const removeAds = (dbAds) => {
	if (dbAds) {
		removeDbAds(dbAds);
	}
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
	removeGenericAds(genericAds);
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

const removeGenericAds = (genericAds) => {
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
