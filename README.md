# Argparse Command Generator

Python argparse 스크립트를 분석해 명령어를 쉽게 조합하는 웹 도구

## 소개 (Introduction)

Python `argparse` 코드를 붙여넣거나 `.py` 파일을 드래그하면, 인자 목록을 GUI 폼으로 렌더링해 줍니다. 각 인자를 폼에서 설정하면 실행 가능한 명령어가 실시간으로 생성됩니다. 생성된 명령어는 클립보드 복사 및 히스토리 저장이 가능합니다.

## 주요 기능 (Key Features)

- Python argparse 코드를 정적 분석해 인자 목록 추출
- `.py` 파일 드래그&드롭 / 파일 열기 지원
- 인자 타입에 맞는 컨트롤 자동 생성 (텍스트, 숫자, 선택, 체크박스, 다중 입력, 태그)
- 환경변수 설정 (`CUDA_VISIBLE_DEVICES=1` 등)
- 실행 접두어 선택 (`python`, `python3`, `uv run`, 없음)
- 생성 명령어 클립보드 복사
- 명령어 히스토리 저장/불러오기/삭제 (localStorage, 최대 50개)

## 시작하기 (Getting Started)

### 요구사항 (Requirements)

- 모던 웹 브라우저 (Chrome, Firefox, Edge, Safari 최신 버전)
- 별도 서버 설치 불필요 — 정적 파일만으로 동작

### 설치 (Installation)

저장소를 클론하거나 파일을 다운로드합니다.

```bash
git clone https://github.com/russel0719/py-command-generator.git
cd py-command-generator
```

### 실행 (Running)

ES Module(`type="module"`)을 사용하므로 로컬 HTTP 서버가 필요합니다.

```bash
# Python 내장 서버
python3 -m http.server 8080

# 또는 Node.js 기반
npx serve .
```

브라우저에서 `http://localhost:8080` 접속

## 프로젝트 구조 (Project Structure)

```
py-command-generator/
├── index.html          # 단일 HTML 진입점, 전체 UI 마크업
├── style.css           # 전체 스타일 (CSS 변수 기반 디자인 시스템)
└── js/
    ├── app.js          # 진입점: 이벤트 바인딩 및 앱 로직
    ├── parser.js       # Python argparse 코드 파서
    ├── ui.js           # 폼 렌더링 및 폼 값 읽기/복원
    └── history.js      # 히스토리 관리 (localStorage)
```

## 사용법 (Usage)

1. **코드 입력**: Python argparse 코드를 텍스트 영역에 붙여넣거나 `.py` 파일을 드래그합니다.
2. **파싱하기**: `파싱하기` 버튼을 클릭합니다.
3. **옵션 설정**: 환경변수(`CUDA_VISIBLE_DEVICES` 등)와 각 인자 값을 입력합니다.
4. **명령어 복사**: 실시간으로 생성된 명령어를 `복사` 버튼으로 복사합니다.
5. **히스토리 저장**: `히스토리에 저장` 버튼으로 나중에 재사용할 수 있습니다.

### 지원하는 argparse 기능

| argparse 기능               | UI 컨트롤                |
| --------------------------- | ------------------------ |
| 위치 인자 (positional)      | 텍스트/숫자 입력         |
| `--flag` (선택 인자)        | 텍스트/숫자 입력         |
| `choices=[...]`             | 드롭다운 선택            |
| `action='store_true/false'` | 체크박스                 |
| `action='count'`            | 숫자 입력 (0~10)         |
| `action='append'`           | 태그 입력 (Enter로 추가) |
| `nargs=N`                   | N개 입력 필드            |
| `nargs='+' or '*'`          | 공백 구분 텍스트 입력    |
| `type=int/float`            | 숫자 입력                |

## 배포 (Deployment)

### GitHub Pages

빌드 없이 정적 파일 그대로 배포 가능합니다.

1. GitHub에 저장소 생성 후 push

```bash
git remote add origin https://github.com/russel0719/py-command-generator.git
git push -u origin main
```

2. 저장소 **Settings → Pages** 이동
3. **Source**: `Deploy from a branch` 선택
4. **Branch**: `main` / `/ (root)` 선택 후 **Save**
5. 잠시 후 `https://russel0719.github.io/py-command-generator/` 에서 접근 가능

> GitHub Pages는 HTTPS로 서빙되므로 ES Module CORS 문제 없이 동작합니다.

## 개발 (Development)

빌드 과정 없음. HTML/CSS/JS 파일을 직접 수정하고 브라우저에서 확인합니다.

- **파서 수정**: `js/parser.js` — argparse 코드 분석 로직
- **UI 수정**: `js/ui.js` — 폼 컴포넌트 생성 로직
- **스타일 수정**: `style.css` — `:root`의 CSS 변수로 테마 조정 가능

## 제한 사항 (Limitations)

- `add_subparsers()` 기반 서브커맨드 구조는 부분적으로만 지원
- 런타임에 동적으로 생성되는 인자는 파싱 불가
- Python 코드의 실제 실행 없이 정적 텍스트 분석에만 의존
