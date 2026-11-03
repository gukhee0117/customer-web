import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import * as apiAuth from '../api/auth'
import type { MeData } from '../api/auth'
import { clearLoginSession, setLoginSession } from '../components/login/loginSession'

type AuthState =
  | { status: 'checking' }
  | { status: 'authenticated'; me: MeData }
  | { status: 'unauthenticated' }

interface AuthContextValue {
  auth: AuthState
  login: (loginId: string, password: string) => Promise<void>
  logout: () => Promise<void>
  extend: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<AuthState>({ status: 'checking' })

  // 앱 시작 시 1회 — 서버 세션 확인
  useEffect(() => {
    apiAuth
      .getMe()
      .then((me) => {
        setLoginSession({ name: me.name, expiresAt: me.expiresAt })
        setAuth({ status: 'authenticated', me })
      })
      .catch(() => {
        clearLoginSession()
        setAuth({ status: 'unauthenticated' })
      })
  }, [])

  const login = useCallback(async (loginId: string, password: string) => {
    const me = await apiAuth.login(loginId, password) // 실패 시 throw → 호출부에서 처리
    setLoginSession({ name: me.name, expiresAt: me.expiresAt })
    setAuth({ status: 'authenticated', me })
  }, [])

  const logout = useCallback(async () => {
    // 클라이언트 세션 먼저 지우고 이동 (서버 실패해도 로그아웃은 완료)
    clearLoginSession()
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

  return (
    <AuthContext.Provider value={{ auth, login, logout, extend }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
