import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { reloadOnBusinessDateChange, syncBusinessToday } from './lib/clock'
import { initNewsSession } from './components/home/newsPrefetch'
import './index.css'

// 화면의 "오늘"은 서버 업무일이다. 첫 화면을 그리기 전에 받아 두고, 그 뒤에 앱을 불러온다(앱 안의 날짜 계산이 목업 날짜로 굳지 않게)
document.getElementById('root')!.textContent = '불러오는 중…' // 서버가 꺼져 있으면 최대 2초 걸린다
await syncBusinessToday()
reloadOnBusinessDateChange()
initNewsSession()
const { default: App } = await import('./App')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
