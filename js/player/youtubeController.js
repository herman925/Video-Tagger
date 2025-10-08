(function registerYouTubeController(global) {
  if (!global) return;

  const root = global.VideoTagger = global.VideoTagger || {};
  const player = root.player = root.player || {};
  const adapterModule = root.YouTubeAdapter || {};
  const YT_PLAYER_STATE = adapterModule.YT_PLAYER_STATE || {
    UNSTARTED: -1,
    ENDED: 0,
    PLAYING: 1,
    PAUSED: 2,
    BUFFERING: 3,
    CUED: 5
  };
  let PlyrYouTubeAdapter = adapterModule.PlyrYouTubeAdapter;
  if (!PlyrYouTubeAdapter) {
    PlyrYouTubeAdapter = class LegacyPlyrAdapter {
      constructor(plyrInstance) {
        this.plyr = plyrInstance || null;
        this.state = YT_PLAYER_STATE.UNSTARTED;
      }

      setState(newState) {
        this.state = newState;
      }

      getPlayerState() {
        return this.state;
      }

      playVideo() {
        try {
          this.plyr?.play();
        } catch (err) {
          console.warn('[video.js] Plyr adapter failed to play', err);
        }
      }

      pauseVideo() {
        try {
          this.plyr?.pause();
        } catch (err) {
          console.warn('[video.js] Plyr adapter failed to pause', err);
        }
      }

      stopVideo() {
        try {
          this.plyr?.stop();
        } catch (err) {
          console.warn('[video.js] Plyr adapter failed to stop', err);
        }
      }

      seekTo(seconds) {
        if (!this.plyr) return;
        try {
          this.plyr.currentTime = Number.isFinite(seconds) ? seconds : 0;
        } catch (err) {
          console.warn('[video.js] Plyr adapter failed to seek', { seconds, err });
        }
      }

      getCurrentTime() {
        const cur = this.plyr?.currentTime;
        return Number.isFinite(cur) ? cur : 0;
      }

      getDuration() {
        const duration = this.plyr?.duration;
        return Number.isFinite(duration) ? duration : 0;
      }

      destroy() {
        if (this.plyr) {
          try {
            this.plyr.destroy();
          } catch (err) {
            console.warn('[video.js] Plyr adapter failed to destroy Plyr instance', err);
          }
        }
        this.plyr = null;
        this.state = YT_PLAYER_STATE.UNSTARTED;
      }
    };
  }

  if (typeof adapterModule.ensureYouTubePlayerStateConstants === 'function') {
    adapterModule.ensureYouTubePlayerStateConstants();
  } else if (typeof global !== 'undefined') {
    global.YT = global.YT || {};
    global.YT.PlayerState = global.YT.PlayerState || { ...YT_PLAYER_STATE };
  }

  const MEDIA_MODE = player.constants?.MEDIA_MODE || { AUDIO: 'audio', VIDEO: 'video' };

  function emitStateChange(adapter, state) {
    adapter.setState(state);
    if (typeof player.onPlayerStateChange === 'function') {
      try {
        player.onPlayerStateChange({ data: state, target: adapter });
      } catch (err) {
        console.warn('[video.js] onPlayerStateChange handler threw', err);
      }
    }
  }

  function createYouTubePlayer(videoId) {
    const { youtubeContainer, html5Wrapper, video } = player.getMediaElements();
    if (!youtubeContainer) return;

    global.pendingYouTubeLoad = null;

    youtubeContainer.innerHTML = '';
    youtubeContainer.hidden = false;

    if (html5Wrapper) {
      html5Wrapper.hidden = true;
    }

    if (video) {
      try {
        video.pause();
      } catch (err) {
        console.warn('[video.js] Failed to pause HTML5 video before loading YouTube', err);
      }
    }

    if (global.plyrInstance) {
      try {
        global.plyrInstance.destroy();
      } catch (err) {
        console.warn('[video.js] Failed to destroy existing Plyr instance before creating YouTube player', err);
      }
      global.plyrInstance = null;
    }

    if (global.ytPlayer) {
      try {
        global.ytPlayer.destroy();
      } catch (err) {
        console.warn('[video.js] Failed to destroy existing YouTube adapter before creating new one', err);
      }
      global.ytPlayer = null;
    }

    const playerDiv = document.createElement('div');
    playerDiv.id = 'youtube-embed';
    playerDiv.className = 'plyr__video-embed';
    playerDiv.dataset.plyrProvider = 'youtube';
    playerDiv.dataset.plyrEmbedId = videoId;
    youtubeContainer.appendChild(playerDiv);

    console.info('[video.js] createYouTubePlayer requested', { videoId, mode: 'plyr-adapter' });

    const plyrOptions = {
      controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'],
      youtube: {
        rel: 0,
        showinfo: 0,
        iv_load_policy: 3,
        modestbranding: 1,
        playsinline: 1,
        noCookie: true
      }
    };

    try {
      global.plyrInstance = new Plyr(playerDiv, plyrOptions);
    } catch (err) {
      console.error('[video.js] Failed to initialize Plyr for YouTube', err);
      return;
    }

    const adapter = new PlyrYouTubeAdapter(global.plyrInstance);
    global.ytPlayer = adapter;

    const plyrEvents = ['play', 'pause', 'seeking', 'seeked', 'ended', 'timeupdate', 'ready', 'error'];
    plyrEvents.forEach(evtName => {
      try {
        global.plyrInstance.on(evtName, (event) => {
          switch (evtName) {
            case 'ready':
              emitStateChange(adapter, YT_PLAYER_STATE.CUED);
              if (typeof player.onPlayerReady === 'function') {
                try {
                  player.onPlayerReady({ target: adapter });
                } catch (err) {
                  console.warn('[video.js] onPlayerReady handler threw', err);
                }
              }
              break;
            case 'play':
              emitStateChange(adapter, YT_PLAYER_STATE.PLAYING);
              break;
            case 'pause':
              emitStateChange(adapter, YT_PLAYER_STATE.PAUSED);
              break;
            case 'seeking':
              emitStateChange(adapter, YT_PLAYER_STATE.BUFFERING);
              break;
            case 'seeked':
              emitStateChange(adapter, global.plyrInstance.playing ? YT_PLAYER_STATE.PLAYING : YT_PLAYER_STATE.PAUSED);
              break;
            case 'ended':
              emitStateChange(adapter, YT_PLAYER_STATE.ENDED);
              break;
            case 'error':
              console.error('[video.js] Plyr YouTube error', event?.detail || event);
              break;
            default:
              break;
          }
          if (evtName !== 'error') {
            player.updateAudioControls(`plyr-youtube:${evtName}`);
          }
        });
      } catch (err) {
        console.warn('[video.js] Failed to bind Plyr event listener for YouTube', { evtName, err });
      }
    });

    if (global._ytTimeInterval) {
      clearInterval(global._ytTimeInterval);
      global._ytTimeInterval = null;
    }

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

    player.logPlayerLayout(`createYouTubePlayer:${videoId}:plyr`);
  }

  function onPlayerReady(event) {
    console.log('YouTube Player Ready');
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

    if (typeof player.applyMediaMode === 'function') {
      player.applyMediaMode();
    }

    const ytDuration = event?.target && typeof event.target.getDuration === 'function' ? event.target.getDuration() : null;
    const ytCurrent = event?.target && typeof event.target.getCurrentTime === 'function' ? event.target.getCurrentTime() : null;
    console.debug('[video.js] yt:onReady snapshot', { duration: ytDuration, currentTime: ytCurrent });
    player.updateAudioControls('yt:onReady');

    player.logPlayerLayout('onPlayerReady');
    player.drawTimelineRuler();
  }

  function onPlayerStateChange(event) {
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

  function onYouTubeIframeAPIReady() {
    if (global.pendingYouTubeLoad) {
      console.info('[video.js] onYouTubeIframeAPIReady called with pending ID', global.pendingYouTubeLoad);
      createYouTubePlayer(global.pendingYouTubeLoad);
      global.pendingYouTubeLoad = null;
    }
  }

  player.createYouTubePlayer = createYouTubePlayer;
  player.onPlayerReady = onPlayerReady;
  player.onPlayerStateChange = onPlayerStateChange;
  player.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;

  global.createYouTubePlayer = createYouTubePlayer;
  global.onPlayerReady = onPlayerReady;
  global.onPlayerStateChange = onPlayerStateChange;
  global.onYouTubeIframeAPIReady = onYouTubeIframeAPIReady;
})(typeof window !== 'undefined' ? window : undefined);
