import type { ReportReason } from '../../api/community'
// 커뮤니티: 원본 community.dc.html에만 있는 값 (채팅·순위·종목 이름은 src/data의 RD를 씀)
import { RETURNS_DATA as RD } from '../../data/returns'

export const DEFAULT_STOCK = '000660' // 처음 열리는 종목
export const WIDE_MIN = 1281 // 3열(왼쪽·가운데·오른쪽): 화면 폭이 1280px 넘을 때
export const MID_MIN = 1025 // 2열: 1280px 이하 ~ 1025px 이상
export const FIXED_MIN_HEIGHT = 720 // 3열이면서 높이가 이 값 이상일 때만 화면에 고정(열 안에서만 스크롤)
export const BAR_H_FALLBACK = 65 // 상단 바 높이를 아직 못 쟀을 때(원본 값)

export const RANK_ROWS = 12 // 많이 이야기하는 종목 칸 수(서버 순위를 12위까지 받음)

export const KR_ALL: Record<string, [string, string, string]> = { ...RD.KR, ...RD.KR_ETF }

// 주소의 ?stock= 값 → 선택 종목(국내 종목코드 6자리 또는 게시판 GEN, 아니면 기본 종목). 서버 종목 목록에 있는지는 목록을 받은 뒤 화면이 이름으로 가린다
export const stockFromUrl = (v: string | null): string => (v && (/^[0-9A-Z]{6}$/.test(v) || v === 'GEN') ? v : DEFAULT_STOCK)

// 행 높이: 고정일 때 왼쪽 칸 높이에 맞춰 44~76px(원본 rowH)
export const rowHeight = (fixed: boolean, colH: number): number =>
  fixed && colH ? Math.max(44, Math.min(76, Math.floor((colH - 50) / RANK_ROWS))) : 44

// ===== C-2: 가운데 열 윗부분 =====
export const GEN = 'GEN' // 게시판 "RIA 제도·일반"의 종목 자리 값
export const GEN_NAME = 'RIA 제도·일반'
export const GEN_RE = /ria|제도|일반/i // 종목 고르기 검색어가 이것이면 게시판도 보임
export const RECENT_KEY = 'returns-recent-stocks' // sessionStorage 키(원본 그대로)
export const RECENT_LIMIT = 6
export const DEFAULT_RECENT = ['000660', '005930', '373220'] // 처음 '최근 본 종목'
export const TOAST_MS = 2200


// ===== C-3: 피드 글 목록 =====
export const FEED_LIMIT = 20 // 처음 보이는 글 수 / "이전 글 더 보기" 한 번에 늘어나는 수
export const REPLY_MAX = 500 // 답글 최대 글자 수(서버 CommunityContent.MAX_LENGTH)
export const LONG_CHARS = 120 // 이 글자 수를 넘거나 3줄을 넘으면 "더보기"
export const LONG_LINES = 3
export const FEED_EMPTY = { search: (q: string) => '‘' + q + '’ 내용의 글이 없어요', mine: '아직 쓴 글이 없어요. 위 입력칸에 첫 의견을 남겨 보세요.', other: '아직 글이 없어요. 첫 의견을 남겨 보세요.' }

// ===== C-5: 닉네임·글쓰기·수정·삭제·신고 =====
export const POST_MAX = 500 // 글·수정 최대 글자 수(서버 CommunityContent.MAX_LENGTH)
export const SEARCH_MAX = 30 // 글 검색어 최대 글자 수(서버 KEYWORD_MAX_LENGTH)
export const REPORT_REASONS: [ReportReason, string][] = [['ABUSE', '욕설·비방'], ['SPAM', '스팸·광고'], ['PRIVACY', '개인정보 노출'], ['ETC', '기타']]
export const FRESH_MS = 400 // 새 글이 나타나는 효과 시간
export const composePlaceholder = (isGen: boolean, stockName: string): string =>
  isGen ? 'RIA 제도에 대해 궁금한 걸 남겨주세요' : stockName + '에 대한 의견을 남겨주세요'
export const kiruAskHint = (isGen: boolean): string =>
  isGen ? '끼루가 RIA 제도 자료를 바탕으로 답해요' : '끼루가 기업 정보·최근 기사·공시를 바탕으로 답해요'
