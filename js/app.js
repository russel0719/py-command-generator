/**
 * 진입점: 이벤트 바인딩 및 전체 앱 로직
 */

import { parseArgparseCode } from './parser.js';
import { renderArgsForm, readFormValues, restoreFormValues } from './ui.js';
import {
  loadHistory, addToHistory, removeFromHistory, clearHistory, renderHistoryList,
} from './history.js';

// ---------- 상태 ----------
let currentArgDefs = [];

// ---------- DOM ----------
const codeInput = document.getElementById('code-input');
const fileInput = document.getElementById('file-input');
const parseBtn = document.getElementById('parse-btn');
const clearBtn = document.getElementById('clear-btn');
const dropzone = document.getElementById('dropzone');
const dropOverlay = document.getElementById('drop-overlay');
const warningsEl = document.getElementById('warnings');
const argsSection = document.getElementById('args-section');
const commandSection = document.getElementById('command-section');
const envVars = document.getElementById('env-vars');
const execPrefix = document.getElementById('exec-prefix');
const scriptName = document.getElementById('script-name');
const argsForm = document.getElementById('args-form');
const commandText = document.getElementById('command-text');
const copyBtn = document.getElementById('copy-btn');
const copyIcon = document.getElementById('copy-icon');
const saveHistoryBtn = document.getElementById('save-history-btn');
const historyList = document.getElementById('history-list');
const historyEmpty = document.getElementById('history-empty');
const clearHistoryBtn = document.getElementById('clear-history-btn');

// ---------- 파싱 ----------
function handleParse() {
  const code = codeInput.value.trim();
  if (!code) {
    showWarnings(['코드를 입력해주세요.']);
    return;
  }

  let parsed;
  try {
    parsed = parseArgparseCode(code);
  } catch (err) {
    showWarnings([`파싱 오류: ${err.message}`]);
    return;
  }

  currentArgDefs = parsed.args;

  if (parsed.warnings.length > 0) {
    showWarnings(parsed.warnings);
  } else {
    hideWarnings();
  }

  if (parsed.prog) scriptName.value = parsed.prog;

  renderArgsForm(currentArgDefs, argsForm);

  argsSection.hidden = false;
  commandSection.hidden = false;
  commandSection.scrollIntoView({ behavior: 'smooth' });

  updateCommand();
}

// ---------- 명령어 생성 ----------
function updateCommand() {
  const values = readFormValues(argsForm);
  const cmd = generateCommand(envVars.value.trim(), execPrefix.value, scriptName.value, values, currentArgDefs);
  commandText.textContent = cmd || '(명령어가 비어있습니다)';
}

function generateCommand(env, prefix, script, values, argDefs) {
  const parts = [];

  if (env) parts.push(env);
  if (prefix) parts.push(prefix);
  if (script) parts.push(script);

  // 위치 인자 먼저
  for (const argDef of argDefs.filter(a => a.isPositional)) {
    const val = values[argDef.name];
    if (val !== undefined && val !== '') parts.push(shellQuote(String(val)));
  }

  // 선택/필수 인자
  for (const argDef of argDefs.filter(a => !a.isPositional)) {
    const val = values[argDef.name];
    const flag = argDef.primaryFlag || `--${argDef.name.replace(/_/g, '-')}`;

    if (argDef.action === 'store_true') {
      if (val === true && val !== argDef.default) parts.push(flag);
    } else if (argDef.action === 'store_false') {
      if (val === false && val !== argDef.default) parts.push(flag);
    } else if (argDef.action === 'count') {
      const count = parseInt(val, 10) || 0;
      for (let i = 0; i < count; i++) parts.push(flag);
    } else if (argDef.action === 'append') {
      if (Array.isArray(val)) {
        for (const item of val) parts.push(flag, shellQuote(item));
      }
    } else if (Array.isArray(val)) {
      // multi nargs
      const filtered = val.filter(v => v !== '');
      if (filtered.length > 0) parts.push(flag, ...filtered.map(shellQuote));
    } else if (typeof argDef.nargs === 'string' && (argDef.nargs === '+' || argDef.nargs === '*')) {
      // space-separated values in a single text field
      if (val && val.trim()) {
        const items = val.trim().split(/\s+/).filter(Boolean);
        if (items.length > 0) parts.push(flag, ...items.map(shellQuote));
      }
    } else {
      if (val !== undefined && val !== '' && val !== null) {
        if (argDef.default !== null && argDef.default !== undefined && String(val) === String(argDef.default)) continue;
        parts.push(flag, shellQuote(String(val)));
      }
    }
  }

  return parts.join(' ');
}

function shellQuote(str) {
  if (/[\s"'\\`$&|;<>(){}]/.test(str)) {
    return `"${str.replace(/"/g, '\\"')}"`;
  }
  return str;
}

// ---------- 클립보드 복사 ----------
async function handleCopy() {
  const cmd = commandText.textContent;
  if (!cmd || cmd === '(명령어가 비어있습니다)') return;

  try {
    await navigator.clipboard.writeText(cmd);
    copyIcon.textContent = '확인됨';
    setTimeout(() => { copyIcon.textContent = '복사'; }, 1500);
  } catch {
    // 대안: textarea 선택
    const ta = document.createElement('textarea');
    ta.value = cmd;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    ta.remove();
    copyIcon.textContent = '확인됨';
    setTimeout(() => { copyIcon.textContent = '복사'; }, 1500);
  }
}

// ---------- 히스토리 ----------
function handleSaveHistory() {
  const cmd = commandText.textContent;
  if (!cmd || cmd === '(명령어가 비어있습니다)') return;

  addToHistory({
    scriptName: scriptName.value,
    command: cmd,
    formState: readFormValues(argsForm),
    argDefs: currentArgDefs,
    execPrefix: execPrefix.value,
    envVars: envVars.value.trim(),
  });

  refreshHistory();
}

function handleLoadHistory(entry) {
  if (!entry.argDefs || entry.argDefs.length === 0) return;

  // 코드 입력창은 비워두고 argDefs로 직접 폼 복원
  currentArgDefs = entry.argDefs;

  envVars.value = entry.envVars || '';
  execPrefix.value = entry.execPrefix || 'python';
  scriptName.value = entry.scriptName || '';

  renderArgsForm(currentArgDefs, argsForm);
  argsSection.hidden = false;
  commandSection.hidden = false;

  restoreFormValues(argsForm, entry.formState || {}, currentArgDefs);
  updateCommand();

  argsSection.scrollIntoView({ behavior: 'smooth' });
}

function handleDeleteHistory(id) {
  removeFromHistory(id);
  refreshHistory();
}

function refreshHistory() {
  const history = loadHistory();
  historyList.innerHTML = '';

  if (history.length === 0) {
    historyEmpty.hidden = false;
    clearHistoryBtn.hidden = true;
  } else {
    historyEmpty.hidden = true;
    clearHistoryBtn.hidden = false;
    historyList.appendChild(
      renderHistoryList(history, handleLoadHistory, handleDeleteHistory)
    );
  }
}

// ---------- 경고 ----------
function showWarnings(messages) {
  warningsEl.innerHTML = messages.map(m => `<p>${escapeHtml(m)}</p>`).join('');
  warningsEl.hidden = false;
}

function hideWarnings() {
  warningsEl.hidden = true;
  warningsEl.innerHTML = '';
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

// ---------- 파일 입력 ----------
function loadFile(file) {
  if (!file || !file.name.endsWith('.py')) {
    showWarnings(['Python 파일(.py)만 지원합니다.']);
    return;
  }
  const reader = new FileReader();
  reader.onload = e => {
    codeInput.value = e.target.result;
  };
  reader.readAsText(file);
}

// ---------- 드래그앤드롭 ----------
dropzone.addEventListener('dragover', e => {
  e.preventDefault();
  dropOverlay.classList.add('active');
});

dropzone.addEventListener('dragleave', e => {
  if (!dropzone.contains(e.relatedTarget)) {
    dropOverlay.classList.remove('active');
  }
});

dropzone.addEventListener('drop', e => {
  e.preventDefault();
  dropOverlay.classList.remove('active');
  const file = e.dataTransfer.files[0];
  if (file) loadFile(file);
});

// ---------- 이벤트 등록 ----------
parseBtn.addEventListener('click', handleParse);

clearBtn.addEventListener('click', () => {
  codeInput.value = '';
  argsSection.hidden = true;
  commandSection.hidden = true;
  hideWarnings();
  currentArgDefs = [];
  argsForm.innerHTML = '';
  commandText.textContent = '';
  scriptName.value = '';
});

fileInput.addEventListener('change', e => {
  if (e.target.files[0]) loadFile(e.target.files[0]);
  fileInput.value = '';
});

envVars.addEventListener('input', updateCommand);
execPrefix.addEventListener('change', updateCommand);
scriptName.addEventListener('input', updateCommand);

argsForm.addEventListener('input', updateCommand);
argsForm.addEventListener('change', updateCommand);

copyBtn.addEventListener('click', handleCopy);
saveHistoryBtn.addEventListener('click', handleSaveHistory);

clearHistoryBtn.addEventListener('click', () => {
  if (confirm('히스토리를 모두 삭제하시겠습니까?')) {
    clearHistory();
    refreshHistory();
  }
});

// ---------- 초기화 ----------
refreshHistory();
