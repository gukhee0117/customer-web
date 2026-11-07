import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom'
import { Tabs } from '../components/common/Tabs'
import type { BotMessage } from '../components/common/ChatbotFab'
import { Toast } from '../components/common/Toast'
import { useToast } from '../components/common/useToast'
import { RETURNS_DATA as RD } from '../data/returns'
import type { DemoSettings } from '../data/returns'
import { F } from '../lib/calc'
import { useAppShell } from '../layouts/appShell'
import { apiErrorMessage } from '../api/client'
import { createPackage, deletePackage, placeOrder, searchCandidates, updatePackage } from '../api/stockPackage'
import type { CandidateItem, OrderResult, SavePackageRequest } from '../api/stockPackage'
import { InvestAssetsBox } from '../components/invest/InvestAssetsBox'
import { InvestDevPanel } from '../components/invest/InvestDevPanel'
import { InvestDialog } from '../components/invest/InvestDialog'
import type { DialogState } from '../components/invest/InvestDialog'
import { InvestOrders } from '../components/invest/InvestOrders'
import { InvestAddPanel } from '../components/invest/InvestAddPanel'
import { InvestBulkPanel } from '../components/invest/InvestBulkPanel'
import { InvestPkgDetail } from '../components/invest/InvestPkgDetail'
import { InvestNewPkg } from '../components/invest/InvestNewPkg'
import { InvestPkgList } from '../components/invest/InvestPkgList'
import { InvestRec } from '../components/invest/InvestRec'
import { InvestTradePanel } from '../components/invest/InvestTradePanel'
import { InvestUnsuitDialog } from '../components/invest/InvestUnsuitDialog'
import type { UnsuitState } from '../components/invest/InvestUnsuitDialog'
import { BOT_CHIPS, botGreeting, botTurn } from '../components/invest/investBotLogic'
import type { ChkDemo, RejectReason } from '../components/invest/investDevData'
import { emptyAdd, pctInt } from '../components/invest/investAddLogic'
import type { AddState } from '../components/invest/investAddLogic'
import { openTradeState } from '../components/invest/investOrderLogic'
import type { BulkCalc, TradeCalc, TradeSide, TradeState } from '../components/invest/investOrderLogic'
import { nmFromUrl, openNewPkg, pickedFrom } from '../components/invest/investNewPkgLogic'
import type { NewPkgState, NmBuyRow } from '../components/invest/investNewPkgLogic'
import { useTendency } from '../components/invest/useNewPkgData'
import { sortViews } from '../components/invest/investPkgLogic'
import type { PkgSort, PkgView } from '../components/invest/investPkgLogic'
import { usePkgRisk } from '../components/invest/usePkgRisk'
import { useOrderFees, useServerPackages } from '../components/invest/useServerPackages'
import styles from '../components/invest/InvestLayout.module.css'
import { useDocumentTitle } from '../components/common/useDocumentTitle'

type InvestTab = 'mine' | 'rec'

const TABS = [
  { key: 'mine', label: '나만의 주식 패키지' },
  { key: 'rec', label: '성향별 추천' }
]

// 주문 한 줄(서버 상품 번호로 보낸다)
interface OrderLine {
  pid: number
  name: string
  side: TradeSide
  qty: number
}

// 구성 종목의 목표 비중으로 서버 저장 요청을 만든다. 성향 밖 종목은 이미 확인하고 담은 것이라 확인함으로 보낸다
const saveRequest = (pkg: PkgView, name: string, weights: { pid: number; weight: number; confirmed: boolean }[]): SavePackageRequest => ({
  name,
  totalAmount: pkg.total,
  items: weights.map((w) => ({ domesticProductId: w.pid, weight: w.weight, unsuitableConfirmed: w.confirmed }))
})

const currentWeights = (pkg: PkgView) => pkg.items.filter((i) => i.target > 0).map((i) => ({ pid: i.pid, weight: i.target, confirmed: i.out === true }))

// 주식 패키지 — 내 패키지(목록·상세·보유 종목·주문 내역)와 주문·패키지 만들기·수정·삭제는 서버 값과 서버 처리, 후보 보기 탭, 새 패키지 만들기 창, 시연 설정
export function InvestPage() {
  useDocumentTitle('Returns 주식 패키지')
  const { hash, search } = useLocation()
  const navigate = useNavigate()
  const [params, setParams] = useSearchParams()
  const tab: InvestTab = hash === '#recommend' ? 'rec' : 'mine'

  const shell = useAppShell()
  const { message, showToast } = useToast()

  // 시연 설정(성향·성향 상태)이 바뀌면 다시 그림(원본 returns-demo 이벤트)
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    window.addEventListener('returns-demo', redraw)
    return () => window.removeEventListener('returns-demo', redraw)
  }, [])

  // 내 패키지·보유·현재가·주문 내역(서버 값)과 오늘 기준 요율
  const server = useServerPackages()
  const fees = useOrderFees()
  const { views, orders, cash } = server
  const [ordOpen, setOrdOpen] = useState(true)
  const [unsuit, setUnsuit] = useState<Record<string, string>>({}) // 이 화면에서 방금 성향 밖 확인을 한 종목(종목코드 → 날짜)
  // 오른쪽 창은 한 번에 하나만: 주문 · 패키지 한 번에 사기(살 금액) · 종목 추가
  const [trade, setTrade] = useState<TradeState | null>(null)
  const [bulk, setBulk] = useState<string | null>(null)
  // 주소로 열기: ?new=1(&ask=말)이면 새 패키지 창, 아니고 ?add=1이면 종목 추가 창. 이 화면에 들어올 때 한 번만 봄
  const [nm, setNm] = useState<NewPkgState | null>(() => (params.get('new') === '1' ? nmFromUrl(params.get('ask')) : null))
  const [add, setAdd] = useState<AddState | null>(() => (params.get('new') !== '1' && params.get('add') === '1' ? emptyAdd() : null))
  // 시연 설정 중 이 화면 안에서만 쓰는 값
  const [noCand, setNoCand] = useState(false)
  const [chkDemo, setChkDemo] = useState<ChkDemo | null>(null)
  const [rejNext, setRejNext] = useState<RejectReason | null>(null)
  const [dlg, setDlg] = useState<DialogState | null>(null)
  const [uf, setUf] = useState<UnsuitState | null>(null)
  const sending = useRef(false) // 서버에 보내는 중이면 같은 버튼을 다시 눌러도 보내지 않는다

  const [sort, setSort] = useState<PkgSort>('ret')
  const rows = useMemo(() => sortViews(views, sort), [views, sort])

  // 선택한 패키지는 주소(?pkg=)에 남김 — 없거나 모르는 값이면 첫 패키지
  const pkgParam = params.get('pkg')
  const cur = views.find((v) => v.id === pkgParam) ?? views[0]
  const selected = cur?.id ?? ''

  // 내 투자성향(서버 값)
  const tendency = useTendency()
  const risk = usePkgRisk(cur, tendency.data?.survey)

  // 상단 바: 내 투자성향 이름(진단이 있을 때)
  const profLabel = tendency.data?.survey.available ? (tendency.data.survey.label ?? undefined) : undefined
  useEffect(() => {
    shell.setTopBar({ profLabel })
  }, [profLabel, shell])

  // 끼루 AI 상담 창 — 내용은 AppLayout의 챗봇 버튼에 넘기고, 이 페이지를 떠나면 비움
  const [bot, setBot] = useState<BotMessage[]>(() => [botGreeting()])
  const chat = useMemo(
    () => ({
      simple: true,
      listMaxHeight: 320,
      messages: bot,
      chips: cur ? BOT_CHIPS.map((label) => ({ label, onClick: () => setBot((b) => b.concat(botTurn(label, views, cur, cash))) })) : [],
      onSend: () => {}
    }),
    [bot, views, cur, cash]
  )
  useEffect(() => {
    shell.setChat(chat)
  }, [shell, chat])
  useEffect(
    () => () => {
      shell.setChat(null)
      shell.setBotOpen(false)
      shell.setTopBar({})
    },
    [shell]
  )

  const closePanel = () => {
    setTrade(null)
    setBulk(null)
    setAdd(null)
  }
  const openAdd = (patch?: Partial<AddState>) => {
    closePanel()
    setAdd({ ...emptyAdd(), ...patch })
  }

  // Esc: 가장 위에 있는 창부터 하나씩 닫음(성향 확인 → 확인 창 → 주문 창 → 새 패키지 창)
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return
      if (uf) setUf(null)
      else if (dlg) setDlg(null)
      else if (trade || bulk !== null || add) closePanel()
      else if (nm) setNm(null)
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [uf, dlg, trade, bulk, add, nm])

  // 서버에 보내는 동작을 한 번에 하나만 하도록 감싼다
  const guarded = async <T,>(fn: () => Promise<T>, fallback: T): Promise<T> => {
    if (sending.current) return fallback
    sending.current = true
    try {
      return await fn()
    } finally {
      sending.current = false
    }
  }

  const failDialog = (title: string, err: unknown) => setDlg({ title, body: apiErrorMessage(err, '잠시 후 다시 시도해 주세요') })

  // 성향 밖 종목을 아직 확인하지 않았으면 한 번 확인받고 이어감(패키지에 담을 때 확인한 종목은 바로 이어감)
  const gate = (pkg: PkgView, codes: string[], then: () => void) => {
    const need = pkg.items.filter((i) => codes.includes(i.code) && i.out === true && !i.ack && !unsuit[i.code])
    if (!need.length) {
      then()
      return
    }
    const survey = tendency.data?.survey
    const mine = survey?.available ? (survey.label ?? '') + ' · ' + (survey.allowedMinGrade === 6 ? '6' : survey.allowedMinGrade + '~6') + '등급' : undefined
    setUf({ codes: need.map((i) => i.code), agree: false, then, items: need.map((i) => ({ code: i.code, name: i.name, grade: i.grade })), mine })
  }

  // 서버 후보를 담기 전 확인: 진단이 없으면 막고, 내 성향보다 위험하면 한 번 확인받고 이어감(이미 확인한 종목은 바로 이어감)
  const gateCandidate = (c: CandidateItem, then: () => void) => {
    const survey = tendency.data?.survey
    if (tendency.state === 'ready' && !survey?.available) {
      setDlg({ title: '투자성향 진단이 필요해요', body: '진단이 없거나 유효기간이 지나 종목을 담을 수 없어요. 내 정보에서 투자성향을 진단해 주세요.' })
      return
    }
    if (c.outOfProfile && !unsuit[c.ticker]) {
      const mine = survey?.available ? (survey.label ?? '') + ' · ' + (survey.allowedMinGrade === 6 ? '6' : survey.allowedMinGrade + '~6') + '등급' : undefined
      setUf({ codes: [c.ticker], agree: false, then, items: [{ code: c.ticker, name: c.name, grade: c.riskGrade }], mine })
    } else then()
  }

  // 거부된 주문을 알리는 창: 서버가 준 사유 문장을 그대로 보여준다
  const rejectDialog = (rejected: OrderResult[], executed: number, retry: () => void): DialogState => {
    const first = rejected[0].rejectReason
    const lines = rejected.map((o) => o.name + ': ' + (o.rejectMessage ?? '거부됐어요'))
    const body = lines.join(' · ') + (executed > 0 ? ' · 체결된 ' + executed + '건은 주문 내역에서 볼 수 있어요' : '')
    const link: [string, () => void] =
      first === 'PRICE_UNAVAILABLE'
        ? [
            '다시 시도',
            () => {
              setDlg(null)
              retry()
            }
          ]
        : first === 'INSUFFICIENT_CASH' || first === 'INSUFFICIENT_QTY'
          ? ['수량 줄이기 ›', () => setDlg(null)]
          : ['확인', () => setDlg(null)]
    return { title: executed > 0 ? '일부 주문이 거부됐어요' : '주문이 거부됐어요', reject: { linkLabel: link[0], onLink: link[1] }, body }
  }

  // 서버에 시장가 주문을 보낸다. 체결가·수수료·세금은 서버가 정한다. 한 건이라도 체결되면 true(창을 닫고 새 값을 다시 받음)
  const placeOrders = (pkgId: string, lines: OrderLine[]): Promise<boolean> =>
    guarded(async () => {
      if (!lines.length) return true
      try {
        const res = await placeOrder(Number(pkgId), {
          idempotencyKey: crypto.randomUUID(),
          items: lines.map((l) => ({ domesticProductId: l.pid, side: l.side === 'buy' ? ('BUY' as const) : ('SELL' as const), qty: l.qty }))
        })
        server.reload()
        setOrdOpen(true)
        const rejected = res.orders.filter((o) => o.status === 'REJECTED')
        const executed = res.orders.length - rejected.length
        if (!rejected.length) {
          const o = res.orders[0]
          showToast(res.orders.length > 1 ? res.orders.length + '건 체결 완료' : o.name + ' ' + o.qty + '주 ' + (o.side === 'BUY' ? '매수' : '매도') + ' 체결 완료', 2200)
          return true
        }
        // 다시 시도는 거부된 종목·방향만 다시 보낸다(이미 체결된 주문까지 보내면 새 멱등키로 중복 체결된다)
        const retryLines = lines.filter((l) =>
          rejected.some((o) => o.domesticProductId === l.pid && o.side === (l.side === 'buy' ? 'BUY' : 'SELL'))
        )
        setDlg(rejectDialog(rejected, executed, () => void placeOrders(pkgId, retryLines)))
        return executed > 0
      } catch (err) {
        failDialog('주문하지 못했어요', err)
        return false
      }
    }, false)

  // 주문 버튼 → 주문 확인 창(매수는 그 전에 성향 확인)
  const submitTrade = (t: TradeState, c: TradeCalc) => {
    if (!cur) return
    const item = cur.items.find((i) => i.code === t.code)
    if (!item) return
    const buy = t.side === 'buy'
    const label = buy ? '매수' : '매도'
    const pkgId = cur.id
    const confirm = () =>
      setDlg({
        title: label + ' 주문을 넣을까요?',
        rows: [
          ['종목', item.name + ' ' + t.code],
          ['구분', label + ' · 시장가'],
          ['수량', c.qty + '주'],
          ['예상 체결가', '₩' + F.won(c.price)],
          ['예상 수수료', '₩' + F.won(c.fee)],
          ['예상 세금', buy ? '₩0' : '₩' + F.won(c.tax) + ' · 증권거래세'],
          ['예상 합계', '₩' + F.won(c.total)]
        ],
        okLabel: label + ' 주문',
        okTone: buy ? 'up' : 'down',
        onOk: () => {
          void placeOrders(pkgId, [{ pid: item.pid, name: item.name, side: t.side, qty: c.qty }]).then((ok) => ok && closePanel())
        }
      })
    if (buy) gate(cur, [t.code], confirm)
    else confirm()
  }

  const openTrade = (code: string, side: TradeSide) => {
    closePanel()
    setTrade(openTradeState(code, side))
  }

  // 패키지 한 번에 사기: 주문 버튼 → (성향 밖 종목이 있으면 확인) → 주문 확인 창
  const submitBulk = (c: BulkCalc) => {
    if (!cur) return
    const buys = c.rows.filter((r) => r.qty > 0)
    const pkgId = cur.id
    gate(
      cur,
      buys.map((r) => r.code),
      () =>
        setDlg({
          title: '패키지를 한 번에 살까요?',
          rows: buys.map((r): [string, string] => [r.name, r.qty + '주 · ₩' + F.won(r.amount)]).concat([
            ['예상 수수료', '₩' + F.won(c.fee)],
            ['예상 합계', '₩' + F.won(c.total)]
          ]),
          okLabel: c.count + '건 주문',
          okTone: 'navy',
          onOk: () => {
            void placeOrders(
              pkgId,
              buys.map((r): OrderLine => ({ pid: r.pid, name: r.name, side: 'buy', qty: r.qty }))
            ).then((ok) => ok && closePanel())
          }
        })
    )
  }

  // 종목 추가: 사지 않고 목표 비중만 정해 패키지에 담음(보유 0주). 서버는 비중 합이 100일 때만 저장하므로 다른 종목 비중도 함께 받는다
  const addItem = (code: string, target: number, adj: Record<string, string> | null) => {
    if (!cur) return
    const picked = add?.info[code]
    if (!picked) return
    const pkg = cur
    const weights = pkg.items
      .filter((i) => i.target > 0 || (adj && pctInt(adj[i.code]) > 0))
      .map((i) => ({ pid: i.pid, weight: adj ? pctInt(adj[i.code]) : i.target, confirmed: i.out === true }))
      .filter((w) => w.weight > 0)
      .concat([{ pid: picked.id, weight: adj ? pctInt(adj[code]) : target, confirmed: picked.out === true }])
    void guarded(async () => {
      try {
        await updatePackage(Number(pkg.id), saveRequest(pkg, pkg.name, weights))
        server.reload()
        setAdd((a) => (a ? { ...a, pick: null, pct: '', adj: null } : a))
        showToast(picked.name + '을(를) 담았어요 · 표의 [매수]로 살 수 있어요', 2200)
      } catch (err) {
        failDialog('담지 못했어요', err)
      }
    }, undefined)
  }

  // 새 패키지 만들기: 서버에 만들고, 사기로 이어졌으면 바로 주문
  const makePkg = (buy: NmBuyRow[] | null) => {
    if (!nm) return
    const state = nm
    const codes = Object.keys(state.w)
    if (codes.some((c) => !state.picked[c])) {
      setDlg({ title: '만들지 못했어요', body: '종목 정보를 불러오지 못했어요. 종목을 다시 담아 주세요.' })
      return
    }
    const request: SavePackageRequest = {
      name: state.name.trim(),
      totalAmount: buy ? pctInt(state.amt) || null : null,
      items: codes.map((c) => ({ domesticProductId: state.picked[c].id, weight: pctInt(state.w[c]), unsuitableConfirmed: state.picked[c].out === true }))
    }
    void guarded(async () => {
      try {
        const created = await createPackage(request)
        const id = String(created.stockPackageId)
        setNm(null)
        setSort('new')
        setParams({ pkg: id }, { replace: true })
        server.reload()
        const lines = (buy ?? []).filter((r) => r.q > 0).map((r): OrderLine => ({ pid: state.picked[r.code].id, name: r.name, side: 'buy', qty: r.q }))
        if (!lines.length) showToast('패키지를 만들었어요', 2200)
        return lines.length ? id : null
      } catch (err) {
        failDialog('패키지를 만들지 못했어요', err)
        return null
      }
    }, null).then((id) => {
      if (!id) return
      const lines = (buy ?? []).filter((r) => r.q > 0).map((r): OrderLine => ({ pid: state.picked[r.code].id, name: r.name, side: 'buy', qty: r.q }))
      if (lines.length) void placeOrders(id, lines)
    })
  }

  // 이름 바꾸기: 비어 있으면 그대로 두고, 20자까지(입력칸에서 이미 자름)
  const renamePkg = (name: string) => {
    if (!cur) return
    const pkg = cur
    void guarded(async () => {
      try {
        await updatePackage(Number(pkg.id), saveRequest(pkg, name, currentWeights(pkg)))
        server.reload()
      } catch (err) {
        failDialog('이름을 바꾸지 못했어요', err)
      }
    }, undefined)
  }

  // 삭제: 확인 후 서버에 요청. 주문 내역이 있는 패키지는 서버가 막고 그 사유를 알려준다
  const askDelete = () => {
    if (!cur) return
    const id = cur.id
    setDlg({
      title: '"' + cur.name + '" 패키지를 삭제할까요?',
      body: '패키지를 삭제해도 보유 종목은 계좌에 그대로 남아요',
      okLabel: '삭제',
      okTone: 'navy',
      onOk: () => {
        void guarded(async () => {
          try {
            await deletePackage(Number(id))
            setParams({}, { replace: true })
            server.reload()
            showToast('패키지를 삭제했어요', 2200)
          } catch (err) {
            failDialog('삭제하지 못했어요', err)
          }
        }, undefined)
      }
    })
  }

  const changeDemo = (patch: Partial<DemoSettings>) => {
    RD.setDemo(patch)
    redraw()
  }

  // 후보 보기 탭 "패키지에 담기": 진단 확인·성향 밖이면 확인 → 어느 패키지에 담을지 → 그 패키지의 종목 추가 창(이미 담긴 패키지면 고르기 없이 검색만)
  const pickPackage = (c: CandidateItem) =>
    gateCandidate(c, () =>
      setDlg({
        title: '어느 패키지에 담을까요?',
        body: c.name + ' · 목표 비중은 다음 화면에서 정해요',
        choices: views.map((v) => {
          const has = v.items.some((i) => i.code === c.ticker && i.target > 0)
          return {
            name: v.name,
            sub: v.items.length + '종목 · 가중평균 ' + v.grade + '등급',
            act: has ? '담겨 있음' : '담기 ›',
            go: () => {
              setDlg(null)
              navigate({ pathname: '/invest', search: '?pkg=' + v.id, hash: '' }, { replace: true })
              openAdd({ q: c.name, pick: has ? null : c.ticker, info: { [c.ticker]: pickedFrom(c) } })
            }
          }
        })
      })
    )

  // 홈 "오늘의 추천"의 "패키지에 담기"로 들어오면(?rec=종목코드) 그 종목으로 바로 "어느 패키지에 담을까요?" 창을 연다. 내 패키지를 다 받은 뒤 한 번만
  const recTicker = params.get('rec')
  const recHandled = useRef(false)
  useEffect(() => {
    if (!recTicker || recHandled.current || server.state !== 'ready') return
    recHandled.current = true
    const rest = new URLSearchParams(params)
    rest.delete('rec')
    setParams(rest, { replace: true })
    void searchCandidates({ keyword: recTicker, includeOutOfProfile: true }).then(
      (list) => {
        const hit = list.items.find((i) => i.ticker === recTicker)
        if (hit) pickPackage(hit)
        else showToast('추천 종목을 찾지 못했어요', 2200)
      },
      (err: unknown) => failDialog('추천 종목을 불러오지 못했어요', err)
    )
    // 한 번만 실행(recHandled로 막음)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recTicker, server.state])

  // 탭 전환은 기록을 쌓지 않고 바꿈(원본 replaceState): 성향별 추천은 #recommend, 나만의 패키지는 해시 없이 현재 쿼리 유지
  const pickTab = (key: string) => navigate({ pathname: '/invest', search, hash: key === 'rec' ? '#recommend' : '' }, { replace: true })

  const names = useMemo(() => Object.fromEntries(views.flatMap((v) => v.items.map((i) => [i.code, i.name]))), [views])

  return (
    <>
      <h1 className={styles.srOnly}>주식 패키지</h1>
      <Tabs variant="page" ariaLabel="주식 패키지 화면" items={TABS} value={tab} onChange={pickTab} />

      {tab === 'mine' && server.state === 'loading' && <div className={styles.stateBox}>내 패키지를 불러오고 있어요…</div>}
      {tab === 'mine' && server.state === 'unauthorized' && <div className={styles.stateBox}>로그인이 필요해요. 로그인한 뒤 다시 열어 주세요.</div>}
      {tab === 'mine' && server.state === 'error' && (
        <div className={styles.stateBox}>
          내 패키지를 불러오지 못했어요.{' '}
          <button type="button" className={styles.stateRetry} onClick={server.reload}>
            다시 시도
          </button>
        </div>
      )}

      {tab === 'mine' && server.state === 'ready' && (
        <div className={styles.mine}>
          <div className={styles.colLeft}>
            <InvestAssetsBox className={styles.assets} views={views} cash={cash} />
            <InvestPkgList className={styles.list} rows={rows} sort={sort} onSort={setSort} selected={selected} onSelect={(id) => setParams({ pkg: id }, { replace: true })} onNew={() => setNm(openNewPkg())} />
          </div>
          <div className={styles.colRight}>
            {cur ? (
              <>
                <InvestPkgDetail
                  pkg={cur}
                  risk={risk}
                  onRecheck={risk.recheck}
                  onTrade={openTrade}
                  onBuy={() => {
                    closePanel()
                    setBulk('')
                  }}
                  onAdd={() => openAdd()}
                  onRename={renamePkg}
                  onDelete={askDelete}
                />
                <InvestOrders orders={orders.filter((o) => o.pkg === cur.id)} open={ordOpen} onOpen={setOrdOpen} />
              </>
            ) : (
              <div className={styles.stateBox}>아직 만든 패키지가 없어요. 왼쪽의 “+ 새 패키지”로 시작해 보세요.</div>
            )}
          </div>
        </div>
      )}

      {tab === 'rec' && <InvestRec onAdd={pickPackage} />}

      {tab === 'mine' && cur && fees && trade && <InvestTradePanel trade={trade} pkg={cur} cash={cash} fees={fees} onChange={(patch) => setTrade({ ...trade, ...patch })} onClose={closePanel} onSubmit={(c) => submitTrade(trade, c)} />}
      {tab === 'mine' && cur && fees && bulk !== null && <InvestBulkPanel pkg={cur} cash={cash} fees={fees} amt={bulk} onAmt={setBulk} onClose={closePanel} onSubmit={submitBulk} />}
      {tab === 'mine' && cur && add && (
        <InvestAddPanel
          pkg={cur}
          add={add}
          names={names}
          onChange={(patch) => setAdd({ ...add, ...patch })}
          onClose={closePanel}
          onPick={(c) => gateCandidate(c, () => setAdd((a) => (a ? { ...a, pick: c.ticker, pct: '', adj: null, info: { ...a.info, [c.ticker]: pickedFrom(c) } } : a)))}
          onAdd={addItem}
        />
      )}
      {nm && (
        <InvestNewPkg
          nm={nm}
          cash={cash}
          fees={fees}
          onPatch={(p) => setNm((n) => (n ? { ...n, ...(typeof p === 'function' ? p(n) : p) } : n))}
          onClose={() => setNm(null)}
          onMake={makePkg}
          onDialog={setDlg}
          noCand={noCand}
          chkDemo={chkDemo}
        />
      )}
      {dlg && <InvestDialog dialog={dlg} onClose={() => setDlg(null)} />}
      {uf && (
        <InvestUnsuitDialog
          state={uf}
          onToggle={() => setUf({ ...uf, agree: !uf.agree })}
          onCancel={() => setUf(null)}
          onOk={() => {
            if (!uf.agree) return
            const d = F.today()
            setUnsuit((u) => ({ ...u, ...Object.fromEntries(uf.codes.map((c) => [c, d])) }))
            setUf(null)
            uf.then()
          }}
        />
      )}
      <InvestDevPanel onChange={changeDemo} noCand={noCand} onNoCand={setNoCand} chk={chkDemo} onChk={setChkDemo} rej={rejNext} onRej={setRejNext} />
      <Toast message={message} />
    </>
  )
}
