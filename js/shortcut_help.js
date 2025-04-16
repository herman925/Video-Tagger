// Keyboard Shortcut Help Popup
function initShortcutHelpPopup() {
  // Create modal HTML
  const modal = document.createElement('div');
  modal.id = 'shortcut-help-modal';
  modal.innerHTML = `
    <div class="shortcut-modal-backdrop"></div>
    <div class="shortcut-modal-content">
      <h2>Keyboard Shortcuts</h2>
      <table class="shortcut-table">
        <thead><tr><th>Shortcut</th><th>Action</th></tr></thead>
        <tbody>
          <tr><td>Left Arrow</td><td>Jump backward 5 seconds</td></tr>
          <tr><td>Right Arrow</td><td>Jump forward 5 seconds</td></tr>
          <tr><td>Alt + Left Arrow</td><td>Jump backward 1 second</td></tr>
          <tr><td>Alt + Right Arrow</td><td>Jump forward 1 second</td></tr>
          <tr><td>Ctrl + Left Arrow</td><td>Jump backward 30 seconds</td></tr>
          <tr><td>Ctrl + Right Arrow</td><td>Jump forward 30 seconds</td></tr>
          <tr><td>Space Bar</td><td>Play/Pause</td></tr>
          <tr><td>I</td><td>Add start time to tag list</td></tr>
          <tr><td>O</td><td>Add end time to tag list</td></tr>
        </tbody>
      </table>
      <button id="close-shortcut-modal">Close</button>
    </div>
  `;
  modal.style.display = 'none';
  document.body.appendChild(modal);

  // Show/hide logic
  function showModal() { modal.style.display = 'block'; }
  function hideModal() { modal.style.display = 'none'; }
  document.getElementById('close-shortcut-modal').onclick = hideModal;
  modal.querySelector('.shortcut-modal-backdrop').onclick = hideModal;

  // Keyboard shortcut: ? to open
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      if (document.activeElement.tagName === 'INPUT' || document.activeElement.isContentEditable) return;
      showModal();
    }
    if (e.key === 'Escape') {
      hideModal();
    }
  });
  // Mouse: '?' buttons
  const helpButtons = document.querySelectorAll('.shortcut-help-btn');
  helpButtons.forEach(btn => {
    btn.onclick = showModal;
  });
}

// Auto-init
window.addEventListener('DOMContentLoaded', initShortcutHelpPopup);
