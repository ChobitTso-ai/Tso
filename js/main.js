// ===== 進度管理（儲存在瀏覽器 localStorage）=====
const STORAGE_KEY = 'github-learn-progress';

function loadProgress() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || {};
  } catch {
    return {};
  }
}

function saveProgress(progress) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
}

function updateProgressBar() {
  const progress = loadProgress();
  const completed = Object.values(progress).filter(Boolean).length;
  const total = Object.keys(LESSONS).length;

  document.getElementById('progress-text').textContent = `進度：${completed} / ${total} 完成`;
  const pct = total > 0 ? (completed / total) * 100 : 0;
  document.getElementById('progress-fill').style.width = pct + '%';

  // 更新每張課程卡片的狀態
  Object.keys(LESSONS).forEach(id => {
    const statusEl = document.getElementById(`status-${id}`);
    const card = document.querySelector(`[data-lesson="${id}"]`);
    if (progress[id]) {
      statusEl.textContent = '✅ 已完成';
      statusEl.classList.add('done');
      card.classList.add('done');
    } else {
      statusEl.textContent = '未開始';
      statusEl.classList.remove('done');
      card.classList.remove('done');
    }
  });
}

// ===== 模態視窗 =====
let currentLesson = null;

function openLesson(id) {
  currentLesson = id;
  const lesson = LESSONS[id];
  if (!lesson) return;

  document.getElementById('modal-content').innerHTML = lesson.content;

  const progress = loadProgress();
  const btn = document.querySelector('.btn-complete');
  if (progress[id]) {
    btn.textContent = '✅ 已完成';
    btn.disabled = true;
  } else {
    btn.textContent = '✅ 標記為完成';
    btn.disabled = false;
  }

  document.getElementById('modal-overlay').classList.add('active');
  document.body.style.overflow = 'hidden';
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
  document.body.style.overflow = '';
  currentLesson = null;
}

function closeLesson(event) {
  if (event.target === document.getElementById('modal-overlay')) {
    closeModal();
  }
}

function completeLesson() {
  if (!currentLesson) return;
  const progress = loadProgress();
  progress[currentLesson] = true;
  saveProgress(progress);
  updateProgressBar();

  const btn = document.querySelector('.btn-complete');
  btn.textContent = '✅ 已完成';
  btn.disabled = true;
}

// ===== ESC 鍵關閉模態 =====
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') closeModal();
});

// ===== 初始化 =====
document.addEventListener('DOMContentLoaded', () => {
  updateProgressBar();
});
