// ==UserScript==
// @name         Focused YouTube
// @version      5.2
// @author       Kervyn
// @namespace    https://raw.githubusercontent.com/KervynH/Focused-YouTube/main/main.user.js
// @description  Remove ads, shorts, and algorithmic suggestions on YouTube
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at       document-start
// @grant        GM.addStyle
// ==/UserScript==


/* Credit:  https://github.com/lawrencehook/remove-youtube-suggestions */


'use strict';

// Config custom settings here
const SETTINGS = {
  /// homepage settings ///
  hideEntireHomepage: true,
  redirectHomepage: 'subs', // Options: 'wl', 'subs', 'lib', false
  hideAllButOneRow: true,
  hideInfiniteScroll: true,

  /// video settings ///
  skipAds: true,
  hideLiveChat: true,
  hideRelatedVideos: true,
  disableAutoPlayNext: true,
  hidePlayNextButton: true,
  hidePlayPreviousButton: true,
  hideMiniPlayerButton: true,
  disableAmbientMode: true, // currently only works on mobile

  /// shorts settings ///
  hideShorts: true,
  redirectShortsPlayer: true,

  /// misc ///
  hideUploadButton: true,
  hideSearchButton: false,
};

// Mark settings in HTML
const HTML = document.documentElement;
Object.keys(SETTINGS).forEach(key => {
  HTML.setAttribute(key, SETTINGS[key]);
});

// Add css to remove unnecessary elements
const DESKTOP_BLOCK_LIST = [
  // Ads 
  '#masthead-ad',
  'ytd-mealbar-promo-renderer',
  'ytd-carousel-ad-renderer',
  '.ytd-display-ad-renderer',
  'ytd-ad-slot-renderer',
  'div.ytp-ad-overlay-image',

  // General 
  'html[hideShorts="true"] a[title="Shorts"]',
  'html[hideShorts="true"] ytd-reel-shelf-renderer',
  'html[hideRelatedVideos="true"] #secondary>div.circle',
  'html[hideRelatedVideos="true"] #related',
  'html[hideRelatedVideos="true"] .html5-endscreen',

  // Left Bar Navigation 
  'a[href="/feed/trending"]',
  'a[href="/feed/explore"]',
  'html[hideShorts="true"] a[title="Shorts"]',
  'html[hideShorts="true"] ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
  'ytd-guide-section-renderer.ytd-guide-renderer.style-scope:nth-of-type(4)',
  'ytd-guide-section-renderer.ytd-guide-renderer.style-scope:nth-of-type(3)',

  // Homepage 
  'html[hideEntireHomepage="true"] ytd-browse[page-subtype="home"]',
  'html[hideEntireHomepage="true"] a:not(#logo)[href="/"]',
  'html[hideAllButOneRow="true"] ytd-browse[page-subtype="home"] ytd-rich-grid-renderer>div#header',
  'html[hideAllButOneRow="true"] ytd-browse[page-subtype="home"] ytd-rich-grid-renderer>#contents>ytd-rich-grid-row:nth-child(n+2)',
  'html[hideInfiniteScroll="true"] ytd-browse[page-subtype="home"] ytd-rich-grid-renderer>#contents>ytd-continuation-item-renderer',
  'html[hideSearchButton="true"] div.ytd-masthead>ytd-searchbox',
  'html[hideSearchButton="true"] div.ytd-masthead>#voice-search-button',
  'html[hideShorts="true"] ytd-rich-section-renderer',

  // Video Player
  'html[hidePlayNextButton="true"] a.ytp-next-button.ytp-button',
  'html[hidePlayPreviousButton="true"] a.ytp-prev-button.ytp-button',
  'html[hideChat="true"] #chat',
  'html[hideMiniPlayerButton="true"] .ytp-button.ytp-miniplayer-button',
  'html[disableAutoPlayNext="true"] div.ytp-autonav-toggle-button-container',
  'html[disableAutoPlayNext="true"] div.ytp-autonav-toggle-button',
  '.iv-branding.annotation-type-custom.annotation',
  '#movie_player button.ytp-button.ytp-share-button',
  '#movie_player button.ytp-button.ytp-watch-later-button',

  // Search Results Page 
  'div.sbdd_a',
  '#container.ytd-search ytd-search-pyv-renderer',
  '#container.ytd-search ytd-reel-shelf-renderer',
  '#container.ytd-search ytd-shelf-renderer',
];
const MOBILE_BLOCK_LIST = [
  // Ads 
  'ytm-companion-ad-renderer',
  'ytm-promoted-sparkles-web-renderer',

  // Homepage 
  'html[hideEntireHomepage="true"] div[tab-identifier="FEwhat_to_watch"]',
  'html[hideSearchButton="true"] #header-bar > header > div > button',
  'html[hideSearchButton="true"] #center.style-scope.ytd-masthead',
  'html[hideUploadButton="true"] #buttons > ytd-topbar-menu-button-renderer.style-scope.ytd-masthead.style-default',

  // Video Player 
  'html[hideRelatedVideos="true"] ytm-item-section-renderer[section-identifier="related-items"]>lazy-list',
  'html[disableAutoPlayNext="true"] button.ytm-autonav-toggle-button-container',
  'html[hidePlayPreviousButton="true"] .player-controls-middle-core-buttons > button:nth-child(1)',
  'html[hidePlayNextButton="true"] .player-controls-middle-core-buttons > button:nth-child(5)',

  // Navigation Bar 
  'html[hideEntireHomepage="true"] ytm-pivot-bar-item-renderer:nth-child(1)',
  'html[hideShorts="true"] ytm-pivot-bar-item-renderer:nth-child(2)',
  'ytm-chip-cloud-chip-renderer[chip-style="STYLE_EXPLORE_LAUNCHER_CHIP"]',
];
if (location.hostname.startsWith('www.')) {
  DESKTOP_BLOCK_LIST.forEach(e => GM.addStyle(`${e} {display: none !important}`));
}
if (location.hostname.startsWith('m.')) {
  MOBILE_BLOCK_LIST.forEach(e => GM.addStyle(`${e} {display: none !important}`));
}

// Global variables for dynamic settings
let path = undefined;
let isRunning = false;
let frameRequested = false;

handleNewPage();


/***** Functions *****/

function handleNewPage() {
  // check whether url has changed
  if (path == location.pathname) return;
  path = location.pathname;
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
  
  cleanSearchResults();
  if (SETTINGS.hideShorts) hideShortsVideos();
  if (SETTINGS.disableAmbientModeOnMobile) disableAmbientMode();
  if (SETTINGS.skipAds) skipVideoAds();

  frameRequested = false;
  isRunning = false;
  requestRunDynamicSettings();
}


function requestRunDynamicSettings() {
  if (isRunning || frameRequested) return;
  frameRequested = true;
  setTimeout(runDynamicSettings, 50);
}


function redirectHomepage() {
  if (path == '/') {
    if (SETTINGS.redirectHomepage == 'wl') {
      location.replace('/playlist/?list=WL');
    }
    if (SETTINGS.redirectHomepage == 'subs') {
      location.replace('/feed/subscriptions');
    }
    if (SETTINGS.redirectHomepage == 'lib') {
      location.replace('/feed/library');
    }
  }
}


function redirectShortsPlayer() {
  if (path.startsWith('/shorts')) {
    const redirPath = path.replace('shorts', 'watch');
    location.replace(redirPath);
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
  const shortsLinks = document.querySelectorAll('a[href^="/shorts"]');
  if (path == '/feed/subscriptions') {
    shortsLinks.forEach(link => {
      // For desktop
      link.closest('ytd-rich-item-renderer')?.remove();
      // For mobile
      link.closest('ytm-item-section-renderer')?.remove();
    });
  }
  // Hide shorts on the results page
  if (path.startsWith('/results')) {
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
  if (path.startsWith('/@')) {
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
  if (path.startsWith('/watch')) {
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


function cleanSearchResults() {
  if (path.startsWith('/results')) {
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


function disableAmbientMode() {
  if (path.startsWith('/watch')) {
    // Mobile
    const cinematicDiv = document.querySelector('div.cinematic-setting');
    cinematicDiv?.remove();
    document.querySelector('ytm-cinematic-container-renderer')?.remove();
  }
}
