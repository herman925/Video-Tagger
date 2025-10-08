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
          window._timelineTags = data.tags.map(tag => ({
            start: typeof tag.start === 'number' ? tag.start : 0,
            end: typeof tag.end === 'number' ? tag.end : 0,
            label: tag.label || '9999',
            languages: Array.isArray(tag.languages) ? tag.languages.filter(l => LANGUAGE_OPTIONS.includes(l)) : [],
            remarks: tag.remarks || ''
          }));
          window.currentVideoSource = data.videoSource || '';
          window.currentVID = (data.vid || '').trim();
          const vidInput = document.getElementById('vid-input');
          if (vidInput) vidInput.value = window.currentVID;
          if (typeof window.renderTagList === 'function') window.renderTagList();
          if (typeof window.updateTimelineMarkers === 'function') window.updateTimelineMarkers(window._timelineTags);
          if (typeof window.updateTagSummary === 'function') window.updateTagSummary();
          window.markSaved();
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
