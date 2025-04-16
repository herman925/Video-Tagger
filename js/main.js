// App entry point and event wiring
// Handles initial setup, loading video, wiring up UI events

window.addEventListener('DOMContentLoaded', () => {
  // Init video, tags, summary, shortcuts
  initVideo();
  initTags();
  // initTagSummary(); // Removed: summary handled by updateTagSummary in tagsummary.js
  initShortcuts();
});
