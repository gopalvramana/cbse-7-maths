/* ===== Progress Tracker ===== */
const STORAGE_KEY = 'cbse7maths_progress';

function getProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch { return {}; }
}

function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

function getCompletedCount() {
  const p = getProgress();
  return Object.values(p).filter(Boolean).length;
}

/* Mark chapter as read (called from chapter pages) */
function markChapterRead(chNum) {
  const p = getProgress();
  p['ch' + chNum] = true;
  saveProgress(p);
  updateReadBtnState(chNum);
}

function updateReadBtnState(chNum) {
  const btn = document.getElementById('mark-read-btn');
  if (!btn) return;
  const p = getProgress();
  if (p['ch' + chNum]) {
    btn.textContent = 'Completed!';
    btn.disabled = true;
    btn.style.opacity = '0.6';
  }
}

/* ===== Progress Page Logic ===== */
function initProgressPage() {
  const p = getProgress();
  const total = 13;
  const done = Object.values(p).filter(Boolean).length;

  const bigNum = document.getElementById('progress-count');
  if (bigNum) bigNum.textContent = done + ' / ' + total;

  const pctEl = document.getElementById('progress-pct');
  if (pctEl) pctEl.textContent = Math.round((done / total) * 100) + '% complete';

  document.querySelectorAll('.progress-card').forEach(card => {
    const ch = card.dataset.ch;
    const cb = card.querySelector('input[type=checkbox]');
    const fill = card.querySelector('.bar-fill');
    if (cb) {
      cb.checked = !!p['ch' + ch];
      cb.addEventListener('change', () => {
        const prog = getProgress();
        prog['ch' + ch] = cb.checked;
        saveProgress(prog);
        initProgressPage();
      });
    }
    if (fill) {
      fill.style.width = p['ch' + ch] ? '100%' : '0%';
    }
  });
}

function resetProgress() {
  if (confirm('Reset all progress? This cannot be undone.')) {
    localStorage.removeItem(STORAGE_KEY);
    initProgressPage();
  }
}

/* ===== Drag & Drop Reorder ===== */
const ORDER_KEY = 'cbse7maths_card_order';

function initDragAndDrop() {
  const grid = document.getElementById('chapter-grid');
  if (!grid) return;

  /* Restore saved order */
  const saved = getSavedOrder();
  if (saved && saved.length) {
    const cards = {};
    grid.querySelectorAll('.card[data-id]').forEach(c => { cards[c.dataset.id] = c; });
    saved.forEach(id => { if (cards[id]) grid.appendChild(cards[id]); });
  }

  let draggedEl = null;

  grid.addEventListener('dragstart', e => {
    const card = e.target.closest('.card[data-id]');
    if (!card) return;
    draggedEl = card;
    card.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', card.dataset.id);
  });

  grid.addEventListener('dragend', e => {
    const card = e.target.closest('.card[data-id]');
    if (card) card.classList.remove('dragging');
    grid.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
    draggedEl = null;
  });

  grid.addEventListener('dragover', e => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const target = e.target.closest('.card[data-id]');
    if (!target || target === draggedEl) return;
    grid.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
    target.classList.add('drag-over');
  });

  grid.addEventListener('dragleave', e => {
    const target = e.target.closest('.card[data-id]');
    if (target) target.classList.remove('drag-over');
  });

  grid.addEventListener('drop', e => {
    e.preventDefault();
    const target = e.target.closest('.card[data-id]');
    if (!target || !draggedEl || target === draggedEl) return;
    target.classList.remove('drag-over');

    const cards = [...grid.querySelectorAll('.card[data-id]')];
    const dragIdx = cards.indexOf(draggedEl);
    const dropIdx = cards.indexOf(target);

    if (dragIdx < dropIdx) {
      target.insertAdjacentElement('afterend', draggedEl);
    } else {
      target.insertAdjacentElement('beforebegin', draggedEl);
    }

    saveCardOrder();
  });

  /* Touch support for mobile */
  let touchCard = null, touchClone = null, lastTouchTarget = null;

  grid.addEventListener('touchstart', e => {
    const card = e.target.closest('.card[data-id]');
    if (!card || e.target.closest('a')) return;
    touchCard = card;
    const touch = e.touches[0];
    const rect = card.getBoundingClientRect();

    touchClone = card.cloneNode(true);
    touchClone.style.cssText = 'position:fixed;z-index:1000;pointer-events:none;opacity:0.85;width:' + rect.width + 'px;transform:rotate(2deg);';
    touchClone.style.left = (touch.clientX - rect.width / 2) + 'px';
    touchClone.style.top = (touch.clientY - 30) + 'px';
    document.body.appendChild(touchClone);
    card.classList.add('dragging');
  }, { passive: true });

  grid.addEventListener('touchmove', e => {
    if (!touchCard || !touchClone) return;
    e.preventDefault();
    const touch = e.touches[0];
    touchClone.style.left = (touch.clientX - touchClone.offsetWidth / 2) + 'px';
    touchClone.style.top = (touch.clientY - 30) + 'px';

    const el = document.elementFromPoint(touch.clientX, touch.clientY);
    const target = el ? el.closest('.card[data-id]') : null;
    grid.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
    if (target && target !== touchCard) {
      target.classList.add('drag-over');
      lastTouchTarget = target;
    }
  }, { passive: false });

  grid.addEventListener('touchend', () => {
    if (touchCard && lastTouchTarget && lastTouchTarget !== touchCard) {
      const cards = [...grid.querySelectorAll('.card[data-id]')];
      const dragIdx = cards.indexOf(touchCard);
      const dropIdx = cards.indexOf(lastTouchTarget);
      if (dragIdx < dropIdx) {
        lastTouchTarget.insertAdjacentElement('afterend', touchCard);
      } else {
        lastTouchTarget.insertAdjacentElement('beforebegin', touchCard);
      }
      saveCardOrder();
    }
    if (touchCard) touchCard.classList.remove('dragging');
    if (touchClone) touchClone.remove();
    grid.querySelectorAll('.card').forEach(c => c.classList.remove('drag-over'));
    touchCard = null; touchClone = null; lastTouchTarget = null;
  }, { passive: true });
}

function getSavedOrder() {
  try { return JSON.parse(localStorage.getItem(ORDER_KEY)); } catch { return null; }
}

function saveCardOrder() {
  const grid = document.getElementById('chapter-grid');
  if (!grid) return;
  const order = [...grid.querySelectorAll('.card[data-id]')].map(c => c.dataset.id);
  localStorage.setItem(ORDER_KEY, JSON.stringify(order));
}

function resetCardOrder() {
  localStorage.removeItem(ORDER_KEY);
  location.reload();
}

/* ===== Init on load ===== */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('progress-count')) {
    initProgressPage();
  }
  const chMeta = document.querySelector('meta[name="chapter-num"]');
  if (chMeta) {
    updateReadBtnState(chMeta.content);
  }
  initDragAndDrop();
});
