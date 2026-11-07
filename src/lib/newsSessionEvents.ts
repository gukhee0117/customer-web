export const NEWS_AUTH_EXPIRED = 'auth-expired'
export const NEWS_CONTEXT_CHANGED = 'news-context-changed'

export function notifyNewsAuthExpired() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NEWS_AUTH_EXPIRED))
}

export function notifyNewsContextChanged() {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(NEWS_CONTEXT_CHANGED))
}
