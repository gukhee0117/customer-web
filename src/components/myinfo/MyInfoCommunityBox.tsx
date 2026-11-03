import { useState } from 'react'
import { Link } from 'react-router-dom'
import { RETURNS_DATA as RD } from '../../data/returns'
import { Box } from '../common/Box'
import { MyInfoPubDialog } from './MyInfoDialogs'
import { MyInfoSwitch } from './MyInfoSwitch'
import row from './MyInfoToggleRow.module.css'
import styles from './MyInfoCommunityBox.module.css'

interface Props {
  className?: string
  onToast: (msg: string) => void
  nickname: string // 서버 닉네임(페이지가 프로필을 받아 내려 줌). 받기 전 '-', 없으면 안내 문구
}

// 커뮤니티 — 닉네임 보기(바꿀 수 없음) + 투자성향 공개 켜고 끄기
// 원본은 이 화면 안에서만 값을 들고 있고(처음 값은 RD.COMMUNITY) 커뮤니티 화면과 공유하지 않음 — 그대로 따름.
// 닉네임은 서버 값(GET /api/customer/profile). 성향 공개는 아직 화면 안에서만 유지한다
// TODO: 백엔드 연결 시 서버의 성향 공개 저장·조회로 대체
export function MyInfoCommunityBox({ className, onToast, nickname }: Props) {
  const [pubOn, setPubOn] = useState(!!RD.COMMUNITY.profilePublic)
  const [pd, setPd] = useState<{ agree: boolean } | null>(null)

  const togglePub = () => {
    if (pubOn) {
      setPubOn(false)
      onToast('내 성향을 비공개로 바꿨어요')
    } else setPd({ agree: false })
  }

  return (
    <Box data-box="community" className={className} title="커뮤니티" actions={<Link to="/community" className={styles.go}>커뮤니티 ›</Link>}>
      <div className={styles.body}>
        <div className={styles.nickRow}>
          <span className={styles.label}>닉네임</span>
          <span className={styles.nick}>{nickname}</span>
        </div>
        <div className={styles.pubRow}>
          <span className={row.label}>
            <span id="pubLabel" className={row.name}>성향 공개</span>
            <span className={row.desc}>기본은 비공개예요. 공개하면 내 글에 성향 이름이 보여요.</span>
          </span>
          <MyInfoSwitch on={pubOn} labelId="pubLabel" onToggle={togglePub} />
        </div>
      </div>
      {pd && (
        <MyInfoPubDialog
          agree={pd.agree}
          onToggle={() => setPd({ agree: !pd.agree })}
          onCancel={() => setPd(null)}
          onOk={() => {
            if (!pd.agree) return
            setPd(null)
            setPubOn(true)
            onToast('내 성향을 공개해요')
          }}
        />
      )}
    </Box>
  )
}
