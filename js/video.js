// Video controls and timeline logic (interval tag support, minimalist controls, jump-to-time only)
window.ytPlayer = null; // Global reference for YouTube player instance
window.plyrInstance = null; // Global reference for Plyr instance

const MEDIA_MODE = {
  AUDIO: 'audio',
  VIDEO: 'video'
};

window.mediaMode = window.mediaMode || MEDIA_MODE.AUDIO; // Default to audio-only until admin enables video

const CONTROL_LOG_DELTA = 0.75;
let lastAudioControlSnapshot = null;

function getMediaElements() {
  return {
    player: document.getElementById('video-player'),
    placeholder: document.getElementById('audio-only-placeholder'),
    audioControlBar: document.getElementById('audio-control-bar'),
    mediaContent: document.getElementById('media-content'),
    html5Wrapper: document.getElementById('html5-wrapper'),
    youtubeContainer: document.getElementById('youtube-container'),
    video: document.getElementById('video'),
    audioToggleBtn: document.getElementById('audio-toggle-btn'),
    audioStatus: document.getElementById('audio-status'),
    audioProgress: document.getElementById('audio-progress'),
    timeline: document.getElementById('timeline')
  };
}

// Collect layout-related details for console logging without crashing on missing nodes.
function describeElementForLog(element, options = {}, depth = 0) {
  if (!element) return null;
  const {
    includeChildren = false,
    maxDepth = 1
  } = options;
  try {
    const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
    const computed = window.getComputedStyle ? window.getComputedStyle(element) : null;
    const summarizeRect = rect
      ? {
          top: Number(rect.top.toFixed(2)),
          left: Number(rect.left.toFixed(2)),
          width: Number(rect.width.toFixed(2)),
          height: Number(rect.height.toFixed(2))
        }
      : null;
    const summarizeStyles = computed
      ? {
          display: computed.display,
          visibility: computed.visibility,
          opacity: computed.opacity,
          pointerEvents: computed.pointerEvents,
          position: computed.position,
          zIndex: computed.zIndex,
          overflow: computed.overflow,
          height: computed.height,
          width: computed.width
        }
      : null;
    const parents = [];
    let current = element;
    while (current && parents.length < 4) {
      const id = current.id ? `#${current.id}` : current.tagName?.toLowerCase() || '';
      const className = current.className ? `.${String(current.className).trim().replace(/\s+/g, '.')}` : '';
      parents.push(`${id}${className}`);
      current = current.parentElement;
    }
    const summary = {
      tag: element.tagName?.toLowerCase() || '',
      id: element.id || null,
      classes: element.className || '',
      hiddenAttr: !!element.hidden,
      inlineDisplay: element.style?.display || '',
      hiddenStyle: element.style?.visibility || '',
      size: {
        offsetWidth: element.offsetWidth,
        offsetHeight: element.offsetHeight,
        clientWidth: element.clientWidth,
        clientHeight: element.clientHeight
      },
      rect: summarizeRect,
      styles: summarizeStyles,
      childCount: element.children ? element.children.length : 0,
      firstChildren: Array.from(element.children || [])
        .slice(0, 3)
        .map(child => {
          const childId = child.id ? `#${child.id}` : child.tagName?.toLowerCase() || '';
          const childClasses = child.className ? `.${String(child.className).trim().replace(/\s+/g, '.')}` : '';
          return `${childId}${childClasses}`;
        }),
      ancestorChain: parents,
      scroll: {
        top: element.scrollTop || 0,
        left: element.scrollLeft || 0,
        width: element.scrollWidth || 0,
        height: element.scrollHeight || 0
      }
    };
    if (element.getAttributeNames) {
      const attrs = element.getAttributeNames();
      if (attrs?.length) {
        summary.attributes = {};
        attrs.forEach(name => {
          summary.attributes[name] = element.getAttribute(name);
        });
      }
    }
    if (element.dataset && Object.keys(element.dataset).length) {
      summary.dataset = { ...element.dataset };
    }
    if (typeof element.textContent === 'string') {
      const text = element.textContent.trim();
      if (text) {
        summary.textPreview = text.length > 160 ? `${text.slice(0, 157)}…` : text;
        summary.textLength = text.length;
      }
    }
    if (includeChildren && element.children?.length && depth < maxDepth) {
      summary.children = Array.from(element.children).map(child =>
        describeElementForLog(child, { includeChildren: true, maxDepth }, depth + 1)
      );
    }
    return summary;
  } catch (err) {
    return { error: err?.message || String(err) };
  }
}

function snapshotDataset(dataset) {
  if (!dataset) return undefined;
  return { ...dataset };
}

function serializeTimeRanges(ranges) {
  if (!ranges || typeof ranges.length !== 'number') return [];
  const result = [];
  for (let i = 0; i < ranges.length; i += 1) {
    try {
      result.push({
        start: Number(ranges.start(i).toFixed(3)),
        end: Number(ranges.end(i).toFixed(3))
      });
    } catch (err) {
      result.push({ error: err?.message || String(err), index: i });
    }
  }
  return result;
}

function collectAudioControlDiagnostics(elements) {
  const { audioToggleBtn, audioStatus, audioProgress, audioControlBar } = elements;
  if (!audioToggleBtn && !audioStatus && !audioProgress && !audioControlBar) return null;
  return {
    toggleButton: audioToggleBtn
      ? {
          text: audioToggleBtn.textContent?.trim() || '',
          disabled: audioToggleBtn.disabled,
          ariaLabel: audioToggleBtn.getAttribute('aria-label'),
          title: audioToggleBtn.getAttribute('title'),
          dataset: snapshotDataset(audioToggleBtn.dataset),
          element: describeElementForLog(audioToggleBtn)
        }
      : null,
    status: audioStatus
      ? {
          text: audioStatus.textContent || '',
          ariaLive: audioStatus.getAttribute('aria-live'),
          element: describeElementForLog(audioStatus)
        }
      : null,
    progress: audioProgress
      ? {
          value: Number.parseFloat(audioProgress.value),
          max: Number.parseFloat(audioProgress.max),
          min: Number.parseFloat(audioProgress.min),
          step: audioProgress.step || null,
          scrubbing: audioProgress.dataset?.scrubbing || null,
          active: audioProgress.matches ? audioProgress.matches(':active') : undefined,
          dataset: snapshotDataset(audioProgress.dataset),
          element: describeElementForLog(audioProgress)
        }
      : null,
    controlBar: audioControlBar ? describeElementForLog(audioControlBar, { includeChildren: true, maxDepth: 2 }) : null
  };
}

function collectHtml5VideoDiagnostics(elements) {
  const video = elements.video;
  if (!video) return null;
  const diagnostics = {
    summary: {
      currentSrc: video.currentSrc || null,
      preload: video.preload || null,
      crossOrigin: video.crossOrigin || null,
      readyState: video.readyState,
      networkState: video.networkState
    },
    playback: {
      paused: video.paused,
      ended: video.ended,
      seeking: video.seeking,
      currentTime: Number.isFinite(video.currentTime) ? Number(video.currentTime.toFixed(3)) : null,
      duration: Number.isFinite(video.duration) ? Number(video.duration.toFixed(3)) : null,
      playbackRate: video.playbackRate,
      defaultPlaybackRate: video.defaultPlaybackRate
    },
    buffering: {
      buffered: serializeTimeRanges(video.buffered),
      seekable: serializeTimeRanges(video.seekable),
      played: serializeTimeRanges(video.played)
    },
    audio: {
      volume: video.volume,
      muted: video.muted,
      defaultMuted: video.defaultMuted,
      audioTracks: video.audioTracks ? video.audioTracks.length : undefined
    },
    textTracks: video.textTracks ? Array.from(video.textTracks).map(track => ({
      kind: track.kind,
      label: track.label,
      language: track.language,
      mode: track.mode,
      cues: track.cues ? track.cues.length : undefined
    })) : undefined,
    element: describeElementForLog(video, { includeChildren: true, maxDepth: 1 }),
    wrapper: describeElementForLog(elements.html5Wrapper, { includeChildren: true, maxDepth: 2 })
  };
  return diagnostics;
}

const YOUTUBE_STATE_LABEL = {
  [-1]: 'unstarted',
  0: 'ended',
  1: 'playing',
  2: 'paused',
  3: 'buffering',
  5: 'cued'
};

function safeYouTubeCall(player, method, ...args) {
  if (!player || typeof player[method] !== 'function') return null;
  try {
    return player[method](...args);
  } catch (err) {
    return { error: err?.message || String(err) };
  }
}

function collectYouTubeDiagnostics(elements) {
  const container = elements.youtubeContainer;
  const iframe = container?.querySelector('iframe') || null;
  const player = window.ytPlayer || null;
  if (!container && !player) return null;
  const diag = {
    hasPlayerInstance: !!player,
    container: describeElementForLog(container, { includeChildren: true, maxDepth: 2 }),
    iframe: describeElementForLog(iframe, { includeChildren: true, maxDepth: 1 }),
    pollingIntervalActive: !!window._ytTimeInterval,
    pendingLoad: window.pendingYouTubeLoad || null
  };
  if (player) {
    const rawState = safeYouTubeCall(player, 'getPlayerState');
    const currentTime = safeYouTubeCall(player, 'getCurrentTime');
    const duration = safeYouTubeCall(player, 'getDuration');
    diag.player = {
      state: {
        raw: rawState,
        label: typeof rawState === 'number' ? (YOUTUBE_STATE_LABEL[rawState] || 'unknown') : rawState
      },
      playback: {
        currentTime: typeof currentTime === 'number' ? Number(currentTime.toFixed(3)) : currentTime,
        duration: typeof duration === 'number' ? Number(duration.toFixed(3)) : duration,
        loadedFraction: safeYouTubeCall(player, 'getVideoLoadedFraction'),
        playbackRate: safeYouTubeCall(player, 'getPlaybackRate'),
        availablePlaybackRates: safeYouTubeCall(player, 'getAvailablePlaybackRates'),
        quality: safeYouTubeCall(player, 'getPlaybackQuality'),
        availableQualityLevels: safeYouTubeCall(player, 'getAvailableQualityLevels')
      },
      volume: {
        muted: safeYouTubeCall(player, 'isMuted'),
        volume: safeYouTubeCall(player, 'getVolume')
      },
      video: {
        data: safeYouTubeCall(player, 'getVideoData'),
        url: safeYouTubeCall(player, 'getVideoUrl'),
        embedCode: safeYouTubeCall(player, 'getVideoEmbedCode'),
        playlist: safeYouTubeCall(player, 'getPlaylist'),
        playlistIndex: safeYouTubeCall(player, 'getPlaylistIndex')
      }
    };
  }
  return diag;
}

function collectPlyrDiagnostics() {
  const plyr = window.plyrInstance;
  if (!plyr) return null;
  const diag = {
    state: {
      playing: plyr.playing,
      paused: plyr.paused,
      stopped: plyr.stopped,
      ended: plyr.ended,
      seeking: plyr.seeking
    },
    playback: {
      currentTime: Number.isFinite(plyr.currentTime) ? Number(plyr.currentTime.toFixed(3)) : null,
      duration: Number.isFinite(plyr.duration) ? Number(plyr.duration.toFixed(3)) : null,
      speed: plyr.speed,
      volume: plyr.volume,
      muted: plyr.muted,
      loop: plyr.loop
    },
    quality: {
      current: plyr.quality,
      options: Array.isArray(plyr.options?.quality?.options) ? [...plyr.options.quality.options] : undefined
    },
    fullscreen: {
      supported: !!plyr.fullscreen,
      active: plyr.fullscreen?.active ?? null
    },
    config: plyr.config || null,
    elements: {
      container: describeElementForLog(plyr.elements?.container, { includeChildren: true, maxDepth: 2 }),
      controls: describeElementForLog(plyr.elements?.controls, { includeChildren: true, maxDepth: 2 })
    }
  };
  return diag;
}

// Emit a grouped console log showing where the media player elements live on the page.
function logPlayerLayout(context) {
  try {
    const elements = getMediaElements();
    const summary = {
      context,
      mediaMode: window.mediaMode,
      hasYouTubePlayer: !!window.ytPlayer,
      hasPlyrInstance: !!window.plyrInstance,
      pendingYouTubeLoad: window.pendingYouTubeLoad || null,
      currentVideoSource: window.currentVideoSource || null,
      ytPolling: !!window._ytTimeInterval,
      lastAudioControlSnapshot
    };
    const diagnostics = {
      summary,
      elements: {
        player: describeElementForLog(elements.player, { includeChildren: true, maxDepth: 2 }),
        mediaContent: describeElementForLog(elements.mediaContent, { includeChildren: true, maxDepth: 2 }),
        placeholder: describeElementForLog(elements.placeholder),
        audioControlBar: describeElementForLog(elements.audioControlBar, { includeChildren: true, maxDepth: 2 }),
        html5Wrapper: describeElementForLog(elements.html5Wrapper, { includeChildren: true, maxDepth: 2 }),
        youtubeContainer: describeElementForLog(elements.youtubeContainer, { includeChildren: true, maxDepth: 2 }),
        timeline: describeElementForLog(elements.timeline, { includeChildren: true, maxDepth: 1 })
      },
      audioControls: collectAudioControlDiagnostics(elements),
      youtube: collectYouTubeDiagnostics(elements),
      html5Video: collectHtml5VideoDiagnostics(elements),
      plyr: collectPlyrDiagnostics()
    };
    if (console.groupCollapsed) console.groupCollapsed(`[video.js] layout @ ${context}`);
    console.info('[video.js] layout summary', summary);
    console.info('[video.js] player elements', diagnostics.elements);
    if (diagnostics.audioControls) console.info('[video.js] audio controls detail', diagnostics.audioControls);
    if (diagnostics.youtube) console.info('[video.js] youtube diagnostics', diagnostics.youtube);
    if (diagnostics.html5Video) console.info('[video.js] html5 video diagnostics', diagnostics.html5Video);
    if (diagnostics.plyr) console.info('[video.js] plyr diagnostics', diagnostics.plyr);
    console.info('[video.js] layout detail dump', diagnostics);
    if (console.groupEnd) console.groupEnd();
  } catch (err) {
    console.warn('[video.js] Failed to log player layout', err);
  }
}

window.logPlayerLayout = logPlayerLayout;

function formatMediaTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateAudioControls(trigger = 'auto') {
  const { video, audioToggleBtn, audioStatus, audioProgress } = getMediaElements();
  if (!audioToggleBtn || !audioStatus) {
    console.warn('[video.js] updateAudioControls missing controls', {
      trigger,
      hasToggle: !!audioToggleBtn,
      hasStatus: !!audioStatus
    });
    return;
  }

  const sourceType = window.ytPlayer
    ? 'youtube'
    : (window.plyrInstance ? 'plyr' : (video ? 'html5' : 'none'));

  const ytStateAvailable = window.ytPlayer
    && typeof window.ytPlayer.getPlayerState === 'function'
    && typeof window.ytPlayer.getCurrentTime === 'function';
  const ytDurationAvailable = window.ytPlayer
    && typeof window.ytPlayer.getDuration === 'function';
  const isYouTube = sourceType === 'youtube' && ytStateAvailable;

  const hasSource = isYouTube
    ? !!window.ytPlayer // Allow controls even before duration is available
    : !!(video && (video.currentSrc || video.src));

  audioToggleBtn.disabled = !hasSource;

  if (!hasSource || (!video && !isYouTube)) {
    audioToggleBtn.textContent = 'Play';
    audioToggleBtn.setAttribute('aria-label', 'Play audio');
    audioStatus.textContent = '00:00 / 00:00';
    if (audioProgress) {
      if (!audioProgress.dataset.scrubbing) audioProgress.dataset.scrubbing = 'false';
      audioProgress.value = 0;
      audioProgress.max = 0;
    }
    if (!hasSource && trigger !== 'auto') {
      console.debug('[video.js] updateAudioControls skipped: no media source', { trigger, sourceType });
    }
    lastAudioControlSnapshot = null;
    return;
  }

  let isPlaying = false;
  let current = 0;
  let rawDuration = 0;

  if (isYouTube) {
    const playerState = window.ytPlayer.getPlayerState ? window.ytPlayer.getPlayerState() : undefined;
    const ytStates = (typeof YT !== 'undefined' && YT.PlayerState) ? YT.PlayerState : null;
    const playingValue = ytStates?.PLAYING ?? 1;
    isPlaying = playerState === playingValue;

    if (typeof window.ytPlayer.getCurrentTime === 'function') {
      current = window.ytPlayer.getCurrentTime();
    }
    if (ytDurationAvailable) {
      rawDuration = window.ytPlayer.getDuration();
    }
  } else if (window.plyrInstance) {
    isPlaying = !window.plyrInstance.paused;
    current = Number.isFinite(window.plyrInstance.currentTime)
      ? window.plyrInstance.currentTime
      : (video?.currentTime || 0);
    rawDuration = Number.isFinite(window.plyrInstance.duration)
      ? window.plyrInstance.duration
      : (Number.isFinite(video?.duration) ? video.duration : 0);
  } else if (video) {
    isPlaying = !video.paused && !video.ended;
    current = Number.isFinite(video.currentTime) ? video.currentTime : 0;
    rawDuration = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : 0;
  }

  const duration = Number.isFinite(rawDuration) && rawDuration > 0 ? rawDuration : 0;

  audioToggleBtn.textContent = isPlaying ? 'Pause' : 'Play';
  audioToggleBtn.setAttribute('aria-label', isPlaying ? 'Pause audio' : 'Play audio');

  audioStatus.textContent = `${formatMediaTime(current)} / ${formatMediaTime(duration || 0)}`;

  if (audioProgress) {
    if (!audioProgress.dataset.scrubbing) {
      audioProgress.dataset.scrubbing = 'false';
    }
    const scrubbing = audioProgress.dataset.scrubbing === 'true';
    const safeDuration = duration > 0 ? duration : 0;
    if (audioProgress.max != safeDuration) audioProgress.max = safeDuration;
    if (!scrubbing) {
      const clamped = safeDuration > 0
        ? Math.min(Math.max(current, 0), safeDuration)
        : Math.max(current, 0);
      audioProgress.value = clamped;
    }
  }

  const snapshot = {
    trigger,
    sourceType,
    isPlaying,
    current,
    duration,
    disabled: audioToggleBtn.disabled
  };

  if (
    !lastAudioControlSnapshot
    || lastAudioControlSnapshot.sourceType !== snapshot.sourceType
    || lastAudioControlSnapshot.isPlaying !== snapshot.isPlaying
    || lastAudioControlSnapshot.disabled !== snapshot.disabled
    || Math.abs((lastAudioControlSnapshot.duration || 0) - snapshot.duration) > CONTROL_LOG_DELTA
    || Math.abs((lastAudioControlSnapshot.current || 0) - snapshot.current) > (isPlaying ? CONTROL_LOG_DELTA * 4 : CONTROL_LOG_DELTA)
  ) {
    console.debug('[video.js] controls:update', snapshot);
    lastAudioControlSnapshot = { ...snapshot };
  } else {
    lastAudioControlSnapshot = { ...lastAudioControlSnapshot, ...snapshot };
  }
}

window.updateAudioControls = updateAudioControls;

window.applyMediaMode = function applyMediaMode() {
  const { player, placeholder, youtubeContainer, audioControlBar } = getMediaElements();
  if (!player) return;
  const mode = window.mediaMode === MEDIA_MODE.VIDEO ? MEDIA_MODE.VIDEO : MEDIA_MODE.AUDIO;
  player.classList.remove('audio-mode', 'video-mode');
  player.classList.add(`${mode}-mode`);

  if (placeholder) {
    placeholder.setAttribute('aria-hidden', mode === MEDIA_MODE.VIDEO ? 'true' : 'false');
    const hasSource = window.ytPlayer
      || (window.plyrInstance && window.plyrInstance.media?.currentSrc)
      || document.getElementById('video')?.currentSrc;
    placeholder.textContent = mode === MEDIA_MODE.AUDIO && hasSource ? 'Audio playback active' : 'No Video';
  }

  if (audioControlBar) {
    audioControlBar.hidden = mode !== MEDIA_MODE.AUDIO;
  }

  if (window.plyrInstance && window.plyrInstance.elements?.container) {
    window.plyrInstance.elements.container.classList.toggle('plyr--audio-mode', mode === MEDIA_MODE.AUDIO);
  }

  if (youtubeContainer && window.ytPlayer) {
    if (mode === MEDIA_MODE.AUDIO) {
      youtubeContainer.style.opacity = '0';
      youtubeContainer.style.pointerEvents = 'none';
      youtubeContainer.style.height = '0';
      youtubeContainer.style.display = '';
    } else {
      youtubeContainer.style.opacity = '';
      youtubeContainer.style.pointerEvents = '';
      youtubeContainer.style.height = '';
      youtubeContainer.style.display = '';
    }
  } else if (youtubeContainer) {
    youtubeContainer.style.opacity = '';
    youtubeContainer.style.pointerEvents = '';
    youtubeContainer.style.height = '';
    youtubeContainer.style.display = '';
  }

  if (mode === MEDIA_MODE.AUDIO) {
    updateAudioControls();
  }

  logPlayerLayout(`applyMediaMode:${mode}`);
};

function onYouTubeIframeAPIReady() {
  if (window.pendingYouTubeLoad) {
    console.info('[video.js] onYouTubeIframeAPIReady called with pending ID', window.pendingYouTubeLoad);
    createYouTubePlayer(window.pendingYouTubeLoad);
    window.pendingYouTubeLoad = null;
  }
}

function createYouTubePlayer(videoId) {
  const { youtubeContainer, html5Wrapper, video } = getMediaElements();
  if (!youtubeContainer) return;

  // Remove previous embed if any
  youtubeContainer.innerHTML = '';
  youtubeContainer.hidden = false;

  if (html5Wrapper) {
    html5Wrapper.hidden = true;
  }

  if (video) {
    video.pause();
  }

  const playerDiv = document.createElement('div');
  playerDiv.id = 'youtube-embed'; // The API needs an element ID
  youtubeContainer.appendChild(playerDiv);

  const rawOrigin = (typeof window !== 'undefined' && window.location && typeof window.location.origin === 'string')
    ? window.location.origin
    : null;
  const safeOrigin = rawOrigin && rawOrigin !== 'null' && /^https?:/i.test(rawOrigin) ? rawOrigin : null;
  console.info('[video.js] createYouTubePlayer requested', { videoId, origin: safeOrigin });

  const playerVars = {
    'playsinline': 1,
    'enablejsapi': 1
  };
  if (safeOrigin) {
    playerVars.origin = safeOrigin;
  }

  window.ytPlayer = new YT.Player('youtube-embed', {
    host: 'https://www.youtube.com',
    height: '400', // Adjust as needed
    width: '100%',
    videoId: videoId,
    playerVars: playerVars,
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange // Optional: handle state changes
    }
  });

  if (typeof window.applyMediaMode === 'function') {
    window.applyMediaMode();
  }
  // Start polling current time while in audio mode (YT doesn't emit timeupdate)
  if (window._ytTimeInterval) {
    clearInterval(window._ytTimeInterval);
    console.debug('[video.js] yt:polling interval cleared');
    window._ytTimeInterval = null;
  }
  window._ytTimeInterval = setInterval(() => {
    if (!window.ytPlayer) return;
    updateAudioControls('yt:poll');
  }, 200);
  console.debug('[video.js] yt:polling interval started', { videoId });

  logPlayerLayout(`createYouTubePlayer:${videoId}`);
}

function onPlayerReady(event) {
  // Player is ready, show the app interface
  console.log("YouTube Player Ready");
  if (window.showApp) window.showApp();
  else showPlayer(); // Fallback

  // Enable buttons now that the player is ready
  const startTagBtn = document.getElementById('start-tag-btn');
  const tagInput = document.getElementById('tag-input');
  const remarksInput = document.getElementById('tag-remarks-input');
  const languageCheckboxes = document.querySelectorAll('.tag-language-checkbox');
  if (startTagBtn) startTagBtn.disabled = false;
  if (tagInput) tagInput.disabled = false;
  if (remarksInput) remarksInput.disabled = false;
  languageCheckboxes.forEach(cb => cb.disabled = false);

  if (typeof window.applyMediaMode === 'function') {
    window.applyMediaMode();
  }

  const ytDuration = event?.target && typeof event.target.getDuration === 'function' ? event.target.getDuration() : null;
  const ytCurrent = event?.target && typeof event.target.getCurrentTime === 'function' ? event.target.getCurrentTime() : null;
  console.debug('[video.js] yt:onReady snapshot', { duration: ytDuration, currentTime: ytCurrent });
  updateAudioControls('yt:onReady');

  logPlayerLayout('onPlayerReady');
}

function onPlayerStateChange(event) {
  // Optional: Handle player state changes (playing, paused, ended, etc.)
  // For example, you might want to update UI elements based on the state.
  // console.log("YouTube Player State:", event.data);
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
  updateAudioControls('yt:stateChange');
}


function initVideo() {
  const videoPlayerContainer = document.getElementById('video-player'); // Renamed for clarity
  const controls = document.getElementById('controls'); // Note: This ID might need adjustment if controls are specific to HTML5
  const timeline = document.getElementById('timeline');
  const video = document.getElementById('video'); // HTML5 video element
  const loadLocalBtn = document.getElementById('load-local-btn');
  const localVideoInput = document.getElementById('local-video-input');
  const loadYoutubeBtn = document.getElementById('load-youtube-btn');
  const youtubeUrlInput = document.getElementById('youtube-url');
  const noVideoMsg = document.getElementById('no-video-message');
  const jumpTimeInput = document.getElementById('jump-time-input');
  const jumpTimeBtn = document.getElementById('jump-time-btn');
  const { audioToggleBtn, audioProgress } = getMediaElements();

  // Helper: Show/hide loader and player sections
  function showPlayer() {
    const videoLoader = document.getElementById('video-loader'); // Get element when function is called
    // Defensive check: Only hide if found
    if (videoLoader) {
        videoLoader.style.display = 'none';
    } else {
        // Log a warning if the element wasn't found when expected
        console.warn('showPlayer called but videoLoader element (ID: video-loader) not found.');
    }
    videoPlayerContainer.style.display = 'block'; // Show the container
    // controls.style.display = 'block'; // Re-evaluate if #controls is needed for YT
    timeline.style.display = 'block';
    // Hide the native video element if a YT player is active
    // Show it otherwise (Plyr will add controls)
    video.style.display = window.ytPlayer ? 'none' : '';
    // Ensure Plyr container visibility matches video element
    const plyrContainer = videoPlayerContainer.querySelector('.plyr');
    if (plyrContainer) {
        plyrContainer.style.display = window.ytPlayer ? 'none' : '';
    }

    const { html5Wrapper, youtubeContainer } = getMediaElements();
    if (html5Wrapper && !window.ytPlayer) {
      html5Wrapper.hidden = false;
    }
    if (youtubeContainer && !window.ytPlayer) {
      youtubeContainer.hidden = true;
    }

    if (typeof window.applyMediaMode === 'function') {
      window.applyMediaMode();
    }
    updateAudioControls();

    logPlayerLayout('showPlayer');
  }

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      const playbackSource = window.ytPlayer
        ? 'youtube'
        : (window.plyrInstance ? 'plyr' : 'html5');
      console.debug('[video.js] audioToggleBtn click', { playbackSource });
      // YouTube
      if (window.ytPlayer && window.ytPlayer.getPlayerState) {
        const state = window.ytPlayer.getPlayerState();
        const ytStates = (typeof YT !== 'undefined' && YT.PlayerState) ? YT.PlayerState : null;
        const playingValue = ytStates?.PLAYING ?? 1;
        if (state === playingValue) window.ytPlayer.pauseVideo();
        else window.ytPlayer.playVideo();
        updateAudioControls('toggle:youtube');
        return;
      }
      // Plyr/HTML5
      if (window.plyrInstance && typeof window.plyrInstance.play === 'function') {
        if (window.plyrInstance.paused) window.plyrInstance.play();
        else window.plyrInstance.pause();
        updateAudioControls('toggle:plyr');
      } else if (video.currentSrc && (video.paused || video.ended)) {
        video.play();
        updateAudioControls('toggle:video');
      } else if (video.currentSrc) {
        video.pause();
        updateAudioControls('toggle:video');
      }
    });

    if (video) {
      const videoEventHandler = (event) => updateAudioControls(`video:${event.type}`);
      ['play', 'pause', 'timeupdate', 'loadedmetadata', 'durationchange', 'ended', 'emptied', 'seeking', 'seeked', 'canplay']
        .forEach(eventName => {
          video.addEventListener(eventName, videoEventHandler);
      });
    }

    updateAudioControls('init:controls');
  }

  // Audio progress drag/seek
  if (audioProgress) {
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
      if (!Number.isFinite(val)) return;
      const max = Number(audioProgress.max) || 0;
      const target = Math.max(0, Math.min(val, max > 0 ? max : val));
      console.debug('[video.js] seek:commit', { target, max, reason });
      if (window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
        window.ytPlayer.seekTo(target, true);
      } else if (window.plyrInstance) {
        window.plyrInstance.currentTime = target;
      } else if (video) {
        video.currentTime = target;
      }
      updateAudioControls(`seek:${reason || 'commit'}`);
    };

    audioProgress.addEventListener('input', () => {
      markScrubbing(true, 'input');
      const val = parseFloat(audioProgress.value);
      const dur = Number(audioProgress.max) || 0;
      const { audioStatus } = getMediaElements();
      if (audioStatus) {
        audioStatus.textContent = `${formatMediaTime(val)} / ${formatMediaTime(dur)}`;
      }
      console.debug('[video.js] seek:preview', { value: val, max: dur });
    });

    audioProgress.addEventListener('change', () => {
      if (audioProgress.dataset.scrubbing !== 'true' && !suppressChangeCommit) {
        commitSeek(parseFloat(audioProgress.value), 'change');
      }
    });

    const finalizeScrub = (context) => {
      if (audioProgress.dataset.scrubbing === 'true') {
        markScrubbing(false, context);
        suppressChangeCommit = true;
        commitSeek(parseFloat(audioProgress.value), context);
        setTimeout(() => { suppressChangeCommit = false; }, 0);
      }
    };

    const cancelScrub = (context) => {
      if (audioProgress.dataset.scrubbing === 'true') {
        markScrubbing(false, context);
        updateAudioControls(`seek:${context}`);
      }
    };

    // Pointer and mouse interactions
    audioProgress.addEventListener('pointerdown', () => markScrubbing(true, 'pointerdown'));
    audioProgress.addEventListener('pointerup', () => finalizeScrub('pointerup'));
    audioProgress.addEventListener('pointercancel', () => cancelScrub('pointercancel'));
    audioProgress.addEventListener('mousedown', () => markScrubbing(true, 'mousedown'));
    audioProgress.addEventListener('mouseup', () => finalizeScrub('mouseup'));

    // Touch interactions
    audioProgress.addEventListener('touchstart', () => markScrubbing(true, 'touchstart'), { passive: true });
    audioProgress.addEventListener('touchend', () => finalizeScrub('touchend'));
    audioProgress.addEventListener('touchcancel', () => cancelScrub('touchcancel'));

    // Accessibility / keyboard interactions
    audioProgress.addEventListener('blur', () => cancelScrub('blur'));
    audioProgress.addEventListener('mouseleave', () => cancelScrub('mouseleave'));
  }

  // Local video loading
  loadLocalBtn.addEventListener('click', () => {
    localVideoInput.value = ''; // Clear previous selection
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

    // If a YouTube player exists, destroy it
    if (window.ytPlayer) {
      window.ytPlayer.destroy();
      window.ytPlayer = null;
      if (window._ytTimeInterval) { clearInterval(window._ytTimeInterval); window._ytTimeInterval = null; }
      logPlayerLayout('localLoad:destroyedYouTube');
    }
    const { html5Wrapper, youtubeContainer } = getMediaElements();
    if (youtubeContainer) {
      youtubeContainer.innerHTML = '';
      youtubeContainer.hidden = true;
    }
    if (html5Wrapper) {
      html5Wrapper.hidden = false;
    }
    // Destroy existing Plyr instance before creating a new one
    if (window.plyrInstance) {
        window.plyrInstance.destroy();
        window.plyrInstance = null;
    }

    // Ensure the HTML5 video tag is visible
    video.style.display = '';

    if (window._currentObjectUrl) {
      try {
        URL.revokeObjectURL(window._currentObjectUrl);
      } catch (err) {
        console.warn('[video.js] Failed to revoke previous object URL', err);
      }
      window._currentObjectUrl = null;
    }

    const url = URL.createObjectURL(file);
    window._currentObjectUrl = url;
    const sourceEl = video.querySelector('source');
    if (sourceEl) {
      sourceEl.src = url;
    } else {
      video.src = url;
    }
    video.load(); // Important: load the new source
    console.info('[video.js] Local video source set and load() called.', {
      objectUrl: sourceEl ? sourceEl.src : video.currentSrc
    });

    updateAudioControls('localLoad:sourceAssigned');
    logPlayerLayout('localLoad:sourceAssigned');

    // Initialize Plyr on the video element AFTER it's loaded
    // Use a timeout to ensure the element is ready, or listen for 'canplay'
    video.oncanplay = () => {
        console.log('[video.js] video.oncanplay event triggered.');
        if (!window.plyrInstance) { // Avoid re-initializing if already done
            console.log('[video.js] Initializing Plyr...');
            try {
                window.plyrInstance = new Plyr(video, {
                    // Plyr options if needed, e.g.:
                    controls: ['play-large', 'play', 'progress', 'current-time', 'mute', 'volume', 'settings', 'fullscreen'] // Uncommented controls
                });
                console.log('[video.js] Plyr initialized successfully:', window.plyrInstance);
                const plyrEvents = ['ready', 'play', 'pause', 'timeupdate', 'seeking', 'seeked', 'ended', 'loadedmetadata', 'durationchange', 'error'];
                const logPlyrEvent = (event) => {
                    const details = {
                      type: event?.type,
                      currentTime: Number.isFinite(window.plyrInstance?.currentTime) ? window.plyrInstance.currentTime : null,
                      duration: Number.isFinite(window.plyrInstance?.duration) ? window.plyrInstance.duration : null
                    };
                    if (event?.type === 'error') {
                      console.error('[video.js] plyr:event', details);
                    } else {
                      console.debug('[video.js] plyr:event', details);
                    }
                    updateAudioControls(`plyr:${event?.type || 'event'}`);
                };
                plyrEvents.forEach(evtName => {
                  try {
                    window.plyrInstance.on(evtName, logPlyrEvent);
                  } catch (err) {
                    console.warn('[video.js] Failed to attach Plyr listener', { evtName, err });
                  }
                });
                // Ensure Plyr controls are visible after initialization
                console.log('[video.js] Calling showPlayer() after Plyr initialization.');
                showPlayer();
                logPlayerLayout('localLoad:plyrReady');
                updateAudioControls('plyr:initialized');
            } catch (error) {
                console.error('[video.js] Error initializing Plyr:', error);
            }
        } else {
            console.log('[video.js] Plyr instance already exists, skipping initialization.');
        }
        video.oncanplay = null; // Remove listener after first run
    };

    // showApp should handle displaying the correct elements
    console.log('[video.js] Calling window.showApp() or showPlayer() fallback.');
    if (window.showApp) window.showApp();
    else showPlayer(); // Fallback
    logPlayerLayout('localLoad:showAppTriggered');
    updateAudioControls('localLoad:showPlayer');

    noVideoMsg.style.display = 'none';
    window.currentVideoSource = file.name;

    // Reset buttons (main.js handles enabling on loadedmetadata/Plyr ready)
    const startTagBtn = document.getElementById('start-tag-btn');
    const endTagBtn = document.getElementById('end-tag-btn');
    const tagInput = document.getElementById('tag-input');
    if (startTagBtn) startTagBtn.disabled = true;
    if (endTagBtn) endTagBtn.disabled = true;
    if (tagInput) tagInput.disabled = true;
    if (startTagBtn) startTagBtn.textContent = 'Mark Start';
  });

  // YouTube video loading
  loadYoutubeBtn.addEventListener('click', () => {
    const ytUrl = youtubeUrlInput.value.trim();
    if (!ytUrl) {
      alert('Please enter a YouTube URL.');
      return;
    }
    console.info('[video.js] YouTube load requested', { url: ytUrl });
    // Extract YouTube video ID
    const match = ytUrl.match(/(?:v=|youtu.be\/|embed\/)([\w-]{11})/);
    const videoId = match ? match[1] : null;
    if (!videoId) {
      alert('Invalid YouTube URL.');
      return;
    }

    if (typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('video-tagger:clear-session-request', { detail: { reason: 'youtube-load', videoId } }));
    }

    // Destroy Plyr instance if it exists
    if (window.plyrInstance) {
        window.plyrInstance.destroy();
        window.plyrInstance = null;
    }

    if (window._currentObjectUrl) {
      try {
        URL.revokeObjectURL(window._currentObjectUrl);
      } catch (err) {
        console.warn('[video.js] Failed to revoke object URL before loading YouTube', err);
      }
      window._currentObjectUrl = null;
    }

    // Pause and hide HTML5 video
    video.pause();
    const sourceToClear = video.querySelector('source');
    if (sourceToClear) sourceToClear.src = '';
    video.style.display = 'none'; // Hide HTML5 player
    const { html5Wrapper, youtubeContainer } = getMediaElements();
    if (html5Wrapper) html5Wrapper.hidden = true;
    if (youtubeContainer) youtubeContainer.hidden = false;
    // Also hide the Plyr container if it exists
    const plyrContainer = videoPlayerContainer.querySelector('.plyr');
    if (plyrContainer) plyrContainer.style.display = 'none';

    window.currentVideoSource = ytUrl; // Store YT URL as source
    noVideoMsg.style.display = 'none';

    updateAudioControls('youtube:load:init');

    logPlayerLayout(`loadYoutubeBtn:${videoId || 'pending'}`);
    if (typeof window.applyMediaMode === 'function') {
      window.applyMediaMode();
    }
    // Ensure the app section is shown even before YT ready
    if (window.showApp) window.showApp();

    // Check if YT API is ready
    if (typeof YT !== 'undefined' && YT.Player) {
      createYouTubePlayer(videoId);
    } else {
      // API not ready yet, store videoId to load when it is
      window.pendingYouTubeLoad = videoId;
      // The onYouTubeIframeAPIReady function will handle creation
    }

    // Reset buttons (they will be enabled in onPlayerReady)
    const startTagBtn = document.getElementById('start-tag-btn');
    const endTagBtn = document.getElementById('end-tag-btn');
    const tagInput = document.getElementById('tag-input');
    if (startTagBtn) startTagBtn.disabled = true;
    if (endTagBtn) endTagBtn.disabled = true;
    if (tagInput) tagInput.disabled = true;
    if (startTagBtn) startTagBtn.textContent = 'Mark Start';

  });

  // Go button logic only
  if (jumpTimeBtn) jumpTimeBtn.addEventListener('click', jumpToTime);
  if (jumpTimeInput) jumpTimeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') jumpToTime();
  });

  function jumpToTime() {
    const inputVal = jumpTimeInput.value.trim();
    if (!inputVal) return;
    // Accept HH:MM:SS.mmm, MM:SS.mmm, SS.mmm, or seconds
    let time = 0;
    const parts = inputVal.split(':');
    if (parts.length === 3) {
      // HH:MM:SS.mmm
      time = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // MM:SS.mmm
      time = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    } else {
      time = parseFloat(parts[0]);
    }

    if (isNaN(time) || time < 0) return;

    const targetSource = window.ytPlayer ? 'youtube' : (window.plyrInstance ? 'plyr' : 'video');
    console.debug('[video.js] jumpToTime', { input: inputVal, seconds: time, targetSource });

    if (window.ytPlayer) {
      // Use YouTube API
      window.ytPlayer.seekTo(time, true); // true allows seeking ahead
      // Focus might need adjustment for iframe
      updateAudioControls('jumpToTime:youtube');
    } else if (window.plyrInstance) {
      // Use Plyr API
      window.plyrInstance.currentTime = time;
      window.plyrInstance.play(); // Ensure video plays if it was paused
      updateAudioControls('jumpToTime:plyr');
    } else if (video.duration && time <= video.duration) {
      // Use HTML5 video API
      video.currentTime = time;
      video.focus();
      updateAudioControls('jumpToTime:video');
    }
  }

  // --- Timeline Ruler ---
  function drawTimelineRuler() {
    const timeline = document.getElementById('timeline');
    // Use YT player duration if available, otherwise HTML5 video
    const duration = (window.ytPlayer && typeof window.ytPlayer.getDuration === 'function') ? window.ytPlayer.getDuration() : (window.plyrInstance ? window.plyrInstance.duration : video.duration);

    if (!timeline || !duration || duration <= 0) return;

    // Clear existing ruler markers
    timeline.querySelectorAll('.timeline-time-marker').forEach(marker => marker.remove());

    const timelineWidth = timeline.offsetWidth;
    const minSpacingPx = 60; // Minimum pixels between markers
    const maxMarkers = Math.floor(timelineWidth / minSpacingPx);
    let interval = 10; // Default interval

    // Calculate a nice interval (e.g., 1, 5, 10, 30, 60 seconds)
    const intervals = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    interval = intervals[intervals.length - 1]; // Start with largest
    for (let i = 0; i < intervals.length; i++) {
      if (duration / intervals[i] <= maxMarkers) {
        interval = intervals[i];
        break;
      }
    }
    // Ensure at least 2 markers if possible
    if (duration / interval < 2 && duration > 1) {
        interval = intervals.find(i => i < interval && duration / i >= 2) || interval;
    }


    for (let time = 0; time <= duration; time += interval) {
      const marker = document.createElement('div');
      marker.className = 'timeline-time-marker';
      const leftPercent = (time / duration) * 100;
      marker.style.left = `${leftPercent}%`;

      // Format time (e.g., MM:SS)
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      marker.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Avoid placing marker too close to the end if it overlaps
      if (leftPercent < 98) { // Adjust threshold as needed
          timeline.appendChild(marker);
      }
    }
  }

  // Draw ruler when video metadata is loaded OR when YT player is ready
  video.addEventListener('loadedmetadata', drawTimelineRuler);
  // We need a way to trigger redraw when YT player is ready. onPlayerReady can call it.
  // Let's modify onPlayerReady to call drawTimelineRuler
  const originalOnPlayerReady = window.onPlayerReady || function() {};
  window.onPlayerReady = function(event) {
    originalOnPlayerReady(event); // Call existing onReady logic
    drawTimelineRuler(); // Draw ruler for YT video
  };


  // Optional: Redraw ruler on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(drawTimelineRuler, 250); // Debounce resize event
  });


  // --- Timeline Intervals ---
  window._timelineTags = window._timelineTags || [];

  // Show a green dot at the start tag position when tagging is in progress
  window.showStartDotOnTimeline = function(startTime) {
    const timeline = document.getElementById('timeline');
    const duration = (window.ytPlayer && typeof window.ytPlayer.getDuration === 'function') ? window.ytPlayer.getDuration() : (window.plyrInstance ? window.plyrInstance.duration : video.duration);
    if (!timeline || !duration) return;
    // Remove any existing dot first
    window.removeStartDotFromTimeline();
    const dot = document.createElement('div');
    dot.className = 'timeline-start-dot';
    const left = (startTime / duration) * 100;
    dot.style.left = `${left}%`;
    dot.title = `Start Tag: ${startTime.toFixed(3)}s`;
    dot.id = 'timeline-start-dot';
    timeline.appendChild(dot);
  };
  window.removeStartDotFromTimeline = function() {
    const dot = document.getElementById('timeline-start-dot');
    if (dot) dot.remove();
  };

  function updateTimelineMarkers(tagList) {
    console.log('[timeline] updateTimelineMarkers called', tagList);
    const timeline = document.getElementById('timeline'); // Ensure timeline is defined
    const duration = (window.ytPlayer && typeof window.ytPlayer.getDuration === 'function') ? window.ytPlayer.getDuration() : (window.plyrInstance ? window.plyrInstance.duration : video.duration);

    // Clear only interval bars, not the ruler markers
    timeline.querySelectorAll('.timeline-interval, .timeline-start-dot, #timeline-context-menu').forEach(el => el.remove());
    timeline.style.display = 'block';
    if (!duration || !Array.isArray(tagList)) return;

    // Sort tags by start time
    const sortedTags = [...tagList].sort((a, b) => a.start - b.start);
    // Assign color index for each tag (cycle through 5 colors)
    sortedTags.forEach((tag, idx) => {
      // Validate tag times against current duration
      if (typeof tag.start !== 'number' || typeof tag.end !== 'number' || tag.start < 0 || tag.end > duration || tag.end < tag.start) {
          console.warn('Skipping invalid tag for timeline marker:', tag);
          return; // Skip invalid tags
      }
      let left = (tag.start / duration) * 100;
      let width = ((tag.end - tag.start) / duration) * 100;
      if (width < 0.5) width = 0.5; // Minimum visual width
      const colorIdx = idx % 5;
      const bar = document.createElement('div');
      bar.className = `timeline-interval timeline-interval-color-${colorIdx}`;
      bar.style.left = `${left}%`;
      bar.style.width = `${width}%`;
      bar.title = `${tag.start.toFixed(3)} - ${tag.end.toFixed(3)}\n${tag.label}`;
      bar.tabIndex = 0;
      bar.setAttribute('role', 'button');
      bar.setAttribute('aria-label', `Jump to ${tag.start.toFixed(3)}: ${tag.label}`);
      bar.dataset.tagIdx = idx.toString(); // Store original index if needed, though sorted index might be more useful here
      timeline.appendChild(bar);
    });

    // Click handler for context menu (overlapping tags)
    timeline.onclick = function(e) {
      // Prevent clicks on the markers themselves triggering this
      if (e.target.classList.contains('timeline-interval')) {
          const clickedTagStart = parseFloat(e.target.title.split(' ')[0]);
          if (!isNaN(clickedTagStart)) {
              if (window.ytPlayer) {
                  window.ytPlayer.seekTo(clickedTagStart, true);
              } else {
                  video.currentTime = clickedTagStart;
                  video.focus();
              }
          }
          return; // Don't show context menu if a bar was clicked directly
      }


      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const time = percent * duration;
      // Find all tags covering this time
      const overlapping = sortedTags.filter(tag => tag.start <= time && tag.end >= time);
      if (overlapping.length === 0) return;
      if (overlapping.length === 1) {
        // Jump to the single overlapping tag's start time
        if (window.ytPlayer) {
            window.ytPlayer.seekTo(overlapping[0].start, true);
        } else {
            video.currentTime = overlapping[0].start;
            video.focus();
        }
        return;
      }
      // Show context menu
      let menu = document.getElementById('timeline-context-menu');
      if (menu) menu.remove();
      menu = document.createElement('div');
      menu.id = 'timeline-context-menu';
      menu.style.left = `${x}px`;
      // Position menu relative to the timeline click, adjust if needed
      menu.style.top = `-${menu.offsetHeight + 5}px`; // Position above click point
      menu.style.transform = 'translateX(-50%)'; // Center menu horizontally


      overlapping.forEach((tag) => {
        const item = document.createElement('div');
        item.textContent = `${tag.label} (${tag.start.toFixed(2)}s)`;
        item.onclick = (ev) => {
          if (window.ytPlayer) {
              window.ytPlayer.seekTo(tag.start, true);
          } else {
              video.currentTime = tag.start;
              video.focus();
          }
          menu.remove();
          ev.stopPropagation();
        };
        menu.appendChild(item);
      });
      timeline.appendChild(menu); // Append to timeline for relative positioning
      // Adjust positioning after appending to calculate height correctly
      menu.style.top = `-${menu.offsetHeight + 5}px`;

      document.addEventListener('mousedown', function handler(ev) {
        if (!menu.contains(ev.target)) {
          menu.remove();
          document.removeEventListener('mousedown', handler);
        }
      }, { once: true }); // Use once option for cleaner removal
    };
  }
  window.updateTimelineMarkers = updateTimelineMarkers;

  // Keyboard Shortcuts (basic, see shortcut.js for more)
  // Need to update shortcut.js to handle YT player as well
  document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.isContentEditable) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (window.ytPlayer) {
        const state = window.ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) {
          window.ytPlayer.pauseVideo();
        } else {
          window.ytPlayer.playVideo();
        }
      } else if (window.plyrInstance) {
        // Use Plyr API for play/pause
        window.plyrInstance.togglePlay();
      } else {
        // Fallback to native video (shouldn't happen if Plyr loads)
        if (video.paused) video.play();
        else video.pause();
      }
    }
  });
}

// Make sure initVideo is called after the DOM is ready
// document.addEventListener('DOMContentLoaded', initVideo); // This is handled by main.js
