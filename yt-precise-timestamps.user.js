// ==UserScript==
// @name         YouTube Precise Timestamps
// @namespace    https://github.com/Kori
// @version      1.0.0
// @description  Adds millisecond precision to YouTube player timestamps
// @author       Kori
// @match        https://www.youtube.com/*
// @match        https://youtube.com/*
// @homepageURL  https://github.com/Kori-ts/yt-precise-timestamps
// @downloadURL  https://raw.githubusercontent.com/Kori-ts/yt-precise-timestamps/main/yt-precise-timestamps.user.js
// @updateURL    https://raw.githubusercontent.com/Kori-ts/yt-precise-timestamps/main/yt-precise-timestamps.user.js
// @grant        none
// ==/UserScript==

(function () {
  "use strict";

  let hoverSeconds = null;
  let seekDuration = 0;
  let activeVideo = null;

  const timeNodes = ".ytp-tooltip-progress-bar-pill-time-stamp,.ytp-storyboard-framepreview-timestamp,.ytp-tooltip-duration";

  const format = (seconds) => {
    const ms = Math.max(0, Math.round((Number.isFinite(seconds) ? seconds : 0) * 1000));
    const h = Math.floor(ms / 3600000);
    const m = Math.floor(ms / 60000) % 60;
    const s = Math.floor(ms / 1000) % 60;
    const tail = `${String(s).padStart(2, "0")}.${String(ms % 1000).padStart(3, "0")}`;
    return `${h ? `${h}:${String(m).padStart(2, "0")}` : m}:${tail}`;
  };

  const video = () => document.querySelector(".html5-video-player video") || document.querySelector("video");

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const write = (node, value) => {
    if (node && node.textContent !== value) node.textContent = value;
  };

  const durationFromPlayerResponse = () => {
    const script = [...document.scripts].find((script) => script.textContent.includes("adaptiveFormats"));
    const counts = {};
    for (const match of (script?.textContent || "").matchAll(/"approxDurationMs"\s*:\s*"(\d+)"/g)) {
      counts[match[1]] = (counts[match[1]] || 0) + 1;
    }

    return Number(Object.keys(counts).sort((a, b) => counts[b] - counts[a])[0] || 0) / 1000;
  };

  const updateHoverPosition = (event) => {
    const bar = document.querySelector(".ytp-progress-bar");
    if (!bar) return;
    if (!seekDuration) seekDuration = durationFromPlayerResponse();
    if (!seekDuration) return;

    const rect = bar.getBoundingClientRect();
    if (rect.width <= 0 || event.clientY < rect.top - 80 || event.clientY > rect.bottom + 80) {
      hoverSeconds = null;
      return;
    }

    const pixel = Math.floor(clamp(event.clientX - rect.left, 0, rect.width));
    hoverSeconds = (pixel / rect.width) * seekDuration;
  };

  const update = () => {
    const el = video();
    if (el) {
      if (el !== activeVideo) {
        activeVideo?.removeEventListener("timeupdate", update);
        el.addEventListener("timeupdate", update);
        activeVideo = el;
      }
      write(document.querySelector(".ytp-time-current"), format(el.currentTime));
      write(document.querySelector(".ytp-time-duration"), format(el.duration));
    }

    if (hoverSeconds != null) {
      const precise = format(hoverSeconds);
      for (const node of document.querySelectorAll(timeNodes)) {
        if (node.textContent.trim()) write(node, precise);
      }
    }
  };

  const tick = () => {
    update();
    requestAnimationFrame(tick);
  };

  document.addEventListener("pointermove", updateHoverPosition, true);
  document.addEventListener("yt-navigate-finish", () => {
    hoverSeconds = null;
    seekDuration = 0;
    activeVideo?.removeEventListener("timeupdate", update);
    activeVideo = null;
  });
  tick();
})();
