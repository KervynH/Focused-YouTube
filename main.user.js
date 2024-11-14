// ==UserScript==
// @name         Focused YouTube
// @version      2024-11-13
// @author       Kervyn
// @namespace    https://raw.githubusercontent.com/KervynH/Focused-YouTube/main/main.user.js
// @description  Remove ads, shorts, and algorithmic suggestions on YouTube
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at       document-end
// @grant        GM.addStyle
// ==/UserScript==

/* Credit:  https://github.com/lawrencehook/remove-youtube-suggestions */

'use strict';

// Config custom settings here
const SETTINGS = {
  /// homepage redirect ///
  // redirectHomepage Options: 'wl', 'subs', 'lib', false
  redirectHomepage: 'wl',
  hideHomepageButton: true,

  /// homepage suggestions ///
  hideAllSuggestions: false,
  hideAllButOneRow: true,
  hideInfiniteScroll: true,

  /// video player ///
  skipAds: true,
  hideLiveChat: true,
  hideRelatedVideos: true,
  hideMiniPlayerButton: true,
  hidePlayNextButton: true,

  /// shorts ///
  hideShorts: true,
  redirectShortsPlayer: true,

  /// misc ///
  hideSearchButton: false,
  cleanSearchResults: true,
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
  '.iv-branding.annotation-type-custom.annotation',

  // Shorts
  'html[hideShorts="true"] ytd-rich-section-renderer',
  'html[hideShorts="true"] a[title="Shorts"]',
  'html[hideShorts="true"] ytd-reel-shelf-renderer',

  // Left Bar Navigation 
  'a[href="/feed/trending"]',
  'a[href="/feed/explore"]',
  'html[hideShorts="true"] a[title="Shorts"]',
  'html[hideShorts="true"] ytd-mini-guide-entry-renderer[aria-label="Shorts"]',
  'ytd-guide-section-renderer.ytd-guide-renderer.style-scope:nth-of-type(4)',
  'ytd-guide-section-renderer.ytd-guide-renderer.style-scope:nth-of-type(3)',

  // Homepage 
  'html[hideHomepageButton="true"] a:not(#logo)[href="/"]',
  'html[hideAllSuggestions="true"] ytd-browse[page-subtype="home"]',
  'html[hideAllButOneRow="true"] ytd-browse[page-subtype="home"] #header',
  'html[hideAllButOneRow="true"] ytd-browse[page-subtype="home"] ytd-rich-grid-renderer>#contents>ytd-rich-grid-row:nth-child(n+2)',
  'html[hideInfiniteScroll="true"] ytd-browse[page-subtype="home"] ytd-rich-grid-renderer>#contents>ytd-continuation-item-renderer',

  // Video Player
  'html[hideRelatedVideos="true"] #secondary>div.circle',
  'html[hideRelatedVideos="true"] #related',
  'html[hideRelatedVideos="true"] .html5-endscreen',
  'html[hidePlayNextButton="true"] a.ytp-next-button.ytp-button',
  'html[hidePlayNextButton="true"] a.ytp-prev-button.ytp-button',
  'html[hideChat="true"] #chat',
  'html[hideMiniPlayerButton="true"] .ytp-button.ytp-miniplayer-button',
  // '#movie_player button.ytp-button.ytp-share-button',
  // '#movie_player button.ytp-button.ytp-watch-later-button',
  '.ytd-download-button-renderer.style-scope',

  // Search
  'div.sbdd_a',
  '#container.ytd-search ytd-search-pyv-renderer',
  '#container.ytd-search ytd-reel-shelf-renderer',
  '#container.ytd-search ytd-shelf-renderer',
  'html[hideSearchButton="true"] div.ytd-masthead>ytd-searchbox',
  'html[hideSearchButton="true"] div.ytd-masthead>#voice-search-button',
];
const MOBILE_BLOCK_LIST = [
  // Ads 
  'ytm-companion-ad-renderer',
  'ytm-promoted-sparkles-web-renderer',

  // Homepage 
  'html[hideHomepageButton="true"] div[tab-identifier="FEwhat_to_watch"]',
  'html[hideSearchButton="true"] #header-bar > header > div > button',
  'html[hideSearchButton="true"] #center.style-scope.ytd-masthead',

  // Video Player 
  'html[hideRelatedVideos="true"] ytm-item-section-renderer[section-identifier="related-items"]>lazy-list',
  'html[hidePlayNextButton="true"] .player-controls-middle-core-buttons > div:nth-child(1)',
  'html[hidePlayNextButton="true"] .player-controls-middle-core-buttons > div:nth-child(5)',

  // Navigation Bar 
  'html[hideHomepageButton="true"] ytm-pivot-bar-item-renderer:nth-child(1)',
  'html[hideShorts="true"] ytm-pivot-bar-item-renderer:nth-child(2)',
  'ytm-chip-cloud-chip-renderer[chip-style="STYLE_EXPLORE_LAUNCHER_CHIP"]',
];

if (location.hostname.startsWith('www.')) {
  DESKTOP_BLOCK_LIST.forEach(e => GM.addStyle(`${e} {display: none !important}`));
}
if (location.hostname.startsWith('m.')) {
  MOBILE_BLOCK_LIST.forEach(e => GM.addStyle(`${e} {display: none !important}`));
}

// Start running dynamic settings
runDynamicSettings();


/***** Functions *****/

function runDynamicSettings() {
  if (SETTINGS.redirectHomepage) redirectHomepage();
  if (SETTINGS.redirectShortsPlayer) redirectShortsPlayer();
  if (SETTINGS.hideShorts) hideShortsVideos();
  if (SETTINGS.cleanSearchResults) cleanSearchResults();
  if (SETTINGS.skipAds) skipVideoAds();
  if (SETTINGS.hideRelatedVideos) disableRelatedAutoPlay();
  setTimeout(runDynamicSettings, 500);
}

function redirectHomepage() {
  if (location.pathname == '/') {
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
  if (location.pathname.startsWith('/shorts')) {
    const redirPath = location.pathname.replace('shorts', 'watch');
    location.replace(redirPath);
  }
}

function disableRelatedAutoPlay() {
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
}

function hideShortsVideos() {
  const shortsLinks = document.querySelectorAll('a[href^="/shorts"]');
  if (location.pathname == '/feed/subscriptions') {
    shortsLinks.forEach(link => {
      // For desktop
      link.closest('ytd-rich-item-renderer')?.remove();
      // For mobile
      link.closest('ytm-item-section-renderer')?.remove();
    });
  }
  // Hide shorts on search result pages
  if (location.pathname.startsWith('/results')) {
    shortsLinks.forEach(link => {
      // For desktop
      link.closest('ytd-video-renderer')?.remove();
      link.closest('ytd-reel-shelf-renderer')?.remove();
      // For mobile
      link.closest('ytm-reel-shelf-renderer')?.remove();
      link.closest('ytm-video-with-context-renderer')?.remove();
    });
  }
  // Hide shorts on channel page
  if (location.pathname.startsWith('/@')) {
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
  if (location.pathname.startsWith('/watch')) {
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
  if (location.pathname.startsWith('/results')) {
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
