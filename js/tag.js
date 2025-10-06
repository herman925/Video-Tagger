// Tagging logic, tag list management with start/stop intervals
function initTags() {
  window._timelineTags = window._timelineTags || [];
  let tagInProgress = null; // { start: number }
  const tagInput = document.getElementById('tag-input');
  const startTagBtn = document.getElementById('start-tag-btn');
  const endTagBtn = document.getElementById('end-tag-btn');
  const tagListBody = document.getElementById('tag-list-body');
  const video = document.getElementById('video'); // HTML5 video

  // Helper to get current time from the active player
  function getCurrentTime() {
    if (window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function') {
      return window.ytPlayer.getCurrentTime();
    } else if (video) {
      return video.currentTime;
    } else {
      return 0; // Fallback
    }
  }

  // Helper to seek the active player
  function seekPlayer(time) {
    if (window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
      window.ytPlayer.seekTo(time, true);
    } else if (video) {
      video.currentTime = time;
      video.focus(); // Keep focus for HTML5
    }
  }

  // Render tag list table (sorted by start time)
  function renderTagList() {
    tagListBody.innerHTML = '';
    const sortedTags = [...window._timelineTags].sort((a, b) => a.start - b.start);
    sortedTags.forEach((tag, i) => {
      const row = document.createElement('tr');
      // Start cell
      const startCell = document.createElement('td');
      startCell.textContent = formatTime(tag.start, true);
      startCell.style.cursor = 'pointer';
      startCell.addEventListener('click', () => {
        seekPlayer(tag.start); // Use helper
      });
      row.appendChild(startCell);
      // End cell
      const endCell = document.createElement('td');
      endCell.textContent = formatTime(tag.end, true);
      endCell.style.cursor = 'pointer';
      endCell.addEventListener('click', () => {
        seekPlayer(tag.end); // Use helper
      });
      row.appendChild(endCell);
      // Tag cell (editable, with chip)
      const tagCell = document.createElement('td');
      const colorIdx = i % 5;
      const chip = document.createElement('span');
      chip.className = `tag-chip timeline-interval-color-${colorIdx}`;
      chip.textContent = tag.label;
      tagCell.appendChild(chip);
      tagCell.contentEditable = true;

      // Helper to save tag edit
      function saveTagEdit() {
        const newLabel = tagCell.textContent.trim() || '9999';
        const idx = window._timelineTags.findIndex(t => t === tag);
        if (idx !== -1) {
          window._timelineTags[idx].label = newLabel;
        }
        // Restore chip after editing
        tagCell.innerHTML = '';
        chip.textContent = newLabel; // Use the potentially updated label
        tagCell.appendChild(chip);
        window.updateTimelineMarkers(window._timelineTags);
        window.updateTagSummary();
        window.markDirty();
      }
      tagCell.addEventListener('focus', () => {
        // Temporarily remove chip and show raw text for editing
        tagCell.textContent = tag.label === '9999' ? '' : tag.label;
      });
      tagCell.addEventListener('blur', saveTagEdit);
      tagCell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          tagCell.blur();
        }
      });
      row.appendChild(tagCell);
      // Actions cell
      const actionsCell = document.createElement('td');
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.className = 'tag-delete-btn';
      delBtn.title = 'Delete tag';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation(); // Prevent row click handler
        const idx = window._timelineTags.findIndex(t => t === tag);
        if (idx !== -1) {
          window._timelineTags.splice(idx, 1);
        }
        renderTagList();
        window.updateTimelineMarkers(window._timelineTags);
        window.updateTagSummary();
        window.markDirty();
      });
      actionsCell.appendChild(delBtn);
      row.appendChild(actionsCell);
      tagListBody.appendChild(row);
    });
  }
  window.renderTagList = renderTagList; // Expose for load.js

  // Start Tag (records start time)
  startTagBtn.addEventListener('click', () => {
    const currentTime = getCurrentTime(); // Use helper
    // Check if player is ready (duration exists for HTML5, or YT player exists)
    const isReady = (video && video.duration) || window.ytPlayer;
    if (!isReady) return;

    tagInProgress = { start: currentTime };
    startTagBtn.disabled = true;
    endTagBtn.disabled = false;
    tagInput.disabled = true;
    startTagBtn.textContent = 'Tagging...';
    // Show green dot on timeline
    if (typeof window.showStartDotOnTimeline === 'function') {
      window.showStartDotOnTimeline(tagInProgress.start);
    }
  });

  // End Tag (records end time and label)
  endTagBtn.addEventListener('click', () => {
    console.log('[tag] endTagBtn click, tagInProgress:', tagInProgress, 'label:', tagInput.value.trim());
    if (!tagInProgress) return;
    const currentTime = getCurrentTime(); // Use helper
    console.log('[tag] currentTime:', currentTime);

    let label = tagInput.value.trim();
    if (!label) label = '9999';
    const end = currentTime;
    // Basic validation: end time should be after start time
    if (end < tagInProgress.start) {
        console.warn('[tag] End time is before start time. Ignoring tag.');
        alert('Error: End time cannot be before start time.');
        // Reset tagging state without saving
        tagInProgress = null;
        startTagBtn.disabled = false;
        endTagBtn.disabled = true;
        tagInput.disabled = false;
        startTagBtn.textContent = 'Mark Start';
        if (typeof window.removeStartDotFromTimeline === 'function') {
          window.removeStartDotFromTimeline();
        }
        return;
    }

    window._timelineTags.push({ start: tagInProgress.start, end, label });
    console.log('[tag] pushed tag:', { start: tagInProgress.start, end, label }, 'window._timelineTags:', window._timelineTags);
    tagInProgress = null;
    tagInput.value = '';
    startTagBtn.disabled = false;
    endTagBtn.disabled = true;
    tagInput.disabled = false;
    startTagBtn.textContent = 'Mark Start';
    renderTagList();
    window.updateTimelineMarkers(window._timelineTags);
    window.updateTagSummary();
    window.markDirty();
    // Remove green dot
    if (typeof window.removeStartDotFromTimeline === 'function') {
      window.removeStartDotFromTimeline();
    }
  });

  // Utility for time formatting (sync with video.js)
  function formatTime(seconds, showMs = false) {
    // Handle potential NaN or undefined input
    if (isNaN(seconds) || seconds === null || seconds === undefined) {
        return '00:00:00' + (showMs ? '.000' : '');
    }
    const totalSeconds = Math.max(0, seconds); // Ensure non-negative
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
    if (showMs) {
      const ms = String(Math.floor((totalSeconds % 1) * 1000)).padStart(3, '0');
      return `${h}:${m}:${s}.${ms}`;
    } else {
      return `${h}:${m}:${s}`;
    }
  }

  // Initial render
  renderTagList();
  // window.updateTagSummary(); // main.js calls this
}
