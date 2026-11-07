import { useCallback, useEffect, useState } from 'react'
import { apiErrorMessage } from '../../api/client'
import { getMySummary } from '../../api/community'
import { getProfile, setInvestorTypePublic } from '../../api/profile'
import { profileKeyOf } from './communityPosts'

export interface MyCommunity {
  nick: string // 없으면 빈 문자열(서버가 가입 때 붙이고 시드 고객 중엔 없을 수 있음)
  profile: string // 내 성향 키(미진단이면 private)
  pub: boolean // 커뮤니티에 내 성향을 보여 주는가
  postN: number
  replyN: number
}

// 내 닉네임·성향·공개 여부(내 정보)와 글·답글 수(커뮤니티 내 활동). 글·답글을 쓰거나 지우면 refresh로 다시 받는다
export function useMyCommunity(onToast: (text: string) => void) {
  const [me, setMe] = useState<MyCommunity | null>(null)
  const refresh = useCallback(() => {
    Promise.all([getProfile(), getMySummary()]).then(
      ([p, s]) => setMe({ nick: s.nickname ?? p.nickname ?? '', profile: profileKeyOf(p.investorType) ?? 'private', pub: p.investorTypePublic, postN: s.postCount, replyN: s.commentCount }),
      () => {}
    )
  }, [])
  useEffect(() => {
    refresh()
  }, [refresh])

  const setPublic = (on: boolean) =>
    setInvestorTypePublic(on).then(
      () => {
        setMe((m) => (m ? { ...m, pub: on } : m))
        onToast(on ? '내 성향을 공개해요' : '내 성향을 비공개로 바꿨어요')
      },
      (e) => onToast(apiErrorMessage(e, '공개 설정을 바꾸지 못했어요'))
    )
  return { me, refresh, setPublic }
}
