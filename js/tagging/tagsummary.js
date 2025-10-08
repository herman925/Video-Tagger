const SUMMARY_MODE = {
  TAG: 'tag',
  LANGUAGE: 'language'
};

const FALLBACK_LABELS = {
  tag: 'Tag',
  language: 'Language',
  unspecifiedLanguage: 'Unspecified'
};

window.tagSummaryMode = window.tagSummaryMode || SUMMARY_MODE.TAG;

function normalizeSummaryMode(mode) {
  return mode === SUMMARY_MODE.LANGUAGE ? SUMMARY_MODE.LANGUAGE : SUMMARY_MODE.TAG;
}

function applySummaryToggleState(mode) {
  const buttons = document.querySelectorAll('.summary-mode-btn');
  buttons.forEach(btn => {
    const btnMode = btn.dataset.summaryMode || SUMMARY_MODE.TAG;
    const isActive = btnMode === mode;
    btn.classList.toggle('is-active', isActive);
    btn.setAttribute('aria-pressed', String(isActive));
  });
}

function buildSummaryData(tags, mode) {
  const counts = new Map();
  const normalizedMode = normalizeSummaryMode(mode);

  tags.forEach(tag => {
    if (normalizedMode === SUMMARY_MODE.LANGUAGE) {
      const languages = Array.isArray(tag.languages) ? tag.languages.filter(Boolean) : [];
      if (languages.length === 0) {
        const label = FALLBACK_LABELS.unspecifiedLanguage;
        counts.set(label, (counts.get(label) || 0) + 1);
        return;
      }
      languages.forEach(language => {
        counts.set(language, (counts.get(language) || 0) + 1);
      });
    } else {
      const label = (tag.label && tag.label.trim()) ? tag.label.trim() : '9999';
      counts.set(label, (counts.get(label) || 0) + 1);
    }
  });

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
}

// Tag summary logic: updates the summary table based on window._timelineTags
function updateTagSummary() {
  const summaryBody = document.getElementById('tag-summary-body');
  const labelHeader = document.querySelector('#tag-summary-table thead th:first-child');
  if (!summaryBody) return;

  const mode = normalizeSummaryMode(window.tagSummaryMode);
  const tags = window._timelineTags || [];
  const summaryRows = buildSummaryData(tags, mode);

  summaryBody.innerHTML = '';

  summaryRows.forEach(([label, count]) => {
    const row = document.createElement('tr');
    const labelCell = document.createElement('td');
    labelCell.textContent = label;
    const freqCell = document.createElement('td');
    freqCell.textContent = count;
    row.appendChild(labelCell);
    row.appendChild(freqCell);
    summaryBody.appendChild(row);
  });

  applySummaryToggleState(mode);

  if (labelHeader) {
    labelHeader.textContent = mode === SUMMARY_MODE.LANGUAGE ? FALLBACK_LABELS.language : FALLBACK_LABELS.tag;
  }
}

function initTagSummary() {
  const toggle = document.querySelector('.summary-mode-toggle');
  if (toggle) {
    toggle.addEventListener('click', (event) => {
      const button = event.target.closest('.summary-mode-btn');
      if (!button || !button.dataset.summaryMode) return;
      const selectedMode = normalizeSummaryMode(button.dataset.summaryMode);
      if (selectedMode === window.tagSummaryMode) return;
      window.tagSummaryMode = selectedMode;
      updateTagSummary();
    });
  }

  updateTagSummary();
}

window.updateTagSummary = updateTagSummary;
document.addEventListener('DOMContentLoaded', initTagSummary);
