// ==UserScript==
// @name         YouTube → Discord RPC
// @namespace    youtube-discord-rpc
// @version      1.0.0
// @description  Sends the current YouTube / YouTube Music playback info to a local bridge for Discord Rich Presence
// @match        https://www.youtube.com/*
// @match        https://music.youtube.com/*
// @grant        GM_xmlhttpRequest
// @connect      127.0.0.1
// @run-at       document-idle
// ==/UserScript==

(function () {
  'use strict';

  const SERVER = 'http://127.0.0.1:6969';
  const INTERVAL = 5000;

  function post(path, data) {
    GM_xmlhttpRequest({
      method: 'POST',
      url: SERVER + path,
      headers: { 'Content-Type': 'application/json' },
      data: JSON.stringify(data || {}),
      timeout: 3000,
      onerror() {},
      ontimeout() {},
    });
  }

  const text = (selector) => document.querySelector(selector)?.textContent?.trim() || '';

  function getInfo() {
    const video = document.querySelector('video');
    const id = new URLSearchParams(location.search).get('v');
    if (!video || !id || !isFinite(video.duration) || video.duration <= 0) return null;

    const isMusic = location.hostname === 'music.youtube.com';
    let title, author, avatar = null, thumb = null, channelUrl = null;

    if (isMusic) {
      title = text('ytmusic-player-bar .title');
      author = text('ytmusic-player-bar .byline').split('•')[0].trim();
      const img = document.querySelector('ytmusic-player-bar img.image')?.src;
      if (img && img.startsWith('http')) thumb = img.replace(/=w\d+-h\d+.*$/, '=w512-h512');
      const link = document.querySelector('ytmusic-player-bar .byline a[href*="channel/"]')?.href;
      if (link) {
        channelUrl = 'https://www.youtube.com/channel/' + link.split('channel/')[1].split(/[/?#]/)[0];
      }
    } else {
      title = text('ytd-watch-metadata h1') || document.title.replace(/ - YouTube$/, '');
      author = text('ytd-watch-metadata ytd-channel-name a');
      const img = document.querySelector('ytd-watch-metadata #owner #avatar img')?.src;
      if (img && img.startsWith('http')) avatar = img;
      channelUrl = document.querySelector('ytd-watch-metadata ytd-channel-name a')?.href || null;
    }

    if (!title) return null;
    if (!thumb) thumb = `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;

    return {
      id,
      title,
      author: author || 'YouTube',
      thumb,
      avatar,
      url: `https://www.youtube.com/watch?v=${id}`,
      channelUrl,
      current: video.currentTime,
      duration: video.duration,
      paused: video.paused,
    };
  }

  function tick() {
    const info = getInfo();
    if (info) post('/presence', info);
  }

  setInterval(tick, INTERVAL);

  document.addEventListener('play', tick, true);
  document.addEventListener('pause', tick, true);
  document.addEventListener('seeked', tick, true);
  window.addEventListener('yt-navigate-finish', () => setTimeout(tick, 1500));
  window.addEventListener('beforeunload', () => post('/clear'));
})();
