import { F } from '../../lib/calc'
import { Box } from '../common/Box'
import { cx } from '../common/cx'
import styles from './MyInfoLoginsBox.module.css'

interface Props {
  className?: string
}

// [며칠 전, 시각, 기기, 지역, IP, 성공 여부] — 원본 예시 데이터. 날짜는 오늘(업무일)에서 거꾸로 셈
// [시연 제외] 서버에 로그인 기록 API가 없어 예시 데이터를 그대로 보여 준다. 시연에서 쓰지 않는다
const LOGINS: [number, string, string, string, string, boolean][] = [
  [0, '09:12', 'Windows · Chrome', '서울', '211.***.***.12', true],
  [1, '21:40', 'iPhone · Returns 앱', '서울', '118.***.***.57', true],
  [1, '08:55', 'Windows · Chrome', '서울', '211.***.***.12', true],
  [3, '23:03', 'Android · Chrome', '부산', '175.***.***.204', false],
  [4, '19:26', 'macOS · Safari', '서울', '121.***.***.89', true]
]

// 로그인 기록 — 맨 위 줄이 "현재 접속". 좁은 화면에서는 표가 가로로 스크롤됨
export function MyInfoLoginsBox({ className }: Props) {
  return (
    <Box
      data-box="logins"
      className={cx(styles.box, className)}
      title="로그인 기록"
      head={
        <>
          <span className={styles.note}>최근 5건</span>
          <span className={styles.warn}>내가 아닌 접속이 있으면 비밀번호를 바꿔 주세요</span>
        </>
      }
    >
      <div className={styles.scroll}>
        <div className={styles.table}>
          <div className={styles.head}>
            <span>일시</span>
            <span>기기</span>
            <span>IP</span>
            <span>결과</span>
          </div>
          {LOGINS.map(([ago, hm, dev, , ip, ok], i) => (
            <div key={i} className={cx(styles.line, i === LOGINS.length - 1 && styles.lineLast)}>
              <span className={styles.at}>{F.short(F.addDays(F.today(), -ago)) + ' ' + hm}</span>
              <span className={styles.dev}>{dev}</span>
              <span className={styles.ip}>{ip}</span>
              <span className={styles.res}>
                <span className={cx(styles.resText, !ok && styles.resFail)}>{ok ? '성공' : '실패 · 비밀번호 오류'}</span>
                {i === 0 && <span className={styles.now}>현재 접속</span>}
              </span>
            </div>
          ))}
        </div>
      </div>
    </Box>
  )
}
