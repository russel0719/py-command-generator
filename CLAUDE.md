# Argparse Command Generator — Codebase Summary

## Project Overview

Python `argparse` 코드를 정적 분석해 GUI 폼을 자동 생성하고, 실시간으로 실행 가능한 CLI 명령어를 조합하는 순수 클라이언트 사이드 웹 앱이다. 서버 없이 GitHub Pages에서 동작하며, 빌드 과정이 전혀 없다.

## Tech Stack

- **언어**: Vanilla JavaScript (ES2020+), HTML5, CSS3
- **모듈 시스템**: ES Modules (`type="module"`, `import`/`export`)
- **빌드 도구**: 없음 (빌드 불필요)
- **배포**: GitHub Pages (브랜치 기반, `main` 브랜치 root)
- **외부 의존성**: 없음 (CDN, npm 패키지 전무)

## Directory Structure

```
py-command-generator/
├── index.html      # 단일 HTML 진입점 — 전체 UI 마크업, <script type="module"> 로드
├── style.css       # 전체 스타일 — CSS 변수(:root) 기반 디자인 시스템
└── js/
    ├── app.js      # 진입점 — 이벤트 바인딩, generateCommand(), 앱 상태 관리
    ├── parser.js   # Python argparse 정적 파서 — 핵심 로직
    ├── ui.js       # 폼 렌더링(renderArgsForm), 값 읽기(readFormValues), 복원(restoreFormValues)
    └── history.js  # localStorage 기반 히스토리 CRUD + renderHistoryList()
```

## Architecture

```
[사용자 입력: 코드 or .py 파일]
        │
        ▼
  parser.js: parseArgparseCode()
        │  → stripComments → extractBalancedContent → parseCallContent → buildArgDef
        │
        ▼  argDef[]
  ui.js: renderArgsForm()
        │  → argDef별 컨트롤 생성 (checkbox / select / number / text / multi / tags)
        │
        ▼  form input 이벤트
  app.js: updateCommand() → generateCommand()
        │  → 명령어 문자열 실시간 업데이트
        │
        ▼
  history.js: addToHistory() → localStorage 저장
```

**핵심 패턴**: 상태는 최소화 — `currentArgDefs` 배열 하나만 전역 상태로 관리. 나머지는 DOM에서 직접 읽음.

## Key Components

### `js/parser.js`

Python argparse 코드를 텍스트 파싱해 `argDef` 객체 배열을 반환하는 핵심 모듈.

- **`parseArgparseCode(code)`** — 메인 진입점. `add_argument()` 호출을 모두 추출해 `argDef[]` 반환
- **`stripComments(code)`** — `#` 주석 제거. 문자열 리터럴 내부는 보존 (삼중 따옴표 포함)
- **`extractBalancedContent(code, startIdx)`** — 여는 괄호 위치에서 균형 잡힌 괄호 내용 추출. 중첩 괄호·문자열 모두 처리
- **`splitTopLevel(content, sep=',')`** — 최상위 레벨에서만 구분자로 분리 (중첩 `[...]`, `(...)` 내부 무시)
- **`findTopLevelEq(str)`** — 최상위 `=` 위치 반환 (`==`, `!=` 제외)
- **`parseValue(valStr)`** — Python 리터럴 → JS 값 변환: `True→true`, `False→false`, `None→null`, 숫자, 문자열, 리스트/튜플
- **`buildArgDef(flags, kwargs)`** — 파싱된 정보로 `argDef` 객체 생성. `store_true`/`store_false` default 자동 설정

### `js/app.js`

DOM 진입점. 이벤트 바인딩과 명령어 생성 로직 담당.

- **`generateCommand(env, prefix, script, values, argDefs)`** — 핵심 명령어 생성 함수 (lines 78-126)
  - 위치 인자 → 선택/필수 인자 순으로 처리
  - `store_true`: `val === true && val !== argDef.default`일 때만 flag 추가
  - `store_false`: `val === false && val !== argDef.default`일 때만 flag 추가
  - 일반 인자: `String(val) === String(argDef.default)`이면 생략
  - `count`: flag를 N번 반복
  - `append`: flag+값 쌍 반복
- **`shellQuote(str)`** — 특수문자 포함 시 `"..."` 로 감싸기
- **`handleParse()`** — 파싱 버튼 핸들러
- **`updateCommand()`** — form input 이벤트마다 호출, 명령어 실시간 갱신
- **`handleSaveHistory()` / `handleLoadHistory(entry)`** — 히스토리 저장/복원

### `js/ui.js`

`argDef` 배열로 HTML 폼을 생성하고, 폼 값을 읽거나 복원하는 모듈.

- **`renderArgsForm(argDefs, container)`** — 위치/필수/선택 그룹으로 분류 후 렌더링
- **`createControl(argDef)`** — action/type/choices/nargs에 따라 컨트롤 분기:
  - `store_true|false` → `createCheckbox()`
  - `count` → `createCountInput()` (숫자, 0~10)
  - `append` → `createTagsInput()` (Enter로 태그 추가)
  - `choices` → `createSelect()`
  - `nargs` (숫자) → `createMultiInput()`
  - `nargs` (+/*) → `createTextInput()` (공백 구분)
  - `int/float` → `createNumberInput()`
  - 기본 → `createTextInput()`
- **`readFormValues(container)`** — DOM에서 현재 폼 값 전부 읽어 `{name: value}` 객체 반환
- **`restoreFormValues(container, formState, argDefs)`** — 저장된 히스토리로 폼 복원

**체크박스 초기화 규칙** (`createCheckbox`, line 157-161):
- `store_false`: `input.checked = argDef.default !== false` (default=true이면 체크)
- `store_true`: `input.checked = argDef.default === true` (default=true이면 체크, 아니면 미체크)

### `js/history.js`

localStorage 기반 히스토리 관리.

- **Key**: `'argparse-cmd-history'`, 최대 50개 (`MAX_ENTRIES`)
- **`addToHistory(entry)`** — 새 항목 앞에 추가 (unshift), 초과 시 tail 삭제
- **`removeFromHistory(id)`**, **`clearHistory()`**, **`loadHistory()`**
- **`renderHistoryList(history, onLoad, onDelete)`** — DocumentFragment 반환

## Data Models

### `argDef` 객체 (parser.js `buildArgDef` 반환)

```javascript
{
  flags: string[],         // 원본 플래그 배열 e.g. ['--verbose', '-v']
  isPositional: boolean,   // 위치 인자 여부
  name: string,            // 인자 이름 (dest > primaryFlag 파생)
  primaryFlag: string,     // 명령어에 사용할 대표 플래그 e.g. '--verbose'
  action: string,          // 'store' | 'store_true' | 'store_false' | 'count' | 'append'
  type: string,            // 'str' | 'int' | 'float' (기본 'str')
  choices: any[] | null,   // 선택지 배열 또는 null
  default: any,            // JS 타입으로 변환된 기본값 (boolean, number, string, null)
  required: boolean,
  help: string,
  nargs: number | string | null,  // 정수, '+', '*', 또는 null
  dest: string | null,
  metavar: string | null,
}
```

### 히스토리 엔트리 (`history.js` localStorage)

```javascript
{
  id: string,           // Date.now().toString()
  timestamp: string,    // ISO 8601
  scriptName: string,
  command: string,      // 저장 시점 명령어 문자열
  formState: Object,    // { [argName]: value } — 폼 복원용
  argDefs: argDef[],    // 전체 argDef 배열 — 폼 재렌더링용
  execPrefix: string,   // 'python' | 'python3' | 'uv run' | ''
  // envVars 미저장 — 히스토리 복원 시 항상 ''로 초기화됨 (known gotcha)
}
```

## Entry Points

1. 브라우저가 `index.html` 로드
2. `<script type="module" src="js/app.js">` 실행
3. `app.js` 최하단에서 즉시 `refreshHistory()` 호출 → localStorage 히스토리 렌더링
4. 사용자가 `파싱하기` 버튼 클릭 → `handleParse()` → `parseArgparseCode()` → `renderArgsForm()` → `updateCommand()`

## Configuration

- 설정 파일 없음
- localStorage key: `'argparse-cmd-history'`
- 히스토리 최대 항목: `MAX_ENTRIES = 50` (history.js)
- 로컬 개발 시 HTTP 서버 필요 (ES Module CORS 제약)

## Dependencies

외부 의존성 없음. 브라우저 표준 API만 사용:
- `localStorage` — 히스토리 영속성
- `navigator.clipboard.writeText()` — 복사 (fallback: `document.execCommand('copy')`)
- `FileReader` — .py 파일 읽기
- `DocumentFragment` — 히스토리 렌더링 성능

## Development Workflow

```bash
# 로컬 서버 (ES Module 사용으로 file:// 불가)
python3 -m http.server 8080
# 또는
npx serve .

# 개발: 파일 직접 수정 후 브라우저 새로고침
# 빌드/컴파일/번들링 없음

# 배포: git push origin main (GitHub Pages 자동 배포)
```

## Important Conventions

- `data-arg-name` 속성으로 DOM 엘리먼트와 argDef를 연결
- `data-control-type="multi"|"tags"` 속성으로 복합 컨트롤 식별
- 모든 내부 함수는 `export` 없이 모듈 내부에서만 사용
- HTML escape는 `escapeHtml()`로 (app.js와 history.js 각자 보유)
- 폼 이벤트는 `input`과 `change` 둘 다 바인딩 (체크박스는 `change`만 발생)

## Known Gotchas

1. **환경변수 미저장**: `addToHistory()`가 `envVars`를 히스토리 엔트리에 포함하지 않음 → 불러오기 시 환경변수 항상 초기화
2. **store_true/false default 처리**: `val !== argDef.default` 비교로 default와 동일한 값은 명령어에 포함 안 함. `default=True`인 `store_true`는 체크해도 `--flag` 미출력
3. **멀티라인 add_argument**: `extractBalancedContent`가 괄호 depth로 처리하므로 정상 파싱됨
4. **subparsers 미지원**: 감지 시 경고 표시하나 파싱 불완전
5. **정적 분석 한계**: 런타임 동적 인자 (`if condition: parser.add_argument(...)`) 파싱 불가
6. **GitHub Pages CDN 캐시**: 푸시 후 브라우저 강제 새로고침(Ctrl+Shift+R) 필요할 수 있음
7. **`document.execCommand('copy')` deprecated**: clipboard API fallback으로만 사용, IDE 경고 무시 가능
