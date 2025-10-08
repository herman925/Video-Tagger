(function initializePlayerController(global) {
  if (!global) return;

  const root = global.VideoTagger = global.VideoTagger || {};
  const player = root.player = root.player || {};
  const MEDIA_MODE = player.constants?.MEDIA_MODE || { AUDIO: 'audio', VIDEO: 'video' };

  global.ytPlayer = global.ytPlayer || null;
  global.plyrInstance = global.plyrInstance || null;
  global.pendingYouTubeLoad = global.pendingYouTubeLoad || null;
  global._ytTimeInterval = global._ytTimeInterval || null;
  global._currentObjectUrl = global._currentObjectUrl || null;

  function showPlayer() {
    const { player: playerContainer, timeline, html5Wrapper, youtubeContainer } = player.getMediaElements();
    const videoLoader = document.getElementById('video-loader') || document.getElementById('video-hero');
    const sidebar = document.getElementById('sidebar');
    const controlsRow = document.getElementById('controls-tag-row');
    const timelineContainer = document.getElementById('timeline-container');

    if (videoLoader) videoLoader.style.display = 'none';
    if (playerContainer) playerContainer.style.display = 'block';
    if (timeline) timeline.style.display = 'block';
    if (sidebar) sidebar.style.display = 'flex';
    if (controlsRow) controlsRow.style.display = 'flex';
    if (timelineContainer) timelineContainer.style.display = '';

    const videoElement = player.getMediaElements().video;
    if (videoElement) {
      videoElement.style.display = global.ytPlayer ? 'none' : '';
    }
    if (html5Wrapper && !global.ytPlayer) {
      html5Wrapper.hidden = false;
    }
    if (youtubeContainer && !global.ytPlayer) {
      youtubeContainer.hidden = true;
    }

    if (typeof player.applyMediaMode === 'function') {
      player.applyMediaMode();
    }
    player.updateAudioControls('showPlayer');
    player.logPlayerLayout('showPlayer');
  }

  global.showPlayer = showPlayer;

  function attachAudioToggle(videoElement) {
    const { audioToggleBtn } = player.getMediaElements();
    if (!audioToggleBtn) return;

    audioToggleBtn.addEventListener('click', () => {
      const playbackSource = global.ytPlayer
        ? 'youtube'
        : (global.plyrInstance ? 'plyr' : 'html5');
      console.debug('[video.js] audioToggleBtn click', { playbackSource });

      if (global.ytPlayer && global.ytPlayer.getPlayerState) {
        const state = global.ytPlayer.getPlayerState();
        const ytStates = (typeof global.YT !== 'undefined' && global.YT.PlayerState) ? global.YT.PlayerState : null;
        const playingValue = ytStates?.PLAYING ?? 1;
        if (state === playingValue) global.ytPlayer.pauseVideo();
        else global.ytPlayer.playVideo();
        player.updateAudioControls('toggle:youtube');
        return;
      }

      if (global.plyrInstance && typeof global.plyrInstance.play === 'function') {
        if (global.plyrInstance.paused) global.plyrInstance.play();
        else global.plyrInstance.pause();
        player.updateAudioControls('toggle:plyr');
      } else if (videoElement?.currentSrc && (videoElement.paused || videoElement.ended)) {
        videoElement.play();
        player.updateAudioControls('toggle:video');
      } else if (videoElement?.currentSrc) {
        videoElement.pause();
        player.updateAudioControls('toggle:video');
      }
    });

    if (videoElement) {
      const videoEventHandler = (event) => player.updateAudioControls(`video:${event.type}`);
      ['play', 'pause', 'timeupdate', 'loadedmetadata', 'durationchange', 'ended', 'emptied', 'seeking', 'seeked', 'canplay']
        .forEach(eventName => {
          videoElement.addEventListener(eventName, videoEventHandler);
        });
    }

    player.updateAudioControls('init:controls');
  }

  function attachAudioProgressHandlers(audioProgress, videoElement) {
    if (!audioProgress) return;

    audioProgress.dataset.scrubbing = audioProgress.dataset.scrubbing || 'false';
    let suppressChangeCommit = false;

    const markScrubbing = (state, context) => {
      const nextState = state ? 'true' : 'false';
      if (audioProgress.dataset.scrubbing !== nextState) {
        console.debug('[video.js] seek:scrubState', { state: nextState, context });
      }
      audioProgress.dataset.scrubbing = nextState;
    };

    const commitSeek = (val, reason) => {
      const parsed = Number.parseFloat(val);
      if (!Number.isFinite(parsed)) return;

      const videoDuration = Number.isFinite(videoElement?.duration) ? videoElement.duration : null;
      const ytDuration = global.ytPlayer && typeof global.ytPlayer.getDuration === 'function'
        ? global.ytPlayer.getDuration()
        : null;
      const plyrDuration = global.plyrInstance && Number.isFinite(global.plyrInstance.duration)
        ? global.plyrInstance.duration
        : null;
      const dur = ytDuration || plyrDuration || videoDuration || 0;
      const target = Math.max(0, Math.min(parsed, dur > 0 ? dur : parsed));
      console.debug('[video.js] seek:commit', { target, dur, reason });

      if (global.ytPlayer && typeof global.ytPlayer.seekTo === 'function') {
        global.ytPlayer.seekTo(target, true);
      } else if (global.plyrInstance) {
        global.plyrInstance.currentTime = target;
      } else if (videoElement) {
        videoElement.currentTime = target;
        videoElement.focus();
      }
      player.updateAudioControls(`seek:${reason}`);
    };

    const finalizeScrub = (context) => {
      if (audioProgress.dataset.scrubbing !== 'true') return;
      markScrubbing(false, context);
      if (!suppressChangeCommit) {
        commitSeek(audioProgress.value, context);
      }
      suppressChangeCommit = false;
    };

    const cancelScrub = (context) => {
      if (audioProgress.dataset.scrubbing === 'true') {
        markScrubbing(false, context);
        player.updateAudioControls(`seek:${context}`);
      }
    };

    audioProgress.addEventListener('input', () => {
      if (audioProgress.dataset.scrubbing === 'true') {
        suppressChangeCommit = true;
        player.updateAudioControls('seek:preview');
      }
    });
    audioProgress.addEventListener('change', () => {
      if (audioProgress.dataset.scrubbing === 'true') return;
      commitSeek(audioProgress.value, 'change');
    });

    audioProgress.addEventListener('pointerdown', () => markScrubbing(true, 'pointerdown'));
    audioProgress.addEventListener('pointerup', () => finalizeScrub('pointerup'));
    audioProgress.addEventListener('pointercancel', () => cancelScrub('pointercancel'));
    audioProgress.addEventListener('mousedown', () => markScrubbing(true, 'mousedown'));
    audioProgress.addEventListener('mouseup', () => finalizeScrub('mouseup'));

    audioProgress.addEventListener('touchstart', () => markScrubbing(true, 'touchstart'), { passive: true });
    audioProgress.addEventListener('touchend', () => finalizeScrub('touchend'));
    audioProgress.addEventListener('touchcancel', () => cancelScrub('touchcancel'));

    audioProgress.addEventListener('blur', () => cancelScrub('blur'));
    audioProgress.addEventListener('mouseleave', () => cancelScrub('mouseleave'));
  }

  function destroyYouTubePlayer() {
    if (global.ytPlayer && typeof global.ytPlayer.destroy === 'function') {
      global.ytPlayer.destroy();
    }
    global.ytPlayer = null;
    if (global._ytTimeInterval) {
      clearInterval(global._ytTimeInterval);
      global._ytTimeInterval = null;
    }
    player.logPlayerLayout('localLoad:destroyedYouTube');
  }

  function resetObjectUrl() {
    if (global._currentObjectUrl) {
      try {
        URL.revokeObjectURL(global._currentObjectUrl);
      } catch (err) {
        console.warn('[video.js] Failed to revoke previous object URL', err);
      }
      global._currentObjectUrl = null;
    }
  }

  function primeLocalVideo(videoElement, file) {
    destroyYouTubePlayer();
    const { html5Wrapper, youtubeContainer } = player.getMediaElements();
    if (youtubeContainer) {
      youtubeContainer.innerHTML = '';
      youtubeContainer.hidden = true;
    }
    if (html5Wrapper) {
      html5Wrapper.hidden = false;
    }
    if (global.plyrInstance) {
      try {
        global.plyrInstance.destroy();
      } catch (err) {
        console.warn('[video.js] Failed to destroy Plyr instance for local video', err);
      }
      global.plyrInstance = null;
    }

    if (videoElement) {
      videoElement.style.display = '';
    }

    resetObjectUrl();
    const objectUrl = URL.createObjectURL(file);
    global._currentObjectUrl = objectUrl;
    const sourceEl = videoElement?.querySelector('source');
    if (sourceEl) {
      sourceEl.src = objectUrl;
    } else if (videoElement) {
      videoElement.src = objectUrl;
    }
    videoElement?.load();
    console.info('[video.js] Local video source set and load() called.', {
      objectUrl: sourceEl ? sourceEl.src : videoElement?.currentSrc
    });

    player.updateAudioControls('localLoad:sourceAssigned');
    player.logPlayerLayout('localLoad:sourceAssigned');
  }

  function initializePlyrOnVideo(videoElement) {
    if (!videoElement) return;
    videoElement.oncanplay = () => {
      if (!global.plyrInstance) {
        try {
          global.plyrInstance = new Plyr(videoElement, {
            controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen']
          });
          const plyrEvents = ['ready', 'play', 'pause', 'timeupdate', 'seeking', 'seeked', 'ended', 'loadedmetadata', 'durationchange', 'error'];
          const logEvent = (event) => {
            const details = {
              type: event?.type,
              currentTime: Number.isFinite(global.plyrInstance?.currentTime) ? global.plyrInstance.currentTime : null,
              duration: Number.isFinite(global.plyrInstance?.duration) ? global.plyrInstance.duration : null
            };
            if (event?.type === 'error') console.error('[video.js] plyr:event', details);
            else console.debug('[video.js] plyr:event', details);
            player.updateAudioControls(`plyr:${event?.type || 'event'}`);
          };
          plyrEvents.forEach(evtName => {
            try {
              global.plyrInstance.on(evtName, logEvent);
            } catch (err) {
              console.warn('[video.js] Failed to attach Plyr listener', { evtName, err });
            }
          });
          showPlayer();
          player.logPlayerLayout('localLoad:plyrReady');
          player.updateAudioControls('plyr:initialized');
        } catch (error) {
          console.error('[video.js] Error initializing Plyr:', error);
        }
      }
      videoElement.oncanplay = null;
    };
  }

  function setupLocalVideoLoading(videoElement) {
    const loadLocalBtn = document.getElementById('load-local-btn');
    const localVideoInput = document.getElementById('local-video-input');
    if (!loadLocalBtn || !localVideoInput || !videoElement) return;

    loadLocalBtn.addEventListener('click', () => {
      localVideoInput.value = '';
      localVideoInput.click();
    });

    localVideoInput.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) {
        console.debug('[video.js] Local file selection cleared.');
        return;
      }

      console.info('[video.js] Local file selected', {
        name: file.name,
        type: file.type,
        size: file.size,
        lastModified: file.lastModified
      });

      if (typeof CustomEvent === 'function') {
        document.dispatchEvent(new CustomEvent('video-tagger:clear-session-request', { detail: { reason: 'local-load' } }));
      }

      primeLocalVideo(videoElement, file);
      initializePlyrOnVideo(videoElement);

      console.log('[video.js] Calling window.showApp() or showPlayer() fallback.');
      if (typeof global.showApp === 'function') global.showApp();
      else showPlayer();
      player.logPlayerLayout('localLoad:showAppTriggered');
      player.updateAudioControls('localLoad:showPlayer');

      const noVideoMsg = document.getElementById('no-video-message');
      if (noVideoMsg) noVideoMsg.style.display = 'none';
      global.currentVideoSource = file.name;

      const startTagBtn = document.getElementById('start-tag-btn');
      const endTagBtn = document.getElementById('end-tag-btn');
      const tagInput = document.getElementById('tag-input');
      if (startTagBtn) startTagBtn.disabled = true;
      if (endTagBtn) endTagBtn.disabled = true;
      if (tagInput) tagInput.disabled = true;
      if (startTagBtn) startTagBtn.textContent = 'Mark Start';
    });
  }

  function setupYouTubeLoading(videoElement) {
    const loadYoutubeBtn = document.getElementById('load-youtube-btn');
    const youtubeUrlInput = document.getElementById('youtube-url');
    const noVideoMsg = document.getElementById('no-video-message');
    if (!loadYoutubeBtn || !youtubeUrlInput || !videoElement) return;

    loadYoutubeBtn.addEventListener('click', () => {
      const ytUrl = youtubeUrlInput.value.trim();
      if (!ytUrl) {
        alert('Please enter a YouTube URL.');
        return;
      }
      console.info('[video.js] YouTube load requested', { url: ytUrl });
      const match = ytUrl.match(/(?:v=|youtu.be\/|embed\/)([\w-]{11})/);
      const videoId = match ? match[1] : null;
      if (!videoId) {
        alert('Invalid YouTube URL.');
        return;
      }

      if (typeof CustomEvent === 'function') {
        document.dispatchEvent(new CustomEvent('video-tagger:clear-session-request', { detail: { reason: 'youtube-load', videoId } }));
      }

      if (global.plyrInstance) {
        global.plyrInstance.destroy();
        global.plyrInstance = null;
      }

      resetObjectUrl();

      videoElement.pause();
      const sourceToClear = videoElement.querySelector('source');
      if (sourceToClear) sourceToClear.src = '';
      videoElement.style.display = 'none';
      const { html5Wrapper, youtubeContainer } = player.getMediaElements();
      if (html5Wrapper) html5Wrapper.hidden = true;
      if (youtubeContainer) youtubeContainer.hidden = false;

      global.currentVideoSource = ytUrl;
      if (noVideoMsg) noVideoMsg.style.display = 'none';

      player.updateAudioControls('youtube:load:init');

      player.logPlayerLayout(`loadYoutubeBtn:${videoId || 'pending'}`);
      if (typeof player.applyMediaMode === 'function') {
        player.applyMediaMode();
      }
      const { audioControlBar } = player.getMediaElements();
      if (audioControlBar && global.mediaMode === MEDIA_MODE.AUDIO) {
        audioControlBar.hidden = false;
        audioControlBar.removeAttribute('hidden');
        audioControlBar.style.display = 'flex';
        audioControlBar.style.visibility = 'visible';
        audioControlBar.style.opacity = '1';
      }
      if (typeof global.showApp === 'function') global.showApp();

      player.createYouTubePlayer(videoId);

      const startTagBtn = document.getElementById('start-tag-btn');
      const endTagBtn = document.getElementById('end-tag-btn');
      const tagInput = document.getElementById('tag-input');
      if (startTagBtn) startTagBtn.disabled = true;
      if (endTagBtn) endTagBtn.disabled = true;
      if (tagInput) tagInput.disabled = true;
      if (startTagBtn) startTagBtn.textContent = 'Mark Start';
    });
  }

  function setupJumpToTime(videoElement, jumpTimeInput, jumpTimeBtn) {
    if (!jumpTimeInput) return;

    const jumpToTime = () => {
      const inputVal = jumpTimeInput.value.trim();
      if (!inputVal) return;
      const parts = inputVal.split(':');
      let time = 0;
      if (parts.length === 3) {
        time = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
      } else if (parts.length === 2) {
        time = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
      } else {
        time = parseFloat(parts[0]);
      }
      if (Number.isNaN(time) || time < 0) return;

      const targetSource = global.ytPlayer ? 'youtube' : (global.plyrInstance ? 'plyr' : 'video');
      console.debug('[video.js] jumpToTime', { input: inputVal, seconds: time, targetSource });

      if (global.ytPlayer && typeof global.ytPlayer.seekTo === 'function') {
        global.ytPlayer.seekTo(time, true);
        player.updateAudioControls('jumpToTime:youtube');
      } else if (global.plyrInstance) {
        global.plyrInstance.currentTime = time;
        global.plyrInstance.play();
        player.updateAudioControls('jumpToTime:plyr');
      } else if (videoElement?.duration && time <= videoElement.duration) {
        videoElement.currentTime = time;
        videoElement.focus();
        player.updateAudioControls('jumpToTime:video');
      }
    };

    if (jumpTimeBtn) jumpTimeBtn.addEventListener('click', jumpToTime);
    jumpTimeInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') jumpToTime();
    });
  }

  function setupTimelineHooks(videoElement) {
    if (!videoElement) return;
    videoElement.addEventListener('loadedmetadata', player.drawTimelineRuler);
    let resizeTimeout;
    global.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(player.drawTimelineRuler, 250);
    });
  }

  function setupKeyboardShortcuts(videoElement) {
    document.addEventListener('keydown', (e) => {
      if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.isContentEditable) return;
      if (e.key === ' ') {
        e.preventDefault();
        if (global.ytPlayer && global.ytPlayer.getPlayerState) {
          const state = global.ytPlayer.getPlayerState();
          if (state === global.YT?.PlayerState?.PLAYING) {
            global.ytPlayer.pauseVideo();
          } else {
            global.ytPlayer.playVideo();
          }
        } else if (global.plyrInstance) {
          global.plyrInstance.togglePlay();
        } else if (videoElement) {
          if (videoElement.paused) videoElement.play();
          else videoElement.pause();
        }
      }
    });
  }

  function initVideo() {
    const elements = player.getMediaElements();
    const videoElement = elements.video;

    attachAudioToggle(videoElement);
    attachAudioProgressHandlers(elements.audioProgress, videoElement);
    setupLocalVideoLoading(videoElement);
    setupYouTubeLoading(videoElement);
    setupJumpToTime(videoElement, document.getElementById('jump-time-input'), document.getElementById('jump-time-btn'));
    setupTimelineHooks(videoElement);
    setupKeyboardShortcuts(videoElement);
  }

  global.initVideo = initVideo;
})(typeof window !== 'undefined' ? window : undefined);
