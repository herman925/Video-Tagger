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
  function showPlayer() {
    videoLoader.style.display = 'none';
    videoPlayer.style.display = 'block';
    controls.style.display = 'block';
    timeline.style.display = 'block';
  }

  // Local video loading
  loadLocalBtn.addEventListener('click', () => {
    localVideoInput.value = ''; // Clear previous selection
    localVideoInput.click();
  });
  localVideoInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    video.querySelector('source').src = url;
    video.load();
    if (window.showApp) window.showApp(); // Call global showApp from index.html
    else showPlayer(); // Fallback if showApp isn't global
    noVideoMsg.style.display = 'none';
    window.currentVideoSource = file.name;
  });

  // YouTube video loading
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
    if (window.showApp) window.showApp(); // Call global showApp from index.html
    else showPlayer(); // Fallback if showApp isn't global
    noVideoMsg.style.display = 'none';
    controls.style.display = 'block'; // Ensure controls are shown for YouTube too
    window.currentVideoSource = ytUrl;
  });

  // Go button logic only
  if (jumpTimeBtn) jumpTimeBtn.addEventListener('click', jumpToTime);
  if (jumpTimeInput) jumpTimeInput.addEventListener('keydown', (e) => {
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

  // --- Timeline Ruler ---
  function drawTimelineRuler() {
    const timeline = document.getElementById('timeline');
    const video = document.getElementById('video');
    if (!timeline || !video || !video.duration || video.duration <= 0) return;

    // Clear existing ruler markers
    timeline.querySelectorAll('.timeline-time-marker').forEach(marker => marker.remove());

    const duration = video.duration;
    const timelineWidth = timeline.offsetWidth;
    const minSpacingPx = 60; // Minimum pixels between markers
    const maxMarkers = Math.floor(timelineWidth / minSpacingPx);
    let interval = 10; // Default interval

    // Calculate a nice interval (e.g., 1, 5, 10, 30, 60 seconds)
    const intervals = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    interval = intervals[intervals.length - 1]; // Start with largest
    for (let i = 0; i < intervals.length; i++) {
      if (duration / intervals[i] <= maxMarkers) {
        interval = intervals[i];
        break;
      }
    }
    // Ensure at least 2 markers if possible
    if (duration / interval < 2 && duration > 1) {
        interval = intervals.find(i => i < interval && duration / i >= 2) || interval;
    }


    for (let time = 0; time <= duration; time += interval) {
      const marker = document.createElement('div');
      marker.className = 'timeline-time-marker';
      const leftPercent = (time / duration) * 100;
      marker.style.left = `${leftPercent}%`;

      // Format time (e.g., MM:SS)
      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      marker.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      // Avoid placing marker too close to the end if it overlaps
      if (leftPercent < 98) { // Adjust threshold as needed
          timeline.appendChild(marker);
      }
    }
  }

  // Draw ruler when video metadata is loaded
  video.addEventListener('loadedmetadata', drawTimelineRuler);
  // Optional: Redraw ruler on resize
  let resizeTimeout;
  window.addEventListener('resize', () => {
      clearTimeout(resizeTimeout);
      resizeTimeout = setTimeout(drawTimelineRuler, 250); // Debounce resize event
  });


  // --- Timeline Intervals ---
  window._timelineTags = window._timelineTags || [];

  // Show a green dot at the start tag position when tagging is in progress
  window.showStartDotOnTimeline = function(startTime) {
    const timeline = document.getElementById('timeline');
    const video = document.getElementById('video');
    if (!timeline || !video || !video.duration) return;
    // Remove any existing dot first
    window.removeStartDotFromTimeline();
    const dot = document.createElement('div');
    dot.className = 'timeline-start-dot';
    const left = (startTime / video.duration) * 100;
    dot.style.left = `${left}%`;
    dot.title = `Start Tag: ${startTime.toFixed(3)}s`;
    dot.id = 'timeline-start-dot';
    timeline.appendChild(dot);
  };
  window.removeStartDotFromTimeline = function() {
    const dot = document.getElementById('timeline-start-dot');
    if (dot) dot.remove();
  };

  function updateTimelineMarkers(tagList) {
    console.log('[timeline] updateTimelineMarkers called', tagList);
    // Clear only interval bars, not the ruler markers
    timeline.querySelectorAll('.timeline-interval, .timeline-start-dot, #timeline-context-menu').forEach(el => el.remove());
    timeline.style.display = 'block';
    if (!video.duration || !Array.isArray(tagList)) return;

    // Sort tags by start time
    const sortedTags = [...tagList].sort((a, b) => a.start - b.start);
    // Assign color index for each tag (cycle through 5 colors)
    sortedTags.forEach((tag, idx) => {
      if (typeof tag.start !== 'number' || typeof tag.end !== 'number' || tag.start < 0 || tag.end > video.duration || tag.end < tag.start) return;
      let left = (tag.start / video.duration) * 100;
      let width = ((tag.end - tag.start) / video.duration) * 100;
      if (width < 0.5) width = 0.5;
      const colorIdx = idx % 5;
      const bar = document.createElement('div');
      bar.className = `timeline-interval timeline-interval-color-${colorIdx}`;
      bar.style.left = `${left}%`;
      bar.style.width = `${width}%`;
      bar.title = `${tag.start.toFixed(3)} - ${tag.end.toFixed(3)}\n${tag.label}`;
      bar.tabIndex = 0;
      bar.setAttribute('role', 'button');
      bar.setAttribute('aria-label', `Jump to ${tag.start.toFixed(3)}: ${tag.label}`);
      bar.dataset.tagIdx = idx.toString();
      timeline.appendChild(bar);
    });

    // Click handler for context menu (overlapping tags)
    timeline.onclick = function(e) {
      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const time = percent * video.duration;
      // Find all tags covering this time
      const overlapping = sortedTags.filter(tag => tag.start <= time && tag.end >= time);
      if (overlapping.length === 0) return;
      if (overlapping.length === 1) {
        video.currentTime = overlapping[0].start;
        video.focus();
        return;
      }
      // Show context menu
      let menu = document.getElementById('timeline-context-menu');
      if (menu) menu.remove();
      menu = document.createElement('div');
      menu.id = 'timeline-context-menu';
      menu.style.left = `${x}px`;
      menu.style.top = `${e.clientY - rect.top}px`;
      overlapping.forEach((tag) => {
        const item = document.createElement('div');
        item.textContent = `${tag.label} (${tag.start.toFixed(2)}s)`;
        item.onclick = (ev) => {
          video.currentTime = tag.start;
          video.focus();
          menu.remove();
          ev.stopPropagation();
        };
        menu.appendChild(item);
      });
      timeline.appendChild(menu);
      document.addEventListener('mousedown', function handler(ev) {
        if (!menu.contains(ev.target)) {
          menu.remove();
          document.removeEventListener('mousedown', handler);
        }
      });
    };
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
