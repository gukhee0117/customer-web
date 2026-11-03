import { RETURNS_DATA as RD } from '../../data/returns'
import { Box } from '../common/Box'
import { assetUrl } from '../common/assetUrl'
import { cx } from '../common/cx'
import { profileView } from './myinfoProfile'
import type { AssessHistItem } from './myinfoProfile'
import styles from './MyInfoProfileBox.module.css'

interface Props {
  className?: string
  hist: AssessHistItem[] | null // localStorage 'returns-assess-hist' (없으면 기본 진단 1건)
  onOpenAssess: () => void // 다시 진단하기 창 열기
}

// 내 프로필 · 투자성향 (id="assess": 주소 #assess 로 들어오면 여기로 스크롤)
export function MyInfoProfileBox({ className, hist, onOpenAssess }: Props) {
  const pf = profileView(hist)
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
            <span className={styles.name}>{RD.CUSTOMER.name} 님</span>
            <span className={styles.label}>{pf.label}</span>
            {pf.warnOn && <span className={cx(pf.warnRed ? styles.warnRed : styles.warn)}>{pf.warn}</span>}
          </div>
          {pf.done && (
            <>
              <div className={styles.dateRow}>
                <span>
                  진단일 {pf.date} · {pf.next}까지 유효(24개월)
                </span>
                {/* TODO: 백엔드 연결 시 실제 만료일까지 남은 날로 계산 (원본은 D-23 고정 문구, 홈과 같음) */}
                {pf.soon && <span className={styles.badge}>재진단 D-23</span>}
              </div>
              <div className={styles.line}>
                점수 <b>{pf.score}점</b> <span className={styles.of}>/ 50점</span>
              </div>
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
    </Box>
  )
}
