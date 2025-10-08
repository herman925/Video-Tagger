(function registerTimelineHelpers(global) {
  if (!global) return;

  const root = global.VideoTagger = global.VideoTagger || {};
  const player = root.player = root.player || {};

  function getActiveDuration(videoEl) {
    if (global.ytPlayer && typeof global.ytPlayer.getDuration === 'function') {
      return global.ytPlayer.getDuration();
    }
    if (global.plyrInstance && Number.isFinite(global.plyrInstance.duration)) {
      return global.plyrInstance.duration;
    }
    if (videoEl && Number.isFinite(videoEl.duration)) {
      return videoEl.duration;
    }
    return 0;
  }

  function drawTimelineRuler() {
    const { timeline, video } = player.getMediaElements();
    const duration = getActiveDuration(video);
    if (!timeline || !duration || duration <= 0) return;

    timeline.querySelectorAll('.timeline-time-marker').forEach(marker => marker.remove());

    const timelineWidth = timeline.offsetWidth;
    const minSpacingPx = 60;
    const maxMarkers = Math.floor(timelineWidth / minSpacingPx);
    const intervals = [1, 2, 5, 10, 15, 30, 60, 120, 300, 600];
    let interval = intervals[intervals.length - 1];
    for (let i = 0; i < intervals.length; i += 1) {
      if (duration / intervals[i] <= maxMarkers) {
        interval = intervals[i];
        break;
      }
    }
    if (duration / interval < 2 && duration > 1) {
      interval = intervals.find(i => i < interval && duration / i >= 2) || interval;
    }

    for (let time = 0; time <= duration; time += interval) {
      const marker = document.createElement('div');
      marker.className = 'timeline-time-marker';
      const leftPercent = (time / duration) * 100;
      marker.style.left = `${leftPercent}%`;

      const minutes = Math.floor(time / 60);
      const seconds = Math.floor(time % 60);
      marker.textContent = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;

      if (leftPercent < 98) {
        timeline.appendChild(marker);
      }
    }
  }

  function updateTimelineMarkers(tagList) {
    const { timeline, video } = player.getMediaElements();
    if (!timeline) return;
    timeline.querySelectorAll('.timeline-interval, .timeline-start-dot, #timeline-context-menu').forEach(el => el.remove());
    timeline.style.display = 'block';

    const duration = getActiveDuration(video);
    if (!duration || !Array.isArray(tagList)) return;

    const sortedTags = [...tagList].sort((a, b) => a.start - b.start);
    sortedTags.forEach((tag, idx) => {
      if (typeof tag.start !== 'number' || typeof tag.end !== 'number' || tag.start < 0 || tag.end > duration || tag.end < tag.start) {
        console.warn('Skipping invalid tag for timeline marker:', tag);
        return;
      }
      let left = (tag.start / duration) * 100;
      let width = ((tag.end - tag.start) / duration) * 100;
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

    timeline.onclick = (event) => {
      if (event.target.classList.contains('timeline-interval')) {
        const clickedTagStart = parseFloat(event.target.title.split(' ')[0]);
        if (!Number.isNaN(clickedTagStart)) {
          if (global.ytPlayer) {
            global.ytPlayer.seekTo(clickedTagStart, true);
          } else if (video) {
            video.currentTime = clickedTagStart;
            video.focus();
          }
        }
        return;
      }

      const rect = timeline.getBoundingClientRect();
      const x = event.clientX - rect.left;
      const percent = x / rect.width;
      const time = percent * duration;
      const overlapping = sortedTags.filter(tag => tag.start <= time && tag.end >= time);
      if (overlapping.length === 0) return;
      if (overlapping.length === 1) {
        const targetTag = overlapping[0];
        if (global.ytPlayer) {
          global.ytPlayer.seekTo(targetTag.start, true);
        } else if (video) {
          video.currentTime = targetTag.start;
          video.focus();
        }
        return;
      }

      let menu = document.getElementById('timeline-context-menu');
      if (menu) menu.remove();
      menu = document.createElement('div');
      menu.id = 'timeline-context-menu';
      menu.style.left = `${x}px`;
      menu.style.transform = 'translateX(-50%)';

      overlapping.forEach(tag => {
        const item = document.createElement('div');
        item.textContent = `${tag.label} (${tag.start.toFixed(2)}s)`;
        item.onclick = (ev) => {
          if (global.ytPlayer) {
            global.ytPlayer.seekTo(tag.start, true);
          } else if (video) {
            video.currentTime = tag.start;
            video.focus();
          }
          menu.remove();
          ev.stopPropagation();
        };
        menu.appendChild(item);
      });
      timeline.appendChild(menu);
      menu.style.top = `-${menu.offsetHeight + 5}px`;

      document.addEventListener('mousedown', function handler(ev) {
        if (!menu.contains(ev.target)) {
          menu.remove();
          document.removeEventListener('mousedown', handler);
        }
      }, { once: true });
    };
  }

  function showStartDotOnTimeline(startTime) {
    const { timeline, video } = player.getMediaElements();
    const duration = getActiveDuration(video);
    if (!timeline || !duration) return;
    removeStartDotFromTimeline();
    const dot = document.createElement('div');
    dot.className = 'timeline-start-dot';
    const left = (startTime / duration) * 100;
    dot.style.left = `${left}%`;
    dot.title = `Start Tag: ${startTime.toFixed(3)}s`;
    dot.id = 'timeline-start-dot';
    timeline.appendChild(dot);
  }

  function removeStartDotFromTimeline() {
    const dot = document.getElementById('timeline-start-dot');
    if (dot) dot.remove();
  }

  player.drawTimelineRuler = drawTimelineRuler;
  player.updateTimelineMarkers = updateTimelineMarkers;
  player.showStartDotOnTimeline = showStartDotOnTimeline;
  player.removeStartDotFromTimeline = removeStartDotFromTimeline;

  global.drawTimelineRuler = drawTimelineRuler;
  global.updateTimelineMarkers = updateTimelineMarkers;
  global.showStartDotOnTimeline = showStartDotOnTimeline;
  global.removeStartDotFromTimeline = removeStartDotFromTimeline;
})(typeof window !== 'undefined' ? window : undefined);
