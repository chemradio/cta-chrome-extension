(() => {
  chrome.runtime.onMessage.addListener((obj, sender, response) => {
    const { type, ads } = obj;
    if (type === 'ready') {
      setTimeout(removeAds, 3000, [ads]);
    }
  });

  const removeAds = (ads) => {
    iframes = document.querySelectorAll('iframe');
    if (iframes) {
      for (const iframe of iframes) {
        iframe.parentElement.removeChild(iframe);
      }
    }

    for (const ad of ads) {
      let elements = document.querySelectorAll(ad);
      if (!elements) {
        continue;
      }
      for (const element of elements) {
        element.parentElement.removeChild(element);
      }
    }
  };

  // let youtubeLeftControls, youtubePlayer;
  // let currentVideo = '';
  // let currentVideoBookmarks = [];

  // const fetchBookmarks = () => {
  //   return new Promise((resolve) => {
  //     chrome.storage.sync.get([currentVideo], (obj) => {
  //       resolve(obj[currentVideo] ? JSON.parse(obj[currentVideo]) : []);
  //     });
  //   });
  // };

  // const newVideoLoaded = async () => {
  //   const bookmarkBtnExists =
  //     document.getElementsByClassName('bookmark-btn')[0];
  //   currentVideoBookmarks = await fetchBookmarks();

  //   if (!bookmarkBtnExists) {
  //     const bookmarkBtn = document.createElement('img');

  //     bookmarkBtn.src = chrome.runtime.getURL('assets/bookmark.png');
  //     bookmarkBtn.className = 'ytp-button ' + 'bookmark-btn';
  //     bookmarkBtn.title = 'Click to bookmark current timestamp';

  //     youtubeLeftControls =
  //       document.getElementsByClassName('ytp-left-controls')[0];
  //     youtubePlayer = document.getElementsByClassName('video-stream')[0];

  //     youtubeLeftControls.append(bookmarkBtn);
  //     bookmarkBtn.addEventListener('click', addNewBookmarkEventHandler);
  //   }
  // };

  // const addNewBookmarkEventHandler = async () => {
  //   const currentTime = youtubePlayer.currentTime;
  //   const newBookmark = {
  //     time: currentTime,
  //     desc: 'Bookmark at ' + getTime(currentTime),
  //   };

  //   currentVideoBookmarks = await fetchBookmarks();

  //   chrome.storage.sync.set({
  //     [currentVideo]: JSON.stringify(
  //       [...currentVideoBookmarks, newBookmark].sort((a, b) => a.time - b.time)
  //     ),
  //   });
  // };

  // newVideoLoaded();
})();
