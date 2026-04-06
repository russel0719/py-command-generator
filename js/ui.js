/**
 * argparse argument 정의로부터 UI 폼 컴포넌트를 생성한다.
 */

/**
 * argument 정의 배열로 폼 HTML을 렌더링한다.
 * @param {object[]} argDefs
 * @param {HTMLElement} container
 */
export function renderArgsForm(argDefs, container) {
  container.innerHTML = '';

  const positionals = argDefs.filter(a => a.isPositional);
  const requireds = argDefs.filter(a => !a.isPositional && a.required);
  const optionals = argDefs.filter(a => !a.isPositional && !a.required);

  if (positionals.length > 0) {
    container.appendChild(createGroup('위치 인자 (positional)', positionals));
  }
  if (requireds.length > 0) {
    container.appendChild(createGroup('필수 인자 (required)', requireds));
  }
  if (optionals.length > 0) {
    container.appendChild(createGroup('선택 인자 (optional)', optionals));
  }
}

function createGroup(title, argDefs) {
  const group = document.createElement('div');
  group.className = 'arg-group';

  const heading = document.createElement('div');
  heading.className = 'arg-group-title';
  heading.textContent = title;
  group.appendChild(heading);

  for (const argDef of argDefs) {
    group.appendChild(createArgRow(argDef));
  }

  return group;
}

/**
 * argument 하나에 대한 폼 행(row)을 생성한다.
 */
function createArgRow(argDef) {
  const row = document.createElement('div');
  row.className = 'arg-row';
  row.dataset.argName = argDef.name;

  // 라벨 영역
  const labelWrap = document.createElement('div');
  labelWrap.className = 'arg-label';

  const flagEl = document.createElement('span');
  flagEl.className = 'arg-flag';
  flagEl.textContent = argDef.isPositional
    ? argDef.name
    : (argDef.primaryFlag || `--${argDef.name}`);
  labelWrap.appendChild(flagEl);

  if (argDef.required) {
    const req = document.createElement('span');
    req.className = 'required-badge';
    req.title = '필수 인자';
    req.textContent = '*';
    labelWrap.appendChild(req);
  }

  const typeBadge = document.createElement('span');
  typeBadge.className = 'arg-type-badge';
  typeBadge.textContent = getTypeBadgeText(argDef);
  labelWrap.appendChild(typeBadge);

  row.appendChild(labelWrap);

  // 컨트롤 영역
  const controlWrap = document.createElement('div');
  controlWrap.className = 'arg-control';
  controlWrap.appendChild(createControl(argDef));
  row.appendChild(controlWrap);

  // help 텍스트
  if (argDef.help) {
    const helpEl = document.createElement('div');
    helpEl.className = 'arg-help';
    helpEl.textContent = argDef.help;
    row.appendChild(helpEl);
  }

  return row;
}

function getTypeBadgeText(argDef) {
  if (argDef.action === 'store_true') return 'flag';
  if (argDef.action === 'store_false') return 'flag';
  if (argDef.action === 'count') return 'count';
  if (argDef.action === 'append') return 'list';
  if (argDef.choices) return 'choice';
  if (argDef.nargs !== null) return `nargs=${argDef.nargs}`;
  if (argDef.type === 'int') return 'int';
  if (argDef.type === 'float') return 'float';
  return 'str';
}

/**
 * argument 타입에 맞는 컨트롤 엘리먼트를 생성한다.
 */
function createControl(argDef) {
  const { action, choices, type, nargs, default: def } = argDef;

  if (action === 'store_true' || action === 'store_false') {
    return createCheckbox(argDef);
  }

  if (action === 'count') {
    return createCountInput(argDef);
  }

  if (action === 'append') {
    return createTagsInput(argDef);
  }

  if (choices && choices.length > 0) {
    return createSelect(argDef);
  }

  if (typeof nargs === 'number' && nargs > 1) {
    return createMultiInput(argDef);
  }

  if (nargs === '+' || nargs === '*') {
    return createTextInput(argDef, '공백으로 구분하여 여러 값 입력');
  }

  if (type === 'int') {
    return createNumberInput(argDef, 1);
  }

  if (type === 'float') {
    return createNumberInput(argDef, 'any');
  }

  return createTextInput(argDef);
}

function createCheckbox(argDef) {
  const wrap = document.createElement('label');
  wrap.className = 'checkbox-wrap';

  const input = document.createElement('input');
  input.type = 'checkbox';
  input.dataset.argName = argDef.name;

  // store_true: 기본 unchecked, store_false: 기본 checked
  if (argDef.action === 'store_false') {
    input.checked = argDef.default !== false;
  } else {
    input.checked = argDef.default === true;
  }

  const label = document.createElement('span');
  label.textContent = input.checked ? '활성화됨' : '비활성화됨';
  input.addEventListener('change', () => {
    label.textContent = input.checked ? '활성화됨' : '비활성화됨';
  });

  wrap.appendChild(input);
  wrap.appendChild(label);
  return wrap;
}

function createCountInput(argDef) {
  const input = document.createElement('input');
  input.type = 'number';
  input.min = '0';
  input.max = '10';
  input.step = '1';
  input.value = typeof argDef.default === 'number' ? argDef.default : 0;
  input.dataset.argName = argDef.name;
  return input;
}

function createSelect(argDef) {
  const select = document.createElement('select');
  select.dataset.argName = argDef.name;

  if (!argDef.required && !argDef.isPositional) {
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- 선택 안 함 --';
    select.appendChild(placeholder);
  }

  for (const choice of argDef.choices) {
    const option = document.createElement('option');
    option.value = String(choice);
    option.textContent = String(choice);
    if (argDef.default !== null && String(choice) === String(argDef.default)) {
      option.selected = true;
    }
    select.appendChild(option);
  }

  return select;
}

function createNumberInput(argDef, step = 1) {
  const input = document.createElement('input');
  input.type = 'number';
  input.step = step;
  input.dataset.argName = argDef.name;

  if (argDef.default !== null && argDef.default !== undefined) {
    input.value = argDef.default;
  }
  if (argDef.required || argDef.isPositional) {
    input.placeholder = '값 입력';
  }
  return input;
}

function createTextInput(argDef, placeholder = '') {
  const input = document.createElement('input');
  input.type = 'text';
  input.dataset.argName = argDef.name;
  input.placeholder = placeholder || (argDef.metavar || argDef.name.toUpperCase());

  if (argDef.default !== null && argDef.default !== undefined) {
    input.value = String(argDef.default);
  }
  return input;
}

function createMultiInput(argDef) {
  const wrap = document.createElement('div');
  wrap.className = 'multi-input';
  wrap.dataset.argName = argDef.name;
  wrap.dataset.controlType = 'multi';

  const count = argDef.nargs;
  for (let i = 0; i < count; i++) {
    const input = document.createElement('input');
    input.type = argDef.type === 'int' ? 'number' : 'text';
    input.placeholder = `값 ${i + 1}`;
    wrap.appendChild(input);
  }
  return wrap;
}

function createTagsInput(argDef) {
  const wrap = document.createElement('div');
  wrap.className = 'tags-control';
  wrap.dataset.argName = argDef.name;
  wrap.dataset.controlType = 'tags';

  const tagList = document.createElement('div');
  tagList.className = 'tag-list';
  wrap.appendChild(tagList);

  const inputRow = document.createElement('div');
  inputRow.className = 'tag-input-row';

  const textInput = document.createElement('input');
  textInput.type = 'text';
  textInput.placeholder = '값 입력 후 Enter';

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-sm btn-secondary';
  addBtn.textContent = '+';

  const addTag = () => {
    const val = textInput.value.trim();
    if (!val) return;
    addTagChip(tagList, val, wrap);
    textInput.value = '';
    textInput.focus();
    wrap.dispatchEvent(new Event('change', { bubbles: true }));
  };

  addBtn.addEventListener('click', addTag);
  textInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); addTag(); }
  });

  inputRow.appendChild(textInput);
  inputRow.appendChild(addBtn);
  wrap.appendChild(inputRow);

  return wrap;
}

function addTagChip(tagList, value, container) {
  const chip = document.createElement('span');
  chip.className = 'tag-chip';
  chip.dataset.value = value;

  const text = document.createElement('span');
  text.textContent = value;

  const removeBtn = document.createElement('button');
  removeBtn.type = 'button';
  removeBtn.className = 'tag-remove';
  removeBtn.textContent = 'x';
  removeBtn.addEventListener('click', () => {
    chip.remove();
    container.dispatchEvent(new Event('change', { bubbles: true }));
  });

  chip.appendChild(text);
  chip.appendChild(removeBtn);
  tagList.appendChild(chip);
}

/**
 * 폼 컨테이너에서 현재 모든 인자 값을 읽어 반환한다.
 * @param {HTMLElement} container
 * @returns {Object.<string, any>}
 */
export function readFormValues(container) {
  const values = {};

  // 체크박스
  container.querySelectorAll('input[type="checkbox"][data-arg-name]').forEach(el => {
    values[el.dataset.argName] = el.checked;
  });

  // 일반 input (text, number), count
  container.querySelectorAll('input[type="text"][data-arg-name], input[type="number"][data-arg-name]').forEach(el => {
    values[el.dataset.argName] = el.value;
  });

  // select
  container.querySelectorAll('select[data-arg-name]').forEach(el => {
    values[el.dataset.argName] = el.value;
  });

  // 다중 입력 (multi)
  container.querySelectorAll('[data-control-type="multi"][data-arg-name]').forEach(wrap => {
    const vals = Array.from(wrap.querySelectorAll('input')).map(i => i.value.trim());
    values[wrap.dataset.argName] = vals;
  });

  // 태그 입력 (tags/append)
  container.querySelectorAll('[data-control-type="tags"][data-arg-name]').forEach(wrap => {
    const tags = Array.from(wrap.querySelectorAll('.tag-chip')).map(c => c.dataset.value);
    values[wrap.dataset.argName] = tags;
  });

  return values;
}

/**
 * 저장된 폼 상태로 폼을 복원한다.
 * @param {HTMLElement} container
 * @param {Object} formState
 * @param {object[]} argDefs
 */
export function restoreFormValues(container, formState, argDefs) {
  for (const argDef of argDefs) {
    const val = formState[argDef.name];
    if (val === undefined) continue;

    if (argDef.action === 'store_true' || argDef.action === 'store_false') {
      const el = container.querySelector(`input[type="checkbox"][data-arg-name="${argDef.name}"]`);
      if (el) {
        el.checked = Boolean(val);
        el.dispatchEvent(new Event('change'));
      }
    } else if (argDef.action === 'append') {
      const wrap = container.querySelector(`[data-control-type="tags"][data-arg-name="${argDef.name}"]`);
      if (wrap && Array.isArray(val)) {
        const tagList = wrap.querySelector('.tag-list');
        tagList.innerHTML = '';
        for (const v of val) addTagChip(tagList, v, wrap);
      }
    } else if (typeof argDef.nargs === 'number' && argDef.nargs > 1) {
      const wrap = container.querySelector(`[data-control-type="multi"][data-arg-name="${argDef.name}"]`);
      if (wrap && Array.isArray(val)) {
        wrap.querySelectorAll('input').forEach((input, i) => {
          input.value = val[i] || '';
        });
      }
    } else {
      const el = container.querySelector(`[data-arg-name="${argDef.name}"]:not([data-control-type])`);
      if (el) el.value = val;
    }
  }
}
