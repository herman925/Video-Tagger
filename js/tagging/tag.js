// Tag list and interval tagging logic
(function(global) {
'use strict';

const LANGUAGE_OPTIONS = ['Cantonese', 'English', 'Mandarin'];
window.LANGUAGE_OPTIONS = LANGUAGE_OPTIONS;

const PRESET_TAGS_URL = 'data/preset_tags.txt';
let PRESET_TAGS_CACHE = [];

function initTags() {
  const tagListBody = document.getElementById('tag-list-body');
  const remarksInput = document.getElementById('tag-remarks-input');
  const sessionLanguageButtons = Array.from(document.querySelectorAll('.session-language-pill'));
  const video = document.getElementById('video'); // HTML5 video
  const startTagBtn = document.getElementById('start-tag-btn');
  const endTagBtn = document.getElementById('end-tag-btn');
  const openAddTagModalBtn = document.getElementById('open-add-tag-modal-btn');
  const addInitialTagsList = document.getElementById('add-initial-tags-list');

  // Initialize timeline tags if not already initialized
  if (!window._timelineTags) {
    window._timelineTags = [];
  }

  // Track tag in progress
  let tagInProgress = null;
  let preventModalReopenUntilLoaded = false;

  function getDefaultSessionLanguages() {
    const defaults = sessionLanguageButtons
      .filter(btn => btn.dataset.default === 'true')
      .map(btn => btn.dataset.lang)
      .filter(Boolean);
    if (defaults.length) return defaults;
    return [];
  }

  function normalizeLanguages(langs) {
    if (!Array.isArray(langs)) return [];
    return langs
      .map(lang => {
        if (!lang) return null;
        const match = LANGUAGE_OPTIONS.find(option => option.toLowerCase() === String(lang).toLowerCase());
        return match || String(lang).trim();
      })
      .filter(Boolean);
  }

  function ensureSessionLanguages() {
    if (!Array.isArray(window.sessionLanguages)) window.sessionLanguages = [];
    window.sessionLanguages = normalizeLanguages(window.sessionLanguages);
  }

  function updateSessionLanguageButtons() {
    if (sessionLanguageButtons.length === 0) return;
    ensureSessionLanguages();
    const activeSet = new Set(window.sessionLanguages);
    sessionLanguageButtons.forEach(btn => {
      const isActive = activeSet.has(btn.dataset.lang);
      btn.classList.toggle('active', isActive);
    });
  }

  function setSessionLanguages(nextLanguages, { markDirty = false } = {}) {
    window.sessionLanguages = normalizeLanguages(nextLanguages);
    updateSessionLanguageButtons();
    if (markDirty) window.markDirty?.();
  }

  function toggleSessionLanguage(btn) {
    const lang = btn.dataset.lang;
    if (!lang) return;
    const activeSet = new Set(window.sessionLanguages || []);
    if (activeSet.has(lang)) activeSet.delete(lang);
    else activeSet.add(lang);
    setSessionLanguages(Array.from(activeSet), { markDirty: true });
  }

  window.getSessionLanguages = () => Array.from(window.sessionLanguages || []);
  window.setSessionLanguages = (langs, options) => setSessionLanguages(langs, options);

  setSessionLanguages([], { markDirty: false });

  sessionLanguageButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      toggleSessionLanguage(btn);
    });
  });

  updateSessionLanguageButtons();

  if (!startTagBtn || !endTagBtn || !tagListBody) {
    console.warn('[initTags] Missing required elements:', { startTagBtn, endTagBtn, tagListBody });
    return;
  }
  
  // Storage for tags from modal (populated by Add Tags modal)
  let pendingTagsFromModal = [];
  let pendingTags = [];

  function loadPresetTags({ force = false } = {}) {
    if (!force && PRESET_TAGS_CACHE.length > 0) {
      return Promise.resolve(PRESET_TAGS_CACHE);
    }

    preventModalReopenUntilLoaded = true;
    return fetch(PRESET_TAGS_URL)
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load preset tags (${response.status})`);
        }
        return response.text();
      })
      .then(text => {
        PRESET_TAGS_CACHE = text
          .split(/\r?\n/)
          .map(line => line.trim())
          .filter(Boolean);
        return PRESET_TAGS_CACHE;
      })
      .catch(err => {
        console.error('[tag] Unable to load preset tags:', err);
        PRESET_TAGS_CACHE = [];
        return PRESET_TAGS_CACHE;
      })
      .finally(() => {
        preventModalReopenUntilLoaded = false;
      });
  }

  document.addEventListener('video-tagger:session-cleared', () => {
    tagInProgress = null;
    setSessionLanguages([], { markDirty: false });
    pendingTagsFromModal = [];
    pendingTags = [];
    updateAddTagsButtonText();
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

  // Modal helpers for editing tags
  const remarksModal = document.getElementById('remarks-modal');
  const remarksTextarea = document.getElementById('remarks-modal-text');
  const remarksSaveBtn = document.getElementById('remarks-save-btn');
  const remarksCloseEls = document.querySelectorAll('[data-remarks-close]');
  
  const tagLabelModal = document.getElementById('tag-label-modal');
  const tagLabelSaveBtn = document.getElementById('tag-label-save-btn');
  const tagLabelCloseEls = document.querySelectorAll('[data-taglabel-close]');
  const tagLabelOptionsList = document.getElementById('tag-label-options-list');
  const existingTagsList = document.getElementById('existing-tags-list');

  
  let editingTagIndex = null;

  // Remarks Modal
  function openRemarksModal(index) {
    editingTagIndex = index;
    const tag = window._timelineTags[index];
    if (!tag) return;
    if (remarksTextarea) remarksTextarea.value = tag.remarks || '';
    if (remarksModal) remarksModal.hidden = false;
    if (remarksTextarea) remarksTextarea.focus();
  }

  function closeRemarksModal() {
    if (remarksModal) remarksModal.hidden = true;
    editingTagIndex = null;
  }

  if (remarksSaveBtn) {
    remarksSaveBtn.addEventListener('click', () => {
      if (editingTagIndex === null) return closeRemarksModal();
      const tag = window._timelineTags[editingTagIndex];
      if (!tag) return closeRemarksModal();
      tag.remarks = (remarksTextarea?.value || '').trim();
      window.markDirty();
      renderTagList();
      window.updateTagSummary();
      closeRemarksModal();
    });
  }
  remarksCloseEls.forEach(el => el.addEventListener('click', closeRemarksModal));
  if (remarksModal) {
    remarksModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeRemarksModal();
    });
  }

  // Tag Label Modal
  function openTagLabelModal(index) {
    editingTagIndex = index;
    const tag = window._timelineTags[index];
    if (!tag) return;

    const showModal = () => {
      populateTagLabelOptions(index);
      populateExistingTags(index);
      if (tagLabelModal) tagLabelModal.hidden = false;
    };

    if (PRESET_TAGS_CACHE.length === 0) {
      initializePresetTags().then(showModal);
    } else {
      showModal();
    }
  }

  function renderSelectedTagsPreview(labels) {
    const existingTagsList = document.getElementById('existing-tags-list');
    if (!existingTagsList) return;
    existingTagsList.innerHTML = '';
    labels.forEach(label => {
      const pill = document.createElement('span');
      pill.className = 'preset-tag-pill active';
      pill.textContent = label;
      existingTagsList.appendChild(pill);
    });
  }

  function populateExistingTags(index) {
    const tag = window._timelineTags[index];
    if (!tag) return;
    const labels = Array.isArray(tag.label)
      ? tag.label.filter(l => l && l !== '9999')
      : (tag.label && tag.label !== '9999'
        ? String(tag.label)
            .split(';')
            .map(v => v.trim())
            .filter(v => v && v !== '9999')
        : []);
    renderSelectedTagsPreview(labels);
  }

  function populateTagLabelOptions(index) {
    if (!tagLabelOptionsList) return;

    const tag = window._timelineTags[index];
    const selectedLabels = new Set(
      (Array.isArray(tag?.label) ? tag.label : [tag?.label])
        .filter(label => label && label !== '9999')
    );

    tagLabelOptionsList.innerHTML = '';

    const updatePreview = () => {
      renderSelectedTagsPreview(Array.from(selectedLabels));
    };

    PRESET_TAGS_CACHE.forEach(tagValue => {
      const pill = createTagPill(tagValue, selectedLabels.has(tagValue), () => {
        const isActive = pill.classList.toggle('active');
        if (isActive) selectedLabels.add(tagValue);
        else selectedLabels.delete(tagValue);
        updatePreview();
      });
      tagLabelOptionsList.appendChild(pill);
    });

    updatePreview();
  }

  function closeTagLabelModal() {
    if (tagLabelModal) tagLabelModal.hidden = true;
    editingTagIndex = null;
  }

  if (tagLabelSaveBtn) {
    tagLabelSaveBtn.addEventListener('click', () => {
      if (editingTagIndex === null) return closeTagLabelModal();
      
      // Save the changes: collect all tags from the list
      const tag = window._timelineTags[editingTagIndex];
      if (tag) {
        const selectedValues = Array.from(tagLabelOptionsList?.querySelectorAll('.preset-tag-pill.active') || [])
          .map(pill => pill.dataset.tagValue)
          .filter(Boolean);
        const labels = selectedValues.length > 0 ? selectedValues : ['9999'];
        tag.label = labels.length === 1 ? labels[0] : labels;
        renderSelectedTagsPreview(Array.isArray(tag.label) ? tag.label.filter(label => label !== '9999') : (tag.label !== '9999' ? [tag.label] : []));
        window.markDirty();
      }
      
      renderTagList();
      window.updateTimelineMarkers(window._timelineTags);
      window.updateTagSummary();
      closeTagLabelModal();
    });
  }
  tagLabelCloseEls.forEach(el => el.addEventListener('click', closeTagLabelModal));
  if (tagLabelModal) {
    tagLabelModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeTagLabelModal();
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

      const tagCell = document.createElement('td');
      tagCell.className = 'tag-cell clickable';
      tagCell.style.cursor = 'pointer';
      tagCell.title = 'Click to edit tags';
      
      // Handle array of labels or single label
      const labels = Array.isArray(tag.label) ? tag.label.filter(l => l && l !== '9999') : (tag.label && tag.label !== '9999' ? [tag.label] : []);
      
      // Show count instead of individual chips
      const countText = labels.length === 0 ? 'No tags' : `Edit Tags (${labels.length})`;
      tagCell.textContent = countText;
      tagCell.style.color = 'var(--primary)';
      tagCell.style.fontWeight = '500';
      
      tagCell.addEventListener('click', () => openTagLabelModal(window._timelineTags.indexOf(tag)));
      row.appendChild(tagCell);

      const remarksCell = document.createElement('td');
      remarksCell.className = 'remarks-cell clickable';
      remarksCell.style.cursor = 'pointer';
      remarksCell.title = 'Click to edit remarks';
      
      // Show "None" if no remarks, "Edit" if remarks exist
      const hasRemarks = tag.remarks && tag.remarks.trim().length > 0;
      remarksCell.textContent = hasRemarks ? 'Edit' : 'None';
      remarksCell.style.color = 'var(--primary)';
      remarksCell.style.fontWeight = '500';
      
      remarksCell.addEventListener('click', () => openRemarksModal(window._timelineTags.indexOf(tag)));
      row.appendChild(remarksCell);

      const actionsCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.className = 'tag-delete-btn';
      deleteBtn.textContent = '🗑️';
      deleteBtn.title = 'Delete tag';
      deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        
        // Confirmation prompt before deletion
        const confirmed = confirm('Are you sure you want to delete this tag?');
        if (!confirmed) return;
        
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
    // Read VID directly from input field
    const vidField = document.getElementById('vid-input');
    const currentVID = vidField ? vidField.value.trim() : (window.currentVID || '').trim();
    
    if (!currentVID) {
      alert('Please enter a VID before tagging.');
      if (vidField) vidField.focus();
      return;
    }
    
    // Update window.currentVID if not set
    if (!window.currentVID && currentVID) {
      window.currentVID = currentVID;
    }
    const currentTime = getCurrentTime();
    const isReady = (video && video.duration) || window.ytPlayer;
    if (!isReady) return;

    tagInProgress = { start: currentTime };
    startTagBtn.disabled = true;
    endTagBtn.disabled = false;
    if (remarksInput) remarksInput.disabled = true;
    startTagBtn.textContent = 'Tagging...';
    if (typeof window.showStartDotOnTimeline === 'function') {
      window.showStartDotOnTimeline(tagInProgress.start);
    }
  });

  endTagBtn.addEventListener('click', () => {
    if (!tagInProgress) return;
    const currentTime = getCurrentTime();

    // Use tags from modal (array) or default to '9999'
    let label = pendingTagsFromModal.length > 0 ? pendingTagsFromModal : ['9999'];
    const end = currentTime;
    const sessionLangs = Array.isArray(window.sessionLanguages) ? window.sessionLanguages.slice() : [];
    const remarks = remarksInput ? remarksInput.value.trim() : '';

    if (end < tagInProgress.start) {
      console.warn('[tag] End time is before start time. Ignoring tag.');
      alert('Error: End time cannot be before start time.');
      tagInProgress = null;
      startTagBtn.disabled = false;
      endTagBtn.disabled = true;
      if (remarksInput) remarksInput.disabled = false;
      startTagBtn.textContent = 'Mark Start';
      if (typeof window.removeStartDotFromTimeline === 'function') {
        window.removeStartDotFromTimeline();
      }
      return;
    }

    window._timelineTags.push({ start: tagInProgress.start, end, label, languages: sessionLangs, remarks });
    tagInProgress = null;
    // Note: Keep pendingTags so user can reuse them for next interval
    startTagBtn.disabled = false;
    endTagBtn.disabled = true;
    if (remarksInput) {
      remarksInput.value = '';
      remarksInput.disabled = false;
    }
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
  
  // Add Tag Modal (for initial tag setup before marking)
  const addTagModal = document.getElementById('add-tag-modal');
  const addTagModalSaveBtn = document.getElementById('add-tag-modal-save-btn');
  const addTagModalCloseEls = document.querySelectorAll('[data-add-tag-close]');

  function openAddTagModal() {
    if (preventModalReopenUntilLoaded) return;
    function showModal() {
      pendingTags = [...pendingTagsFromModal];
      updateAddInitialTagsList();
      addTagModal.hidden = false;
    }

    loadPresetTags().then(showModal);
  }

  function createTagPill(tagValue, isActive, clickHandler) {
    const pill = document.createElement('button');
    pill.type = 'button';
    pill.className = 'preset-tag-pill';
    pill.dataset.tagValue = tagValue;
    pill.textContent = tagValue;
    if (isActive) pill.classList.add('active');
    pill.addEventListener('click', clickHandler);
    return pill;
  }

  loadPresetTags().then(() => {
    updateAddInitialTagsList();
    updateAddTagsButtonText();
  });

  function updateAddTagsButtonText() {
    if (!openAddTagModalBtn) return;
    if (pendingTags.length === 0) {
      openAddTagModalBtn.textContent = '+ Add Tags';
    } else {
      openAddTagModalBtn.textContent = `Edit Tags (${pendingTags.length})`;
    }
  }

  function closeAddTagModal() {
    if (!addTagModal) return;
    addTagModal.hidden = true;
  }

  function updateAddInitialTagsList() {
    if (!addInitialTagsList) return;
    addInitialTagsList.innerHTML = '';
    const currentSelection = new Set(pendingTags);

    PRESET_TAGS_CACHE.forEach(tagValue => {
      const pill = createTagPill(tagValue, currentSelection.has(tagValue), () => {
        const isActive = pill.classList.toggle('active');
        if (isActive) {
          if (!pendingTags.includes(tagValue)) pendingTags.push(tagValue);
        } else {
          pendingTags = pendingTags.filter(tag => tag !== tagValue);
        }
        updateAddTagsButtonText();
      });
      addInitialTagsList.appendChild(pill);
    });
  }

  if (openAddTagModalBtn) {
    openAddTagModalBtn.addEventListener('click', openAddTagModal);
  }

  if (addTagModalSaveBtn) {
    addTagModalSaveBtn.addEventListener('click', () => {
      pendingTags = pendingTags.filter(tag => PRESET_TAGS_CACHE.includes(tag));
      pendingTagsFromModal = [...pendingTags];
      updateAddTagsButtonText();
      closeAddTagModal();
    });
  }
  
  // Wire up close buttons
  addTagModalCloseEls.forEach(el => el.addEventListener('click', closeAddTagModal));
  if (addTagModal) {
    addTagModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeAddTagModal();
    });
  }
}

window.initTags = initTags;
})(window);
