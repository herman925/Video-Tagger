// Main application logic, theme switching, initialization

let hasUnsavedChanges = false;
window.markDirty = () => { hasUnsavedChanges = true; };
window.markSaved = () => { hasUnsavedChanges = false; };
// Warn user if they attempt to close with unsaved changes
window.addEventListener('beforeunload', e => {
  if (!hasUnsavedChanges) return;
  const msg = 'You have unsaved changes. Press Cancel to return and click Save to preserve your tags, or press Leave to discard changes and close.';
  e.preventDefault();
  e.returnValue = msg;
  return msg;
});

document.addEventListener('DOMContentLoaded', () => {
  window.mediaMode = window.mediaMode || 'audio';
  window.currentVID = window.currentVID || '';
  if (typeof window.applyMediaMode === 'function') {
    window.applyMediaMode();
  }
  // Theme toggle logic using data-theme attribute
  const storageKey = 'theme-preference';
  function getColorPreference() {
    return localStorage.getItem(storageKey) || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
  }
  const theme = { value: getColorPreference() };
  function reflectPreference() {
    document.documentElement.setAttribute('data-theme', theme.value);
    document.body.classList.toggle('dark-theme', theme.value === 'dark');
    document.querySelector('#theme-toggle')?.setAttribute('aria-label', theme.value);
  }
  function setPreference() {
    localStorage.setItem(storageKey, theme.value);
    reflectPreference();
  }
  function onClick() {
    theme.value = theme.value === 'light' ? 'dark' : 'light';
    setPreference();
  }
  // set early so no page flash
  reflectPreference();
  window.onload = () => {
    reflectPreference();
    document.querySelector('#theme-toggle')?.addEventListener('click', onClick);
  };
  // sync with system changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ({matches:isDark}) => {
    theme.value = isDark ? 'dark' : 'light';
    setPreference();
  });

  // Initialize other components if they exist
  if (typeof initVideo === 'function') initVideo();
  if (typeof initTags === 'function') initTags();
  if (typeof initTagSummary === 'function') initTagSummary();
  if (typeof initExport === 'function') initExport();
  if (typeof initSaveLoad === 'function') initSaveLoad();
  if (typeof initShortcuts === 'function') initShortcuts();
  if (typeof initShortcutHelp === 'function') initShortcutHelp();

  // Initial setup for button states etc.
  const startTagBtn = document.getElementById('start-tag-btn');
  const endTagBtn = document.getElementById('end-tag-btn');
  const tagInput = document.getElementById('tag-input');
  const remarksInput = document.getElementById('tag-remarks-input');
  const languageCheckboxes = Array.from(document.querySelectorAll('.tag-language-checkbox'));
  const vidInput = document.getElementById('vid-input');
  const goHomeBtn = document.querySelector('[data-home-trigger]');

  if (startTagBtn) startTagBtn.disabled = true; // Disabled until video loaded
  if (endTagBtn) endTagBtn.disabled = true;
  if (tagInput) tagInput.disabled = true;
  if (remarksInput) remarksInput.disabled = true;
  languageCheckboxes.forEach(cb => { cb.disabled = true; });

  if (vidInput) {
    window.currentVID = vidInput.value.trim();
    vidInput.addEventListener('input', () => {
      window.currentVID = vidInput.value.trim();
      window.markDirty();
    });
  }

  languageCheckboxes.forEach(cb => {
    cb.addEventListener('change', () => {
      window.markDirty();
    });
  });

  if (remarksInput) {
    remarksInput.addEventListener('input', window.markDirty);
  }

  initAdminControls();

  // Tear down active players and reset media UI so a fresh source can load cleanly.
  function resetMediaState(reason) {
    const elements = (typeof getMediaElements === 'function') ? getMediaElements() : {};

    if (window._ytTimeInterval) {
      clearInterval(window._ytTimeInterval);
      window._ytTimeInterval = null;
    }

    if (window.ytPlayer) {
      try {
        if (typeof window.ytPlayer.destroy === 'function') {
          window.ytPlayer.destroy();
        } else if (typeof window.ytPlayer.stopVideo === 'function') {
          window.ytPlayer.stopVideo();
        }
      } catch (err) {
        console.warn('[main.js] Error tearing down YouTube player during reset', err);
      }
      window.ytPlayer = null;
    }

    if (window.plyrInstance) {
      try {
        window.plyrInstance.destroy();
      } catch (err) {
        console.warn('[main.js] Error destroying Plyr instance during reset', err);
      }
      window.plyrInstance = null;
    }

    if (window._currentObjectUrl) {
      try {
        URL.revokeObjectURL(window._currentObjectUrl);
      } catch (err) {
        console.warn('[main.js] Failed to revoke previous object URL during reset', err);
      }
      window._currentObjectUrl = null;
    }

    const videoEl = elements.video || document.getElementById('video');
    if (videoEl) {
      try { videoEl.pause(); } catch (err) { console.warn('[main.js] pause() failed during reset', err); }
      try { videoEl.currentTime = 0; } catch (err) { /* ignore */ }
      videoEl.oncanplay = null;
      const sourceEl = videoEl.querySelector('source');
      if (sourceEl) sourceEl.src = '';
      if (videoEl.getAttribute('src')) videoEl.removeAttribute('src');
      videoEl.load();
      videoEl.style.display = '';
    }

    if (elements.youtubeContainer) {
      elements.youtubeContainer.innerHTML = '';
      elements.youtubeContainer.hidden = true;
      elements.youtubeContainer.style.opacity = '';
      elements.youtubeContainer.style.pointerEvents = '';
      elements.youtubeContainer.style.display = '';
      elements.youtubeContainer.style.height = '';
    }
    if (elements.html5Wrapper) {
      elements.html5Wrapper.hidden = false;
    }

    if (elements.audioToggleBtn) {
      elements.audioToggleBtn.disabled = true;
      elements.audioToggleBtn.textContent = 'Play';
      elements.audioToggleBtn.setAttribute('aria-label', 'Play audio');
    }
    if (elements.audioStatus) {
      elements.audioStatus.textContent = '00:00 / 00:00';
    }
    if (elements.audioProgress) {
      elements.audioProgress.value = 0;
      elements.audioProgress.max = 0;
    }

    if (typeof updateAudioControls === 'function') {
      updateAudioControls();
    }
    if (typeof logPlayerLayout === 'function') {
      logPlayerLayout(`resetMediaState:${reason}`);
    }
  }

  // Clear tag data and disable tagging controls for a new session.
  function clearTaggingSession(reason) {
    window._timelineTags = [];
    if (typeof window.renderTagList === 'function') window.renderTagList();
    if (typeof window.updateTimelineMarkers === 'function') window.updateTimelineMarkers([]);
    if (typeof window.updateTagSummary === 'function') window.updateTagSummary();
    if (typeof window.removeStartDotFromTimeline === 'function') window.removeStartDotFromTimeline();

    if (startTagBtn) {
      startTagBtn.disabled = true;
      startTagBtn.textContent = 'Mark Start';
    }
    if (endTagBtn) endTagBtn.disabled = true;
    if (tagInput) {
      tagInput.value = '';
      tagInput.disabled = true;
    }
    if (remarksInput) {
      remarksInput.value = '';
      remarksInput.disabled = true;
    }
    languageCheckboxes.forEach(cb => {
      cb.checked = false;
      cb.disabled = true;
    });

    if (typeof CustomEvent === 'function') {
      document.dispatchEvent(new CustomEvent('video-tagger:session-cleared', { detail: { reason } }));
    }
  }

  document.addEventListener('video-tagger:clear-session-request', (event) => {
    clearTaggingSession(event?.detail?.reason || 'external-request');
    window.markDirty();
  });

  if (goHomeBtn) {
    goHomeBtn.addEventListener('click', () => {
      const videoLoader = document.getElementById('video-loader') || document.getElementById('video-hero');
      const videoPlayer = document.getElementById('video-player');
      const controlsRow = document.getElementById('controls-tag-row');
      const timelineLabel = document.querySelector('.timeline-label');
      const timeline = document.getElementById('timeline');
      const timelineContainer = document.getElementById('timeline-container');
      const sidebar = document.getElementById('sidebar');
      const noVideoMsg = document.getElementById('no-video-message');
      const youtubeInput = document.getElementById('youtube-url');

      if (videoLoader) videoLoader.style.display = 'flex';
      if (videoPlayer) videoPlayer.style.display = 'none';
      if (controlsRow) controlsRow.style.display = 'none';
      if (timelineLabel) timelineLabel.style.display = 'none';
      if (timeline) timeline.style.display = 'none';
      if (timelineContainer) timelineContainer.style.display = 'none';
      if (sidebar) sidebar.style.display = 'none';

      resetMediaState('home');
      clearTaggingSession('home');

      if (vidInput) {
        vidInput.value = '';
        window.currentVID = '';
      }
      if (youtubeInput) {
        youtubeInput.value = '';
      }
      if (noVideoMsg) {
        noVideoMsg.style.display = '';
      }

      window.pendingYouTubeLoad = null;
      window.currentVideoSource = '';
      if (typeof window.applyMediaMode === 'function') {
        window.applyMediaMode();
      }
      if (typeof window.markSaved === 'function') {
        window.markSaved();
      }
    });
  }

  // Add listener to enable buttons when video is ready
  const video = document.getElementById('video');
  if (video) {
    video.addEventListener('loadedmetadata', () => {
      if (startTagBtn) startTagBtn.disabled = false;
      if (tagInput) tagInput.disabled = false;
      if (remarksInput) remarksInput.disabled = false;
      languageCheckboxes.forEach(cb => { cb.disabled = false; });
      // End button remains disabled until start is clicked
    });
     video.addEventListener('emptied', () => {
        // Reset buttons if video source is removed/changed
        if (startTagBtn) startTagBtn.disabled = true;
        if (endTagBtn) endTagBtn.disabled = true;
        if (tagInput) tagInput.disabled = true;
        if (remarksInput) remarksInput.disabled = true;
        languageCheckboxes.forEach(cb => {
          cb.checked = false;
          cb.disabled = true;
        });
        if (startTagBtn) startTagBtn.textContent = 'Mark Start'; // Reset text
        // Clear tags and timeline? Might be needed depending on desired UX
        // window._timelineTags = [];
        // if(window.updateTimelineMarkers) window.updateTimelineMarkers([]);
        // if(window.updateTagSummary) window.updateTagSummary();
        // renderTagList(); // Assuming renderTagList is accessible or part of initTags
    });
  }

  function initAdminControls() {
    const adminBtn = document.getElementById('admin-btn');
    const modal = document.getElementById('admin-modal');
    if (!adminBtn || !modal) return;

    const passwordSection = document.getElementById('admin-password-section');
    const passwordInput = document.getElementById('admin-password-input');
    const authBtn = document.getElementById('admin-auth-btn');
    const errorEl = document.getElementById('admin-error');
    const toggleSection = document.getElementById('admin-toggle-section');
    const mediaToggle = document.getElementById('media-mode-toggle');
    const closeButtons = modal.querySelectorAll('[data-admin-close]');

    let isUnlocked = false;

    function closeModal() {
      modal.hidden = true;
      if (!isUnlocked && passwordInput) passwordInput.value = '';
      if (errorEl) errorEl.textContent = '';
    }

    function openModal() {
      modal.hidden = false;
      if (!isUnlocked) {
        toggleSection.hidden = true;
        passwordSection.hidden = false;
        if (passwordInput) {
          passwordInput.value = '';
          passwordInput.focus();
        }
        mediaToggle.checked = window.mediaMode === 'video';
        mediaToggle.disabled = true;
      } else {
        toggleSection.hidden = false;
        passwordSection.hidden = true;
        mediaToggle.checked = window.mediaMode === 'video';
        mediaToggle.focus();
        mediaToggle.disabled = false;
      }
    }

    adminBtn.addEventListener('click', openModal);
    closeButtons.forEach(btn => btn.addEventListener('click', closeModal));

    modal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeModal();
      }
    });

    authBtn.addEventListener('click', () => {
      if (!passwordInput) return;
      if (passwordInput.value === 'ks2.0') {
        isUnlocked = true;
        passwordSection.hidden = true;
        toggleSection.hidden = false;
        errorEl.textContent = '';
        mediaToggle.checked = window.mediaMode === 'video';
        mediaToggle.focus();
        mediaToggle.disabled = false;
      } else {
        errorEl.textContent = 'Incorrect password.';
        passwordInput.focus();
        passwordInput.select();
      }
    });

    mediaToggle.addEventListener('change', () => {
      if (!isUnlocked) {
        errorEl.textContent = 'Enter the admin password first.';
        mediaToggle.checked = window.mediaMode === 'video';
        return;
      }
      window.mediaMode = mediaToggle.checked ? 'video' : 'audio';
      if (typeof window.applyMediaMode === 'function') {
        window.applyMediaMode();
      }
    });
  }
});
