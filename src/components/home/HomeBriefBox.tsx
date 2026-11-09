import axios from 'axios'
import { subscribeAssetEvents, type AssetConnection } from '../../api/assetEvents'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/authState'
import '../../styles/tokens.css'
import { RETURNS_DATA as RD } from '../../data/returns'
import { getCustomerAssetBriefing, getCustomerTaxBriefing, getCustomerExpectedTaxBriefing } from '../../api/briefing'
import type { CustomerAssetBriefing, CustomerTaxBriefing, CustomerExpectedTaxBriefing } from '../../api/briefing'
import { Box } from '../common/Box'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { cx } from '../common/cx'
import styles from './HomeBriefBox.module.css'

type Tab = 'tax' | 'asset'
type RequestState<T> =
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'not-ready' }
  | { status: 'not-found' }
  | { status: 'error' }

const wonFormatter = new Intl.NumberFormat('ko-KR', { maximumFractionDigits: 0 })
const formatWon = (value: number | null | undefined) =>
  value == null ? '확인 불가' : `₩${wonFormatter.format(Math.round(value))}`
const formatDateTime = (value: string | null | undefined) =>
  value ? value.replace('T', ' ').slice(0, 16) : '—'
const formatDate = (value: string | null | undefined) =>
  value ? value.slice(5, 10).replace('-', '/') : '—'

async function load<T>(request: () => Promise<T>): Promise<RequestState<T>> {
  try {
    return { status: 'success', data: await request() }
  } catch (error) {
    if (axios.isAxiosError(error) && error.response?.status === 401) throw error
    if (axios.isAxiosError<{ code?: string }>(error) && error.response?.status === 404) {
      if (error.response.data?.code === 'TAX_SNAPSHOT_NOT_FOUND') {
        return { status: 'not-ready' }
      }
      if (error.response.data?.code === 'ACCOUNT_NOT_FOUND') {
        return { status: 'not-found' }
      }
    }
    return { status: 'error' }
  }
}

// 요청별로 로딩·재시도하며 종료된 요청의 응답은 반영하지 않는다.
function useBriefingRequest<T>(request: () => Promise<T>, onSessionExpired: () => void) {
  const [state, setState] = useState<RequestState<T>>({ status: 'loading' })
  const [attempt, setAttempt] = useState(0)
  const running = useRef(false)
  const pending = useRef(false)
  const retry = useCallback(() => {
    pending.current = false
    setState({ status: 'loading' })
    setAttempt((value) => value + 1)
  }, [])
  const refresh = useCallback(() => {
    if (running.current) {
      pending.current = true
      return
    }
    setAttempt((value) => value + 1)
  }, [])

  useEffect(() => {
    let active = true
    running.current = true
    void load(request).then((result) => {
      if (active) setState((previous) => previous.status === 'success' && result.status === 'error' ? previous : result)
    }).catch(() => {
      if (active) onSessionExpired()
    }).finally(() => {
      if (!active) return
      running.current = false
      if (pending.current) {
        pending.current = false
        setAttempt((value) => value + 1)
      }
    })
    return () => { active = false; running.current = false }
  }, [request, attempt, onSessionExpired])

  return [state, retry, refresh] as const
}

// 끼루 브리핑은 고객별 백엔드 계산 결과를 표시한다.
export function HomeBriefBox({ className }: { className?: string }) {
  const [tab, setTab] = useState<Tab>('tax')
  const [guide, setGuide] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { logout } = useAuth()
  const sessionExpired = useRef(false)
  const onSessionExpired = useCallback(() => {
    if (sessionExpired.current) return
    sessionExpired.current = true
    void logout()
    navigate('/login', { replace: true, state: { from: location.pathname } })
  }, [logout, navigate, location.pathname])
  const [taxState, retryTax] = useBriefingRequest(getCustomerTaxBriefing, onSessionExpired)
  const [expectedState, retryExpected] = useBriefingRequest(getCustomerExpectedTaxBriefing, onSessionExpired)
  const [assetState, retryAsset, refreshAsset] = useBriefingRequest(getCustomerAssetBriefing, onSessionExpired)
  const [taxH, setTaxH] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const noAccount = [taxState, expectedState, assetState].some((state) => state.status === 'not-found')
  const cur: Tab = noAccount ? 'tax' : tab
  const [assetConnection, setAssetConnection] = useState<AssetConnection>('connecting')

  useEffect(() => {
    if (cur !== 'asset' || noAccount) return
    return subscribeAssetEvents(refreshAsset, setAssetConnection)
  }, [cur, noAccount, refreshAsset])

  useEffect(() => {
    const el = bodyRef.current
    if (cur !== 'tax' || !el) return
    const measure = () => {
      const height = el.offsetHeight
      if (height) setTaxH(height)
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [cur, noAccount])

  const tabs: [Tab, string][] = noAccount ? [] : [['tax', '절세'], ['asset', '자산']]
  const head = (
    <div className={styles.tabs}>
      {tabs.map(([key, label], index) => (
        <span key={key} className={styles.tabItem}>
          {index > 0 && <span className={styles.sep}>·</span>}
          <button
            type="button"
            aria-pressed={cur === key}
            className={cx(styles.tab, cur === key && styles.tabOn)}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        </span>
      ))}
    </div>
  )

  return (
    <Box shadow className={className} title="끼루 브리핑" head={head}>
      {noAccount && (
        <div className={styles.noAcct}>
          <div className={styles.noAcctTitle}>계좌를 열면 절세·자산 정보를 확인할 수 있어요</div>
          <div className={styles.noAcctGo}>
            <Link to="/account#open">계좌 개설하기 ›</Link>
          </div>
        </div>
      )}
      {!noAccount && cur === 'tax' && (
        <div ref={bodyRef}>
          <TaxTab
            state={taxState}
            expectedState={expectedState}
            guide={guide}
            setGuide={setGuide}
            onRetry={retryTax}
            onRetryExpected={retryExpected}
          />
        </div>
      )}
      {!noAccount && cur === 'asset' && (
        <AssetTab state={assetState} minHeight={taxH} onRetry={retryAsset} connection={assetConnection} />
      )}
    </Box>
  )
}

interface TaxTabProps {
  state: RequestState<CustomerTaxBriefing>
  expectedState: RequestState<CustomerExpectedTaxBriefing>
  guide: boolean
  setGuide: (value: boolean) => void
  onRetry: () => void
  onRetryExpected: () => void
}

function TaxTab({ state, expectedState, guide, setGuide, onRetry, onRetryExpected }: TaxTabProps) {
  if (state.status !== 'success') {
    if (state.status === 'not-ready') {
      return (
        <div className={styles.noAcct} role="status">
          <div className={styles.noAcctTitle}>아직 집계된 절세 정보가 없어요.</div>
          <div className={styles.factSub}>집계가 완료되면 세금과 감면액을 확인할 수 있어요.</div>
          <button type="button" className={styles.segBtn} onClick={onRetry}>다시 불러오기</button>
        </div>
      )
    }
    return <RequestMessage status={state.status} onRetry={onRetry} />
  }

  const briefing = state.data
  const expected = expectedState.status === 'success' ? expectedState.data : null
  const noHoldings = expected?.holdingCount === 0
  const useExpected = guide && expected !== null
  const scenario = useExpected ? expected! : briefing.current
  const maxTax = Math.max(briefing.current.generalTax, briefing.current.riaTax + briefing.current.reliefAmount, expected?.generalTax ?? 0, (expected?.riaTax ?? 0) + (expected?.reliefAmount ?? 0), 1)
  const generalHeight = `${(scenario.generalTax / maxTax) * 100}%`
  const riaHeight = `${(scenario.riaTax / maxTax) * 100}%`
  // 합산 감면액이 줄어들 수도 있으므로, 막대는 실제 합계 안에서만 나눈다.
  const finalizedRelief = useExpected ? expected!.finalizedReliefAmount : scenario.reliefAmount
  const confirmedSegment = Math.min(finalizedRelief, scenario.reliefAmount)
  const projectedSegment = Math.max(scenario.reliefAmount - confirmedSegment, 0)
  const confirmedHeight = `${(confirmedSegment / maxTax) * 100}%`
  const projectedHeight = `${(projectedSegment / maxTax) * 100}%`
  const reliefHeight = `${(scenario.reliefAmount / maxTax) * 100}%`
  const reliefLabelPosition = scenario.reliefAmount > 0
    ? Math.max(18, Math.min(82, ((scenario.riaTax + scenario.reliefAmount / 2) / maxTax) * 100))
    : 50
  const confirmedLabelInside = confirmedSegment / maxTax >= 0.2
  const projectedLabelInside = projectedSegment / maxTax >= 0.2
  const chartMotionKey = `${guide}:${maxTax}:${scenario.generalTax}:${scenario.riaTax}:${scenario.reliefAmount}:${confirmedSegment}:${projectedSegment}`
  const expectedMessage = expectedState.status === 'loading' ? '계산 중…' : '확인 불가'

  return (
    <div className={styles.taxBody}>
      <div className={styles.topRow}>
        <div>
          <div className={styles.cutLabel}>RIA로 줄어드는 세금</div>
          <div className={styles.cutBig}>
            {guide && noHoldings ? '대상 없음' : guide && !expected ? expectedMessage : formatWon(scenario.reliefAmount)}
          </div>
        </div>
        <span className={styles.asOf}>
          {guide && noHoldings ? '가정 매도 대상 없음' : guide && !expected ? '가정 매도 예상 세액' : useExpected ? `가정 매도 결제일 ${formatDate(expected!.expectedFinalAt)}` : `집계 기준 ${formatDateTime(briefing.calculatedAt)}`}
        </span>
      </div>

      <div role="group" aria-label="세액 계산 기준" className={styles.seg}>
        <button
          type="button"
          className={cx(styles.segBtn, !guide && styles.segOn)}
          aria-pressed={!guide}
          onClick={() => setGuide(false)}
        >
          현재까지
        </button>
        <button
          type="button"
          className={cx(styles.segBtn, styles.segBtnSecond, guide && styles.segOn)}
          aria-pressed={guide}
          onClick={() => setGuide(true)}
        >
          보유 종목을 가정 매도하면
        </button>
      </div>

      <div className={styles.chart}>
        {guide && noHoldings ? (
          <div className={styles.noAcct} role="status" aria-live="polite">
            <div className={styles.noAcctTitle}>가정 매도할 보유 종목이 없어요.</div>
            <div className={styles.factSub}>현재까지의 세금과 감면액은 ‘현재까지’에서 확인해 주세요.</div>
          </div>
        ) : guide && !expected ? (
          <div className={styles.noAcct} role="status" aria-live="polite" aria-busy={expectedState.status === 'loading'}>
            <div className={styles.noAcctTitle}>
              {expectedState.status === 'loading' ? '가정 매도 예상 세액을 계산 중이에요.' : '예상 세액을 불러오지 못했어요.'}
            </div>
            <div className={styles.factSub}>
              {expectedState.status === 'loading' ? '계산이 끝나면 여기에 그래프가 표시돼요.' : '다시 시도하거나 현재까지의 결과를 확인해 주세요.'}
            </div>
            {expectedState.status !== 'loading' && (
              <button type="button" className={styles.segBtn} onClick={onRetryExpected}>다시 시도</button>
            )}
          </div>
        ) : (
          <>
            <div key={chartMotionKey} className={styles.plot}>
              <div className={cx(styles.barAmount, styles.amountGeneral, styles.chartAnnotation)} style={{ bottom: `calc(${generalHeight} + var(--space-8))` }} aria-label="일반 과세 세액">{formatWon(scenario.generalTax)}</div>
              <div className={cx(styles.barAmount, styles.amountRia, styles.chartAnnotation)} style={{ bottom: `calc(${((scenario.riaTax + scenario.reliefAmount) / maxTax) * 100}% + var(--space-8))` }} aria-label="감면 후 납부세액">{formatWon(scenario.riaTax)}</div>
              {scenario.generalTax > 0 && (
                <div key={`taxGuideLine:${chartMotionKey}`} className={styles.taxGuideLine} style={{ bottom: generalHeight }} aria-hidden="true" />
              )}
              <div className={styles.barGeneral} style={{ height: generalHeight }} />
              <div className={cx(styles.barRia, scenario.riaTax > 0 && scenario.reliefAmount === 0 && styles.stackTop)} style={{ height: riaHeight }} />
              <div className={cx(styles.barRelief, confirmedSegment > 0 && projectedSegment === 0 && styles.stackTop)} style={{ height: confirmedHeight, bottom: riaHeight }}>
                {confirmedLabelInside && <span className={styles.segmentText}>확정 감면액<br />{formatWon(confirmedSegment)}</span>}
              </div>
              <div className={cx(styles.barProjected, styles.expectedRelief, projectedSegment > 0 && styles.stackTop)} style={{ height: projectedHeight, bottom: `${((scenario.riaTax + confirmedSegment) / maxTax) * 100}%` }}>
                {projectedLabelInside && <span className={styles.segmentText}>추가 예상 감면액<br />{formatWon(projectedSegment)}</span>}
              </div>
              {scenario.reliefAmount > 0 && (
                <div key={`reliefBracket:${chartMotionKey}`} className={styles.reliefBracket} style={{ bottom: riaHeight, height: reliefHeight }} aria-hidden="true" />
              )}
              {scenario.reliefAmount > 0 && (
                <div key={`reliefLabel:${chartMotionKey}`} className={cx(styles.reliefLabel, styles.chartAnnotation)} style={{ bottom: `${reliefLabelPosition}%` }}><div className={styles.barCaption}>총 감면액</div>−{formatWon(scenario.reliefAmount)}</div>
              )}
            </div>
            <div className={styles.axis}>
              <span className={styles.axisGeneral}>일반 과세</span>
              <span className={styles.axisRia}>RIA 적용</span>
            </div>
            <div className={styles.chartLegend}>
              <span><i className={styles.taxSwatch} aria-hidden="true" />감면 후 납부세액 {formatWon(scenario.riaTax)}</span>
              <span><i className={styles.reliefSwatch} aria-hidden="true" />확정 감면액 {formatWon(confirmedSegment)}</span>
              {useExpected && projectedSegment > 0 && <span><i className={cx(styles.reliefSwatch, styles.expectedRelief)} aria-hidden="true" />추가 예상 감면액 {formatWon(projectedSegment)}</span>}
            </div>
            <div className={styles.zeroTax} role="status">
              <span className={cx(styles.zeroNote, (guide || scenario.generalTax !== 0 || scenario.riaTax !== 0) && styles.hiddenNote)} aria-hidden={guide || scenario.generalTax !== 0 || scenario.riaTax !== 0}>
                현재까지 계산된 세액과 감면액은 0원이에요.
              </span>
              <span className={cx(styles.zeroNote, (!guide || scenario.generalTax !== 0 || scenario.riaTax !== 0) && styles.hiddenNote)} aria-hidden={!guide || scenario.generalTax !== 0 || scenario.riaTax !== 0}>
                합산 가정 매도 예상 세액은 0원이에요.
              </span>
            </div>
          </>
        )}
      </div>

      {!guide && expectedState.status === 'loading' && (
        <div className={styles.factSub} role="status">보유 종목의 가정 매도 예상 세액을 계산하고 있어요.</div>
      )}
      {!guide && expectedState.status !== 'loading' && expectedState.status !== 'success' && (
        <div className={styles.warn} role="status">
          예상 세액을 불러오지 못했어요. 현재까지의 결과는 확인할 수 있어요.
          <button type="button" className={styles.segBtn} onClick={onRetryExpected}>다시 시도</button>
        </div>
      )}

      <div className={styles.facts}>
        <div className={styles.factL}>
          <div className={styles.factKey}>확정 매도분 감면액</div>
          <div className={styles.factVal}>{formatWon(briefing.current.reliefAmount)}</div>
          <div className={styles.factSub}>집계 기준 {formatDateTime(briefing.calculatedAt)}</div>
        </div>
        <div className={styles.factR}>
          <div className={styles.factKey}>가정 매도 후 전체 감면액</div>
          <div className={styles.factVal}>
            {noHoldings ? '대상 없음' : expected === null ? expectedMessage : formatWon(expected.reliefAmount)}
          </div>
          {expected && !noHoldings && (
            <div className={styles.factSub}>
              가정 매도 결제일 {formatDate(expected.expectedFinalAt)}
            </div>
          )}
        </div>
      </div>
      {expected && expected.additionalReliefAmount < 0 && (
        <div className={styles.warn} role="status">보유분 손익 반영으로 감면액이 {formatWon(Math.abs(expected.additionalReliefAmount))} 줄어들어요.</div>
      )}
    </div>
  )
}

interface AssetTabProps {
  connection: AssetConnection
  state: RequestState<CustomerAssetBriefing>
  minHeight: number
  onRetry: () => void
}

function AssetTab({ state, minHeight, onRetry, connection }: AssetTabProps) {
  if (state.status !== 'success') {
    return <RequestMessage status={state.status} onRetry={onRetry} />
  }

  const asset = state.data
  const profit = asset.valuationProfit
  const pnlClass = profit == null ? styles.flat : profit > 0 ? styles.up : profit < 0 ? styles.down : styles.flat
  const recentPurchases = asset.monthlyPurchases.slice(-3).reverse()
  const valuationUnavailable = asset.domesticValuationAmount == null

  return (
    <div className={styles.assetBody} style={{ minHeight }}>
      <div className={styles.assetTop}>
        <div>
          <div className={styles.cutLabel}>국내 운용 자산 평가액</div>
          <div className={styles.assetBig}>
            {valuationUnavailable ? '시세 연결 후 확인' : formatWon(asset.domesticValuationAmount)}
          </div>
        </div>
        <span className={cx(styles.pnl, pnlClass)}>
          {profit == null
            ? '평가손익 확인 불가'
            : `평가손익 ${profit > 0 ? '+' : profit < 0 ? '−' : ''}${formatWon(Math.abs(profit))}${asset.valuationReturnRate == null ? '' : ` (${asset.valuationReturnRate > 0 ? '+' : ''}${asset.valuationReturnRate.toFixed(2)}%)`}`}
        </span>
      </div>

      <div className={styles.summaryRow}>
        <KkiruAvatar profile={RD.CUSTOMER.profile} size={24} />
        <span className={styles.summary}>
          {asset.investmentRatio == null
            ? '누적 확정 환전액이 없어 보유자산 비율을 계산할 수 없어요.'
            : `보유자산 매입금액은 누적 확정 환전액의 ${asset.investmentRatio.toFixed(2)}%예요.`}
        </span>
      </div>

      <div className={styles.flows}>
        <div className={styles.flow}>
          <span className={styles.flowTxt}>계좌 예수금 {formatWon(asset.cashAmount)}</span>
          <Link to="/invest" className={styles.flowLink}>투자 보기 ›</Link>
        </div>
        <div className={styles.flow}>
          <span className={styles.flowTxt}>
            보유자산 매입금액 {formatWon(asset.investmentCostAmount)} · 누적 확정 환전액 {formatWon(asset.cumulativeInflowAmount)}
          </span>
        </div>
        <div className={styles.flow}>
          <span className={styles.flowTxt}>
            월별 매수: {recentPurchases.length
              ? recentPurchases.map((purchase) => `${purchase.month} ${formatWon(purchase.buyAmount)}`).join(' · ')
              : '내역 없음'}
          </span>
          <Link to="/account#flow" className={styles.flowLink}>자금 흐름 ›</Link>
        </div>
      </div>

      <div className={styles.factSub} role="status">
        {connection === 'reconnecting' ? '실시간 연결을 다시 시도하고 있어요. 마지막 조회 값을 표시해요.' : connection === 'connected' ? '자산 정보를 자동으로 갱신하고 있어요.' : '실시간 연결 중이에요.'}
      </div>
      <div className={styles.assetFoot}>
        {valuationUnavailable
          ? '현재가를 확인할 수 없어 평가액과 손익을 표시하지 않았어요.'
          : `업무 기준 ${formatDateTime(asset.calculatedAt)} · 시세 기준 ${formatDateTime(asset.valuationPriceTo)}`}
      </div>
    </div>
  )
}

function RequestMessage({
  status,
  onRetry,
}: {
  status: Exclude<RequestState<unknown>['status'], 'success'>
  onRetry: () => void
}) {
  return (
    <div className={styles.noAcct} role="status" aria-live="polite">
      <div className={styles.noAcctTitle}>
        {status === 'loading'
          ? '브리핑을 불러오고 있어요.'
          : status === 'not-ready'
            ? '브리핑 계산 자료가 아직 준비되지 않았어요.'
          : status === 'not-found'
            ? '브리핑 계좌 정보를 찾을 수 없어요.'
            : '브리핑을 불러오지 못했어요.'}
      </div>
      {status !== 'loading' && (
        <button type="button" className={styles.segBtn} onClick={onRetry}>
          다시 시도
        </button>
      )}
    </div>
  )
}
