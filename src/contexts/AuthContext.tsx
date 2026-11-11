import { useCallback, useEffect, useState } from 'react'
import { isAxiosError } from 'axios'
import type { ReactNode } from 'react'
import * as apiAuth from '../api/auth'
import { syncAssessState } from '../api/investor'
import type { MeData } from '../api/auth'
import { clearAssessHist, clearLoginSession, setLoginSession } from '../components/login/loginSession'
import { RETURNS_DATA as RD } from '../data/returns'
import { AuthContext } from './authState'
import { resetNewsSession, prefetchNews } from '../components/home/newsPrefetch'
import type { AuthState } from './authState'

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' })

  // 앱 시작 시 1회 — 서버 세션 확인
  useEffect(() => {
    let active = true
    const ok = (me: MeData) => {
      if (!active) return
      setLoginSession({ name: me.name, expiresAt: me.expiresAt })
      setAuth({ status: 'authenticated', me })
      void syncAssessState() // 새로고침으로 세션이 복원돼도 진단 상태는 서버 값으로
    }
    const fail = () => {
      if (!active) return
      resetNewsSession()
      clearLoginSession()
      setAuth({ status: 'unauthenticated' })
    }

    let timerId: ReturnType<typeof setTimeout> | undefined
    apiAuth
      .getMe()
      .then(ok)
      .catch((e: unknown) => {
        if (!isAxiosError(e) || e.response?.status === 401) { fail(); return }
        // 네트워크 단절·5xx 등 일시 오류 — 2초 후 1회 재시도한다.
        // 재시도 성공 시 세션 복원, 실패 시 로그인 화면으로 이동(checking에 갇히지 않게)
        timerId = setTimeout(() => { apiAuth.getMe().then(ok).catch(fail) }, 2000)
      })
    // active=false가 먼저 설정되면 ok/fail이 아무것도 하지 않아 StrictMode 이중 실행에서도 안전하다
    return () => { active = false; clearTimeout(timerId) }
  }, [])

  const login = useCallback(async (loginId: string, password: string) => {
    const me = await apiAuth.login(loginId, password)
    resetNewsSession()
    clearAssessHist()
    setLoginSession({ name: me.name, expiresAt: me.expiresAt })
    setAuth({ status: 'authenticated', me })
    prefetchNews(me.customerId)
  }, [])

  const logout = useCallback(async () => {
    // 클라이언트 세션 먼저 지우고 이동 (서버 실패해도 로그아웃은 완료)
    resetNewsSession()
    clearLoginSession()
    clearAssessHist()
    RD.setServerState({ profile: null, account: 'opened', assess: 'ok' }) // 같은 탭에서 다른 계정으로 들어와도 이전 계정 값이 비치지 않게 처음 값으로
    setAuth({ status: 'unauthenticated' })
    try {
      await apiAuth.logout()
    } catch (err) {
      console.error('logout server error', err)
    }
  }, [])

  const extend = useCallback(async () => {
    // 서버 응답 받은 뒤에 expiresAt 갱신 (낙관적 업데이트 없음)
    const me = await apiAuth.extendSession()
    setLoginSession({ name: me.name, expiresAt: me.expiresAt })
    setAuth({ status: 'authenticated', me })
  }, [])

  // 가입 API는 성공하면 서버가 바로 로그인 세션을 만든다. 로그인 폼을 거치지 않으므로 그 결과를 여기에 반영한다
  const applySession = useCallback((me: MeData) => {
    resetNewsSession()
    clearAssessHist()
    setLoginSession({ name: me.name, expiresAt: me.expiresAt })
    setAuth({ status: 'authenticated', me })
    prefetchNews(me.customerId)
  }, [])

  return (
    <AuthContext.Provider value={{ auth, login, logout, extend, applySession }}>
      {children}
    </AuthContext.Provider>
  )
}
