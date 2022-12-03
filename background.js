// 'https://raw.githubusercontent.com/chemradio/cta-chrome-extension/main/ads_database.json';
chrome.tabs.onUpdated.addListener(async (tabId, changeInfo, tab) => {
  db_url = 'ads_database.json';
  response = await fetch(db_url);
  rtext = await response.text();
  ad_database = JSON.parse(rtext);
  hosts = Object.keys(ad_database);

  if (tab.url) {
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
  }
});
