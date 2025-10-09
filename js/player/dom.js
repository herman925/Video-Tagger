(function registerPlayerDomHelpers(global) {
  if (!global) return;

  const root = global.VideoTagger = global.VideoTagger || {};
  const player = root.player = root.player || {};
  const constants = player.constants = player.constants || {};
  const state = player.state = player.state || {};

  function getMediaElements() {
    return {
      player: document.getElementById('video-player'),
      placeholder: document.getElementById('audio-only-placeholder'),
      audioControlBar: document.getElementById('audio-control-bar'),
      mediaContent: document.getElementById('media-content'),
    html5Wrapper: document.getElementById('html5-wrapper'),
    youtubePlaceholder: document.getElementById('youtube-placeholder'),
    youtubeContainer: document.getElementById('youtube-container'),
    video: document.getElementById('video'),
    audioToggleBtn: document.getElementById('audio-toggle-btn'),
    audioStatus: document.getElementById('audio-status'),
    audioProgress: document.getElementById('audio-progress'),
    audioVolume: document.getElementById('audio-volume'),
    audioBanner: document.getElementById('audio-mode-banner'),
    timeline: document.getElementById('timeline'),
    controlsColumn: document.getElementById('controls-column')
  };
}

  function describeElementForLog(element, options = {}, depth = 0) {
    if (!element) return null;
    const {
      includeChildren = false,
      maxDepth = 1
    } = options;
    try {
      const rect = element.getBoundingClientRect ? element.getBoundingClientRect() : null;
      const computed = global.getComputedStyle ? global.getComputedStyle(element) : null;
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
        duration: Number.isFinite(video.duration) ? video.duration : null,
        currentTime: Number.isFinite(video.currentTime) ? video.currentTime : null,
        playbackRate: Number.isFinite(video.playbackRate) ? video.playbackRate : null,
        volume: Number.isFinite(video.volume) ? video.volume : null,
        muted: video.muted,
        seeking: video.seeking,
        buffered: serializeTimeRanges(video.buffered),
        played: serializeTimeRanges(video.played),
        seekable: serializeTimeRanges(video.seekable)
      },
      tracks: {
        audio: video.audioTracks ? video.audioTracks.length : null,
        video: video.videoTracks ? video.videoTracks.length : null,
        text: video.textTracks ? video.textTracks.length : null
      },
      element: describeElementForLog(video, { includeChildren: true, maxDepth: 1 })
    };
    return diagnostics;
  }

  function safeYouTubeCall(playerInstance, method, ...args) {
    if (!playerInstance || typeof playerInstance[method] !== 'function') return undefined;
    try {
      return playerInstance[method](...args);
    } catch (err) {
      console.warn('[video.js] safeYouTubeCall failed', { method, err });
      return undefined;
    }
  }

  function collectYouTubeDiagnostics(elements) {
    const container = elements.youtubeContainer;
    const placeholder = elements.youtubePlaceholder;
    const iframe = container?.querySelector('iframe') || null;
    const ytPlayer = global.ytPlayer || null;
    if (!container && !ytPlayer && !placeholder) return null;
    const diag = {
      container: describeElementForLog(container, { includeChildren: true, maxDepth: 2 }),
      placeholder: describeElementForLog(placeholder),
      iframe: describeElementForLog(iframe),
      playerState: ytPlayer && global.YT && global.YT.PlayerState
        ? Object.entries(global.YT.PlayerState).reduce((acc, [key, value]) => {
            if (value === ytPlayer.getPlayerState?.()) acc.current = key;
            acc[key] = value;
            return acc;
          }, { current: null })
        : null,
      currentTime: safeYouTubeCall(ytPlayer, 'getCurrentTime'),
      duration: safeYouTubeCall(ytPlayer, 'getDuration'),
      videoData: safeYouTubeCall(ytPlayer, 'getVideoData'),
      videoUrl: safeYouTubeCall(ytPlayer, 'getVideoUrl'),
      volume: safeYouTubeCall(ytPlayer, 'getVolume'),
      muted: safeYouTubeCall(ytPlayer, 'isMuted'),
      playbackRate: safeYouTubeCall(ytPlayer, 'getPlaybackRate'),
      availablePlaybackRates: safeYouTubeCall(ytPlayer, 'getAvailablePlaybackRates'),
      videoLoadedFraction: safeYouTubeCall(ytPlayer, 'getVideoLoadedFraction'),
      playlist: safeYouTubeCall(ytPlayer, 'getPlaylist'),
      playlistIndex: safeYouTubeCall(ytPlayer, 'getPlaylistIndex'),
      iframeState: iframe ? {
        src: iframe.src,
        readyState: iframe.readyState || null,
        width: iframe.width,
        height: iframe.height
      } : null
    };
    return diag;
  }

  function collectPlyrDiagnostics() {
    const plyr = global.plyrInstance || null;
    if (!plyr) return null;
    const diag = {
      summary: {
        supported: !!plyr.supported,
        browser: plyr.browser || null,
        configured: plyr.configured || null,
        playing: plyr.playing,
        paused: plyr.paused,
        stopped: plyr.stopped,
        ended: plyr.ended,
        duration: Number.isFinite(plyr.duration) ? plyr.duration : null,
        currentTime: Number.isFinite(plyr.currentTime) ? plyr.currentTime : null,
        muted: plyr.muted,
        volume: plyr.volume
      },
      fullscreen: {
        enabled: !!plyr.fullscreen,
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

  function logPlayerLayout(context) {
    try {
      const elements = getMediaElements();
      const summary = {
        context,
        mediaMode: global.mediaMode,
        hasYouTubePlayer: !!global.ytPlayer,
        hasPlyrInstance: !!global.plyrInstance,
        pendingYouTubeLoad: global.pendingYouTubeLoad || null,
        currentVideoSource: global.currentVideoSource || null,
        ytPolling: !!global._ytTimeInterval,
        lastAudioControlSnapshot: state.lastAudioControlSnapshot
      };
      const diagnostics = {
        summary,
        elements: {
          player: describeElementForLog(elements.player, { includeChildren: true, maxDepth: 2 }),
          mediaContent: describeElementForLog(elements.mediaContent, { includeChildren: true, maxDepth: 2 }),
          placeholder: describeElementForLog(elements.placeholder),
          audioControlBar: describeElementForLog(elements.audioControlBar, { includeChildren: true, maxDepth: 2 }),
          html5Wrapper: describeElementForLog(elements.html5Wrapper, { includeChildren: true, maxDepth: 2 }),
          youtubePlaceholder: describeElementForLog(elements.youtubePlaceholder),
          youtubeContainer: describeElementForLog(elements.youtubeContainer, { includeChildren: true, maxDepth: 2 }),
          controlsColumn: describeElementForLog(elements.controlsColumn, { includeChildren: true, maxDepth: 2 }),
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

  player.getMediaElements = getMediaElements;
  global.getMediaElements = getMediaElements;
  player.describeElementForLog = describeElementForLog;
  player.logPlayerLayout = logPlayerLayout;
  player.safeYouTubeCall = safeYouTubeCall;
  player.snapshotDataset = snapshotDataset;
  player.serializeTimeRanges = serializeTimeRanges;
  player.collectAudioControlDiagnostics = collectAudioControlDiagnostics;

  global.logPlayerLayout = logPlayerLayout;
})(typeof window !== 'undefined' ? window : undefined);
