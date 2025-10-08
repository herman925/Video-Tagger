// Tagging logic, tag list management with start/stop intervals

function initTags() {
  window._timelineTags = window._timelineTags || [];
  let tagInProgress = null; // { start: number }

  const tagInput = document.getElementById('tag-input');
  const startTagBtn = document.getElementById('start-tag-btn');
  const endTagBtn = document.getElementById('end-tag-btn');
  const tagListBody = document.getElementById('tag-list-body');
  const remarksInput = document.getElementById('tag-remarks-input');
  const languageCheckboxes = Array.from(document.querySelectorAll('.tag-language-checkbox'));
  const video = document.getElementById('video'); // HTML5 video

  if (!tagInput || !startTagBtn || !endTagBtn || !tagListBody) {
    return;
  }

  document.addEventListener('video-tagger:session-cleared', () => {
    tagInProgress = null;
  });

  function getCurrentTime() {
    if (window.ytPlayer && typeof window.ytPlayer.getCurrentTime === 'function') {
      return window.ytPlayer.getCurrentTime();
    } else if (video) {
      return video.currentTime;
    }
    return 0;
  }

  function seekPlayer(time) {
    if (window.ytPlayer && typeof window.ytPlayer.seekTo === 'function') {
      window.ytPlayer.seekTo(time, true);
    } else if (video) {
      video.currentTime = time;
      video.focus();
    }
  }

  function formatTime(seconds, showMs = false) {
    if (isNaN(seconds) || seconds === null || seconds === undefined) {
      return '00:00:00' + (showMs ? '.000' : '');
    }
    const totalSeconds = Math.max(0, seconds);
    const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0');
    const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0');
    const s = String(Math.floor(totalSeconds % 60)).padStart(2, '0');
    if (showMs) {
      const ms = String(Math.floor((totalSeconds % 1) * 1000)).padStart(3, '0');
      return `${h}:${m}:${s}.${ms}`;
    }
    return `${h}:${m}:${s}`;
  }

  function formatLanguages(langs) {
    return Array.isArray(langs) && langs.length ? langs.join(':') : '';
  }

  function parseLanguages(raw) {
    if (!raw) return [];
    return raw
      .split(/[:;,]/)
      .map(part => part.trim())
      .filter(Boolean)
      .map(entry => {
        const match = LANGUAGE_OPTIONS.find(option => option.toLowerCase() === entry.toLowerCase());
        return match || null;
      })
      .filter(Boolean);
  }

  // Map full language to initial
  const LANG_TO_INITIAL = {
    'Cantonese': 'C',
    'English': 'E',
    'Mandarin': 'M'
  };

  function languagesToInitials(langs) {
    if (!Array.isArray(langs) || langs.length === 0) return '';
    return langs.map(l => LANG_TO_INITIAL[l] || l?.[0]?.toUpperCase() || '').filter(Boolean).join(':');
  }

  // Remarks modal helpers
  const remarksModal = document.getElementById('remarks-modal');
  const remarksTextarea = document.getElementById('remarks-modal-text');
  const remarksSaveBtn = document.getElementById('remarks-save-btn');
  const remarksCloseEls = document.querySelectorAll('[data-remarks-close]');
  let remarksEditingIndex = null;

  function openRemarksModal(index) {
    remarksEditingIndex = index;
    const tag = window._timelineTags[index];
    if (!tag) return;
    if (remarksTextarea) remarksTextarea.value = tag.remarks || '';
    if (remarksModal) remarksModal.hidden = false;
    if (remarksTextarea) remarksTextarea.focus();
  }

  function closeRemarksModal() {
    if (remarksModal) remarksModal.hidden = true;
    remarksEditingIndex = null;
  }

  if (remarksSaveBtn) {
    remarksSaveBtn.addEventListener('click', () => {
      if (remarksEditingIndex === null) return closeRemarksModal();
      const tag = window._timelineTags[remarksEditingIndex];
      if (!tag) return closeRemarksModal();
      tag.remarks = (remarksTextarea?.value || '').trim();
      window.markDirty();
      renderTagList();
      closeRemarksModal();
    });
  }
  remarksCloseEls.forEach(el => el.addEventListener('click', closeRemarksModal));
  if (remarksModal) {
    remarksModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeRemarksModal();
    });
  }

  function renderTagList() {
    tagListBody.innerHTML = '';
    const sortedTags = [...window._timelineTags].sort((a, b) => a.start - b.start);

    sortedTags.forEach((tag, index) => {
      const row = document.createElement('tr');

      const startCell = document.createElement('td');
      startCell.textContent = formatTime(tag.start, true);
      startCell.style.cursor = 'pointer';
      startCell.addEventListener('click', () => seekPlayer(tag.start));
      row.appendChild(startCell);

      const endCell = document.createElement('td');
      endCell.textContent = formatTime(tag.end, true);
      endCell.style.cursor = 'pointer';
      endCell.addEventListener('click', () => seekPlayer(tag.end));
      row.appendChild(endCell);

      const languagesCell = document.createElement('td');
      languagesCell.className = 'languages-cell';
      languagesCell.textContent = languagesToInitials(tag.languages);
      row.appendChild(languagesCell);

      const tagCell = document.createElement('td');
      tagCell.className = 'tag-cell';
      const chip = document.createElement('span');
      chip.className = `tag-chip timeline-interval-color-${index % 5}`;
      chip.textContent = tag.label || '9999';
      tagCell.appendChild(chip);
      tagCell.contentEditable = true;

      function commitTagLabel() {
        const value = tagCell.textContent.trim() || '9999';
        const idx = window._timelineTags.findIndex(t => t === tag);
        if (idx !== -1) {
          window._timelineTags[idx].label = value;
        }
        tagCell.innerHTML = '';
        chip.textContent = value;
        tagCell.appendChild(chip);
        window.updateTimelineMarkers(window._timelineTags);
        window.updateTagSummary();
        window.markDirty();
      }

      tagCell.addEventListener('focus', () => {
        tagCell.textContent = (tag.label === '9999' ? '' : tag.label);
      });
      tagCell.addEventListener('blur', commitTagLabel);
      tagCell.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          tagCell.blur();
        }
      });
      row.appendChild(tagCell);

      const remarksCell = document.createElement('td');
      remarksCell.className = 'remarks-cell';
      const viewBtn = document.createElement('button');
      viewBtn.className = 'remarks-view-btn';
      viewBtn.textContent = (tag.remarks && tag.remarks.length) ? 'View' : 'Add';
      viewBtn.title = 'View/Edit remarks';
      viewBtn.addEventListener('click', () => openRemarksModal(window._timelineTags.indexOf(tag)));
      remarksCell.appendChild(viewBtn);
      row.appendChild(remarksCell);

      const actionsCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tag-delete-btn';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Delete tag';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = window._timelineTags.findIndex(t => t === tag);
        if (idx !== -1) {
          window._timelineTags.splice(idx, 1);
          renderTagList();
          window.updateTimelineMarkers(window._timelineTags);
          window.updateTagSummary();
          window.markDirty();
        }
      });
      actionsCell.appendChild(deleteBtn);
      row.appendChild(actionsCell);

      tagListBody.appendChild(row);
    });
  }

  window.renderTagList = renderTagList;

  startTagBtn.addEventListener('click', () => {
    if (!(window.currentVID || '').trim()) {
      alert('Please enter a VID before tagging.');
      const vidField = document.getElementById('vid-input');
      if (vidField) vidField.focus();
      return;
    }
    const currentTime = getCurrentTime();
    const isReady = (video && video.duration) || window.ytPlayer;
    if (!isReady) return;

    tagInProgress = { start: currentTime };
    startTagBtn.disabled = true;
    endTagBtn.disabled = false;
    tagInput.disabled = true;
    if (remarksInput) remarksInput.disabled = true;
    languageCheckboxes.forEach(cb => { cb.disabled = true; });
    startTagBtn.textContent = 'Tagging...';
    if (typeof window.showStartDotOnTimeline === 'function') {
      window.showStartDotOnTimeline(tagInProgress.start);
    }
  });

  endTagBtn.addEventListener('click', () => {
    if (!tagInProgress) return;
    const currentTime = getCurrentTime();

    let label = tagInput.value.trim();
    if (!label) label = '9999';
    const end = currentTime;
    const languages = languageCheckboxes.filter(cb => cb.checked).map(cb => cb.value);
    const remarks = remarksInput ? remarksInput.value.trim() : '';

    if (end < tagInProgress.start) {
      console.warn('[tag] End time is before start time. Ignoring tag.');
      alert('Error: End time cannot be before start time.');
      tagInProgress = null;
      startTagBtn.disabled = false;
      endTagBtn.disabled = true;
      tagInput.disabled = false;
      if (remarksInput) remarksInput.disabled = false;
      languageCheckboxes.forEach(cb => { cb.disabled = false; });
      startTagBtn.textContent = 'Mark Start';
      if (typeof window.removeStartDotFromTimeline === 'function') {
        window.removeStartDotFromTimeline();
      }
      return;
    }

    window._timelineTags.push({ start: tagInProgress.start, end, label, languages, remarks });
    tagInProgress = null;
    tagInput.value = '';
    startTagBtn.disabled = false;
    endTagBtn.disabled = true;
    tagInput.disabled = false;
    if (remarksInput) {
      remarksInput.value = '';
      remarksInput.disabled = false;
    }
    languageCheckboxes.forEach(cb => {
      cb.checked = false;
      cb.disabled = false;
    });
    startTagBtn.textContent = 'Mark Start';
    renderTagList();
    window.updateTimelineMarkers(window._timelineTags);
    window.updateTagSummary();
    window.markDirty();
    if (typeof window.removeStartDotFromTimeline === 'function') {
      window.removeStartDotFromTimeline();
    }
  });

  renderTagList();
}
