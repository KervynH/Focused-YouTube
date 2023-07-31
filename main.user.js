// ==UserScript==
// @name         Focused YouTube
// @version      4.11
// @author       Kervyn
// @namespace    https://raw.githubusercontent.com/KervynH/Focused-YouTube/main/main.user.js
// @description  Remove ads, shorts, and algorithmic suggestions on YouTube
// @match        *://*.youtube.com/*
// @icon         https://www.google.com/s2/favicons?sz=64&domain=youtube.com
// @run-at       document-start
// @grant        GM_addStyle
// @grant        GM_getResourceText
// @resource     REMOTE_CSS https://raw.githubusercontent.com/KervynH/Focused-YouTube/main/main.css
// ==/UserScript==


/* Credit:  https://github.com/lawrencehook/remove-youtube-suggestions */


(function () {
  'use strict';

  // Config custom settings here
  const SETTINGS = {
    /// homepage settings ///
    hideEntireHomepage: true,
    redirectHomepage: 'subs', // Options: 'wl', 'subs', 'lib', false
    hideAllButOneRow: true,
    hideInfiniteScroll: true,

    /// video settings ///
    hideChat: true,
    hideRelatedVideos: true,
    disableAutoPlayNext: true,
    hidePlayNextButton: true,
    hidePlayPreviousButton: true,
    hideMiniPlayerButton: true,
    disableAmbientModeOnMobile: true,

    /// shorts settings ///
    hideShorts: true,
    redirectShortsPlayer: true,

    /// misc ///
    hideUploadButton: true,
    hideSearchButton: true,
  };

  // Mark settings in HTML
  const HTML = document.documentElement;
  Object.keys(SETTINGS).forEach(key => {
    HTML.setAttribute(key, SETTINGS[key]);
  });

  // Add remote css to remove unnecessary elements
  const CSS = GM_getResourceText("REMOTE_CSS");
  GM_addStyle(CSS);

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

    if (SETTINGS.hideShorts) hideShortsVideos();
    if (SETTINGS.disableAmbientModeOnMobile) disableAmbientMode();
    cleanSearchResults();
    skipVideoAds();

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

      // Desktop
      // document.querySelectorAll("div[role='menuitemcheckbox']")?.forEach(b => {
      //   if (b.innerText.startsWith('電影') ||
      //     b.innerText.startsWith('影院') ||
      //     b.innerText == 'Ambient Mode') { b.remove(); }
      // });
      // const ambientModeCheckbox = document.querySelector("div[role='menuitemcheckbox']");
      // // Note: The first instance is the cinematic button
      // ambientModeCheckbox?.remove();
      // HTML.setAttribute('disable_ambient_mode', true);
    }
  }


  // function selectVideoQuality() {
  //   const ytApiArgs = {
  //     "4320p": "highres",
  //     "2880p": "hd2880",
  //     "1440p": "hd1440",
  //     "1080p": "hd1080",
  //     "720p": "hd720",
  //     "480p": "large",
  //     "360p": "medium",
  //     "240p": "small",
  //     "144p": "tiny"
  //   };
  //   if (path.startsWith('/watch')) {
  //     const player = document.querySelector('.html5-video-player');
  //     player?.setPlaybackQualityRange(ytApiArgs[SETTINGS.autoSelectVideoQuality]);
  //   }
  // }
})();
