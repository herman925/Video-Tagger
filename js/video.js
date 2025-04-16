// Video controls and timeline logic (interval tag support, minimalist controls, jump-to-time only)
function initVideo() {
  const videoLoader = document.getElementById('video-loader');
  const videoPlayer = document.getElementById('video-player');
  const controls = document.getElementById('controls');
  const timeline = document.getElementById('timeline');
  const video = document.getElementById('video');
  const loadLocalBtn = document.getElementById('load-local-btn');
  const localVideoInput = document.getElementById('local-video-input');
  const loadYoutubeBtn = document.getElementById('load-youtube-btn');
  const youtubeUrlInput = document.getElementById('youtube-url');
  const noVideoMsg = document.getElementById('no-video-message');
  const jumpTimeInput = document.getElementById('jump-time-input');
  const jumpTimeBtn = document.getElementById('jump-time-btn');

  // Helper: Show/hide loader and player sections
  function showLoader() {
    videoLoader.style.display = 'block';
    videoPlayer.style.display = 'none';
    controls.style.display = 'none';
    timeline.style.display = 'none';
    // Remove any YouTube embed if present
    const yt = document.getElementById('youtube-embed');
    if (yt) yt.remove();
  }
  function showPlayer() {
    videoLoader.style.display = 'none';
    videoPlayer.style.display = 'block';
    controls.style.display = 'flex';
    timeline.style.display = 'block';
  }

  // Local video loading
  loadLocalBtn.addEventListener('click', () => {
    localVideoInput.value = '';
    localVideoInput.click();
  });
  localVideoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    video.querySelector('source').src = url;
    video.load();
    showPlayer();
    noVideoMsg.style.display = 'none';
    window.currentVideoSource = file.name;
  });

  // YouTube video loading (basic placeholder)
  loadYoutubeBtn.addEventListener('click', () => {
    const ytUrl = youtubeUrlInput.value.trim();
    if (!ytUrl) {
      alert('Please enter a YouTube URL.');
      return;
    }
    // Extract YouTube video ID
    const match = ytUrl.match(/(?:v=|youtu.be\/|embed\/)([\w-]{11})/);
    const videoId = match ? match[1] : null;
    if (!videoId) {
      alert('Invalid YouTube URL.');
      return;
    }
    // Remove local video if any
    video.pause();
    video.querySelector('source').src = '';
    video.load();
    // Remove previous embed if any
    const oldEmbed = document.getElementById('youtube-embed');
    if (oldEmbed) oldEmbed.remove();
    // Create iframe
    const iframe = document.createElement('iframe');
    iframe.id = 'youtube-embed';
    iframe.width = '100%';
    iframe.height = '400';
    iframe.src = `https://www.youtube.com/embed/${videoId}?enablejsapi=1`;
    iframe.frameBorder = '0';
    iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
    iframe.allowFullscreen = true;
    videoPlayer.innerHTML = '';
    videoPlayer.appendChild(iframe);
    showPlayer();
    noVideoMsg.style.display = 'none';
    controls.style.display = 'flex';
    window.currentVideoSource = ytUrl;
  });

  // Go button logic only
  jumpTimeBtn.addEventListener('click', jumpToTime);
  jumpTimeInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') jumpToTime();
  });
  function jumpToTime() {
    const inputVal = jumpTimeInput.value.trim();
    if (!inputVal) return;
    // Accept HH:MM:SS.mmm, MM:SS.mmm, SS.mmm, or seconds
    let time = 0;
    const parts = inputVal.split(':');
    if (parts.length === 3) {
      // HH:MM:SS.mmm
      time = parseFloat(parts[0]) * 3600 + parseFloat(parts[1]) * 60 + parseFloat(parts[2]);
    } else if (parts.length === 2) {
      // MM:SS.mmm
      time = parseFloat(parts[0]) * 60 + parseFloat(parts[1]);
    } else {
      time = parseFloat(parts[0]);
    }
    if (!isNaN(time) && video.duration && time >= 0 && time <= video.duration) {
      video.currentTime = time;
      video.focus();
    }
  }

  // --- Timeline Intervals ---
  window._timelineTags = window._timelineTags || [];
  function updateTimelineMarkers(tagList) {
    timeline.innerHTML = '';
    if (!video.duration || !Array.isArray(tagList)) return;
    tagList.forEach(tag => {
      if (typeof tag.start !== 'number' || typeof tag.end !== 'number' || tag.start < 0 || tag.end > video.duration || tag.end < tag.start) return;
      // Create a bar for the interval, min width for same start/end
      let left = (tag.start / video.duration) * 100;
      let width = ((tag.end - tag.start) / video.duration) * 100;
      if (width < 0.5) width = 0.5; // minimum width in percent for visibility
      const bar = document.createElement('div');
      bar.className = 'timeline-interval';
      bar.style.position = 'absolute';
      bar.style.left = `${left}%`;
      bar.style.width = `${width}%`;
      bar.style.top = '6px';
      bar.style.height = '16px';
      bar.style.background = '#5b9fff';
      bar.style.borderRadius = '6px';
      bar.style.opacity = '0.7';
      bar.title = `${tag.start.toFixed(3)} - ${tag.end.toFixed(3)}\n${tag.label}`;
      bar.tabIndex = 0;
      bar.setAttribute('role', 'button');
      bar.setAttribute('aria-label', `Jump to ${tag.start.toFixed(3)}: ${tag.label}`);
      bar.addEventListener('click', () => {
        if (videoPlayer.contains(video)) {
          video.currentTime = tag.start;
          video.focus();
        }
      });
      timeline.appendChild(bar);
    });
  }
  window.updateTimelineMarkers = updateTimelineMarkers;

  // Keyboard Shortcuts (basic, see shortcut.js for more)
  document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.isContentEditable) return;
    if (e.key === ' ') {
      e.preventDefault();
      if (video.paused) video.play();
      else video.pause();
    }
  });
}
