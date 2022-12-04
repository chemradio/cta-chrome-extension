chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
	if (tab.url) {
		db_url = 'ads_database.json';
		response = await fetch(db_url);
		rtext = await response.text();
		ad_database = JSON.parse(rtext);
		hosts = Object.keys(ad_database);
		tabHost = new URL(tab.url).host;
		console.log(tabHost);
		if (hosts.includes(tabHost)) {
			if (ad_database[tabHost]) {
				chrome.tabs.sendMessage(tabId, {
					type: 'ready',
					ads: ad_database[tabHost],
				});
			}
		}
	} else {
		chrome.tabs.sendMessage(tabId, {
			type: 'missing',
			ads: null,
		});
	}
});
