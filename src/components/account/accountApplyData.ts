import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { GEN_HOLDINGS } from './accountData'
import type { HistTab } from './accountHistData'

// 입고·인출·계좌 개설 신청 창의 문구와 숫자 — 원본 renderVals의 MT·inRows·o·op 계산 그대로(값은 src/data·src/lib에서)

export type ApplyKind = 'in' | 'out' | 'open'

export interface ApplyConfig {
  title: string
  steps: string[]
  from: string // 보내는 계좌(없으면 계좌 줄을 안 보임)
  to: string
  histTab: HistTab | null // 완료 화면의 '내역 보기'가 여는 탭
}

export function applyConfig(kind: ApplyKind): ApplyConfig {
  const LK = RD.LINKED.name + ' ' + RD.LINKED.no
  const RA = RD.ACCOUNT.name + ' ' + RD.ACCOUNT.no
  if (kind === 'in') return { title: '입고 신청', steps: ['종목·수량', '확인', '완료'], from: LK, to: RA, histTab: 'deposits' }
  if (kind === 'out') return { title: '인출 신청', steps: ['금액', '확인', '완료'], from: RA, to: LK, histTab: 'withdraw' }
  return { title: '계좌 개설 신청', steps: ['조건 확인', '한도 설정', '확인', '완료'], from: '', to: '', histTab: null }
}

export const parseInt0 = (v: unknown): number => parseInt(String(v == null ? '' : v).replace(/\D/g, ''), 10) || 0

// ---- 입고 ----
export interface InRowView {
  t: string
  now: number
  base: number
  avail: number
  sel: boolean
  q: number
  qv: string
  over: boolean
  got: number
  back: number
  overMsg: string
  retMsg: string
}

// 일반계좌 해외주식 표. inQ는 선택한 종목 → 입력한 수량(글자)
export function inRows(inQ: Record<string, string>): InRowView[] {
  return GEN_HOLDINGS.map(([t, now, base]) => {
    const sel = Object.prototype.hasOwnProperty.call(inQ, t)
    const q = parseInt0(inQ[t])
    const avail = Math.min(now, base)
    return {
      t,
      now,
      base,
      avail,
      sel,
      q,
      qv: sel ? inQ[t] : '',
      over: sel && q > avail,
      got: Math.min(q, avail),
      back: Math.max(0, q - avail),
      overMsg: avail + '주까지 신청할 수 있어요',
      retMsg: '넘은 ' + Math.max(0, q - avail) + '주는 심사 후 일반계좌로 돌려드려요'
    }
  })
}

export const SUBMIT_NOTE = '신청하면 심사가 시작돼요. 결과는 알림으로 알려드려요.'
export const IN_SUBMIT_NOTE = '신청하면 수량이 즉시 확정돼요.'
export const inMinNote = (): string => '입고 가능 수량 = 신청 수량, ' + F.dot(RD.FIXED.DEPOSIT_BASE) + ' 기준 보유 수량, 현재 보유 수량 중 가장 적은 수량'
export const IN_NEXT = ['예상 가능 수량 내에서 승인되며, 미승인 수량은 입고되지 않아요']

// ---- 인출 ----
export interface OutValues {
  now: string
  paid: string
  paidAmt: string
  wdDate: string
  wdD: number
  cashNum: number
  nowNum: number
  cut: string
  tooMsg: string
}

export function outValues(): OutValues {
  const biz = RD.C.BUSINESS_DATE
  return {
    now: F.won(F.withdrawableNow()),
    paid: F.dot(RD.WITHDRAW.paidDate),
    paidAmt: F.won(RD.WITHDRAW.paidIn),
    wdDate: F.dot(RD.WITHDRAW.availableDate),
    wdD: F.withdrawDday(biz),
    cashNum: RD.ASSETS.cash,
    nowNum: F.withdrawableNow(),
    cut: F.won(F.tax(0, biz).cut),
    tooMsg: '주문 가능 현금 ₩' + F.won(RD.ASSETS.cash) + '까지 인출할 수 있어요'
  }
}

export function outNext(risky: boolean): string[] {
  return ['심사가 끝나면 일반계좌로 보내드려요(1영업일)', '결과는 알림으로 알려드려요', risky ? '1년이 지나지 않은 납입금이 포함돼 이 계좌의 세제 혜택이 취소돼요' : '세제 혜택은 그대로 유지돼요']
}

export function outDoneSum(amt: number): string {
  return '₩' + F.won(amt) + ' → ' + RD.LINKED.name + ' ' + RD.LINKED.no
}

// ---- 계좌 개설 ----
const MIN_LIMIT = 1000000
const MAX_LIMIT = 50000000

// 반려 상태에서 다시 열면 다른 증권사 한도 3,000만 · 기본 한도 2,000만(원본 예시 값)
// TODO: 백엔드 연결 시 마이데이터 조회 결과(다른 증권사 RIA 한도 합계)로 교체
const REJECTED_OTHER = 30000000
const REJECTED_LIMIT = 20000000

export interface OpenValues {
  checks: { label: string; ok: boolean }[]
  defaultLimit: number
  other: number
  linked: string
  linkedNote: string
  rowsFor: (limit: number) => [string, string][]
  next: string[]
}

export function openValues(): OpenValues {
  const rejected = RD.ACCOUNT_STATE === 'rejected'
  const other = rejected ? REJECTED_OTHER : 0
  const linked = RD.LINKED.name + ' ' + RD.LINKED.no
  return {
    checks: [
      { label: '국내 거주 개인투자자', ok: true },
      { label: '리턴증권에 RIA 계좌(또는 신청 내역)가 없어요 — 증권사별 1개', ok: true },
      { label: '2025.12.23 기준 해외주식 보유 ' + GEN_HOLDINGS.length + '종목', ok: true }
    ],
    defaultLimit: rejected ? REJECTED_LIMIT : MAX_LIMIT,
    other,
    linked,
    linkedNote: RD.LINKED.note,
    rowsFor: (limit) => [
      ['계좌', RD.ACCOUNT.name],
      ['이번 계좌 한도', '₩' + F.won(limit)],
      ['다른 증권사 RIA 한도 합계', '₩' + F.won(other)],
      ['연결 일반계좌', linked]
    ],
    next: ['조건이 맞으면 바로 계좌가 개설돼요', '확인이 더 필요하면 심사해요(1~2영업일)', '결과는 알림으로 알려드려요']
  }
}

export const LIMIT_MIN = MIN_LIMIT
export const LIMIT_MAX = MAX_LIMIT
export const clampLimit = (raw: string): number => Math.max(MIN_LIMIT, Math.min(MAX_LIMIT, Math.round(parseInt0(raw) / 1e6) * 1e6))

// 전 증권사 합계 막대: 5,000만까지는 남색, 넘은 만큼은 빨강
export function limitBar(total: number): { navy: string; red: string } {
  const scale = Math.max(total, MAX_LIMIT)
  return { navy: ((Math.min(total, MAX_LIMIT) / scale) * 100).toFixed(2) + '%', red: ((Math.max(0, total - MAX_LIMIT) / scale) * 100).toFixed(2) + '%' }
}

// ---- 접수 후 내역 새 줄 ----
export interface AddedIn {
  t: string
  req: number
  base: number
  now: number
}
export interface AddedOut {
  amt: number
}
