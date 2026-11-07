import type { InvestorStatus } from '../../api/investor'
import { Box } from '../common/Box'
import { assetUrl } from '../common/assetUrl'
import { cx } from '../common/cx'
import { profileView } from './myinfoProfile'
import type { AssessHistItem } from './myinfoProfile'
import styles from './MyInfoProfileBox.module.css'

interface Props {
  className?: string
  hist: AssessHistItem[] | null // localStorage 'returns-assess-hist' (이번 브라우저에서 제출한 진단. 없으면 null)
  name: string | undefined // 서버 프로필 이름(받기 전·실패하면 undefined)
  status: InvestorStatus | null // 서버 투자성향 상태(진단일·만료일)
  onOpenAssess: () => void // 다시 진단하기 창 열기
}

// 내 프로필 · 투자성향 (id="assess": 주소 #assess 로 들어오면 여기로 스크롤)
export function MyInfoProfileBox({ className, hist, name, status, onOpenAssess }: Props) {
  const pf = profileView(hist, status)
  return (
    <Box
      id="assess"
      data-box="profile"
      className={className}
      title="내 프로필 · 투자성향"
      actions={
        <button type="button" className={styles.link} onClick={onOpenAssess}>
          다시 진단하기 ›
        </button>
      }
    >
      <div className={styles.top}>
        <img src={assetUrl(pf.img)} alt={pf.label + ' 끼루'} />
        <div className={styles.info}>
          <div className={styles.nameRow}>
            <span className={styles.name}>{name ?? '-'} 님</span>
            <span className={styles.label}>{pf.label}</span>
            {pf.warnOn && <span className={cx(pf.warnRed ? styles.warnRed : styles.warn)}>{pf.warn}</span>}
          </div>
          {pf.done && (
            <>
              <div className={styles.dateRow}>
                <span>{pf.date ? `진단일 ${pf.date} · ${pf.next}까지 유효(24개월)` : '진단 기록이 없어요'}</span>
                {pf.soon && <span className={styles.badge}>재진단 D-{pf.dLeft}</span>}
              </div>
              {pf.score != null && (
                <div className={styles.line}>
                  점수 <b>{pf.score}점</b> <span className={styles.of}>/ 50점</span>
                </div>
              )}
              <div className={styles.line}>
                추천받을 수 있는 상품 <b>{pf.allowed}</b>
              </div>
              <div className={styles.grade}>1등급 매우 높은 위험 ~ 6등급 매우 낮은 위험 · 리턴증권 자체 산정</div>
            </>
          )}
        </div>
      </div>
      {pf.noteOn && (
        <div className={styles.note}>
          <p>{pf.note}</p>
          <button type="button" className={styles.noteBtn} onClick={onOpenAssess}>
            {pf.noteBtn}
          </button>
        </div>
      )}
      {pf.hist.length > 0 && (
        <div className={styles.hist}>
          <div className={styles.histTitle}>진단 이력</div>
          {pf.hist.map((h, i) => (
            <div key={i} className={styles.histRow}>
              <span>{h.date}</span>
              <b>{h.label}</b>
              <span>{h.score}점</span>
              {h.cur && <span className={styles.cur}>현재</span>}
            </div>
          ))}
        </div>
      )}
    </Box>
  )
}
