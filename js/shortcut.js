// Keyboard shortcuts for Video Tagger (requirements.md compliant)
function initShortcuts() {
  const video = document.getElementById('video');
  const startTagBtn = document.getElementById('start-tag-btn');
  const endTagBtn = document.getElementById('end-tag-btn');

  document.addEventListener('keydown', (e) => {
    if (document.activeElement.tagName === 'INPUT' || document.activeElement.isContentEditable) return;
    // Ctrl + Left/Right: jump 30s
    if (e.ctrlKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 30);
    } else if (e.ctrlKey && e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + 30);
    }
    // Alt + Left/Right: jump 1s
    else if (e.altKey && e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 1);
    } else if (e.altKey && e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(video.duration, video.currentTime + 1);
    }
    // Left/Right Arrow: jump 5s
    else if (!e.ctrlKey && !e.altKey && (e.key === 'ArrowLeft' || e.key === 'ArrowRight')) {
      e.preventDefault();
      if (e.key === 'ArrowLeft') video.currentTime = Math.max(0, video.currentTime - 5);
      else video.currentTime = Math.min(video.duration, video.currentTime + 5);
    }
    // Space bar: play/pause
    else if (e.key === ' ') {
      e.preventDefault();
      if (video.paused) video.play();
      else video.pause();
    }
    // I: Add start time to tag list
    else if (e.key.toLowerCase() === 'i') {
      e.preventDefault();
      if (startTagBtn && !startTagBtn.disabled) {
        startTagBtn.click();
      }
    }
    // O: Add end time to tag list
    else if (e.key.toLowerCase() === 'o') {
      e.preventDefault();
      if (endTagBtn && !endTagBtn.disabled) {
        endTagBtn.click();
      }
    }
  });
}
