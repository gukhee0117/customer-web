import '../../styles/tokens.css'
import type { CheckResult } from '../../api/stockPackage'
import { cx } from '../common/cx'
import styles from './InvestCheckResult.module.css'

interface Props {
  result: CheckResult
  stale?: boolean // 구성이 바뀌어 이전 구성 기준인 결과
}

const pct = (n: number): string => String(Math.round(n * 10) / 10)

// 패키지 검사 결과 — 숫자는 서버가 계산한 값이고, 설명 문장은 서버가 사전에 검수한 문장에 값만 끼운 것이라 그대로 보여준다
export function InvestCheckResult({ result: r, stale = false }: Props) {
  const volOk = r.volatilityPercent != null
  const topTheme = r.themes[0]
  const cards: { k: string; v: string; n: string; muted?: boolean }[] = [
    { k: '구성 종목 위험등급 가중평균', v: r.avgRiskGrade.toFixed(2) + '등급', n: '1등급이 가장 높은 위험, 6등급이 가장 낮은 위험' },
    r.outOfProfileCount == null
      ? { k: '내 성향 범위를 벗어난 종목', v: '확인 불가', n: '투자성향 진단이 없거나 만료됐어요', muted: true }
      : { k: '내 성향 범위를 벗어난 종목', v: r.outOfProfileCount + '개', n: (r.outOfProfileNames ?? []).join(', ') },
    { k: '패키지 연 변동성', v: volOk ? pct(r.volatilityPercent as number) + '%' : '계산 불가', n: volOk ? '(과거 3년 기준, 예측 아님)' : '잠시 후 다시 검사해 주세요', muted: !volOk },
    { k: '종목 집중도(HHI)', v: String(r.hhi), n: r.itemCount + '종목을 같은 비중으로 담으면 ' + r.equalWeightHhi },
    { k: '가장 큰 종목', v: r.topItem.name + ' ' + pct(r.topItem.weight) + '%', n: '' },
    { k: '가장 큰 테마', v: topTheme ? topTheme.name + ' ' + pct(topTheme.weight) + '%' : '-', n: topTheme ? '한 종목이 여러 테마에 속할 수 있어요' : '', muted: !topTheme }
  ]

  return (
    <div className={cx(styles.res, stale && styles.resStale)}>
      <div className={styles.cards}>
        {cards.map((c) => (
          <div key={c.k} className={styles.card}>
            <span className={styles.ck1}>{c.k}</span>
            <b className={cx(styles.ck2, c.muted && styles.ck2Muted)}>{c.v}</b>
            {!!c.n && <span className={styles.ck3}>{c.n}</span>}
          </div>
        ))}
      </div>
      <div className={styles.expl}>
        {r.explanation.map((b) => (
          <div key={b.metric} className={styles.blk}>
            <b className={styles.blkTitle}>{b.title}</b>
            {b.facts.map((f) => (
              <span key={f} className={styles.fact}>
                {f}
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
