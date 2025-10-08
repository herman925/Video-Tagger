(function registerAudioControls(global) {
  if (!global) return;

  const root = global.VideoTagger = global.VideoTagger || {};
  const player = root.player = root.player || {};
  const constants = player.constants = player.constants || {};
  const state = player.state = player.state || {};

  const MEDIA_MODE = constants.MEDIA_MODE || { AUDIO: 'audio', VIDEO: 'video' };
  const CONTROL_LOG_DELTA = constants.CONTROL_LOG_DELTA ?? 0.75;

  function formatMediaTime(seconds) {
    if (!Number.isFinite(seconds) || seconds < 0) return '00:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }

  function updateAudioControls(trigger = 'auto') {
    const {
      video,
      audioToggleBtn,
      audioStatus,
      audioProgress,
      audioControlBar
    } = player.getMediaElements();
    if (!audioToggleBtn || !audioStatus) {
      console.warn('[video.js] updateAudioControls missing controls', {
        trigger,
        hasToggle: !!audioToggleBtn,
        hasStatus: !!audioStatus
      });
      return;
    }
    if (audioControlBar) {
      audioControlBar.hidden = false;
      audioControlBar.removeAttribute('hidden');
      audioControlBar.style.visibility = 'visible';
      audioControlBar.style.opacity = '1';
      audioControlBar.style.display = 'flex';
    }

    const sourceType = global.ytPlayer
      ? 'youtube'
      : (global.plyrInstance ? 'plyr' : (video ? 'html5' : 'none'));

    const ytPlayer = global.ytPlayer || null;
    const ytFunctionsAvailable = ytPlayer
      && typeof global.ytPlayer.getPlayerState === 'function'
      && typeof global.ytPlayer.getCurrentTime === 'function';
    const ytDurationAvailable = ytPlayer
      && typeof global.ytPlayer.getDuration === 'function';
    const isYouTube = !!ytPlayer;

    const hasSource = isYouTube
      ? !!ytPlayer
      : !!(video && (video.currentSrc || video.src));

    audioToggleBtn.disabled = !hasSource;

    if (!hasSource || (!video && !isYouTube)) {
      const details = {
        trigger,
        sourceType,
        ytPlayerAvailable: !!global.ytPlayer,
        ytReadyState: global.ytPlayer ? player.safeYouTubeCall(global.ytPlayer, 'getPlayerState') : null,
        html5HasVideo: !!video,
        html5CurrentSrc: video?.currentSrc || null,
        plyrActive: !!global.plyrInstance,
        note: 'Audio controls disabled because no playable media source is available.'
      };
      audioToggleBtn.textContent = 'Play';
      audioToggleBtn.setAttribute('aria-label', 'Play audio');
      audioStatus.textContent = '00:00 / 00:00';
      if (audioProgress) {
        if (!audioProgress.dataset.scrubbing) audioProgress.dataset.scrubbing = 'false';
        audioProgress.value = 0;
        audioProgress.max = 0;
      }
      if (!hasSource) {
        console.debug('[video.js] updateAudioControls skipped: no media source', details);
        if (trigger !== 'auto') {
          player.logPlayerLayout(`updateAudioControls:noSource:${trigger}`);
        }
      }
      state.lastAudioControlSnapshot = null;
      return;
    }

    let isPlaying = false;
    let current = 0;
    let rawDuration = 0;

    if (isYouTube) {
      const playerState = ytFunctionsAvailable && global.ytPlayer.getPlayerState
        ? global.ytPlayer.getPlayerState()
        : undefined;
      const ytStates = (typeof global.YT !== 'undefined' && global.YT.PlayerState) ? global.YT.PlayerState : null;
      const playingValue = ytStates?.PLAYING ?? 1;
      if (typeof playerState === 'number') {
        isPlaying = playerState === playingValue;
      } else if (playerState && typeof playerState === 'object' && 'label' in playerState) {
        isPlaying = playerState.label === 'playing';
      }

      if (ytFunctionsAvailable && typeof global.ytPlayer.getCurrentTime === 'function') {
        current = global.ytPlayer.getCurrentTime();
      }
      if (ytDurationAvailable) {
        rawDuration = global.ytPlayer.getDuration();
      }
    } else if (global.plyrInstance) {
      isPlaying = !global.plyrInstance.paused;
      current = Number.isFinite(global.plyrInstance.currentTime)
        ? global.plyrInstance.currentTime
        : (video?.currentTime || 0);
      rawDuration = Number.isFinite(global.plyrInstance.duration)
        ? global.plyrInstance.duration
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
      !state.lastAudioControlSnapshot
      || state.lastAudioControlSnapshot.sourceType !== snapshot.sourceType
      || state.lastAudioControlSnapshot.isPlaying !== snapshot.isPlaying
      || state.lastAudioControlSnapshot.disabled !== snapshot.disabled
      || Math.abs((state.lastAudioControlSnapshot.duration || 0) - snapshot.duration) > CONTROL_LOG_DELTA
      || Math.abs((state.lastAudioControlSnapshot.current || 0) - snapshot.current) > (isPlaying ? CONTROL_LOG_DELTA * 4 : CONTROL_LOG_DELTA)
    ) {
      console.debug('[video.js] controls:update', snapshot);
      state.lastAudioControlSnapshot = { ...snapshot };
    } else {
      state.lastAudioControlSnapshot = { ...state.lastAudioControlSnapshot, ...snapshot };
    }
  }

  function applyMediaMode() {
    const { player: playerRoot, placeholder, youtubeContainer, audioControlBar } = player.getMediaElements();
    if (!playerRoot) return;
    const mode = global.mediaMode === MEDIA_MODE.VIDEO ? MEDIA_MODE.VIDEO : MEDIA_MODE.AUDIO;
    playerRoot.classList.remove('audio-mode', 'video-mode');
    playerRoot.classList.add(`${mode}-mode`);

    if (placeholder) {
      placeholder.setAttribute('aria-hidden', mode === MEDIA_MODE.VIDEO ? 'true' : 'false');
      const hasSource = global.ytPlayer
        || (global.plyrInstance && global.plyrInstance.media?.currentSrc)
        || document.getElementById('video')?.currentSrc;
      placeholder.textContent = mode === MEDIA_MODE.AUDIO && hasSource ? 'Audio playback active' : 'No Video';
    }

    if (audioControlBar) {
      audioControlBar.hidden = mode !== MEDIA_MODE.AUDIO;
      if (mode === MEDIA_MODE.AUDIO) {
        audioControlBar.removeAttribute('hidden');
        audioControlBar.style.display = 'flex';
        audioControlBar.style.visibility = 'visible';
        audioControlBar.style.opacity = '1';
      }
    }

    if (global.plyrInstance && global.plyrInstance.elements?.container) {
      global.plyrInstance.elements.container.classList.toggle('plyr--audio-mode', mode === MEDIA_MODE.AUDIO);
    }

    if (youtubeContainer && global.ytPlayer) {
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

    player.logPlayerLayout(`applyMediaMode:${mode}`);
  }

  player.formatMediaTime = formatMediaTime;
  player.updateAudioControls = updateAudioControls;
  player.applyMediaMode = applyMediaMode;

  global.updateAudioControls = updateAudioControls;
  global.applyMediaMode = applyMediaMode;
})(typeof window !== 'undefined' ? window : undefined);
