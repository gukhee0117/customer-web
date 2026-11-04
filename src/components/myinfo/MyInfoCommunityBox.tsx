import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiErrorMessage } from '../../api/client'
import { setInvestorTypePublic } from '../../api/profile'
import { Box } from '../common/Box'
import { MyInfoPubDialog } from './MyInfoDialogs'
import { MyInfoSwitch } from './MyInfoSwitch'
import row from './MyInfoToggleRow.module.css'
import styles from './MyInfoCommunityBox.module.css'

interface Props {
  className?: string
  onToast: (msg: string) => void
  nickname: string // 서버 닉네임(페이지가 프로필을 받아 내려 줌). 받기 전 '-', 없으면 안내 문구
  pub: boolean | undefined // 서버의 성향 공개 값(프로필을 받기 전엔 undefined)
}

// 커뮤니티 — 닉네임 보기(바꿀 수 없음) + 투자성향 공개 켜고 끄기
// 원본은 이 화면 안에서만 값을 들고 있고(처음 값은 RD.COMMUNITY) 커뮤니티 화면과 공유하지 않음 — 그대로 따름.
// 닉네임·성향 공개는 서버 값(GET /api/customer/profile), 켜고 끄면 PUT /api/customer/profile/investor-type-public 로 저장한다
export function MyInfoCommunityBox({ className, onToast, nickname, pub }: Props) {
  const [saved, setSaved] = useState<boolean | null>(null) // 이 화면에서 저장한 값(없으면 서버 프로필 값)
  const pubOn = saved ?? !!pub
  const save = (value: boolean, okMsg: string) =>
    setInvestorTypePublic(value)
      .then(() => {
        setSaved(value)
        onToast(okMsg)
      })
      .catch((e) => onToast(apiErrorMessage(e, '저장하지 못했어요. 잠시 뒤 다시 해 주세요')))
  const [pd, setPd] = useState<{ agree: boolean } | null>(null)

  const togglePub = () => {
    if (pubOn) void save(false, '내 성향을 비공개로 바꿨어요')
    else setPd({ agree: false })
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
            void save(true, '내 성향을 공개해요')
          }}
        />
      )}
    </Box>
  )
}
