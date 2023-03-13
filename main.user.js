// ==UserScript==
// @name         Focused YouTube
// @version      4.3
// @author       Kervyn
// @namespace    https://raw.githubusercontent.com/KervynH/Focused-YouTube/main/main.user.js
// @description  Remove ads, shorts, and algorithmic suggestions on YouTube
// @match        *://*.youtube.com/*
// @run-at       document-end
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @resource     REMOTE_CSS https://raw.githubusercontent.com/KervynH/Focused-YouTube/main/main.css
// ==/UserScript==


/* The following code is mostly modified from
https://github.com/lawrencehook/remove-youtube-suggestions
which is licensed under is licensed under the Mozilla Public License 2.0 */


// Config custom settings here
const SETTINGS = {
  /// homepage settings ///
  hideEntireHomepage: true,
  redirectHomepage: 'wl', // Values: 'wl', 'subs', 'lib', false
  hideAllButOneRow: true,
  hideInfiniteScroll: true,

  /// video settings ///
  hideRelatedVideos: true,
  hideChat: true,
  disableAutoPlayNext: true,
  hidePlayNextButton: true,
  hideMiniPlayerButton: true,
  hideCinematicModeButton: true,
  autoEnableTheaterMode: false,
  singleColumnVideoPage: false,

  /// shorts settings ///
  hideShortsInFeed: true,
  redirectShortsPlayer: true,

  /// misc ///
  hideStreamedVideosInSubs: false,
};


// Mark settings in the document
const HTML = document.documentElement;
HTML.setAttribute('hideEntireHomepage', SETTINGS.hideEntireHomepage);
HTML.setAttribute('hideAllButOneRow', SETTINGS.hideAllButOneRow);
HTML.setAttribute('hideInfiniteScroll', SETTINGS.hideInfiniteScroll);
HTML.setAttribute('hideRelatedVideos', SETTINGS.hideRelatedVideos);
HTML.setAttribute('hideChat', SETTINGS.hideChat);
HTML.setAttribute('hidePlayNextButton', SETTINGS.hidePlayNextButton);
HTML.setAttribute('hideShorts', SETTINGS.hideShortsInFeed);
HTML.setAttribute('hideEntireRightColumn', SETTINGS.hideEntireRightColumn);
HTML.setAttribute('disableAutoPlayNext', SETTINGS.disableAutoPlayNext);
HTML.setAttribute('hideMiniPlayerButton', SETTINGS.hideMiniPlayerButton);


// Add remote css to remove unnecessary elements
const css = GM_getResourceText("REMOTE_CSS");
GM_addStyle(css);


// Global constants
const resultsPageRegex = new RegExp('.*://.*youtube\.com/results.*', 'i');
const homepageRegex = new RegExp('.*://(www|m)\.youtube\.com(/)?$', 'i');
const shortsRegex = new RegExp('.*://.*youtube\.com/shorts.*', 'i');
const videoRegex = new RegExp('.*://.*youtube\.com/watch\\?v=.*', 'i');
const subsRegex = new RegExp('.*://.*youtube\.com/feed/subscriptions.*', 'i');
const channelRegex = new RegExp('.*://.*youtube\.com/@.*', 'i');


// Global dynamic settings variables
let url = undefined;
let isRunning = false;
let frameRequested = false;


handleNewPage();


/////// Functions ////////

function handleNewPage() {
  // check whether url has changed
  if (url == location.href) return;
  url = location.href;
  // Static settings run only once
  runStaticSettings();
  // Dyamic settings run periodically
  requestRunDynamicSettings();
}


function runStaticSettings() {
  if (SETTINGS.redirectHomepage) redirectHomepage();
  if (SETTINGS.redirectShortsPlayer) redirectShortsPlayer();
  if (SETTINGS.disableAutoPlayNext) disableAutoPlayNext();
}


function runDynamicSettings() {
  if (isRunning) return;
  isRunning = true;

  handleNewPage();

  if (SETTINGS.hideStreamedVideosInSubs) hideStreamedVideosInSubs();
  if (SETTINGS.hideShortsInFeed) hideShortsVideos();
  if (SETTINGS.hideCinematicModeButton) hideCinematicModeButton();
  if (SETTINGS.autoEnableTheaterMode) enableTheaterMode();
  if (SETTINGS.singleColumnVideoPage) singleColumnVideoPage();
  cleanSearchResults();
  skipVideoAds();

  frameRequested = false;
  isRunning = false;
  requestRunDynamicSettings();
}


function requestRunDynamicSettings() {
  if (isRunning || frameRequested) return;
  frameRequested = true;
  setTimeout(runDynamicSettings, 40);
}


function redirectHomepage() {
  const onHomepage = homepageRegex.test(location.href);
  if (!onHomepage) return;
  if (SETTINGS.redirectHomepage == 'wl') {
    location.replace('https://www.youtube.com/playlist/?list=WL');
  }
  if (SETTINGS.redirectHomepage == 'subs') {
    location.replace('https://www.youtube.com/feed/subscriptions');
  }
  if (SETTINGS.redirectHomepage == 'lib') {
    location.replace('https://www.youtube.com/feed/library');
  }
}


function redirectShortsPlayer() {
  const currentUrl = location.href;
  const onShorts = shortsRegex.test(currentUrl);
  if (onShorts) {
    const newUrl = currentUrl.replace('shorts', 'watch');
    location.replace(newUrl);
  }
}


function disableAutoPlayNext() {
  // turn off auto play button
  const autoplayButton = document.querySelectorAll('.ytp-autonav-toggle-button[aria-checked=true]');
  autoplayButton?.forEach(e => {
    if (e && e.offsetParent) {
      e.click();
    }
  });
  // turn off auto play button on mobile
  const mAutoplayButton = document.querySelectorAll('.ytm-autonav-toggle-button-container[aria-pressed=true]');
  mAutoplayButton?.forEach(e => {
    if (e && e.offsetParent) {
      e.click();
    }
  });
  // disable playlist auto play
  const existingScript = document.querySelector('script[id="disable_playlist_autoplay"]');
  if (existingScript) return; // Avoid repeatedly injecting script in setInterval(RunDynamicSettings, 50)
  const script = document.createElement("script");
  script.id = 'disable_playlist_autoplay';
  script.type = "text/javascript";
  script.innerText = `setInterval(function() {
      let pm = document.querySelector('yt-playlist-manager');
      if (pm) pm.canAutoAdvance_ = false;
    }, 100)`;
  document.body?.appendChild(script);
}


function hideShortsVideos() {
  const currentUrl = location.href;
  const onSubsPage = subsRegex.test(currentUrl);
  const onResultsPage = resultsPageRegex.test(currentUrl);
  const onChannelPage = channelRegex.test(currentUrl);
  const shortsLinks = document.querySelectorAll('a[href^="/shorts"]');
  if (onSubsPage) {
    shortsLinks.forEach(link => {
      // For desktop
      link.closest('ytd-grid-video-renderer')?.remove();
      // For mobile
      link.closest('ytm-item-section-renderer')?.remove();
    });
  }
  // Hide shorts on the results page
  if (onResultsPage) {
    shortsLinks.forEach(link => {
      // For desktop
      link.closest('ytd-video-renderer')?.remove();
      link.closest('ytd-reel-shelf-renderer')?.remove();
      // For mobile
      link.closest('ytm-reel-shelf-renderer')?.remove();
      link.closest('ytm-media-item')?.remove();
    });
  }
  // Hide shorts on channel page
  if (onChannelPage) {
    // remove shorts tab
    document.querySelectorAll('div.tab-content')?.forEach(tab => {
      if (tab.innerText == "SHORTS") tab.parentElement.remove(); // desktop
    });
    document.querySelectorAll('a[role="tab"]')?.forEach(tab => {
      if (tab.innerText == 'SHORTS') tab.remove(); // mobile
    });
    // remove shorts shelf
    document.querySelectorAll('a[href^="/shorts"]')?.forEach(link => {
      link.closest('ytm-reel-shelf-renderer.item')?.remove(); // mobile
      link.closest('ytd-reel-shelf-renderer')?.remove(); // desktop
    });
  }
}


function skipVideoAds() {
  const onVideoPage = videoRegex.test(location.href);
  if (onVideoPage) {
    // click "skip ad" button if it exists
    // during the first 5s, th button is not clickable in UI, but it's clickable in console
    const adSkipButton = document.querySelector(".ytp-ad-skip-button-slot button,.ytp-ad-overlay-close-button");
    adSkipButton?.click();

    // skip ad video
    const adVideo = document.querySelector('.ad-showing');
    if (adVideo) {
      const video = document.querySelector('.html5-main-video');
      if (video && !isNaN(video?.duration)) {
        video.play();
        video.currentTime = video?.duration;
      }
    }
  }
}


function hideStreamedVideosInSubs() {
  const onSubsPage = subsRegex.test(location.href);
  // mobile
  if (onSubsPage) {
    const badges = document.querySelectorAll('.ytm-badge-and-byline-item-byline > .yt-core-attributed-string');
    badges.forEach(badge => {
      // Only support Chinese and English now
      if (badge.textContent.startsWith('直播') || badge.textContent.startsWith('Live')) {
        badge.closest('ytm-item-section-renderer')?.remove();
      }
    });
  }
  // desktop
  if (onSubsPage) {
    const badges = document.querySelectorAll('span.style-scope.ytd-grid-video-renderer');
    badges.forEach(badge => {
      // Only support Chinese and English now
      if (badge.textContent.startsWith('直播') || badge.textContent.startsWith('Streamed')) {
        // console.log(badge);
        badge.closest('ytd-grid-video-renderer')?.remove();
      }
    });
  }
}


function cleanSearchResults() {
  const onResultsPage = resultsPageRegex.test(location.href);
  if (onResultsPage) {
    // Mobile
    const badges = document.querySelectorAll('ytm-badge');
    badges.forEach(badge => {
      // Only support Chinese and English now
      if (badge.innerText == '相關影片' || badge.innerText == '相关视频' || badge.innerText == 'Related') {
        badge.closest('ytm-video-with-context-renderer')?.remove();
      }
    });
  }
}


function hideCinematicModeButton() {
  const cinematicButton = document.querySelector('div.cinematic-setting');
  cinematicButton?.remove();
}


function enableTheaterMode() {
  const onVideoPage = videoRegex.test(location.href);
  if (onVideoPage) {
    const theaterButton = document.querySelector('button.ytp-size-button');
    const videoPage = document.querySelector('ytd-watch-flexy');
    const isTheaterMode = videoPage?.hasAttribute('theater');
    if (!isTheaterMode) theaterButton?.click();
  }
}


function singleColumnVideoPage() {
  const onVideoPage = videoRegex.test(location.href);
  if (onVideoPage) {
    var videoPage = document.querySelector('ytd-watch-flexy');
    videoPage?.removeAttribute('is-two-columns_');
    HTML.style['overflow-x'] = 'hidden';
  }
}
