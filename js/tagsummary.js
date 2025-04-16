// Tag summary logic: updates the summary table based on window._timelineTags
function updateTagSummary() {
  const summaryBody = document.getElementById('tag-summary-body');
  const tags = window._timelineTags || [];
  // Count frequencies
  const freq = {};
  tags.forEach(tag => {
    const label = tag.label || '9999';
    freq[label] = (freq[label] || 0) + 1;
  });
  // Sort by frequency (descending)
  const sorted = Object.entries(freq).sort((a, b) => b[1] - a[1]);
  // Render summary
  summaryBody.innerHTML = '';
  sorted.forEach(([label, count]) => {
    const row = document.createElement('tr');
    const tagCell = document.createElement('td');
    tagCell.textContent = label;
    const freqCell = document.createElement('td');
    freqCell.textContent = count;
    row.appendChild(tagCell);
    row.appendChild(freqCell);
    summaryBody.appendChild(row);
  });
}

window.updateTagSummary = updateTagSummary;
document.addEventListener('DOMContentLoaded', updateTagSummary);
