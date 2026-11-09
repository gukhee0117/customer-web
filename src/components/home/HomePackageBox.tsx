import { Link } from 'react-router-dom'
import '../../styles/tokens.css'
import { RETURNS_DATA as RD } from '../../data/returns'
import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { KkiruAvatar } from '../common/KkiruAvatar'
import { StockIcon } from '../common/StockIcon'
import { cx } from '../common/cx'
import { useServerPackages } from '../invest/useServerPackages'
import { PKG_ASK_CHIPS } from './homeRecData'
import styles from './HomePackageBox.module.css'

const tone = (n: number) => (n > 0 ? styles.up : n < 0 ? styles.down : styles.flat)

// 나만의 주식 패키지 박스 — 투자 화면과 같은 서버 패키지(최근 만든 3개). opened는 RIA 계좌가 개설 상태인가(서버 프로필)
export function HomePackageBox({ className, opened }: { className?: string; opened: boolean }) {
  const { state, views } = useServerPackages()
  const pkgs = [...views].sort((a, b) => b.created - a.created).slice(0, 3)
  const hasPkg = views.length > 0
  const show = opened && hasPkg
  const total = views.reduce((t, v) => t + v.val, 0)
  const cost = views.reduce((t, v) => t + v.evalCost, 0)
  const ret = cost ? ((total - cost) / cost) * 100 : 0
  const unpriced = views.some((v) => v.unpriced > 0)

  const head = show ? (
    <span className={styles.summary}>
      {unpriced ? <span className={styles.example}>수익률 확인 불가</span> : <span className={cx(styles.retTotal, tone(ret))}>{F.pct(ret)}</span>}
    </span>
  ) : null

  const actions = (
    <span className={styles.links}>
      {show && (
        <>
          <Link to="/invest?new=1" className={styles.newPkg}>+ 새 패키지 만들기</Link>
          <span className={styles.dot}>·</span>
        </>
      )}
      <Link to="/invest" className={styles.all}>전체 ›</Link>
    </span>
  )

  return (
    <Box shadow className={className} title="나만의 주식 패키지" head={head} actions={actions}>
      {show && (
        <div className={styles.cols}>
          {pkgs.map((p) => (
            <Link key={p.id} to={'/invest?pkg=' + p.id} className={styles.card}>
              <span className={styles.nameRow}>
                <span className={styles.name}>{p.name}</span>
                <span className={styles.chev}>›</span>
              </span>
              <span className={styles.iconRow}>
                <span className={styles.icons}>
                  {p.items.slice(0, 3).map((it) => (
                    <span key={it.code} className={styles.icon}>
                      <StockIcon color="var(--color-navy)" initial={String(it.name || it.code)[0]} size={18} code={it.code} />
                    </span>
                  ))}
                </span>
                {p.items.length > 3 && <span className={styles.more}>외 {p.items.length - 3}종목</span>}
              </span>
              <span className={styles.amtRow}>
                <b className={styles.amt}>₩{F.won(p.val)}</b>
                {p.unpriced > 0 ? <span className={styles.flat}>수익률 확인 불가</span> : <span className={cx(styles.ret, tone(p.ret))}>{F.pct(p.ret)}</span>}
              </span>
              <span className={styles.grade}>가중평균 {p.grade}등급</span>
            </Link>
          ))}
        </div>
      )}

      {opened && state === 'ready' && !hasPkg && (
        <div className={styles.empty}>
          <div className={styles.emptyTop}>
            <KkiruAvatar profile={RD.CUSTOMER.profile} size={48} />
            <div className={styles.emptyText}>끼루에게 원하는 걸 말하면 성향에 맞는 종목으로 패키지 구성을 도와드려요.</div>
          </div>
          <div className={styles.chips}>
            {PKG_ASK_CHIPS.map((label) => (
              <Link key={label} to={'/invest?new=1&ask=' + encodeURIComponent(label)} className={styles.chip}>
                {label}
              </Link>
            ))}
          </div>
          <Link to="/invest?new=1" className={styles.go}>패키지 만들러 가기 ›</Link>
        </div>
      )}

      {opened && state === 'loading' && <div className={styles.closed}>패키지를 불러오는 중이에요</div>}
      {opened && (state === 'error' || state === 'unauthorized') && <div className={styles.closed}>패키지를 불러오지 못했어요. 잠시 후 다시 확인해 주세요</div>}
      {!opened && <div className={styles.closed}>계좌를 연 뒤 만들 수 있어요</div>}
    </Box>
  )
}
