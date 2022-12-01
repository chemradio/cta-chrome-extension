db_url =
  'https://raw.githubusercontent.com/chemradio/cta-chrome-extension/main/ads_database.json';
response = await fetch(db_url);
rtext = await response.text();
ad_database = JSON.parse(rtext);
hosts = Object.keys(ad_database);

current_host = window.location.host;

if (hosts.includes(current_host)) {
  ads = ad_database[current_host];
  for (const ad of ads) {
    console.log(ad);
    let element = document.querySelector(ad);
    element.parentElement.removeChild(element);
  }
}
