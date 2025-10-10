(function registerNativeYouTubeController(global) {
  if (!global) return;

  const root = global.VideoTagger = global.VideoTagger || {};
  const player = root.player = root.player || {};

  const MEDIA_MODE = player.constants?.MEDIA_MODE || { AUDIO: 'audio', VIDEO: 'video' };

  function resolvePlayerOrigin() {
    try {
      const { location } = global;
      if (!location) return null;
      if (location.origin && location.origin !== 'null') {
        return location.origin;
      }
      const protocol = location.protocol || 'https:';
      const hostname = location.hostname || 'localhost';
      const port = location.port ? `:${location.port}` : '';
      return `${protocol}//${hostname}${port}`;
    } catch (err) {
      console.warn('[video.js] Failed to resolve window origin for YouTube embed', err);
      return null;
    }
  }

  function defaultOnPlayerReady(event) {
    console.log('[video.js] YouTube Player Ready');
    if (typeof global.showApp === 'function') global.showApp();
    else if (typeof global.showPlayer === 'function') global.showPlayer();

    const startTagBtn = document.getElementById('start-tag-btn');
    const tagInput = document.getElementById('tag-input');
    const remarksInput = document.getElementById('tag-remarks-input');
    const languageCheckboxes = document.querySelectorAll('.tag-language-checkbox');
    if (startTagBtn) startTagBtn.disabled = false;
    if (tagInput) tagInput.disabled = false;
    if (remarksInput) remarksInput.disabled = false;
    languageCheckboxes.forEach(cb => cb.disabled = false);

    const elements = player.getMediaElements();
    // Don't override mediaMode - let it stay at default (audio)
    if (elements.youtubePlaceholder) {
      elements.youtubePlaceholder.style.display = 'none';
    }
    if (elements.youtubeContainer) {
      elements.youtubeContainer.hidden = false;
      elements.youtubeContainer.style.opacity = '';
      elements.youtubeContainer.style.pointerEvents = '';
      elements.youtubeContainer.style.display = '';
      elements.youtubeContainer.style.visibility = 'visible';
    }
    document.body.classList.add('youtube-mode');

    const ytDuration = Number.isFinite(global.ytPlayer.getDuration()) ? global.ytPlayer.getDuration() : 0;
    const ytCurrent = Number.isFinite(global.ytPlayer.getCurrentTime()) ? global.ytPlayer.getCurrentTime() : 0;
    console.debug('[video.js] yt:onReady snapshot', { duration: ytDuration, currentTime: ytCurrent });
    
    // Apply media mode after YouTube player is ready (default to audio mode)
    if (typeof global.applyMediaMode === 'function') {
      global.applyMediaMode();
    }
    
    // Update button text AFTER applying mode
    if (typeof global.updateAudioModeToggle === 'function') {
      global.updateAudioModeToggle();
    }
    
    player.updateAudioControls('yt:onReady');
    player.drawTimelineRuler?.();
    player.logPlayerLayout?.('onPlayerReady');
  }
  function defaultOnPlayerStateChange(event) {
    const stateLabels = {
      [-1]: 'unstarted',
      0: 'ended',
      1: 'playing',
      2: 'paused',
      3: 'buffering',
      5: 'cued'
    };
    console.debug('[video.js] yt:stateChange', {
      state: event?.data,
      label: stateLabels[event?.data] || 'unknown'
    });
    player.updateAudioControls('yt:stateChange');
  }

  if (typeof player.onPlayerReady !== 'function') {
    player.onPlayerReady = defaultOnPlayerReady;
  }
  if (typeof player.onPlayerStateChange !== 'function') {
    player.onPlayerStateChange = defaultOnPlayerStateChange;
  }

  function clearExistingYouTubePlayer() {
    if (global.ytPlayer && typeof global.ytPlayer.destroy === 'function') {
      try {
        global.ytPlayer.destroy();
      } catch (err) {
        console.warn('[video.js] Failed to destroy YouTube player', err);
      }
    }
    global.ytPlayer = null;
    if (global._ytTimeInterval) {
      clearInterval(global._ytTimeInterval);
      global._ytTimeInterval = null;
    }
  }

  function ensureContainerReset(youtubeContainer, html5Wrapper, videoElement, placeholder) {
    if (!youtubeContainer) return;

    youtubeContainer.hidden = true;
    youtubeContainer.removeAttribute('hidden');
    youtubeContainer.style.display = 'block';
    youtubeContainer.style.opacity = '';
    youtubeContainer.style.pointerEvents = '';
    youtubeContainer.style.height = '';
    youtubeContainer.style.visibility = 'hidden';
    youtubeContainer.innerHTML = '';

    if (html5Wrapper) {
      html5Wrapper.hidden = true;
    }

    if (videoElement) {
      try {
        videoElement.pause();
      } catch (err) {
        /* ignore pause failure */
      }
      videoElement.style.display = 'none';
    }
    if (placeholder) {
      placeholder.style.display = '';
    }
  }

  function createPollingInterval() {
    if (global._ytTimeInterval) {
      clearInterval(global._ytTimeInterval);
    }
    global._ytTimeInterval = setInterval(() => {
      if (!global.ytPlayer) return;
      player.updateAudioControls('yt:poll');
    }, 250);
  }

  function fireOnReady(event) {
    if (typeof player.onPlayerReady === 'function') {
      try {
        player.onPlayerReady(event);
      } catch (err) {
        console.warn('[video.js] onPlayerReady handler failed', err);
      }
    }
    player.updateAudioControls('yt:onReady');
    if (typeof player.drawTimelineRuler === 'function') {
      player.drawTimelineRuler();
    }
  }

  function fireOnStateChange(event) {
    if (typeof player.onPlayerStateChange === 'function') {
      try {
        player.onPlayerStateChange(event);
      } catch (err) {
        console.warn('[video.js] onPlayerStateChange handler failed', err);
      }
    }
    player.updateAudioControls('yt:stateChange');
  }

  function createYouTubePlayer(videoId) {
    const { youtubeContainer, html5Wrapper, video, audioControlBar, youtubePlaceholder } = player.getMediaElements();
    if (!youtubeContainer) return;

    global.pendingYouTubeLoad = videoId;

    clearExistingYouTubePlayer();
    ensureContainerReset(youtubeContainer, html5Wrapper, video, youtubePlaceholder);

    if (!global.YT || typeof global.YT.Player !== 'function') {
      console.info('[video.js] YouTube API not ready; deferring player creation', { videoId });
      return;
    }

    const mountId = `youtube-embed-${Date.now()}`;
    const mount = document.createElement('div');
    mount.id = mountId;
    mount.className = 'youtube-embed';
    youtubeContainer.appendChild(mount);

    const origin = resolvePlayerOrigin();
    const playerVars = {
      playsinline: 1,
      modestbranding: 1,
      rel: 0,
      controls: 1,
      enablejsapi: 1
    };
    if (origin) {
      playerVars.origin = origin;
      playerVars.widget_referrer = origin;
    } else {
      console.warn('[video.js] YouTube origin could not be determined; postMessage handshakes may be blocked.');
    }

    try {
      global.ytPlayer = new YT.Player(mountId, {
        width: '100%',
        height: '400',
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars,
        events: {
          onReady(event) {
            fireOnReady(event);
            createPollingInterval();
          },
          onStateChange(event) {
            fireOnStateChange(event);
          },
          onError(event) {
            console.warn('[video.js] yt:error', event?.data, {
              origin,
              detail: event
            });
            player.updateAudioControls('yt:error');
          }
        }
      });
      global.pendingYouTubeLoad = null;
    } catch (err) {
      console.error('[video.js] Failed to initialise YT.Player', err);
      global.pendingYouTubeLoad = null;
      if (youtubePlaceholder) youtubePlaceholder.style.display = 'none';
      if (youtubeContainer) {
        youtubeContainer.hidden = true;
        youtubeContainer.style.visibility = '';
      }
      document.body.classList.remove('youtube-mode');
      return;
    }

    player.updateAudioControls('yt:create');

    if (typeof player.applyMediaMode === 'function') {
      player.applyMediaMode();
    }
    if (audioControlBar && global.mediaMode === MEDIA_MODE.AUDIO) {
      audioControlBar.hidden = false;
      audioControlBar.removeAttribute('hidden');
      audioControlBar.style.display = 'flex';
      audioControlBar.style.visibility = 'visible';
      audioControlBar.style.opacity = '1';
    }

    player.logPlayerLayout(`createYouTubePlayer:${videoId}:native`);
  }

  function onYouTubeIframeAPIReady() {
    if (global.pendingYouTubeLoad) {
      createYouTubePlayer(global.pendingYouTubeLoad);
      global.pendingYouTubeLoad = null;
    }
  }

  player.createYouTubePlayer = createYouTubePlayer;
  player.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
  global.createYouTubePlayer = createYouTubePlayer;
  global.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
})(typeof window !== 'undefined' ? window : undefined);
