import { useCallback, useEffect, useRef, useState } from 'react'
import { fetchCustomerNotifications, markCustomerNotificationsRead, subscribeCustomerNotifications } from '../../api/notifications'
import type { CustomerNotification } from '../../api/notifications'

interface State { uid: number | null; items: CustomerNotification[]; error: boolean }

export function useCustomerNotifications(uid: number | null, onToast: (message: string) => void) {
  const [state, setState] = useState<State>({ uid: null, items: [], error: false })
  const controls = useRef<{ uid: number | null; reload: () => void; read: (ids: number[]) => void } | null>(null)
  useEffect(() => {
    if (uid == null) { controls.current = null; return }
    let active = true
    let request = 0
    let reading = false
    let known: Set<number> | null = null
    let announcePending = false
    const load = async (announce: boolean) => {
      announcePending ||= announce
      const version = ++request
      try {
        const items = await fetchCustomerNotifications()
        if (!active || version !== request) return
        if (announcePending && known) {
          const fresh = items.find(item => !item.readAt && !known!.has(item.notificationId))
          if (fresh) onToast(fresh.title)
        }
        known = new Set(items.map(item => item.notificationId))
        announcePending = false
        setState({ uid, items, error: false })
      } catch {
        if (active && version === request) setState(previous => ({ uid, items: previous.uid === uid ? previous.items : [], error: true }))
      }
    }
    const read = async (ids: number[]) => {
      if (reading || ids.length === 0) return
      reading = true
      ++request // 읽기 전 요청의 옛 미읽음 상태가 덮어쓰지 않게 한다.
      try {
        await markCustomerNotificationsRead(ids)
        if (active) await load(false)
      } catch {
        if (active) onToast('알림 읽음 처리에 실패했어요. 다시 시도해 주세요.')
      } finally { reading = false }
    }
    controls.current = { uid, reload: () => { void load(false) }, read: ids => { void read(ids) } }
    void load(false)
    const unsubscribe = subscribeCustomerNotifications(() => { void load(true) }, () => { void load(false) })
    const timer = setInterval(() => { void load(false) }, 30_000)
    const focus = () => { void load(false) }
    window.addEventListener('focus', focus)
    return () => {
      active = false
      ++request
      clearInterval(timer)
      unsubscribe()
      window.removeEventListener('focus', focus)
      controls.current = null
    }
  }, [uid, onToast])
  const reload = useCallback(() => { if (controls.current?.uid === uid) controls.current.reload() }, [uid])
  const markRead = useCallback((ids: number[]) => { if (controls.current?.uid === uid) controls.current.read(ids) }, [uid])
  const items = state.uid === uid ? state.items : []
  return { items, unread: items.filter(item => !item.readAt).length, error: state.uid === uid && state.error, reload, markRead }
}
