// Save tagging session to JSON
function initSave() {
  const saveBtn = document.getElementById('save-btn');
  saveBtn.addEventListener('click', () => {
    const tags = window._timelineTags || [];
    const videoSource = window.currentVideoSource || '';
    const session = {
      videoSource,
      tags
    };
    const json = JSON.stringify(session, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'video_tag_session.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    window.markSaved();
  });
}
document.addEventListener('DOMContentLoaded', initSave);
