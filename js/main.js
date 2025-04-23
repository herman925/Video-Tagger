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
  // Get references to the new checkboxes
  const themeCheckboxHero = document.getElementById('theme-checkbox-hero');
  const themeCheckboxSidebar = document.getElementById('theme-checkbox-sidebar');
  const body = document.body;

  // Function to apply theme based on checkbox state
  function applyTheme(isDark) {
    if (isDark) {
      body.classList.add('dark-theme');
    } else {
      body.classList.remove('dark-theme');
    }
    // Sync both checkboxes
    if (themeCheckboxHero) themeCheckboxHero.checked = isDark;
    if (themeCheckboxSidebar) themeCheckboxSidebar.checked = isDark;
    // Save preference
    localStorage.setItem('theme', isDark ? 'dark' : 'light');
  }

  // Load saved theme preference
  const savedTheme = localStorage.getItem('theme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  let initialThemeIsDark = false;

  if (savedTheme === 'dark') {
    initialThemeIsDark = true;
  } else if (savedTheme === 'light') {
    initialThemeIsDark = false;
  } else {
    // If no saved theme, use system preference
    initialThemeIsDark = prefersDark;
  }

  // Apply the initial theme
  applyTheme(initialThemeIsDark);


  // Add event listeners to both checkboxes
  if (themeCheckboxHero) {
    themeCheckboxHero.addEventListener('change', (e) => {
      applyTheme(e.target.checked);
    });
  }
  if (themeCheckboxSidebar) {
    themeCheckboxSidebar.addEventListener('change', (e) => {
      applyTheme(e.target.checked);
    });
  }


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
