// Video controls and timeline logic (interval tag support, minimalist controls, jump-to-time only)
window.ytPlayer = null; // Global reference for YouTube player instance
window.plyrInstance = null; // Global reference for Plyr instance

const MEDIA_MODE = {
  AUDIO: 'audio',
  VIDEO: 'video'
};

window.mediaMode = window.mediaMode || MEDIA_MODE.AUDIO; // Default to audio-only until admin enables video

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
    audioProgress: document.getElementById('audio-progress')
  };
}

function formatMediaTime(seconds) {
  if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
  const minutes = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function updateAudioControls() {
  const { video, audioToggleBtn, audioStatus, audioProgress } = getMediaElements();
  if (!audioToggleBtn || !audioStatus) return;

  // Detect source: HTML5/Plyr or YouTube (guard function existence)
  const isYouTube = !!window.ytPlayer
    && typeof window.ytPlayer.getDuration === 'function'
    && typeof window.ytPlayer.getCurrentTime === 'function'
    && typeof window.ytPlayer.getPlayerState === 'function';
  const hasSource = isYouTube
    ? typeof window.ytPlayer.getDuration === 'function' && window.ytPlayer.getDuration() > 0
    : !!(video && (video.currentSrc || video.src));
  audioToggleBtn.disabled = !hasSource;

  if (!hasSource || (!video && !isYouTube)) {
    audioToggleBtn.textContent = 'Play';
    audioToggleBtn.setAttribute('aria-label', 'Play audio');
    audioStatus.textContent = '00:00 / 00:00';
    return;
  }

  const isPlaying = isYouTube
    ? (window.ytPlayer.getPlayerState() === YT.PlayerState.PLAYING)
    : (!video.paused && !video.ended);
  audioToggleBtn.textContent = isPlaying ? 'Pause' : 'Play';
  audioToggleBtn.setAttribute('aria-label', isPlaying ? 'Pause audio' : 'Play audio');

  const current = isYouTube
    ? window.ytPlayer.getCurrentTime()
    : (video.currentTime || 0);
  const duration = isYouTube
    ? window.ytPlayer.getDuration()
    : (Number.isFinite(video.duration) && video.duration > 0
        ? video.duration
        : (window.plyrInstance && Number.isFinite(window.plyrInstance.duration) ? window.plyrInstance.duration : 0));
  audioStatus.textContent = `${formatMediaTime(current)} / ${formatMediaTime(duration || 0)}`;

  // Progress bar sync
  if (audioProgress) {
    const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : 0;
    if (audioProgress.max != safeDuration) audioProgress.max = safeDuration;
    if (!audioProgress.matches(':active')) {
      // Only update UI if the user isn't actively dragging
      audioProgress.value = Math.min(Math.max(current, 0), safeDuration);
    }
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
};

function onYouTubeIframeAPIReady() {
  if (window.pendingYouTubeLoad) {
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

  window.ytPlayer = new YT.Player('youtube-embed', {
    height: '400', // Adjust as needed
    width: '100%',
    videoId: videoId,
    playerVars: {
      'playsinline': 1, // Important for mobile playback
      'origin': (window.location && window.location.origin) ? window.location.origin : undefined
    },
    events: {
      'onReady': onPlayerReady,
      'onStateChange': onPlayerStateChange // Optional: handle state changes
    }
  });

  if (typeof window.applyMediaMode === 'function') {
    window.applyMediaMode();
  }
  // Start polling current time while in audio mode (YT doesn't emit timeupdate)
  if (window._ytTimeInterval) { clearInterval(window._ytTimeInterval); window._ytTimeInterval = null; }
  window._ytTimeInterval = setInterval(() => {
    if (!window.ytPlayer) return;
    updateAudioControls();
  }, 200);
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
}

function onPlayerStateChange(event) {
  // Optional: Handle player state changes (playing, paused, ended, etc.)
  // For example, you might want to update UI elements based on the state.
  // console.log("YouTube Player State:", event.data);
  updateAudioControls();
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
  }

  if (audioToggleBtn) {
    audioToggleBtn.addEventListener('click', () => {
      // YouTube
      if (window.ytPlayer && window.ytPlayer.getPlayerState) {
        const state = window.ytPlayer.getPlayerState();
        if (state === YT.PlayerState.PLAYING) window.ytPlayer.pauseVideo();
        else window.ytPlayer.playVideo();
        return;
      }
      // Plyr/HTML5
      if (window.plyrInstance && typeof window.plyrInstance.play === 'function') {
        if (window.plyrInstance.paused) window.plyrInstance.play();
        else window.plyrInstance.pause();
      } else if (video.currentSrc && (video.paused || video.ended)) {
        video.play();
      } else if (video.currentSrc) {
        video.pause();
      }
    });

    if (video) {
      ['play', 'pause', 'timeupdate', 'loadedmetadata', 'ended', 'emptied'].forEach(eventName => {
        video.addEventListener(eventName, updateAudioControls);
      });
    }

    updateAudioControls();
  }

  // Audio progress drag/seek
  if (audioProgress) {
    let isScrubbing = false;
    const commitSeek = (val) => {
      if (!Number.isFinite(val)) return;
      const target = Math.max(0, Math.min(val, Number(audioProgress.max) || 0));
      if (window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
        window.ytPlayer.seekTo(target, true);
      } else if (window.plyrInstance) {
        window.plyrInstance.currentTime = target;
      } else if (video) {
        video.currentTime = target;
      }
    };
    audioProgress.addEventListener('input', () => {
      isScrubbing = true;
      // Update status while dragging
      const val = parseFloat(audioProgress.value);
      const dur = Number(audioProgress.max) || 0;
      const { audioStatus } = getMediaElements();
      if (audioStatus) audioStatus.textContent = `${formatMediaTime(val)} / ${formatMediaTime(dur)}`;
    });
    audioProgress.addEventListener('change', () => {
      commitSeek(parseFloat(audioProgress.value));
      isScrubbing = false;
    });
    // If user stops interacting, next timeupdate will take over UI updates
  }

  // Local video loading
  loadLocalBtn.addEventListener('click', () => {
    localVideoInput.value = ''; // Clear previous selection
    localVideoInput.click();
  });
  localVideoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // If a YouTube player exists, destroy it
    if (window.ytPlayer) {
      window.ytPlayer.destroy();
      window.ytPlayer = null;
      if (window._ytTimeInterval) { clearInterval(window._ytTimeInterval); window._ytTimeInterval = null; }
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

    const url = URL.createObjectURL(file);
    const sourceEl = video.querySelector('source');
    if (sourceEl) {
      sourceEl.src = url;
    } else {
      video.src = url;
    }
    video.load(); // Important: load the new source
    console.log('[video.js] Local video source set and load() called.');

    updateAudioControls();

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
                // Ensure Plyr controls are visible after initialization
                console.log('[video.js] Calling showPlayer() after Plyr initialization.');
                showPlayer();
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
    // Extract YouTube video ID
    const match = ytUrl.match(/(?:v=|youtu.be\/|embed\/)([\w-]{11})/);
    const videoId = match ? match[1] : null;
    if (!videoId) {
      alert('Invalid YouTube URL.');
      return;
    }

    // Destroy Plyr instance if it exists
    if (window.plyrInstance) {
        window.plyrInstance.destroy();
        window.plyrInstance = null;
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

    updateAudioControls();

    // Force video mode so iframe is visible
    window.mediaMode = MEDIA_MODE.VIDEO;
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

    if (window.ytPlayer) {
      // Use YouTube API
      window.ytPlayer.seekTo(time, true); // true allows seeking ahead
      // Focus might need adjustment for iframe
    } else if (window.plyrInstance) {
      // Use Plyr API
      window.plyrInstance.currentTime = time;
      window.plyrInstance.play(); // Ensure video plays if it was paused
    } else if (video.duration && time <= video.duration) {
      // Use HTML5 video API
      video.currentTime = time;
      video.focus();
    }
  }

  // --- Timeline Ruler ---
  function drawTimelineRuler() {
    const timeline = document.getElementById('timeline');
    // Use YT player duration if available, otherwise HTML5 video
    const duration = window.ytPlayer ? window.ytPlayer.getDuration() : (window.plyrInstance ? window.plyrInstance.duration : video.duration);

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
    const duration = window.ytPlayer ? window.ytPlayer.getDuration() : (window.plyrInstance ? window.plyrInstance.duration : video.duration);
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
    const duration = window.ytPlayer ? window.ytPlayer.getDuration() : (window.plyrInstance ? window.plyrInstance.duration : video.duration);

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
