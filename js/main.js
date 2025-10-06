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

  if (startTagBtn) startTagBtn.disabled = true; // Disabled until video loaded
  if (endTagBtn) endTagBtn.disabled = true;
  if (tagInput) tagInput.disabled = true;

  // Add listener to enable buttons when video is ready
  const video = document.getElementById('video');
  if (video) {
    video.addEventListener('loadedmetadata', () => {
      if (startTagBtn) startTagBtn.disabled = false;
      if (tagInput) tagInput.disabled = false;
      // End button remains disabled until start is clicked
    });
     video.addEventListener('emptied', () => {
        // Reset buttons if video source is removed/changed
        if (startTagBtn) startTagBtn.disabled = true;
        if (endTagBtn) endTagBtn.disabled = true;
        if (tagInput) tagInput.disabled = true;
        if (startTagBtn) startTagBtn.textContent = 'Mark Start'; // Reset text
        // Clear tags and timeline? Might be needed depending on desired UX
        // window._timelineTags = [];
        // if(window.updateTimelineMarkers) window.updateTimelineMarkers([]);
        // if(window.updateTagSummary) window.updateTagSummary();
        // renderTagList(); // Assuming renderTagList is accessible or part of initTags
    });
  }

});
