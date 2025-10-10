// Keyboard Shortcut Help Popup
function initShortcutHelp() {
  // Create modal HTML with modern design
  const modal = document.createElement('div');
  modal.id = 'shortcut-help-modal';
  modal.className = 'modal';
  modal.setAttribute('role', 'dialog');
  modal.setAttribute('aria-modal', 'true');
  modal.setAttribute('aria-labelledby', 'shortcut-modal-title');
  modal.hidden = true;
  modal.innerHTML = `
    <div class="modal-backdrop" data-shortcut-close></div>
    <div class="modal-dialog" style="max-width: 800px;">
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="shortcut-modal-title">Keyboard Shortcuts</h2>
          <button class="icon-btn" data-shortcut-close type="button" aria-label="Close">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
        <div class="modal-body">
          <div class="shortcuts-grid" style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 16px;">
            <div class="shortcut-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Play/Pause</span>
              <kbd class="kbd">Space</kbd>
            </div>
            <div class="shortcut-item" style="display: flex; justify-space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Set Start Marker</span>
              <kbd class="kbd">I</kbd>
            </div>
            <div class="shortcut-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Seek Backward (5s)</span>
              <kbd class="kbd">←</kbd>
            </div>
            <div class="shortcut-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Set End Marker</span>
              <kbd class="kbd">O</kbd>
            </div>
            <div class="shortcut-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Seek Forward (5s)</span>
              <kbd class="kbd">→</kbd>
            </div>
            <div class="shortcut-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Show Help</span>
              <kbd class="kbd">?</kbd>
            </div>
            <div class="shortcut-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Seek Backward (1s)</span>
              <kbd class="kbd">Alt + ←</kbd>
            </div>
            <div class="shortcut-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Seek Forward (1s)</span>
              <kbd class="kbd">Alt + →</kbd>
            </div>
            <div class="shortcut-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Seek Backward (30s)</span>
              <kbd class="kbd">Ctrl + ←</kbd>
            </div>
            <div class="shortcut-item" style="display: flex; justify-content: space-between; align-items: center; padding: 12px 0; border-bottom: 1px solid var(--border-color);">
              <span style="font-size: 14px; color: var(--text-secondary);">Seek Forward (30s)</span>
              <kbd class="kbd">Ctrl + →</kbd>
            </div>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn-primary" data-shortcut-close type="button">Close</button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(modal);

  // Show/hide logic
  function showModal() { 
    modal.hidden = false;
    modal.style.display = 'flex';
  }
  function hideModal() { 
    modal.hidden = true;
    modal.style.display = 'none';
  }
  
  // Wire up close buttons
  const closeButtons = modal.querySelectorAll('[data-shortcut-close]');
  closeButtons.forEach(btn => {
    btn.addEventListener('click', hideModal);
  });

  // Keyboard shortcut: ? to open
  document.addEventListener('keydown', (e) => {
    if (e.key === '?' && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const activeTag = document.activeElement?.tagName;
      if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || document.activeElement?.isContentEditable) return;
      e.preventDefault();
      showModal();
    }
    if (e.key === 'Escape' && !modal.hidden) {
      e.preventDefault();
      hideModal();
    }
  });
  
  // Wire up help button in header
  const headerHelpBtn = document.querySelector('.app-actions button[title="Keyboard Help"]');
  if (headerHelpBtn) {
    headerHelpBtn.addEventListener('click', showModal);
  }
}

// Export for main.js to call
if (typeof window !== 'undefined') {
  window.initShortcutHelp = initShortcutHelp;
}
