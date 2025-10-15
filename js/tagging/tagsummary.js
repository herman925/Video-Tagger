function buildSummaryData(tags) {
  const counts = new Map();

  tags.forEach(tag => {
    const labels = Array.isArray(tag.label)
      ? tag.label.filter(l => l && l !== '9999')
      : (tag.label && tag.label.trim && tag.label.trim() !== '9999' ? [tag.label.trim()] : []);

    if (labels.length === 0) {
      counts.set('9999', (counts.get('9999') || 0) + 1);
    } else {
      labels.forEach(label => {
        counts.set(label, (counts.get(label) || 0) + 1);
      });
    }
  });

  return Array.from(counts.entries())
    .sort((a, b) => {
      if (b[1] !== a[1]) return b[1] - a[1];
      return a[0].localeCompare(b[0]);
    });
}

function updateTagSummary() {
  const summaryBody = document.getElementById('tag-summary-body');
  const labelHeader = document.querySelector('#tag-summary-table thead th:first-child');
  if (!summaryBody) return;

  const tags = window._timelineTags || [];
  const summaryRows = buildSummaryData(tags);

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

  if (labelHeader) {
    labelHeader.textContent = 'Tag';
  }
}

function initTagSummary() {
  updateTagSummary();
}

window.updateTagSummary = updateTagSummary;
