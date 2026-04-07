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

/* ===== Init on load ===== */
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('progress-count')) {
    initProgressPage();
  }
  const chMeta = document.querySelector('meta[name="chapter-num"]');
  if (chMeta) {
    updateReadBtnState(chMeta.content);
  }
});
