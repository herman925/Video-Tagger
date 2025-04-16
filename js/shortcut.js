// Keyboard shortcuts for Video Tagger (see requirements.md)
function initShortcuts() {
  const video = document.getElementById('video');
  document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.isContentEditable) return;
    // Shift + Left/Right: jump 10ms
    if (e.shiftKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 0.01);
    } else if (e.shiftKey && e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + 0.01);
    }
    // Ctrl + Left/Right: jump 30s
    else if (e.ctrlKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 30);
    } else if (e.ctrlKey && e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + 30);
    }
    // Space bar: play/pause (already handled in video.js, but here for redundancy)
    else if (e.key === ' ') {
      e.preventDefault();
      if (video.paused) video.play();
      else video.pause();
    }
    // T: Add current time as tag (start/end logic)
    else if (e.key.toLowerCase() === 't') {
      e.preventDefault();
      const startTagBtn = document.getElementById('start-tag-btn');
      const endTagBtn = document.getElementById('end-tag-btn');
      if (!startTagBtn.disabled) {
        startTagBtn.click();
      } else if (!endTagBtn.disabled) {
        endTagBtn.click();
      }
    }
  });
}
