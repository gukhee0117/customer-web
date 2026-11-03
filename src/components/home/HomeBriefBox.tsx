import axios from 'axios'
import { useEffect, useRef, useState, type RefObject } from 'react'
import { Link } from 'react-router-dom'
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
  value == null ? '확인 불가' : wonFormatter.format(Math.round(value))
const formatDateTime = (value: string | null | undefined) =>
  value ? value.replace('T', ' ').slice(0, 16) : '—'
const formatDate = (value: string | null | undefined) =>
  value ? value.slice(5, 10).replace('-', '/') : '—'

async function load<T>(request: () => Promise<T>): Promise<RequestState<T>> {
  try {
    return { status: 'success', data: await request() }
  } catch (error) {
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

// 끼루 브리핑은 고객별 백엔드 계산 결과를 표시한다.
export function HomeBriefBox({ className }: { className?: string }) {
  const [tab, setTab] = useState<Tab>('tax')
  const [guide, setGuide] = useState(false)
  const [result, setResult] = useState<{
    retryKey: number
    tax: RequestState<CustomerTaxBriefing>
    expected: RequestState<CustomerExpectedTaxBriefing>
    asset: RequestState<CustomerAssetBriefing>
  } | null>(null)
  const [taxH, setTaxH] = useState(0)
  const [retryKey, setRetryKey] = useState(0)
  const bodyRef = useRef<HTMLDivElement>(null)
  const taxState: RequestState<CustomerTaxBriefing> =
    result?.retryKey === retryKey ? result.tax : { status: 'loading' }
  const assetState: RequestState<CustomerAssetBriefing> =
    result?.retryKey === retryKey ? result.asset : { status: 'loading' }
  const expectedState: RequestState<CustomerExpectedTaxBriefing> =
    result?.retryKey === retryKey ? result.expected : { status: 'loading' }
  const noAccount = assetState.status === 'not-found'
  const cur: Tab = noAccount ? 'tax' : tab

  useEffect(() => {
    let active = true
    const initial = {
      retryKey,
      tax: { status: 'loading' } as RequestState<CustomerTaxBriefing>,
      expected: { status: 'loading' } as RequestState<CustomerExpectedTaxBriefing>,
      asset: { status: 'loading' } as RequestState<CustomerAssetBriefing>,
    }
    void load(getCustomerTaxBriefing).then((tax) => {
      if (!active) return
      setResult((previous) => ({ ...(previous?.retryKey === retryKey ? previous : initial), tax }))
    })
    void load(getCustomerExpectedTaxBriefing).then((expected) => {
      if (!active) return
      setResult((previous) => ({ ...(previous?.retryKey === retryKey ? previous : initial), expected }))
    })
    void load(getCustomerAssetBriefing).then((asset) => {
      if (!active) return
      setResult((previous) => ({ ...(previous?.retryKey === retryKey ? previous : initial), asset }))
    })

    return () => {
      active = false
    }
  }, [retryKey])

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
  }, [cur, taxState.status])

  const retry = () => setRetryKey((value) => value + 1)
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
        <TaxTab
          bodyRef={bodyRef}
          state={taxState}
          expectedState={expectedState}
          guide={guide}
          setGuide={setGuide}
          onRetry={retry}
        />
      )}
      {!noAccount && cur === 'asset' && (
        <AssetTab state={assetState} minHeight={taxH} onRetry={retry} />
      )}
    </Box>
  )
}

interface TaxTabProps {
  bodyRef: RefObject<HTMLDivElement | null>
  state: RequestState<CustomerTaxBriefing>
  expectedState: RequestState<CustomerExpectedTaxBriefing>
  guide: boolean
  setGuide: (value: boolean) => void
  onRetry: () => void
}

function TaxTab({ bodyRef, state, expectedState, guide, setGuide, onRetry }: TaxTabProps) {
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
  const maxTax = Math.max(scenario.generalTax, scenario.riaTax, 1)
  const generalHeight = `${(scenario.generalTax / maxTax) * 70}%`
  const riaHeight = `${(scenario.riaTax / maxTax) * 70}%`
  const expectedMessage = expectedState.status === 'loading' ? '계산 중…' : '확인 불가'

  return (
    <div ref={bodyRef} className={styles.taxBody}>
      <div className={styles.topRow}>
        <div>
          <div className={styles.cutLabel}>RIA로 줄어드는 세금</div>
          <div className={styles.cutBig}>
            {guide && noHoldings ? '대상 없음' : guide && !expected ? expectedMessage : `₩${formatWon(scenario.reliefAmount)}`}
          </div>
        </div>
        <span className={styles.asOf}>
          {guide && noHoldings ? '가정 매도 대상 없음' : guide && !expected ? '가정 매도 예상 세액' : useExpected ? `가정 매도 결제일 ${formatDate(expected!.expectedFinalAt)}` : `집계 기준 ${formatDateTime(briefing.calculatedAt)}`}
        </span>
      </div>

      <div className={styles.cutNote}>
        {guide
          ? '아직 팔지 않은 보유분만 가정 매도한 예상치예요. 이미 판 내역은 포함하지 않아요.'
          : '확정된 매도 내역을 마지막 집계 시점 기준으로 계산했어요.'}
      </div>
      <div className={styles.cutNote}>
        매도·조기인출 등 최근 변경은 다음 일일 집계 후 반영돼요.
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

      {!guide && expectedState.status === 'loading' && (
        <div className={styles.factSub} role="status">보유 종목의 가정 매도 예상 세액을 계산하고 있어요.</div>
      )}
      {!guide && expectedState.status !== 'loading' && expectedState.status !== 'success' && (
        <div className={styles.warn} role="status">
          예상 세액을 불러오지 못했어요. 현재까지의 결과는 확인할 수 있어요.
          <button type="button" className={styles.segBtn} onClick={onRetry}>다시 시도</button>
        </div>
      )}

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
              <button type="button" className={styles.segBtn} onClick={onRetry}>다시 시도</button>
            )}
          </div>
        ) : (
          <>
        <div className={styles.plot}>
          <div className={styles.barGeneral} style={{ height: generalHeight }} />
          <div className={styles.generalLabel} style={{ bottom: generalHeight }}>
            <div className={styles.barCaption}>일반 과세 세액</div>
            ₩{formatWon(scenario.generalTax)}
          </div>
          <div className={styles.barRia} style={{ height: riaHeight }} />
          <div className={styles.riaLabel} style={{ bottom: riaHeight }}>
            <div className={styles.barCaption}>RIA 세액</div>
            ₩{formatWon(scenario.riaTax)}
          </div>
          <div className={styles.cutLabelChart} style={{ bottom: '4%' }}>
            <div className={styles.cutLabelSmall}>감면액</div>
            ₩{formatWon(scenario.reliefAmount)}
          </div>
        </div>
        <div className={styles.axis}>
          <span className={styles.axisGeneral}>일반 과세</span>
          <span className={styles.axisRia}>RIA 적용</span>
        </div>
          </>
        )}
      </div>

      <div className={styles.facts}>
        <div className={styles.factL}>
          <div className={styles.factKey}>확정 매도분 감면액</div>
          <div className={styles.factVal}>₩{formatWon(briefing.current.reliefAmount)}</div>
          <div className={styles.factSub}>집계 기준 {formatDateTime(briefing.calculatedAt)}</div>
        </div>
        <div className={styles.factR}>
          <div className={styles.factKey}>보유분 가정 매도 감면액</div>
          <div className={styles.factVal}>
            {noHoldings ? '대상 없음' : expected === null ? expectedMessage : `₩${formatWon(expected.reliefAmount)}`}
          </div>
          {expected && !noHoldings && (
            <div className={styles.factSub}>
              가정 매도 결제일 {formatDate(expected.expectedFinalAt)}
            </div>
          )}
        </div>
      </div>
      <div className={styles.assetFoot}>
        보유분 예상액은 추가 감면액이 아니에요. 두 금액은 각각 다른 매도 내역을 계산한 값이에요.
      </div>
    </div>
  )
}

interface AssetTabProps {
  state: RequestState<CustomerAssetBriefing>
  minHeight: number
  onRetry: () => void
}

function AssetTab({ state, minHeight, onRetry }: AssetTabProps) {
  if (state.status !== 'success') {
    return <RequestMessage status={state.status} onRetry={onRetry} />
  }

  const asset = state.data
  const profit = asset.valuationProfit
  const pnlClass = profit == null ? styles.flat : profit > 0 ? styles.up : profit < 0 ? styles.down : styles.flat
  const recentPurchases = [...asset.monthlyPurchases].slice(-3).reverse()
  const valuationUnavailable = asset.domesticValuationAmount == null

  return (
    <div className={styles.assetBody} style={{ minHeight }}>
      <div className={styles.assetTop}>
        <div>
          <div className={styles.cutLabel}>국내 운용 자산 평가액</div>
          <div className={styles.assetBig}>
            {valuationUnavailable ? '시세 연결 후 확인' : `₩${formatWon(asset.domesticValuationAmount)}`}
          </div>
        </div>
        <span className={cx(styles.pnl, pnlClass)}>
          {profit == null
            ? '평가손익 확인 불가'
            : `평가손익 ${profit > 0 ? '+' : profit < 0 ? '−' : ''}₩${formatWon(Math.abs(profit))}${asset.valuationReturnRate == null ? '' : ` (${asset.valuationReturnRate > 0 ? '+' : ''}${asset.valuationReturnRate.toFixed(2)}%)`}`}
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
          <span className={styles.flowTxt}>계좌 예수금 {`₩${formatWon(asset.cashAmount)}`}</span>
          <Link to="/invest" className={styles.flowLink}>투자 보기 ›</Link>
        </div>
        <div className={styles.flow}>
          <span className={styles.flowTxt}>
            보유자산 매입금액 ₩{formatWon(asset.investmentCostAmount)} · 누적 확정 환전액 ₩{formatWon(asset.cumulativeInflowAmount)}
          </span>
        </div>
        <div className={styles.flow}>
          <span className={styles.flowTxt}>
            월별 매수: {recentPurchases.length
              ? recentPurchases.map((purchase) => `${purchase.month} ₩${formatWon(purchase.buyAmount)}`).join(' · ')
              : '내역 없음'}
          </span>
          <Link to="/account#flow" className={styles.flowLink}>자금 흐름 ›</Link>
        </div>
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
