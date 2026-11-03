import { createContext, useContext } from 'react'
import type { MeData } from '../api/auth'

export type AuthState =
  | { status: 'checking' }
  | { status: 'authenticated'; me: MeData }
  | { status: 'unauthenticated' }

export interface AuthContextValue {
  auth: AuthState
  login: (loginId: string, password: string) => Promise<void>
  logout: () => Promise<void>
  extend: () => Promise<void>
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
