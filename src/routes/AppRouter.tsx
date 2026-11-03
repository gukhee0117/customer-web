import { lazy, Suspense, useEffect } from 'react'
import type { ReactNode } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { AppLayout } from '../layouts/AppLayout'
import { BareLayout } from '../layouts/BareLayout'

// 페이지는 모두 따로 불러온다(레이아웃·상단 바·푸터·챗봇은 메인에 남음)
const LandingPage = lazy(() => import('../pages/LandingPage').then((m) => ({ default: m.LandingPage })))
const LoginPage = lazy(() => import('../pages/LoginPage').then((m) => ({ default: m.LoginPage })))
const HomePage = lazy(() => import('../pages/HomePage').then((m) => ({ default: m.HomePage })))
const AccountPage = lazy(() => import('../pages/AccountPage').then((m) => ({ default: m.AccountPage })))
const InvestPage = lazy(() => import('../pages/InvestPage').then((m) => ({ default: m.InvestPage })))
const CommunityPage = lazy(() => import('../pages/CommunityPage').then((m) => ({ default: m.CommunityPage })))
const MyInfoPage = lazy(() => import('../pages/MyInfoPage').then((m) => ({ default: m.MyInfoPage })))

// Suspense를 레이아웃 안쪽(페이지 자리)에 둬서 불러오는 동안에도 상단 바·푸터·챗봇은 그대로 있다.
const blank = (background?: string) => <div style={{ minHeight: '100vh', background }} />
const appBlank = <div style={{ flex: 1 }} />

function page(element: ReactNode, fallback: ReactNode) {
  return <Suspense fallback={fallback}>{element}</Suspense>
}

function RequireAuth({ children }: { children: ReactNode }) {
  const { auth } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  useEffect(() => {
    if (auth.status === 'unauthenticated') {
      navigate('/login', { replace: true, state: { from: location.pathname } })
    }
  }, [auth.status, navigate, location.pathname])

  // 인증 확인 중: AppLayout 배경 유지하며 빈 화면 대기
  if (auth.status === 'checking') return null

  return <>{children}</>
}

export function AppRouter() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<BareLayout />}>
          <Route path="/" element={page(<LandingPage />, blank('var(--color-photo-base)'))} />
          <Route path="/login" element={page(<LoginPage />, blank())} />
        </Route>
        <Route element={<AppLayout />}>
          <Route path="/home" element={<RequireAuth>{page(<HomePage />, appBlank)}</RequireAuth>} />
          <Route path="/account" element={<RequireAuth>{page(<AccountPage />, appBlank)}</RequireAuth>} />
          <Route path="/invest" element={<RequireAuth>{page(<InvestPage />, appBlank)}</RequireAuth>} />
          <Route path="/community" element={<RequireAuth>{page(<CommunityPage />, appBlank)}</RequireAuth>} />
          <Route path="/myinfo" element={<RequireAuth>{page(<MyInfoPage />, appBlank)}</RequireAuth>} />
        </Route>
        <Route path="/mypage" element={<Navigate to="/myinfo" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
