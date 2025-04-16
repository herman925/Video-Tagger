// Tagging logic, tag list management with start/stop intervals
function initTags() {
  window._timelineTags = window._timelineTags || [];
  let tagInProgress = null; // { start: number }
  const tagInput = document.getElementById('tag-input');
  const startTagBtn = document.getElementById('start-tag-btn');
  const endTagBtn = document.getElementById('end-tag-btn');
  const tagListBody = document.getElementById('tag-list-body');
  const video = document.getElementById('video');

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
        video.currentTime = tag.start;
        video.focus();
      });
      row.appendChild(startCell);
      // End cell
      const endCell = document.createElement('td');
      endCell.textContent = formatTime(tag.end, true);
      endCell.style.cursor = 'pointer';
      endCell.addEventListener('click', () => {
        video.currentTime = tag.end;
        video.focus();
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
        const idx = window._timelineTags.findIndex(t => t === tag);
        if (idx !== -1) {
          window._timelineTags[idx].label = tagCell.textContent.trim() || '9999';
        }
        // Restore chip after editing
        tagCell.innerHTML = '';
        chip.textContent = window._timelineTags[idx] ? window._timelineTags[idx].label : tag.label;
        tagCell.appendChild(chip);
        window.updateTimelineMarkers(window._timelineTags);
        window.updateTagSummary();
      }
      tagCell.addEventListener('focus', () => {
        tagCell.textContent = tag.label;
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
      delBtn.addEventListener('click', () => {
        const idx = window._timelineTags.findIndex(t => t === tag);
        if (idx !== -1) {
          window._timelineTags.splice(idx, 1);
        }
        renderTagList();
        window.updateTimelineMarkers(window._timelineTags);
        window.updateTagSummary();
      });
      actionsCell.appendChild(delBtn);
      row.appendChild(actionsCell);
      tagListBody.appendChild(row);
    });
  }

  // Start Tag (records start time)
  startTagBtn.addEventListener('click', () => {
    if (!video.duration) return;
    tagInProgress = { start: video.currentTime };
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
    console.log('[tag] endTagBtn click, tagInProgress:', tagInProgress, 'label:', tagInput.value.trim(), 'video.currentTime:', video.currentTime);
    if (!tagInProgress) return;
    let label = tagInput.value.trim();
    if (!label) label = '9999';
    const end = video.currentTime;
    window._timelineTags.push({ start: tagInProgress.start, end, label });
    console.log('[tag] pushed tag:', { start: tagInProgress.start, end, label }, 'window._timelineTags:', window._timelineTags);
    tagInProgress = null;
    tagInput.value = '';
    startTagBtn.disabled = false;
    endTagBtn.disabled = true;
    tagInput.disabled = false;
    startTagBtn.textContent = 'Start Tag';
    renderTagList();
    window.updateTimelineMarkers(window._timelineTags);
    window.updateTagSummary();
    // Remove green dot
    if (typeof window.removeStartDotFromTimeline === 'function') {
      window.removeStartDotFromTimeline();
    }
  });

  // Utility for time formatting (sync with video.js)
  function formatTime(seconds, showMs = false) {
    const h = String(Math.floor(seconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((seconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(seconds % 60)).padStart(2, '0');
    if (showMs) {
      const ms = String(Math.floor((seconds % 1) * 1000)).padStart(3, '0');
      return `${h}:${m}:${s}.${ms}`;
    } else {
      return `${h}:${m}:${s}`;
    }
  }

  // Initial render
  renderTagList();
  window.updateTagSummary();
}
