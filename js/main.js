// App entry point and event wiring
// Handles initial setup, loading video, wiring up UI events

window.addEventListener('DOMContentLoaded', () => {
  // Video elements
  const video = document.getElementById('video');
  const playBtn = document.getElementById('play-btn');
  const pauseBtn = document.getElementById('pause-btn');
  const seekBar = document.getElementById('seek-bar');
  const currentTimeLabel = document.getElementById('current-time');
  const durationLabel = document.getElementById('duration');
  
  // --- Play/Pause Button Logic ---
  playBtn.addEventListener('click', () => video.play());
  pauseBtn.addEventListener('click', () => video.pause());

  // --- Time Label Update ---
  function formatTime(seconds) {
    if (isNaN(seconds) || seconds == null) return '00:00:00.000';
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    const ms = String(Math.floor((seconds % 1) * 1000)).padStart(3, '0');
    return `${h}:${m}:${s}.${ms}`;
  }
  function updateTimeLabels() {
    currentTimeLabel.textContent = formatTime(video.currentTime);
    durationLabel.textContent = formatTime(video.duration);
  }
  video.addEventListener('timeupdate', updateTimeLabels);
  video.addEventListener('loadedmetadata', updateTimeLabels);
  seekBar.addEventListener('input', () => {
    if (video.duration) {
      video.currentTime = (seekBar.value / 100) * video.duration;
    }
  });

  // --- Save/Load Logic ---
  const saveBtn = document.getElementById('save-btn');
  const loadBtn = document.getElementById('load-btn');
  saveBtn.addEventListener('click', () => {
    const tags = window._timelineTags || [];
    const videoSource = window.currentVideoSource || '';
    const session = { videoSource, tags };
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
  });
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
          alert('Session loaded! Please manually reload the video if needed.');
        } catch (err) {
          alert('Failed to load session: ' + err.message);
        }
      };
      reader.readAsText(file);
    });
    input.click();
  });

  // --- Keyboard Shortcuts ---
  document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.isContentEditable) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (video.paused) video.play();
      else video.pause();
    }
  });

  // (Re-)initialize other modules as needed
  if (typeof initVideo === 'function') initVideo();
  if (typeof initTags === 'function') initTags();
  if (typeof initShortcuts === 'function') initShortcuts();
});
