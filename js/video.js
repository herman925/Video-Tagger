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
    controls.style.display = 'block';
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

  // --- Timeline Intervals ---
  window._timelineTags = window._timelineTags || [];
  function updateTimelineMarkers(tagList) {
  console.log('[timeline] updateTimelineMarkers called', tagList);
    timeline.innerHTML = '';
  timeline.style.display = 'block'; // DEBUG: always show timeline
    if (!video.duration || !Array.isArray(tagList)) return;

    // Sort tags by start time
    const sortedTags = [...tagList].sort((a, b) => a.start - b.start);
  console.log('[timeline] sortedTags', sortedTags);
    // Track for each row (0-4) the latest end time
    const rowEndTimes = [0, 0, 0, 0, 0];
    const tagRows = [];

    // Assign row to each tag
    sortedTags.forEach(tag => {
      let assignedRow = 0;
      for (let row = 0; row < 5; row++) {
        if (rowEndTimes[row] <= tag.start) {
          assignedRow = row;
          rowEndTimes[row] = tag.end;
          break;
        }
        if (row === 4) {
          // All rows overlap, just put in last row
          assignedRow = 4;
          rowEndTimes[4] = Math.max(rowEndTimes[4], tag.end);
        }
      }
      tagRows.push({ tag, row: assignedRow });
    console.log(`[timeline] assigned tag '${tag.label}' [${tag.start}, ${tag.end}] to row ${assignedRow}`);
    });

    // Render bars
    console.log('[timeline] tagRows', tagRows);
tagRows.forEach(({ tag, row }, idx) => {
      if (typeof tag.start !== 'number' || typeof tag.end !== 'number' || tag.start < 0 || tag.end > video.duration || tag.end < tag.start) return;
      let left = (tag.start / video.duration) * 100;
      let width = ((tag.end - tag.start) / video.duration) * 100;
      if (width < 0.5) width = 0.5;
      const bar = document.createElement('div');
      bar.className = `timeline-interval timeline-interval-row-${row} timeline-interval-color-${row}`;
      bar.style.left = `${left}%`;
      bar.style.width = `${width}%`;
      bar.title = `${tag.start.toFixed(3)} - ${tag.end.toFixed(3)}\n${tag.label}`;
      bar.tabIndex = 0;
      bar.setAttribute('role', 'button');
      bar.setAttribute('aria-label', `Jump to ${tag.start.toFixed(3)}: ${tag.label}`);
      bar.dataset.tagIdx = idx.toString();
      timeline.appendChild(bar);
    console.log(`[timeline] rendered bar for tag '${tag.label}' [${tag.start}, ${tag.end}] on row ${row}`);
    });

    // Click handler for context menu
    timeline.onclick = function(e) {
      // Get click position as percent
      const rect = timeline.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const percent = x / rect.width;
      const time = percent * video.duration;
      // Find all tags covering this time
      const overlapping = tagRows.filter(({ tag }) => tag.start <= time && tag.end >= time);
      if (overlapping.length === 0) return;
      if (overlapping.length === 1) {
        // Jump directly
        video.currentTime = overlapping[0].tag.start;
        video.focus();
        return;
      }
      // Show context menu
      let menu = document.getElementById('timeline-context-menu');
      if (menu) menu.remove();
      menu = document.createElement('div');
      menu.id = 'timeline-context-menu';
      menu.style.position = 'absolute';
      menu.style.left = `${x}px`;
      menu.style.top = `${e.clientY - rect.top}px`;
      menu.style.background = '#fff';
      menu.style.border = '1px solid #bbb';
      menu.style.borderRadius = '6px';
      menu.style.boxShadow = '0 2px 8px rgba(0,0,0,0.13)';
      menu.style.zIndex = 1000;
      menu.style.padding = '6px 0';
      menu.style.minWidth = '120px';
      overlapping.forEach(({ tag }) => {
        const item = document.createElement('div');
        item.textContent = `${tag.label} (${tag.start.toFixed(2)}s)`;
        item.style.padding = '6px 18px';
        item.style.cursor = 'pointer';
        item.onmouseenter = () => item.style.background = '#eaf2fb';
        item.onmouseleave = () => item.style.background = '';
        item.onclick = (ev) => {
          video.currentTime = tag.start;
          video.focus();
          menu.remove();
          ev.stopPropagation();
        };
        menu.appendChild(item);
      });
      timeline.appendChild(menu);
      // Remove menu on outside click
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
