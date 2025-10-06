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

  if (goHomeBtn) {
    goHomeBtn.addEventListener('click', () => {
      const videoLoader = document.getElementById('video-loader') || document.getElementById('video-hero');
      const videoPlayer = document.getElementById('video-player');
      const controlsRow = document.getElementById('controls-tag-row');
      const timelineLabel = document.querySelector('.timeline-label');
      const timeline = document.getElementById('timeline');
      const sidebar = document.getElementById('sidebar');

      if (videoLoader) videoLoader.style.display = 'flex';
      if (videoPlayer) videoPlayer.style.display = 'none';
      if (controlsRow) controlsRow.style.display = 'none';
      if (timelineLabel) timelineLabel.style.display = 'none';
      if (timeline) timeline.style.display = 'none';
      if (sidebar) sidebar.style.display = 'none';

      if (window.plyrInstance) {
        window.plyrInstance.pause();
      }
      const videoEl = document.getElementById('video');
      if (videoEl) {
        videoEl.pause();
        videoEl.currentTime = 0;
      }
      if (window.ytPlayer && typeof window.ytPlayer.stopVideo === 'function') {
        window.ytPlayer.stopVideo();
      }
      window.currentVideoSource = '';
      window.mediaMode = 'audio';
      if (typeof window.applyMediaMode === 'function') {
        window.applyMediaMode();
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
