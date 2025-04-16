// Load tagging session from JSON
function initLoad() {
  const loadBtn = document.getElementById('load-btn');
  loadBtn.addEventListener('click', () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function(evt) {
        try {
          const data = JSON.parse(evt.target.result);
          if (!data.tags || !Array.isArray(data.tags)) throw new Error('Invalid session file.');
          window._timelineTags = data.tags;
          window.currentVideoSource = data.videoSource || '';
          if (typeof window.updateTagSummary === 'function') window.updateTagSummary();
          if (typeof window.updateTimelineMarkers === 'function') window.updateTimelineMarkers(window._timelineTags);
          if (typeof window.initTags === 'function') window.initTags();
          alert('Session loaded!');
        } catch (err) {
          alert('Failed to load session: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });
}
document.addEventListener('DOMContentLoaded', initLoad);
