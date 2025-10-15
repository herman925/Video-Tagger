// Export logic for Video Tagger (interval tags, with video source)

// Store the handler function to allow removal
let exportClickHandler = null;

function initExport() {
  console.log('initExport called'); // Log initExport call
  const exportBtn = document.getElementById('export-btn');
  if (!exportBtn) {
    console.error('Export button not found!');
    return; // Exit if button not found
  }

  // Define the handler function
  exportClickHandler = () => {
    console.log('Export button clicked!'); // Log click event
    const tags = window._timelineTags || [];
    const videoSource = window.currentVideoSource || '';
    const vid = (window.currentVID || '').trim();
    if (!tags.length) {
      alert('No tags to export!');
      return;
    }
    if (!vid) {
      alert('VID is required before exporting.');
      return;
    }
    console.log('Export process started.'); // Log export start
    const normalizeLabels = (raw) => {
      if (Array.isArray(raw)) {
        return raw.filter(label => label && label !== '9999').map(label => String(label).trim()).filter(Boolean);
      }
      if (raw && raw !== '9999') {
        return String(raw)
          .split(';')
          .map(part => part.trim())
          .filter(part => part && part !== '9999');
      }
      return [];
    };

    const uniqueTagLabels = new Set();
    tags.forEach(tag => {
      normalizeLabels(tag.label).forEach(label => uniqueTagLabels.add(label));
    });
    const sortedTagLabels = Array.from(uniqueTagLabels).sort((a, b) => a.localeCompare(b));

    const escapeCsv = (value) => `"${String(value || '').replace(/"/g, '""')}"`;

    const headerParts = [
      'Video Source',
      'VID',
      'Start (s)',
      'End (s)',
      'Start (HH:MM:SS.mmm)',
      'End (HH:MM:SS.mmm)',
      'Cantonese',
      'English',
      'Mandarin',
      ...sortedTagLabels,
      'Remarks'
    ];

    let csv = `${headerParts.join(',')}\n`;
    tags
      .slice()
      .sort((a, b) => a.start - b.start)
      .forEach(tag => {
        const labels = normalizeLabels(tag.label);
        const tagPresence = sortedTagLabels.map(label => labels.includes(label) ? 1 : 0);

        // Languages as 0/1 columns
        const languages = Array.isArray(tag.languages) ? tag.languages : [];
        const cantonese = languages.includes('Cantonese') ? 1 : 0;
        const english = languages.includes('English') ? 1 : 0;
        const mandarin = languages.includes('Mandarin') ? 1 : 0;
        
        // Remarks: show "9999" if empty or missing
        const remarksValue = (tag.remarks && tag.remarks.trim()) ? tag.remarks.trim() : '9999';
        const remarks = remarksValue.replace(/"/g, '""');

        const rowParts = [
          escapeCsv(videoSource),
          escapeCsv(vid),
          (tag.start || 0).toFixed(3),
          (tag.end || 0).toFixed(3),
          formatTime(tag.start, true),
          formatTime(tag.end, true),
          cantonese,
          english,
          mandarin,
          ...tagPresence,
          escapeCsv(remarks)
        ];

        csv += `${rowParts.join(',')}\n`;
      });
    // Add UTF-8 BOM for Excel/Unicode compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const now = new Date();
    const y = String(now.getFullYear());
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const base = vid ? `${y}${m}${d}_${vid}` : `${y}${m}${d}_tags`;
    a.download = `${base}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    console.log('Export process finished.'); // Log export end
  };

  // Remove any existing listener before adding the new one
  if (exportClickHandler) {
      console.log('Removing existing export click listener.');
      exportBtn.removeEventListener('click', exportClickHandler);
  }
  console.log('Adding new export click listener.');
  exportBtn.addEventListener('click', exportClickHandler);

  // Utility for time formatting (should match tag.js/video.js)
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
}

/* Remove the DOMContentLoaded listener as main.js handles initialization */
// document.addEventListener('DOMContentLoaded', () => {
//     console.log('DOMContentLoaded - calling initExport');
//     initExport();
// });
