// Tag list and interval tagging logic
(function(global) {
'use strict';

const LANGUAGE_OPTIONS = ['Cantonese', 'English', 'Mandarin'];
window.LANGUAGE_OPTIONS = LANGUAGE_OPTIONS;

function initTags() {
  const tagListBody = document.getElementById('tag-list-body');
  const remarksInput = document.getElementById('tag-remarks-input');
  const languageButtons = Array.from(document.querySelectorAll('.tag-language-checkbox'));
  const video = document.getElementById('video'); // HTML5 video
  const startTagBtn = document.getElementById('start-tag-btn');
  const endTagBtn = document.getElementById('end-tag-btn');

  // Initialize timeline tags if not already initialized
  if (!window._timelineTags) {
    window._timelineTags = [];
  }

  // Track tag in progress
  let tagInProgress = null;

  // Set up language button toggles
  languageButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      btn.classList.toggle('active');
    });
  });

  if (!startTagBtn || !endTagBtn || !tagListBody) {
    console.warn('[initTags] Missing required elements:', { startTagBtn, endTagBtn, tagListBody });
    return;
  }
  
  // Storage for tags from modal (populated by Add Tags modal)
  let pendingTagsFromModal = [];

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

  // Modal helpers for editing tags
  const remarksModal = document.getElementById('remarks-modal');
  const remarksTextarea = document.getElementById('remarks-modal-text');
  const remarksSaveBtn = document.getElementById('remarks-save-btn');
  const remarksCloseEls = document.querySelectorAll('[data-remarks-close]');
  
  const tagLabelModal = document.getElementById('tag-label-modal');
  const tagLabelInput = document.getElementById('tag-label-input');
  const tagLabelSaveBtn = document.getElementById('tag-label-save-btn');
  const tagLabelCloseEls = document.querySelectorAll('[data-taglabel-close]');
  
  const langModal = document.getElementById('language-modal');
  const langSaveBtn = document.getElementById('language-save-btn');
  const langCloseEls = document.querySelectorAll('[data-language-close]');
  
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
    
    // Populate existing tags list
    populateExistingTags(index);
    
    // Clear new tag input
    const newTagInput = document.getElementById('new-tag-input');
    if (newTagInput) newTagInput.value = '';
    
    if (tagLabelModal) tagLabelModal.hidden = false;
  }

  function populateExistingTags(index) {
    const existingTagsList = document.getElementById('existing-tags-list');
    if (!existingTagsList) return;
    
    const tag = window._timelineTags[index];
    if (!tag) return;
    
    existingTagsList.innerHTML = '';
    const labels = Array.isArray(tag.label) ? tag.label : [tag.label];
    
    labels.forEach((label, i) => {
      if (!label || label === '9999') return;
      
      const li = document.createElement('li');
      li.className = 'tag-list-item';
      
      const span = document.createElement('span');
      span.textContent = label;
      
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = '<span class="material-symbols-outlined">delete</span>';
      button.addEventListener('click', () => {
        removeTagLabel(index, i);
      });
      
      li.appendChild(span);
      li.appendChild(button);
      existingTagsList.appendChild(li);
    });
  }

  function removeTagLabel(tagIndex, labelIndex) {
    const tag = window._timelineTags[tagIndex];
    if (!tag) return;
    
    const labels = Array.isArray(tag.label) ? tag.label : [tag.label];
    labels.splice(labelIndex, 1);
    tag.label = labels.length > 0 ? labels : ['9999'];
    
    populateExistingTags(tagIndex);
    window.markDirty();
  }

  function addNewTag() {
    if (editingTagIndex === null) return;
    const tag = window._timelineTags[editingTagIndex];
    if (!tag) return;
    
    const newTagInput = document.getElementById('new-tag-input');
    const newLabel = (newTagInput?.value || '').trim();
    if (!newLabel) return;
    
    const labels = Array.isArray(tag.label) ? tag.label.filter(l => l && l !== '9999') : (tag.label && tag.label !== '9999' ? [tag.label] : []);
    labels.push(newLabel);
    tag.label = labels;
    
    newTagInput.value = '';
    populateExistingTags(editingTagIndex);
    window.markDirty();
  }

  function closeTagLabelModal() {
    if (tagLabelModal) tagLabelModal.hidden = true;
    editingTagIndex = null;
  }

  // Wire up "+ Add Tag" button to show input
  const addTagBtnOpen = document.getElementById('add-tag-btn-open');
  const newTagInput = document.getElementById('new-tag-input');
  
  if (addTagBtnOpen && newTagInput) {
    addTagBtnOpen.addEventListener('click', () => {
      newTagInput.style.display = 'block';
      newTagInput.focus();
      addTagBtnOpen.style.display = 'none';
    });
  }
  
  // Wire up Enter key in new tag input
  if (newTagInput) {
    newTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addNewTag();
        newTagInput.style.display = 'none';
        if (addTagBtnOpen) addTagBtnOpen.style.display = 'block';
      } else if (e.key === 'Escape') {
        newTagInput.value = '';
        newTagInput.style.display = 'none';
        if (addTagBtnOpen) addTagBtnOpen.style.display = 'block';
      }
    });
  }

  if (tagLabelSaveBtn) {
    tagLabelSaveBtn.addEventListener('click', () => {
      if (editingTagIndex === null) return closeTagLabelModal();
      
      // Save the changes: collect all tags from the list
      const tag = window._timelineTags[editingTagIndex];
      if (tag) {
        const tagsList = document.getElementById('existing-tags-list');
        const tagItems = tagsList ? tagsList.querySelectorAll('li') : [];
        const labels = Array.from(tagItems).map(li => li.querySelector('span')?.textContent).filter(Boolean);
        tag.label = labels.length > 0 ? labels : ['9999'];
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

  // Language Modal
  function openLanguageModal(index) {
    editingTagIndex = index;
    const tag = window._timelineTags[index];
    if (!tag) return;
    
    // Update checkboxes to reflect current languages
    const checkboxes = langModal?.querySelectorAll('.lang-modal-checkbox');
    if (checkboxes) {
      checkboxes.forEach(cb => {
        const lang = cb.dataset.lang;
        cb.checked = (tag.languages || []).includes(lang);
      });
    }
    
    if (langModal) langModal.hidden = false;
  }

  function closeLanguageModal() {
    if (langModal) langModal.hidden = true;
    editingTagIndex = null;
  }

  if (langSaveBtn) {
    langSaveBtn.addEventListener('click', () => {
      if (editingTagIndex === null) return closeLanguageModal();
      const tag = window._timelineTags[editingTagIndex];
      if (!tag) return closeLanguageModal();
      
      const checkboxes = langModal?.querySelectorAll('.lang-modal-checkbox');
      const selectedLangs = [];
      if (checkboxes) {
        checkboxes.forEach(cb => {
          if (cb.checked) selectedLangs.push(cb.dataset.lang);
        });
      }
      tag.languages = selectedLangs;
      
      window.markDirty();
      renderTagList();
      window.updateTagSummary();
      closeLanguageModal();
    });
  }
  langCloseEls.forEach(el => el.addEventListener('click', closeLanguageModal));
  if (langModal) {
    langModal.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeLanguageModal();
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
      languagesCell.className = 'languages-cell clickable';
      const initials = languagesToInitials(tag.languages) || '—';
      languagesCell.textContent = initials;
      languagesCell.style.cursor = 'pointer';
      // Tooltip showing full language names
      const fullLangNames = Array.isArray(tag.languages) && tag.languages.length > 0 
        ? tag.languages.join(', ') 
        : 'No languages';
      languagesCell.title = `${fullLangNames} (Click to edit)`;
      languagesCell.addEventListener('click', () => openLanguageModal(window._timelineTags.indexOf(tag)));
      row.appendChild(languagesCell);

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
    languageButtons.forEach(cb => { cb.disabled = true; });
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
    const languages = languageButtons.filter(btn => btn.classList.contains('active')).map(btn => btn.dataset.lang);
    const remarks = remarksInput ? remarksInput.value.trim() : '';

    if (end < tagInProgress.start) {
      console.warn('[tag] End time is before start time. Ignoring tag.');
      alert('Error: End time cannot be before start time.');
      tagInProgress = null;
      startTagBtn.disabled = false;
      endTagBtn.disabled = true;
      if (remarksInput) remarksInput.disabled = false;
      languageButtons.forEach(cb => { cb.disabled = false; });
      startTagBtn.textContent = 'Mark Start';
      if (typeof window.removeStartDotFromTimeline === 'function') {
        window.removeStartDotFromTimeline();
      }
      return;
    }

    window._timelineTags.push({ start: tagInProgress.start, end, label, languages, remarks });
    tagInProgress = null;
    pendingTagsFromModal = []; // Clear tags after use
    // Note: We keep pendingTags so user can reuse them for next interval
    startTagBtn.disabled = false;
    endTagBtn.disabled = true;
    if (remarksInput) {
      remarksInput.value = '';
      remarksInput.disabled = false;
    }
    languageButtons.forEach(cb => {
      cb.classList.remove('active');
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
  
  // Add Tag Modal (for initial tag setup before marking)
  const addTagModal = document.getElementById('add-tag-modal');
  const openAddTagModalBtn = document.getElementById('open-add-tag-modal-btn');
  const addTagModalSaveBtn = document.getElementById('add-tag-modal-save-btn');
  const addTagModalCloseEls = document.querySelectorAll('[data-add-tag-close]');
  const addInitialTagBtnOpen = document.getElementById('add-initial-tag-btn-open');
  const addInitialTagInput = document.getElementById('add-initial-tag-input');
  const addInitialTagsList = document.getElementById('add-initial-tags-list');
  
  // Temporary storage for tags before marking
  let pendingTags = [];
  
  function openAddTagModal() {
    if (!addTagModal) return;
    // Keep existing tags when opening modal for editing
    if (pendingTags.length === 0) {
      pendingTags = [];
    }
    updateAddInitialTagsList();
    
    if (addInitialTagInput) addInitialTagInput.style.display = 'none';
    if (addInitialTagBtnOpen) addInitialTagBtnOpen.style.display = 'block';
    
    addTagModal.hidden = false;
  }
  
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
    
    pendingTags.forEach((tag, i) => {
      const li = document.createElement('li');
      li.className = 'tag-list-item';
      
      const span = document.createElement('span');
      span.textContent = tag;
      
      const button = document.createElement('button');
      button.type = 'button';
      button.innerHTML = '<span class="material-symbols-outlined">delete</span>';
      button.addEventListener('click', () => {
        pendingTags.splice(i, 1);
        updateAddInitialTagsList();
        updateAddTagsButtonText();
      });
      
      li.appendChild(span);
      li.appendChild(button);
      addInitialTagsList.appendChild(li);
    });
  }
  
  function addPendingTag() {
    if (!addInitialTagInput) return;
    const newTag = addInitialTagInput.value.trim();
    if (!newTag) return;
    
    pendingTags.push(newTag);
    addInitialTagInput.value = '';
    updateAddInitialTagsList();
    updateAddTagsButtonText();
  }
  
  // Wire up open button
  if (openAddTagModalBtn) {
    openAddTagModalBtn.addEventListener('click', openAddTagModal);
  }
  
  // Wire up "+ Add Tag" button in modal
  if (addInitialTagBtnOpen && addInitialTagInput) {
    addInitialTagBtnOpen.addEventListener('click', () => {
      addInitialTagInput.style.display = 'block';
      addInitialTagInput.focus();
      addInitialTagBtnOpen.style.display = 'none';
    });
  }
  
  // Wire up Enter key in add initial tag input
  if (addInitialTagInput) {
    addInitialTagInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        addPendingTag();
        addInitialTagInput.style.display = 'none';
        if (addInitialTagBtnOpen) addInitialTagBtnOpen.style.display = 'block';
      } else if (e.key === 'Escape') {
        addInitialTagInput.value = '';
        addInitialTagInput.style.display = 'none';
        if (addInitialTagBtnOpen) addInitialTagBtnOpen.style.display = 'block';
      }
    });
  }
  
  // Language and remarks are now managed in the main left column, not in the modal
  
  // Wire up Done button
  if (addTagModalSaveBtn) {
    addTagModalSaveBtn.addEventListener('click', () => {
      // Store tags for use when marking start/end
      pendingTagsFromModal = [...pendingTags]; // Copy tags from modal
      
      // Update button text to show tag count
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
