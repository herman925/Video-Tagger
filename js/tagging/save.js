// Save tagging session to JSON
function initSaveLoad() {
  const saveBtn = document.getElementById('save-btn');
  if (!saveBtn) return;
  saveBtn.addEventListener('click', () => {
    const tags = window._timelineTags || [];
    const videoSource = window.currentVideoSource || '';
    const vid = (window.currentVID || '').trim();

    if (!vid) {
      alert('VID is required before saving the session.');
      return;
    }

    const processedTags = (tags || []).slice().map(tag => {
      const languages = Array.isArray(tag.languages) ? tag.languages.filter(Boolean) : [];
      return {
        start: tag.start,
        end: tag.end,
        label: tag.label || '9999',
        languages: languages.slice(),
        remarks: tag.remarks || ''
      };
    });

    const session = {
      videoSource,
      vid,
      tags: processedTags
    };
    const json = JSON.stringify(session, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video_tag_session.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.markSaved();
  });

  // Load functionality
  const loadBtn = document.getElementById('load-btn');
  if (!loadBtn) return;
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
            languages: Array.isArray(tag.languages) ? tag.languages.filter(l => window.LANGUAGE_OPTIONS.includes(l)) : [],
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
