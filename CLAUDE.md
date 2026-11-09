# customer-web — Claude Code 작업 규칙

Returns(리턴증권, 교육용 가상 증권사) RIA 고객 웹. Claude Design 원본을 React로 옮긴 프로젝트이며, 7개 페이지 전환이 끝났고 지금은 백엔드 연결 단계다.

## 스택·실행
- Vite 8 + React 19 + TypeScript + react-router-dom v7, axios(`src/api/client.ts`, `VITE_API_BASE_URL`, 기본 http://localhost:10000), oxlint
- Node 22(conda 환경 `returns-web`). `npm run dev`(5173), `npm run build`, `npm run lint`
- 랜딩 전용 라이브러리: gsap 3.12.5, lenis 1.1.13, d3-geo 3.1.1, d3-array 3.2.4, topojson-client 3.1.0 (버전 고정, ^ 없음)

## 폴더·라우트
- `/` 랜딩, `/login`, `/home`, `/account`, `/invest`, `/community`, `/myinfo` (`/mypage` → `/myinfo`). 모든 페이지는 `src/routes/AppRouter.tsx`에서 lazy 로딩
- 레이아웃: `BareLayout`(랜딩·로그인), `AppLayout`(상단 바·푸터·챗봇). 페이지 → 레이아웃 전달은 `src/layouts/appShell.ts`의 `useAppShell`
- 페이지 부품: `src/components/<home|account|invest|community|myinfo|login|landing>/`
- 공통 부품: `src/components/common/` (TopBar, SiteFooter, StockLabel, StockIcon, KkiruAvatar, ChatbotFab, Box, Tabs, Modal, Toast, useDocumentTitle 등)

## 꼭 지킬 것
1. 디자인 원본 `_design/Returns_프론트_최종/`은 읽기 전용(gitignore 대상). 화면을 바꿀 때는 원본과 같은지 먼저 확인한다.
2. 요청받은 파일·범위만 바꾼다. 공통 파일(`src/components/common`, `src/layouts`, `src/routes`, `src/data/returns.ts`, `src/lib`, `src/styles/tokens.css`, `index.html`)은 이유와 선택지를 먼저 묻고 승인받은 뒤 바꾼다.
3. `package.json`·`package-lock.json` 변경은 팀 합의 후에만. `npm install` 뒤 lock 파일이 혼자 바뀌면(Windows libc 줄 등) `git restore package-lock.json`.
4. 색은 `tokens.css` 변수만 쓴다. 컴포넌트에 HEX 금지. 새 색은 원본 값과 함께 먼저 묻는다. 랜딩 색은 `--landing-*` 구역. 그림자·반투명 rgba는 원본 값 허용.
5. 스타일은 CSS Module. 랜딩만 예외로 `landing.css` 하나를 `.landing` 범위로 가둠.
6. 커밋은 사람이 직접 한다. Claude Code는 커밋하지 않는다.

## 데이터·날짜
- "오늘"은 `src/lib/clock.ts`의 `getBusinessToday()`만 쓴다(서버 업무일 `GET /api/customer/business-date`를 받아 쓰고, 서버가 꺼져 있을 때만 `src/data/businessDate.ts`의 2026-11-18 목업). 예외: 로그인 30분 타이머·인증번호 타이머·화면 시계(시:분)는 실제 시각.
- 공용 데이터 `src/data/returns.ts`(RD), 계산 `src/lib/calc.ts`(F). 같은 값은 새로 만들지 말고 여기서 가져와 페이지 간 숫자를 맞춘다(예: 패키지 총액은 홈·내 계좌가 같아야 함). 단 주식 패키지 화면은 서버 값이라 홈·내 계좌의 예시 패키지 숫자와 다를 수 있다(두 화면을 서버로 연결하면 맞춘다).
- 원본이 직접 넣은 예시 값은 각 페이지 데이터 파일에 있고, 백엔드로 바꿀 곳은 `TODO` 주석으로 표시돼 있다. 백엔드 연결은 이 TODO를 찾아 API 호출로 바꾸는 작업이다.
- 저장소 키: sessionStorage `returns-login`·`returns-session-exp`·`returns-session-warned`(로그인 세션, 지우기는 `clearLoginSession()`), `returns-logout-notice`(랜딩 토스트), `returns-notify`(알림 설정), `returns-landing-scroll`(랜딩 복원) / localStorage `returns-demo`(시연 설정, 홈·내 계좌·주식 패키지·내 정보 공유), `returns-assess-hist`(진단 이력).
- 글·답글·닉네임·회원정보 변경은 원본처럼 화면 안에서만 유지(새로고침 시 초기화) → 백엔드 연결 시 교체. 주식 패키지의 주문·패키지 만들기/수정/삭제는 이미 서버(`src/api/stockPackage.ts`)에 저장된다.

## 확인 방법
- 결과 보고 맨 위에 `npm run build`, `npm run lint` 결과를 적는다. 빌드 500KB 경고가 다시 생기면 원인을 적는다.
- 화면 비교는 Playwright(레포 밖 `C:\Users\82109\pw-tools`)로 원본(5180)과 React(5201)를 열어서 한다. 레포에 Playwright를 설치하지 않는다. 비교 전 vite를 새로 띄운다. 원본이 실제 오늘을 쓰는 곳은 비교할 때만 2026-11-18로 맞춘다.
- 확인용 서버는 5180·5201(운영 빌드 확인 5202)만 쓰고 끝나면 끈다. 5173(개발자가 쓰는 서버)은 건드리지 않는다.
- 글자 가장자리 번짐(안티앨리어싱) 차이는 렌더링 차이로 본다.

## Git
- `develop`에서 직접 작업. 부분마다 커밋 → 페이지·작업 단위로 `git pull --rebase` → `npm run build` → `npm run lint` → `git push`.
- `git add`는 바꾼 경로를 지정해서 하고, `git status`로 `_design`·`package-lock.json`이 섞이지 않았는지 확인한다.

## 원본과 일부러 다르게 둔 것
- 업무일 2026-11-18 고정, 홈 패키지 숫자는 공용 데이터 기준, 시연 설정 위젯 폭 260·"날짜 바꿔 보기" 없음
- 커뮤니티: 여러 글 펼침 시 답글 입력 커서가 방금 연 칸으로 감
- 랜딩: S4 진행률 100%에서 "D-0 · 확정 원화 금액"으로 끝남, S7 창 크기 변경 시 줄바꿈 유지, 눈금자 오늘 표시는 날짜 단위
- 홈·주식 패키지: 원본에서 국내 9종목이 코드만 깨져 보이던 곳을 종목명·코드 정상 표시
- 오늘의 종목: 홈 "오늘의 종목"(`HomeRecBox`)과 투자 탭 "오늘의 종목"(`InvestRec`)은 서버 추천 API(`/recommendations`, `/recommendations/ask`)에 연결돼 있다. 설문 투자성향 허용 범위 안의 종목만(보유 종목 제외) 보여 주고, 설문·거래 기준을 바꿔 볼 수 있으며, 투자 권유가 아닌 정보 제공 안내 문구를 함께 표시한다. 추천 종목(홈은 3종목)·이유·끼루 답변은 서버 값이고, 20일 추이·30일 차트는 서버 종가 이력(`/price-history`)을 쓴다. 서버에 없는 시가총액·PER은 유형·업종·연 변동성·테마와 안내 문구로 바꿨다. "패키지에 담기"는 홈에서 `/invest?rec=종목코드`로 넘어가 "어느 패키지에 담을까요?" 창으로 이어진다. 화면에 연결되지 않던 후보 보기 화면(`InvestCandidateTab`, `HomeTendencyBox`)은 지웠다(git 기록에서 복구할 수 있다)
- 주식 패키지: 서버에 이력이 없는 수익률 차트는 안내 문구로, 목록 미니 그래프는 뺐고, 종목 펼침의 시가총액·PER 등 재무 정보는 위험등급과 안내만 남겼다
- 주식 패키지: 주문 거부 사유 문장은 서버가 준 문장 그대로 보인다. 시연 설정의 "다음 주문 거부 사유"는 서버 주문에는 효과가 없다
- 주식 패키지: 서버는 목표 비중 합이 정확히 100%일 때만 저장해서, 종목 추가 때 합이 100이 아니면 비중 맞추기 단계로 간다
- 투자 탭 "오늘의 종목" 분류 버튼: 원본의 "ETF"를 "ETF·펀드"로 적음(서버 분류 FUND에 주식형 펀드도 들어 있어서)
- [확인 필요] 회원가입 투자성향 퀴즈와 내 정보 재진단은 원본부터 문항·계산이 다름(통일 여부 미정)
