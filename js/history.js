/**
 * 명령어 히스토리 관리 (localStorage 기반)
 */

const STORAGE_KEY = 'argparse-cmd-history';
const MAX_ENTRIES = 50;

export function loadHistory() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch {
    // localStorage 용량 초과 등 무시
  }
}

export function addToHistory(entry) {
  const history = loadHistory();
  const newEntry = {
    id: Date.now().toString(),
    timestamp: new Date().toISOString(),
    scriptName: entry.scriptName || '',
    command: entry.command || '',
    formState: entry.formState || {},
    argDefs: entry.argDefs || [],
    execPrefix: entry.execPrefix || 'python',
  };

  history.unshift(newEntry);
  if (history.length > MAX_ENTRIES) {
    history.splice(MAX_ENTRIES);
  }
  saveHistory(history);
  return newEntry;
}

export function removeFromHistory(id) {
  const history = loadHistory().filter(e => e.id !== id);
  saveHistory(history);
}

export function clearHistory() {
  saveHistory([]);
}

/**
 * 히스토리 목록 HTML을 렌더링한다.
 * @param {object[]} history
 * @param {Function} onLoad - (entry) => void
 * @param {Function} onDelete - (id) => void
 * @returns {DocumentFragment}
 */
export function renderHistoryList(history, onLoad, onDelete) {
  const fragment = document.createDocumentFragment();

  for (const entry of history) {
    const item = document.createElement('div');
    item.className = 'history-item';
    item.dataset.id = entry.id;

    const date = new Date(entry.timestamp);
    const dateStr = date.toLocaleDateString('ko-KR', {
      month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit',
    });

    item.innerHTML = `
      <div class="history-meta">
        <span class="history-time">${dateStr}</span>
        <span class="history-script">${escapeHtml(entry.scriptName || '')}</span>
      </div>
      <code class="history-command">${escapeHtml(entry.command)}</code>
      <div class="history-actions">
        <button class="btn btn-sm btn-secondary btn-load" data-id="${entry.id}">불러오기</button>
        <button class="btn btn-sm btn-ghost btn-delete" data-id="${entry.id}">삭제</button>
      </div>
    `;

    item.querySelector('.btn-load').addEventListener('click', () => onLoad(entry));
    item.querySelector('.btn-delete').addEventListener('click', () => onDelete(entry.id));

    fragment.appendChild(item);
  }

  return fragment;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
