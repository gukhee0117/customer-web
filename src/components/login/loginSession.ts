const SESSION_MS = 30 * 60 * 1000

const KEY_LOGIN = 'returns-login'
const KEY_EXP = 'returns-session-exp'
const KEY_WARNED = 'returns-session-warned'
const KEY_NAME = 'returns-customer-name'

export interface SessionInfo {
  name: string
  expiresAt: string // 서버 ISO 8601
}

export const setLoginSession = (info: SessionInfo) => {
  try {
    const expMs = new Date(info.expiresAt).getTime()
    const safeExpMs = Number.isFinite(expMs) ? expMs : Date.now() + SESSION_MS
    sessionStorage.setItem(KEY_LOGIN, '1')
    sessionStorage.setItem(KEY_EXP, String(safeExpMs))
    sessionStorage.setItem(KEY_NAME, info.name)
    sessionStorage.removeItem(KEY_WARNED)
  } catch {
    /* 저장소 불가 시 무시 */
  }
}

// 진단 이력(localStorage)은 계정마다 달라서, 로그인·가입·로그아웃 때 비운다
export const clearAssessHist = () => {
  try {
    localStorage.removeItem('returns-assess-hist')
  } catch {
    /* 저장소 불가 시 무시 */
  }
}

export const clearLoginSession = () => {
  ;[KEY_LOGIN, KEY_EXP, KEY_WARNED, KEY_NAME].forEach((k) => {
    try {
      sessionStorage.removeItem(k)
    } catch {
      /* 무시 */
    }
  })
}

export const getSessionName = (): string => {
  try {
    return sessionStorage.getItem(KEY_NAME) ?? ''
  } catch {
    return ''
  }
}