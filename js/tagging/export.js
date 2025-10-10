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
    // CSV header with separate language columns
    let csv = 'Video Source,VID,Start (s),End (s),Start (HH:MM:SS.mmm),End (HH:MM:SS.mmm),Tag,Cantonese,English,Mandarin,Remarks\n';
    tags
      .slice()
      .sort((a, b) => a.start - b.start)
      .forEach(tag => {
        // Handle array of labels or single label, join with semicolon
        const labels = Array.isArray(tag.label) ? tag.label.filter(l => l && l !== '9999') : (tag.label && tag.label !== '9999' ? [tag.label] : []);
        const label = (labels.length > 0 ? labels.join(';') : '9999').replace(/"/g, '""');
        
        // Languages as 0/1 columns
        const languages = Array.isArray(tag.languages) ? tag.languages : [];
        const cantonese = languages.includes('Cantonese') ? 1 : 0;
        const english = languages.includes('English') ? 1 : 0;
        const mandarin = languages.includes('Mandarin') ? 1 : 0;
        
        // Remarks: show "9999" if empty or missing
        const remarksValue = (tag.remarks && tag.remarks.trim()) ? tag.remarks.trim() : '9999';
        const remarks = remarksValue.replace(/"/g, '""');
        csv += `"${videoSource.replace(/"/g, '""')}","${vid.replace(/"/g, '""')}",${(tag.start || 0).toFixed(3)},${(tag.end || 0).toFixed(3)},${formatTime(tag.start, true)},${formatTime(tag.end, true)},"${label}",${cantonese},${english},${mandarin},"${remarks}"\n`;
      });
    // Add UTF-8 BOM for Excel/Unicode compatibility
    const BOM = '\uFEFF';
    const blob = new Blob([BOM + csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tags_export.csv';
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
