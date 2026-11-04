import { useEffect, useMemo, useReducer, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { ApplyModal } from '../components/account/ApplyModal'
import { SellModal } from '../components/account/SellModal'
import { AccountDevPanel } from '../components/account/AccountDevPanel'
import { AccountBalanceBox } from '../components/account/AccountBalanceBox'
import { AccountDocsBox } from '../components/account/AccountDocsBox'
import { AccountHistBox } from '../components/account/AccountHistBox'
import { AccountHoldBox } from '../components/account/AccountHoldBox'
import { AccountLimitBox } from '../components/account/AccountLimitBox'
import { AccountTaxBox } from '../components/account/AccountTaxBox'
import { TaxCalcModal } from '../components/account/TaxCalcModal'
import { issuedRecords, setAdjOverride, docTypeOf } from '../components/account/accountTaxData'
import { apiErrorMessage } from '../api/client'
import { downloadDocument, issueDocument, listDocuments } from '../api/documents'
import { ALERT_DESC, ALERT_LINK, ALERT_TAG, BOT_CHIPS, botGreeting, botTurn } from '../components/account/accountBotData'
import type { ApplyAlert } from '../components/account/accountBotData'
import type { IssueRecord } from '../components/account/accountTaxData'
import { AccountStateBox } from '../components/account/AccountStateBox'
import { AccountSummaryBox } from '../components/account/AccountSummaryBox'
import { FOOT_FLOW, FOOT_STATUS, PAGE_TABS } from '../components/account/accountData'
import type { PageKey } from '../components/account/accountData'
import type { AddedIn, AddedOut, ApplyKind } from '../components/account/accountApplyData'
import type { SubmittedInboundResult } from '../components/account/ApplyModal'
import { moreTitle } from '../components/account/accountSellData'
import type { AddedSell, AddedSettle } from '../components/account/accountSellData'
import { isHistTab } from '../components/account/accountHistData'
import type { HistTab } from '../components/account/accountHistData'
import styles from '../components/account/AccountLayout.module.css'
import { FlowAllocBox, FlowCutBox, FlowMonthlyBox, FlowStepsBox } from '../components/account/AccountFlowBoxes'
import { useStream } from '../api/useChatStream'
import { Tabs } from '../components/common/Tabs'
import { Toast } from '../components/common/Toast'
import { useToast } from '../components/common/useToast'
import { RETURNS_DATA as RD } from '../data/returns'
import type { DemoSettings } from '../data/returns'
import { useAppShell } from '../layouts/appShell'
import { F } from '../lib/calc'
import { useFundFlow } from '../components/account/useFundFlow'
import { useDocumentTitle } from '../components/common/useDocumentTitle'

// 자금 흐름 탭에서 서버 값이 아닌 데이터를 보여줄 때의 안내 문구
const FLOW_NOTICE: Record<string, string> = {
  loading: '내 자금 흐름을 불러오는 중이에요. 아래 숫자는 아직 예시예요.',
  demo: '시연용 예시 데이터예요. 실제 내 계좌 값이 아니에요.',
  error: '내 자금 흐름을 불러오지 못했어요. 지금 보이는 숫자는 시연용 예시이니 잠시 후 다시 확인해 주세요.'
}

// 내 계좌 — 1~8번째 부분: 뼈대·페이지 탭·계좌 요약·계좌 상태 + 매도 한도·세액·원금 유지·증빙서류 + 잔고 + 거래·신청 내역 + 자금 흐름 탭 박스 4개 + 입고·인출·계좌 개설 신청 창 + 매도 신청 창 + 상담 창·상단 종 알림·시연 설정
export function AccountPage() {
  useDocumentTitle('Returns 내 계좌')
  const { hash, pathname, search } = useLocation()
  const navigate = useNavigate()
  const shell = useAppShell()
  const { message: toast, showToast } = useToast()

  // 시연 설정(계좌 상태 등)이 바뀌면 다시 그림(원본 returns-demo 이벤트)
  const [, redraw] = useReducer((n: number) => n + 1, 0)
  useEffect(() => {
    window.addEventListener('returns-demo', redraw)
    return () => window.removeEventListener('returns-demo', redraw)
  }, [])

  const [calcOpen, setCalcOpen] = useState(false)
  // 자금 흐름 탭에 들어왔을 때만 서버 값을 받아옴(실패하면 시연 데이터로 보임)
  const fundFlow = useFundFlow(RD.ACCOUNT_STATE === 'opened' && hash === '#flow')

  // 끼루 AI 상담 창 — AppLayout 공유 스트림 사용, 페이지 이동 시 대화 이력 유지
  const stream = useStream()
  const { messages: bot, send, cancel, addMessages } = stream
  const streamRef = useRef(stream)
  streamRef.current = stream
  useEffect(() => {
    if (streamRef.current.messages.length === 0)
      streamRef.current.addMessages([botGreeting()])
  }, []) // intentional: mount only
  const chat = useMemo(
    () => ({
      messages: bot,
      chips: BOT_CHIPS.map((label) => ({ label, onClick: () => addMessages(botTurn(label)) })),
      onSend: send
    }),
    [bot, send, addMessages]
  )
  useEffect(() => {
    shell.setChat(chat)
  }, [shell, chat])
  useEffect(() => () => { cancel() }, [cancel])
  useEffect(
    () => () => {
      shell.setChat(null)
      shell.setBotOpen(false)
      shell.setTopBar({})
      setAdjOverride(null)
    },
    [shell]
  )

  // 상단 종 알림 — 신청이 접수될 때마다 1건 추가(누르면 해당 내역 탭으로)
  const [alerts, setAlerts] = useState<ApplyAlert[]>([])
  const addAlert = (title: string, tab: ApplyAlert['tab']) => setAlerts((prev) => [{ title, tab }, ...prev])
  const goHistRef = useRef<(tab: HistTab) => void>(() => {})
  const profLabel = RD.PROFILES[RD.CUSTOMER.profile].label
  useEffect(() => {
    shell.setTopBar({
      todos: alerts.map((a) => ({
        tag: ALERT_TAG,
        tagColor: 'var(--color-navy)',
        title: a.title,
        desc: ALERT_DESC,
        to: '#' + a.tab,
        link: ALERT_LINK,
        onClick: (e) => {
          e.preventDefault()
          goHistRef.current(a.tab)
        }
      })),
      todoDate: F.short(F.today()),
      todoAlert: alerts.length,
      profLabel
    })
  }, [shell, alerts, profLabel])

  // 신청 창 — 입고 / 인출 / 계좌 개설. 주소 끝이 #open이고 계좌가 없거나 반려일 때도 열림(원본 onHash)
  const canOpenAcct = () => RD.ACCOUNT_STATE !== 'opened' && RD.ACCOUNT_STATE !== 'reviewing'
  const [applyKind, setApplyKind] = useState<ApplyKind | null>(() => (hash === '#open' && canOpenAcct() ? 'open' : null))
  // 접수한 신청 — 거래·신청 내역 해당 탭 맨 위에 '심사 중' 줄로 보임
  const [addedIn, setAddedIn] = useState<AddedIn[]>([])
  const [addedOut, setAddedOut] = useState<AddedOut[]>([])
  // 매도 신청 창 — 접수한 매도는 매도 내역·정산 상태 맨 위에 '심사 중' 줄로 보임
  const [sellOpen, setSellOpen] = useState(false)
  const [addedSell, setAddedSell] = useState<AddedSell[]>([])
  const [addedSettle, setAddedSettle] = useState<AddedSettle[]>([])
  const [issued, setIssued] = useState<IssueRecord[]>([])
  // 발급 기록은 서버 기록(서버는 같은 종류를 한 번만 발급해 같은 서류가 두 줄이 되지 않는다)
  const issuedReq = useRef(0)
  const loadIssued = () => {
    const req = ++issuedReq.current
    return listDocuments()
      .then((list) => req === issuedReq.current && setIssued(issuedRecords(list)))
      .catch(() => {})
  }
  useEffect(() => {
    void loadIssued()
    return () => {
      issuedReq.current = -1 // 화면을 떠나면 늦게 온 응답을 버린다
    }
  }, [])

  // 거래·신청 내역 탭 — 주소 끝(#deposits 등)이 탭 이름이면 그 탭을 연다(원본 onHash). 자금 흐름 화면에 다녀와도 유지
  const [histTab, setHistTab] = useState<HistTab>(() => (isHistTab(hash.slice(1)) ? (hash.slice(1) as HistTab) : 'deposits'))
  const ownHash = useRef(false) // 탭을 눌러 우리가 바꾼 주소 — 이때는 스크롤하지 않음
  const [seenHash, setSeenHash] = useState(hash)
  if (seenHash !== hash) {
    setSeenHash(hash)
    if (isHistTab(hash.slice(1))) setHistTab(hash.slice(1) as HistTab)
    if (hash === '#open' && canOpenAcct()) setApplyKind('open')
  }

  const opened = RD.ACCOUNT_STATE === 'opened'
  const page: PageKey = opened && hash === '#flow' ? 'flow' : 'status'

  const scrollToHist = () =>
    setTimeout(() => {
      const el = document.querySelector('[data-box="hist"]')
      if (el) window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 80, behavior: 'smooth' })
    }, 30)

  // 주소로 들어오거나 주소 끝이 바뀌어 탭 이름이 되면 그 탭의 박스로 스크롤
  useEffect(() => {
    if (ownHash.current) {
      ownHash.current = false
      return
    }
    if (opened && isHistTab(hash.slice(1))) {
      const t = scrollToHist()
      return () => clearTimeout(t)
    }
  }, [hash, opened])

  // ?open=inbound|sell|withdrawal 파라미터로 해당 모달 열기 (끼루 챗봇 링크 연동)
  useEffect(() => {
    const params = new URLSearchParams(search)
    const open = params.get('open')
    if (open === 'inbound') {
      setApplyKind('in')
      navigate(pathname + hash, { replace: true })
    } else if (open === 'withdrawal') {
      setApplyKind('out')
      navigate(pathname + hash, { replace: true })
    } else if (open === 'sell') {
      setSellOpen(true)
      navigate(pathname + hash, { replace: true })
    }
  }, [search]) // pathname, hash, navigate는 안정적 — search 변경 시에만 실행

  // #tax, #docs 해시로 해당 박스로 스크롤 (끼루 챗봇 링크 연동)
  useEffect(() => {
    if (hash === '#tax' || hash === '#docs') {
      const selector = `[data-box="${hash.slice(1)}"]`
      const el = document.querySelector(selector)
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [hash])

  // 탭을 누르면 주소 끝(#flow)만 바꾸고 기록은 남기지 않음(원본의 replaceState)
  const setPage = (key: string) => {
    navigate({ pathname, hash: key === 'flow' ? '#flow' : '' }, { replace: true })
    window.scrollTo(0, 0)
  }

  const copyAcct = () => {
    try {
      navigator.clipboard.writeText(RD.ACCOUNT.no)
    } catch {
      // 클립보드를 못 쓰는 환경에서도 안내는 보여 준다(원본과 동일)
    }
    showToast('계좌번호를 복사했어요')
  }

  // 탭을 누르면 주소 끝만 바꿈(원본 setTab의 replaceState)
  const pickHistTab = (k: HistTab) => {
    ownHash.current = '#' + k !== hash
    navigate({ pathname, hash: '#' + k }, { replace: true })
    setHistTab(k)
  }
  // 원금 유지의 '인출 내역 ›' — 인출 탭을 열고 거래·신청 내역 박스로 부드럽게 스크롤(원본 goHist)
  const goWithdraw = () => {
    pickHistTab('withdraw')
    scrollToHist()
  }

  // 신청 창 — 접수 결과를 내역에 올리고, 계좌 개설은 시연 상태를 '심사 중'으로 바꿈
  // 접수된 신청은 상단 종 알림에도 1건 추가(원본 alerts): 입고 · 매도 · 인출 신청만(계좌 개설 신청은 원본도 토스트만)
  const goHist = (tab: HistTab) => {
    setApplyKind(null)
    setSellOpen(false)
    pickHistTab(tab)
    scrollToHist()
  }
  useEffect(() => {
    goHistRef.current = goHist
  })
  // 어떤 신청 창이든 열면 상담 창은 닫힘(원본 openM)
  const openApply = (k: ApplyKind) => {
    shell.setBotOpen(false)
    setApplyKind(k)
  }
  const openSell = () => {
    shell.setBotOpen(false)
    setSellOpen(true)
  }
  const openCalc = () => {
    shell.setBotOpen(false)
    setCalcOpen(true)
  }
  const changeDemo = (patch: Partial<DemoSettings>) => {
    RD.setDemo(patch)
    if (patch.benefit !== undefined) setAdjOverride(null) // 혜택 상태를 바꾸면 조정비율은 그 상태 값으로 돌아감(원본)
    redraw()
  }
  const changeAdj = (v: number) => {
    setAdjOverride(v)
    redraw()
  }
  const finishOpen = () => {
    setApplyKind(null)
    RD.setDemo({ account: 'reviewing' })
    showToast('계좌 개설 신청이 접수됐어요')
  }
  const cancelOpen = () => {
    RD.setDemo({ account: 'none' })
    showToast('계좌 개설 신청을 취소했어요')
  }

  // PDF 받기 — 서버에서 발급(이미 있으면 그 발급본)해 내려받고, 발급 기록은 서버 목록을 다시 받는다
  const pdfBusy = useRef(false) // 연타로 발급 요청이 겹치지 않게
  const fetchPdf = async (name: string) => {
    const docType = docTypeOf(name)
    if (!docType || pdfBusy.current) return false
    pdfBusy.current = true
    try {
      const issue = await issueDocument(docType)
      await downloadDocument(issue.documentIssueId, name + '.pdf')
      return true
    } catch (e) {
      showToast(apiErrorMessage(e, name + ' PDF를 받지 못했어요. 잠시 뒤 다시 시도해 주세요'))
      return false
    } finally {
      pdfBusy.current = false
    }
  }
  const issue = async (name: string) => {
    if (!(await fetchPdf(name))) return
    void loadIssued()
    showToast(name + ' PDF를 받았어요')
  }
  const reissue = async (name: string) => {
    if (await fetchPdf(name)) showToast(name + ' PDF를 다시 받았어요')
  }

  return (
    <>
      <h1 className={styles.srOnly}>내 계좌</h1>
      {opened && <Tabs variant="page" ariaLabel="내 계좌 화면" items={PAGE_TABS} value={page} onChange={setPage} />}

      {!opened && <AccountStateBox onOpen={() => openApply('open')} onCancel={cancelOpen} />}

      {opened && page === 'status' && (
        <div className={styles.status}>
          <div className={styles.colLeft}>
            <AccountSummaryBox className={styles.summary} onCopy={copyAcct} onApply={(k) => (k === 'sell' ? openSell() : openApply(k))} />
            <AccountLimitBox className={styles.limit} onApply={openSell} />
            <AccountTaxBox className={styles.tax} onOpenCalc={openCalc} />
            <AccountHoldBox className={styles.hold} onHistory={goWithdraw} />
            <AccountDocsBox className={styles.docs} issued={issued} onIssue={issue} onReissue={reissue} />
          </div>
          <div className={styles.colRight}>
            <AccountBalanceBox className={styles.balance} onSell={openSell} />
            <AccountHistBox className={styles.hist} tab={histTab} onTab={pickHistTab} onApplyIn={() => openApply('in')} onApplyOut={() => openApply('out')} addedIn={addedIn} addedOut={addedOut} addedSell={addedSell} addedSettle={addedSettle} />
          </div>
        </div>
      )}

      {opened && page === 'flow' && (
        <div className={styles.flow}>
          {fundFlow.source === 'live' ? (
            <div className={styles.asOf}>{F.asOf(RD.C.BUSINESS_DATE)} · 매일 새벽 집계</div>
          ) : (
            <div className={fundFlow.source === 'error' ? styles.flowNoticeError : styles.flowNotice} role="status">
              {FLOW_NOTICE[fundFlow.source] ?? FLOW_NOTICE.demo}
            </div>
          )}
          <FlowStepsBox live={fundFlow} />
          <div className={styles.flowGrid}>
            <FlowMonthlyBox monthly={fundFlow.monthly} />
            <div className={styles.flowSide}>
              <FlowAllocBox allocation={fundFlow.allocation} />
              <FlowCutBox summary={fundFlow.summary} relief={fundFlow.relief} />
            </div>
          </div>
        </div>
      )}

      <p className={styles.foot}>{opened && page === 'flow' ? FOOT_FLOW : FOOT_STATUS}</p>
      {applyKind && (
        <ApplyModal
          kind={applyKind}
          onClose={() => setApplyKind(null)}
          onGoHist={goHist}
          onSubmitIn={(results: SubmittedInboundResult[]) => {
            const rows: AddedIn[] = results
              .filter((r) => r.status === 'ok')
              .map((r) => ({ t: r.ticker, req: r.requestedQty ?? r.approvedQty ?? 0, base: r.approvedQty ?? 0, now: r.approvedQty ?? 0 }))
            if (rows.length > 0) setAddedIn((prev) => [...rows, ...prev])
            addAlert('입고 신청 · ' + moreTitle(results.map((r) => ({ t: r.ticker }))), 'deposits')
          }}
          onSubmitOut={(amt) => {
            setAddedOut((prev) => [{ amt }, ...prev])
            addAlert('인출 신청 · ₩' + F.won(amt), 'withdraw')
          }}
          onFinishOpen={finishOpen}
        />
      )}
      {sellOpen && (
        <SellModal
          onClose={() => setSellOpen(false)}
          onGoHist={() => goHist('sells')}
          onSubmit={(sells, settle) => {
            setAddedSell((prev) => [...sells, ...prev])
            setAddedSettle((prev) => [settle, ...prev])
            addAlert('매도 신청 · ' + settle.title, 'sells')
          }}
        />
      )}
      <TaxCalcModal open={calcOpen} onClose={() => setCalcOpen(false)} />
      <AccountDevPanel onChange={changeDemo} onAdj={changeAdj} />
      <Toast message={toast} />
    </>
  )
}
