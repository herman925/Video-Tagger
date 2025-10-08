// Keyboard shortcuts for Video Tagger (requirements.md compliant)
function showShortcutTooltip(message) {
  let tooltip = document.getElementById('shortcut-tooltip');
  if (!tooltip) {
    tooltip = document.createElement('div');
    tooltip.id = 'shortcut-tooltip';
    tooltip.style.position = 'fixed';
    tooltip.style.bottom = '40px';
    tooltip.style.left = '50%';
    tooltip.style.transform = 'translateX(-50%)';
    tooltip.style.background = 'rgba(40,40,40,0.95)';
    tooltip.style.color = '#fff';
    tooltip.style.padding = '10px 24px';
    tooltip.style.borderRadius = '8px';
    tooltip.style.fontSize = '1.1em';
    tooltip.style.zIndex = 9999;
    tooltip.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
    document.body.appendChild(tooltip);
  }
  tooltip.textContent = message;
  tooltip.style.display = 'block';
  clearTimeout(tooltip._timeout);
  tooltip._timeout = setTimeout(() => {
    tooltip.style.display = 'none';
  }, 1500);
}

function isEditingTagOrInput() {
  const el = document.activeElement;
  if (!el) return false;
  const tag = el.tagName;
  // Exclude all input fields, textareas, selects, and contenteditable elements
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    el.isContentEditable
  );
}

function initShortcuts() {
  // Use window and capture phase to catch events before native controls
  window.addEventListener('keydown', (e) => {
    if (isEditingTagOrInput()) return;
    const video = document.getElementById('video');
    const startTagBtn = document.getElementById('start-tag-btn');
    const endTagBtn = document.getElementById('end-tag-btn');
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
      } else {
        showShortcutTooltip('You need to load a video before marking a start tag.');
      }
    }
    // O: Add end time to tag list
    else if (e.key.toLowerCase() === 'o') {
      e.preventDefault();
      if (endTagBtn && !endTagBtn.disabled) {
        endTagBtn.click();
      } else {
        showShortcutTooltip('You need to mark a start tag before marking an end tag.');
      }
    }
  }, true); // capture phase
}
