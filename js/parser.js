/**
 * Python argparse 코드 파서
 * add_argument() 호출을 분석해 구조화된 argument 정의 배열을 반환한다.
 */

/**
 * 주석(#)을 제거하되, 문자열 리터럴 내부는 보존한다.
 */
function stripComments(code) {
  let result = '';
  let i = 0;

  while (i < code.length) {
    const ch = code[i];
    const peek3 = code.substring(i, i + 3);

    if (peek3 === '"""' || peek3 === "'''") {
      const quote = peek3;
      const end = code.indexOf(quote, i + 3);
      if (end === -1) {
        result += code.substring(i);
        break;
      }
      result += code.substring(i, end + 3);
      i = end + 3;
    } else if (ch === '"' || ch === "'") {
      let j = i + 1;
      result += ch;
      while (j < code.length && code[j] !== ch) {
        if (code[j] === '\\') {
          result += code[j] + (code[j + 1] || '');
          j += 2;
        } else {
          result += code[j++];
        }
      }
      result += ch;
      i = j + 1;
    } else if (ch === '#') {
      while (i < code.length && code[i] !== '\n') i++;
    } else {
      result += ch;
      i++;
    }
  }
  return result;
}

/**
 * startIdx(여는 괄호 위치)에서 시작해 균형 잡힌 괄호 안의 내용을 추출한다.
 * @returns {{ content: string, endIdx: number }}
 */
function extractBalancedContent(code, startIdx) {
  let depth = 0;
  let i = startIdx;
  let inStr = false;
  let strChar = null;
  let tripleQuote = false;
  let result = '';

  while (i < code.length) {
    const ch = code[i];
    const peek3 = code.substring(i, i + 3);

    if (inStr) {
      if (tripleQuote) {
        const endQ = strChar.repeat(3);
        if (code.substring(i, i + 3) === endQ) {
          result += endQ;
          i += 3;
          inStr = false;
          continue;
        }
      } else {
        if (ch === strChar && code[i - 1] !== '\\') {
          inStr = false;
          result += ch;
          i++;
          continue;
        }
      }
      result += ch;
    } else if (peek3 === '"""' || peek3 === "'''") {
      inStr = true;
      tripleQuote = true;
      strChar = ch;
      result += peek3;
      i += 3;
      continue;
    } else if (ch === '"' || ch === "'") {
      inStr = true;
      tripleQuote = false;
      strChar = ch;
      result += ch;
    } else if (ch === '(') {
      depth++;
      if (depth > 1) result += ch;
    } else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return { content: result, endIdx: i };
      }
      result += ch;
    } else {
      result += ch;
    }
    i++;
  }
  return { content: result, endIdx: i };
}

/**
 * 문자열 내에서 최상위 레벨의 '=' 위치를 찾는다 (==, !=는 제외).
 */
function findTopLevelEq(str) {
  let depth = 0;
  let inStr = false;
  let strChar = null;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if (inStr) {
      if (ch === strChar && str[i - 1] !== '\\') inStr = false;
    } else if (ch === '"' || ch === "'") {
      inStr = true;
      strChar = ch;
    } else if ('([{'.includes(ch)) {
      depth++;
    } else if (')]}'.includes(ch)) {
      depth--;
    } else if (ch === '=' && depth === 0) {
      const prev = str[i - 1];
      const next = str[i + 1];
      if (prev !== '!' && prev !== '=' && next !== '=') {
        return i;
      }
    }
  }
  return -1;
}

/**
 * 최상위 레벨의 구분자(sep)로 문자열을 분리한다.
 */
function splitTopLevel(content, sep = ',') {
  const parts = [];
  let depth = 0;
  let inStr = false;
  let strChar = null;
  let tripleQuote = false;
  let current = '';
  let i = 0;

  while (i < content.length) {
    const ch = content[i];
    const peek3 = content.substring(i, i + 3);

    if (inStr) {
      if (tripleQuote) {
        const endQ = strChar.repeat(3);
        if (content.substring(i, i + 3) === endQ) {
          current += endQ;
          i += 3;
          inStr = false;
          continue;
        }
      } else {
        if (ch === strChar && content[i - 1] !== '\\') {
          inStr = false;
          current += ch;
          i++;
          continue;
        }
      }
      current += ch;
    } else if (peek3 === '"""' || peek3 === "'''") {
      inStr = true;
      tripleQuote = true;
      strChar = ch;
      current += peek3;
      i += 3;
      continue;
    } else if (ch === '"' || ch === "'") {
      inStr = true;
      tripleQuote = false;
      strChar = ch;
      current += ch;
    } else if ('([{'.includes(ch)) {
      depth++;
      current += ch;
    } else if (')]}'.includes(ch)) {
      depth--;
      current += ch;
    } else if (ch === sep && depth === 0) {
      parts.push(current.trim());
      current = '';
      i++;
      continue;
    } else {
      current += ch;
    }
    i++;
  }
  if (current.trim()) parts.push(current.trim());
  return parts;
}

/**
 * Python 리터럴 문자열을 JS 값으로 변환한다.
 */
function parseValue(valStr) {
  valStr = valStr.trim();
  if (!valStr) return null;

  if (valStr === 'True') return true;
  if (valStr === 'False') return false;
  if (valStr === 'None') return null;

  // 숫자
  if (/^-?\d+$/.test(valStr)) return parseInt(valStr, 10);
  if (/^-?\d+\.\d*([eE][+-]?\d+)?$/.test(valStr)) return parseFloat(valStr);

  // 문자열 리터럴
  if (valStr.startsWith("'''") && valStr.endsWith("'''")) return valStr.slice(3, -3);
  if (valStr.startsWith('"""') && valStr.endsWith('"""')) return valStr.slice(3, -3);
  if (valStr.startsWith("'") && valStr.endsWith("'")) return valStr.slice(1, -1);
  if (valStr.startsWith('"') && valStr.endsWith('"')) return valStr.slice(1, -1);

  // 리스트
  if (valStr.startsWith('[') && valStr.endsWith(']')) {
    const inner = valStr.slice(1, -1).trim();
    if (!inner) return [];
    return splitTopLevel(inner).map(parseValue);
  }

  // 튜플
  if (valStr.startsWith('(') && valStr.endsWith(')')) {
    const inner = valStr.slice(1, -1).trim();
    if (!inner) return [];
    return splitTopLevel(inner).map(parseValue);
  }

  // 타입 참조 등 식별자 그대로 반환 (int, float, str, ...)
  return valStr;
}

/**
 * add_argument(...) 내부 콘텐츠를 파싱해 flag 목록과 kwargs를 반환한다.
 */
function parseCallContent(content) {
  const parts = splitTopLevel(content);
  const flags = [];
  const kwargs = {};

  for (const part of parts) {
    if (!part) continue;
    const eqIdx = findTopLevelEq(part);
    if (eqIdx !== -1) {
      const key = part.substring(0, eqIdx).trim();
      const val = part.substring(eqIdx + 1).trim();
      kwargs[key] = parseValue(val);
    } else {
      const val = parseValue(part);
      if (typeof val === 'string') flags.push(val);
    }
  }

  return { flags, kwargs };
}

/**
 * 파싱된 flags/kwargs로 구조화된 argument 정의 객체를 만든다.
 */
function buildArgDef(flags, kwargs) {
  const isPositional = flags.length > 0 && !flags[0].startsWith('-');
  const action = typeof kwargs.action === 'string' ? kwargs.action : 'store';

  const arg = {
    flags,
    isPositional,
    name: null,
    primaryFlag: null,
    action,
    type: kwargs.type || 'str',
    choices: Array.isArray(kwargs.choices) ? kwargs.choices : null,
    default: kwargs.default !== undefined ? kwargs.default : null,
    required: kwargs.required === true || false,
    help: typeof kwargs.help === 'string' ? kwargs.help : '',
    nargs: kwargs.nargs !== undefined ? kwargs.nargs : null,
    dest: typeof kwargs.dest === 'string' ? kwargs.dest : null,
    metavar: typeof kwargs.metavar === 'string' ? kwargs.metavar : null,
  };

  if (isPositional) {
    arg.name = arg.dest || flags[0];
    arg.primaryFlag = null;
  } else {
    const longFlag = flags.find(f => f.startsWith('--'));
    const shortFlag = flags.find(f => f.startsWith('-') && !f.startsWith('--'));
    arg.primaryFlag = longFlag || shortFlag || flags[0];
    arg.name = arg.dest || (arg.primaryFlag
      ? arg.primaryFlag.replace(/^--?/, '').replace(/-/g, '_')
      : flags[0]);
  }

  // store_false: 기본값을 true로 설정
  if (action === 'store_false' && arg.default === null) {
    arg.default = true;
  }
  // store_true: 기본값을 false로 설정
  if (action === 'store_true' && arg.default === null) {
    arg.default = false;
  }

  return arg;
}

/**
 * Python argparse 소스 코드를 파싱한다.
 * @param {string} code - Python 소스 코드
 * @returns {{ prog: string, description: string, args: object[], hasSubparsers: boolean, warnings: string[] }}
 */
export function parseArgparseCode(code) {
  const result = {
    prog: '',
    description: '',
    args: [],
    hasSubparsers: false,
    warnings: [],
  };

  const cleanCode = stripComments(code);

  // ArgumentParser 정보 추출
  const apMatch = cleanCode.match(/ArgumentParser\s*\(/);
  if (apMatch) {
    const startIdx = apMatch.index + apMatch[0].length - 1;
    const { content } = extractBalancedContent(cleanCode, startIdx);
    const { kwargs } = parseCallContent(content);
    if (typeof kwargs.prog === 'string') result.prog = kwargs.prog;
    if (typeof kwargs.description === 'string') result.description = kwargs.description;
  }

  // subparsers 감지
  if (/\.add_subparsers\s*\(/.test(cleanCode)) {
    result.hasSubparsers = true;
    result.warnings.push(
      'subparsers가 감지되었습니다. 현재 버전에서는 subparser 구조를 완전히 지원하지 않으므로 일부 인자가 누락되거나 잘못 표시될 수 있습니다.'
    );
  }

  // add_argument 호출 모두 추출
  const addArgRegex = /\.add_argument\s*\(/g;
  let match;
  while ((match = addArgRegex.exec(cleanCode)) !== null) {
    const startIdx = match.index + match[0].length - 1;
    const { content } = extractBalancedContent(cleanCode, startIdx);
    const { flags, kwargs } = parseCallContent(content);
    if (flags.length > 0) {
      result.args.push(buildArgDef(flags, kwargs));
    }
  }

  if (result.args.length === 0 && !apMatch) {
    result.warnings.push('argparse 코드를 찾을 수 없습니다. ArgumentParser와 add_argument() 호출이 포함된 코드인지 확인해주세요.');
  }

  return result;
}
