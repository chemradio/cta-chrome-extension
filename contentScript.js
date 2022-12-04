if (chrome.runtime) {
	chrome.runtime.onMessage.addListener((obj, sender, response) => {
		const { type, ads } = obj;
		if (type === 'ready') {
			removeAds(ads);
		}
	});
}

const removeAds = (dbAds) => {
	if (!dbAds) {
		console.log('no ads in database for this domain');
		return;
	}
	removeDbAds(dbAds);
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

const removeScripts = () => {
	iframes = document.querySelectorAll('script');
	if (iframes) {
		for (const iframe of iframes) {
			iframe.parentElement.removeChild(iframe);
		}
	}
};
