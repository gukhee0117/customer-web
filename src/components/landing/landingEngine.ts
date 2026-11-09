// 랜딩(/) 스크롤 엔진 — 원본 landing-journey.html <script>의 구조를 그대로 옮긴 일반 TS 모듈.
// LandingPage의 useLayoutEffect 한 곳에서 mountLanding(root)을 부르고, 돌려받은 함수를 cleanup으로 쓴다.
// 이번 단계(L-2): Lenis·ScrollTrigger·마스터 타임라인 뼈대, build() 재빌드, #hdr2, 패스포트 장면 이동, 스크롤 복원.
// 장면 tween·캔버스·글자 갱신은 L-3부터 채운다(자리는 // L-n 주석으로 표시).
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Lenis from 'lenis'
import { calc as calcAt, clamp, confirmDate, LIMIT, man, MY, won, withdrawDate, ymd } from './landingCalc'
import { BOARD_ROWS, BOARD_STATES } from './landingBoardData'
import { createLandingMap } from './landingMap'
import { MH, MW, SYM1 } from './landingMapData'
import { R, SCN, TOTAL } from './landingScenes'
import { lateTexts } from './landingTexts'

export interface LandingMountOptions {
  /** 이 진입이 뒤로 가기(POP)인가 — 그때만 이전 스크롤 위치를 복원한다 */
  pop: boolean
  /** 현재 history 항목 키 — 저장해 둔 위치가 이 항목의 것일 때만 복원 */
  historyKey: string
  /** 주소의 해시(예: '#faq') — 다른 페이지에서 /#faq 로 들어오면 FAQ 위치로 스크롤 */
  hash: string
}

const SCROLL_KEY = 'returns-landing-scroll'
const LOGOUT_NOTICE_KEY = 'returns-logout-notice'
let lastNoticeAt = -1e9 // StrictMode 재마운트에서 같은 안내를 한 번 더 보여 주기 위한 표시

function readSavedScroll(historyKey: string): number | null {
  try {
    const v = JSON.parse(sessionStorage.getItem(SCROLL_KEY) || 'null')
    return v && v.key === historyKey && Number.isFinite(v.y) ? v.y : null
  } catch {
    return null
  }
}

function writeSavedScroll(historyKey: string, y: number): void {
  try {
    sessionStorage.setItem(SCROLL_KEY, JSON.stringify({ key: historyKey, y }))
  } catch {
    /* 저장 불가 환경이면 복원만 건너뜀 */
  }
}

export function mountLanding(root: HTMLElement, opts: LandingMountOptions): () => void {
  const $ = <T extends HTMLElement = HTMLElement>(s: string): T => root.querySelector(s) as T
  const $$ = <T extends HTMLElement = HTMLElement>(s: string): T[] => [...root.querySelectorAll<T>(s)]
  const byId = (id: string) => root.querySelector<HTMLElement>('#' + id)!

  let dead = false
  const timers = new Set<ReturnType<typeof setTimeout>>()
  const cleanups: Array<() => void> = []
  const listen = <K extends keyof WindowEventMap>(type: K, fn: (e: WindowEventMap[K]) => void, o?: AddEventListenerOptions) => {
    window.addEventListener(type, fn, o)
    cleanups.push(() => window.removeEventListener(type, fn, o))
  }

  /* ===== time remap: 장면 tween 시간 → R() ===== */
  type Tweenish = { duration?: number }
  function wrapTL(tl: gsap.core.Timeline) {
    const t = tl as unknown as Record<string, (...a: unknown[]) => unknown>
    ;['to', 'fromTo', 'set'].forEach((m) => {
      const f = t[m].bind(tl)
      t[m] = (...a: unknown[]) => {
        const p = a[a.length - 1]
        if (typeof p === 'number') {
          const v = a[a.length - 2] as Tweenish | null
          if (v && typeof v.duration === 'number') v.duration = Math.max(0.01, R(p + v.duration) - R(p))
          a[a.length - 1] = R(p)
        }
        return f(...a)
      }
    })
  }

  const RM = matchMedia('(prefers-reduced-motion: reduce)').matches

  /* ===== 상태 ===== */
  type Rect = { x: number; y: number; w: number; h: number }
  const LG: { vw: number; vh: number; pad: number; r5?: Rect; l6?: Rect; k7: number; sv?: Rect; fly?: { x: number; y: number }; flyH?: number } = { vw: 0, vh: 0, pad: 96, k7: 1 }
  let GEO: { SCR: { x: number; y: number; w: number; h: number }; MOFF: number; vw: number; vh: number; T1x: number; T4: number; TX: number; dR: number; dX: number } | null = null
  let tl: gsap.core.Timeline | undefined, st: ScrollTrigger | undefined
  let tl2: gsap.core.Timeline | undefined, st2: ScrollTrigger | undefined

  const ctx = gsap.context(() => {}, root)
  const ac = new AbortController() // 마운트 중 시작한 지도 fetch를 언마운트 때 취소
  cleanups.push(() => ac.abort())
  const map = createLandingMap($('#map') as HTMLCanvasElement)
  const { Mp, V, C, A, P } = map

  /* ===== smooth scroll ===== */
  gsap.registerPlugin(ScrollTrigger)
  type LenisLike = Pick<Lenis, 'on' | 'raf' | 'scrollTo'> & { destroy?: () => void }
  const lenis: LenisLike = RM
    ? ({ on() {}, raf() {}, scrollTo(y: number) { window.scrollTo(0, y) } } as unknown as LenisLike)
    : new Lenis({ lerp: 0.1, wheelMultiplier: 1 })
  lenis.on('scroll', ScrollTrigger.update)
  const rafTick = (t: number) => lenis.raf(t * 1000)
  gsap.ticker.add(rafTick)
  gsap.ticker.lagSmoothing(0)
  cleanups.push(() => {
    gsap.ticker.remove(rafTick)
    gsap.ticker.lagSmoothing(500, 33) // gsap 기본값으로 복원
    lenis.destroy?.()
  })

  /* ===== S3 departure board ===== */
  const ROWS = BOARD_ROWS, STATES = BOARD_STATES
  const TH = ROWS.map((_, i) => { const b = 7.4 + i * 0.05; return [R(b), R(b + 0.25), R(b + 0.45)] })
  const rowEls = $$('#rows .br')
  const flEls = rowEls.map((r) => r.children[1] as HTMLElement), krwEls = rowEls.map((r) => r.children[5] as HTMLElement), stEls = rowEls.map((r) => r.children[6].firstElementChild as HTMLElement)
  let rowState = ROWS.map(() => -1)
  function updBoard(t: number, anim?: boolean, force?: boolean) {
    ROWS.forEach((r, i) => {
      const n = TH[i].filter((x) => t >= x).length
      if (n === rowState[i] && !force) return
      const changed = n !== rowState[i]; rowState[i] = n
      const el = stEls[i]; el.textContent = STATES[n]; el.className = 'sx s' + n
      flEls[i].textContent = n >= 1 ? r.f : ''
      krwEls[i].textContent = n >= 1 ? won(disp.A * r.share) : '-'
      if (anim && changed) ctx.add(() => { gsap.fromTo(el, { opacity: 0.1 }, { opacity: 1, duration: 0.28, ease: 'steps(3)', overwrite: true }) })
    })
  }
  const boardLive = () => !!tl && tl.time() > R(7.25) && tl.time() < R(8.65)
  // 시계(#clkH/#clkM)는 React 훅(useLandingClock)이 열 때와 10초마다 실제 시각으로 갱신한다(원본 tick()과 같음)

  /* ===== numbers ===== */
  const on = <K extends keyof HTMLElementEventMap>(el: HTMLElement, type: K, fn: (e: HTMLElementEventMap[K]) => void) => {
    el.addEventListener(type, fn)
    cleanups.push(() => el.removeEventListener(type, fn))
  }
  const later = (fn: () => void, ms: number) => {
    const id: ReturnType<typeof setTimeout> = setTimeout(() => { timers.delete(id); fn() }, ms)
    timers.add(id)
    return id
  }
  const my = { A: MY.A, r: MY.r, w: 1 as number }
  const calc = (A = my.A, r = my.r) => calcAt(A, r)
  const disp = { A: my.A, save: calc().save, remain: calc().remain }
  const K = { v: 1, last: -1 }   // S1 limit count-up
  const limBig = byId('limBig'), amt = byId('amt') as HTMLInputElement, amtMsg = byId('amtMsg')
  const setP = () => amt.style.setProperty('--p', (+amt.value / +amt.max * 100) + '%')
  function paintBig() { const v = disp.A * K.v; limBig.textContent = won(v); amt.value = String(v); setP() }
  function paintNums() {
    $$('[data-n=A]').forEach((e) => { e.textContent = won(disp.A) })
    $$('[data-n=Aman]').forEach((e) => { e.textContent = man(disp.A) })
    $$('[data-n=remain]').forEach((e) => { e.textContent = won(disp.remain) })
    paintBig()
    updBoard(tl ? tl.time() : 0, false, true)
  }
  function refreshNums() {
    const c = calc()
    ctx.add(() => { gsap.to(disp, { A: my.A, save: c.save, remain: c.remain, duration: 0.6, ease: 'power2.out', onUpdate: paintNums, overwrite: true }) })
  }
  let msgT: ReturnType<typeof setTimeout> | undefined
  on(amt, 'input', () => {
    let v = +amt.value
    if (v > LIMIT) {
      v = LIMIT; amt.value = String(LIMIT); amtMsg.textContent = '매도 한도는 전 증권사 합산 5,000만 원이에요'; amtMsg.classList.add('warn')
      if (msgT) { clearTimeout(msgT); timers.delete(msgT) }
      msgT = later(() => { amtMsg.classList.remove('warn'); amtMsg.textContent = '입력하지 않아도 3,000만 원 기준으로 보여드려요' }, 2600)
    }
    my.A = v; K.v = 1; disp.A = v; limBig.textContent = won(v); setP(); refreshNums()
  })
  $$('#rates button').forEach((b) => on(b, 'click', () => {
    $$('#rates button').forEach((x) => x.classList.toggle('on', x === b)); my.r = +b.dataset.r!; refreshNums()
  }))

  /* ===== S5–S9: every frame computed from timeline time ===== */
  const seg = (t: number, a: number, b: number) => clamp((t - a) / (b - a))
  const e3o = (q: number) => 1 - Math.pow(1 - q, 3)
  const setT = (el: HTMLElement, s: string) => { if (el.textContent !== s) el.textContent = s }
  const vis = (el: HTMLElement, o: number, tr?: string) => { o = clamp(o); el.style.opacity = String(o); el.style.visibility = o > 0.001 ? 'visible' : 'hidden'; if (tr != null) el.style.transform = tr }
  const spCache = new WeakMap<HTMLElement, HTMLElement[]>()
  function revL(el: HTMLElement, t0: number, t: number) {
    let sp = spCache.get(el)
    if (!sp) { sp = [...el.querySelectorAll<HTMLElement>('.ml>span')]; spCache.set(el, sp) }
    sp.forEach((s_, i) => { const k = e3o(seg(t, t0 + i * 0.06, t0 + i * 0.06 + 0.22)); s_.style.transform = `translateY(${(1 - k) * 112}%)` })
  }
  const L$: Record<string, HTMLElement> = {}
  ;['late', 'lb5', 'lb6', 'lb7', 'lb8', 'lb9', 's5', 's6', 's7', 's8', 's9', 'tt5', 'd5', 'big5', 'd5b', 'seal5', 'rail5', 'rf5', 'dot5', 'cnt5',
    'ph11', 'w11', 'sum11', 'sum11bg', 'sum11c', 'ph6a', 'ph6b', 'beam6', 'beam6b', 'tt6', 'p6', 'list6', 'big6', 'pct6', 'col7', 'tt7', 'big7', 'rul7', 'rul7in', 'today7', 'rc7', 'paper', 'strike', 'save7',

    'tt8', 'fl8', 'svg8', 'pm8', 'flyW', 'fly8', 'big8', 'tt9', 'list9', 'app9', 'kiroo', 'bub9', 'disc9', 'lkT', 'passD'].forEach((id) => { L$[id] = byId(id) })
  const LL = (n: string) => $$(`[data-l="${n}"]`)
  const ticks5 = $$('.tk5') // S5 rail ticks (13개, 마크업에서 그린 것)
  const rows6 = $$('.r6'), ems6 = rows6.map((r) => r.querySelector('em') as HTMLElement), items7 = $$('.i7')
  const lanes8 = $$('.ln8')
  const items9 = $$('.l9'), panels9 = $$('.a9p'), tabs9 = $$('.a9tab span:not(.ex)'), TABS9 = [0, 0, 2, 1, 3, 0, -1]

  /* S8 flow nodes */
  interface Lab { lab: HTMLElement; dir: 'up' | 'dn'; shift: number; px: number; py: number; flipped?: number; end?: number }
  interface FlowNode extends Lab { x: number; at: number; lane?: number; date?: number; ex?: number; val?: () => number; d: string | (() => string); el: HTMLElement; b: HTMLElement; dir0?: 'up' | 'dn' }
  const NODES = [
    { x: 0, dir: 'dn', at: 0, val: () => disp.A, d: '해외주식' },
    { x: 0.15, dir: 'up', at: 0.15 / 0.46 * 0.35, val: () => disp.A, d: 'RIA 매도' },
    { x: 0.27, dir: 'dn', at: 0.27 / 0.46 * 0.35, val: () => disp.A, d: () => '원화 확정 · ' + ymd(confirmDate()) },
    { x: 0.66, lane: 0, dir: 'up', at: 0.35 + 0.65 * 0.4, val: () => disp.A * 0.5, d: '국내 상장주식 50%', ex: 1 },
    { x: 0.57, lane: 1, dir: 'up', at: 0.35 + 0.65 * 0.2, val: () => disp.A * 0.3, d: '국내 주식형 펀드 30%', ex: 1 },
    { x: 0.66, lane: 2, dir: 'dn', at: 0.35 + 0.65 * 0.33, val: () => disp.A * 0.2, d: '예탁금 20%', ex: 1 },
    { x: 1, dir: 'up', end: 1, at: 0.97, date: 1, d: '인출 가능' },
  ] as unknown as FlowNode[]
  NODES.forEach((n) => {
    n.el = document.createElement('div'); n.el.className = 'nd'; n.el.innerHTML = '<i></i>'; L$.fl8.appendChild(n.el)
    n.lab = document.createElement('div'); n.lab.className = 'nlab' + (n.end ? ' end' : '')
    n.lab.innerHTML = `<b></b><small>${typeof n.d === 'function' ? n.d() : n.d}${n.ex ? '<span class="ex">예시</span>' : ''}</small>`
    L$.fl8.appendChild(n.lab); n.b = n.lab.querySelector('b') as HTMLElement; n.shift = 0
  })
  // 엔진이 만든 노드·라벨 요소는 언마운트 때(그리고 StrictMode 재마운트 때 중복되지 않게) 지운다
  cleanups.push(() => NODES.forEach((n) => { n.el.remove(); n.lab.remove() }))
  const FLY: Lab = { lab: L$.flyW, dir: 'dn', shift: 0, px: 0, py: 0 }
  const fin = (n: FlowNode) => n.date ? ymd(withdrawDate()) : won(n.val!())
  function placeLab(n: Lab) {
    const w = n.lab.offsetWidth, h = n.lab.offsetHeight, gap = 14 + n.shift
    n.lab.style.left = (n.end ? n.px - w + 6 : n.px - 6) + 'px'
    n.lab.style.top = (n.dir === 'up' ? n.py - gap - h : n.py + gap) + 'px'
  }
  const boxOf = (n: Lab) => ({ x: parseFloat(n.lab.style.left), y: parseFloat(n.lab.style.top), w: n.lab.offsetWidth, h: n.lab.offsetHeight })
  const hit = (a: Rect, b: Rect, m: number) => a.x < b.x + b.w + m && b.x < a.x + a.w + m && a.y < b.y + b.h + m && b.y < a.y + a.h + m
  let nudges = 0 // 겹침 해소에서 라벨을 민 횟수(원본은 console.info로만 출력 — 비교용으로 개발 훅에 노출)
  function fixOverlap() {
    const pts: number[][] = []
    ;[L$.pm8, ...lanes8].forEach((p_) => { const sp = p_ as unknown as SVGPathElement, len = sp.getTotalLength(); for (let i = 0; i <= 90; i++) { const q = sp.getPointAtLength(len * i / 90); pts.push([q.x, q.y]) } })
    const labs: Lab[] = [...NODES, FLY]; let moved = 0
    for (let it = 0; it < 12; it++) {
      let any = false
      labs.forEach((a, i) => {
        const r = boxOf(a)
        const onLine = pts.some(([x, y]) => x > r.x - 12 && x < r.x + r.w + 12 && y > r.y - 12 && y < r.y + r.h + 12)
        const onLab = labs.some((b, j) => j !== i && hit(r, boxOf(b), 8))
        if (onLine || onLab) {
          if (a.shift >= 36 && !a.flipped) { a.flipped = 1; a.dir = a.dir === 'up' ? 'dn' : 'up'; a.shift = 0 }
          else a.shift += 6
          placeLab(a); any = true; moved++
        }
      })
      if (!any) break
    }
    nudges = moved
  }


  /* S6 duotone baked once into images (no live filters while scrolling) */
  const bakeSrc = new Image()
  bakeSrc.onload = () => {
    if (dead) return
    const w = Math.min(1600, bakeSrc.naturalWidth), hh = Math.round(w * bakeSrc.naturalHeight / bakeSrc.naturalWidth), c = document.createElement('canvas'); c.width = w; c.height = hh
    const x = c.getContext('2d')!; x.filter = 'grayscale(1) blur(2px)'; x.drawImage(bakeSrc, 0, 0, w, hh); x.filter = 'none'
    const base = x.getImageData(0, 0, w, hh), lo = [6, 18, 20], hi = [120, 170, 170] // 보안 검색대 사진 이중톤(청록) 변환 값(이미지 처리용 숫자)
    const make = (inv: boolean) => {
      const d = new ImageData(new Uint8ClampedArray(base.data), w, hh), p = d.data
      for (let i = 0; i < p.length; i += 4) { let g = p[i] / 255; if (inv) g = 1 - g; p[i] = lo[0] + (hi[0] - lo[0]) * g; p[i + 1] = lo[1] + (hi[1] - lo[1]) * g; p[i + 2] = lo[2] + (hi[2] - lo[2]) * g }
      x.putImageData(d, 0, 0); return c.toDataURL('image/jpeg', 0.86)
    }
    $<HTMLImageElement>('#ph6a img').src = make(false); $<HTMLImageElement>('#ph6b img').src = make(true)
  }
  bakeSrc.src = import.meta.env.BASE_URL + 'assets/photo-security.jpg'
  cleanups.push(() => { bakeSrc.onload = null; bakeSrc.removeAttribute('src') })

  function buildLate(vw: number, vh: number) {
    const pad = parseFloat(getComputedStyle(root).getPropertyValue('--pad')) || 96 // --pad는 .landing에 정의(원본은 :root)
    Object.assign(LG, { vw, vh, pad })
    paintLate()
    /* S5: text color follows the dawn gradient (white on dark top, ink on light bottom) */
    ;[L$.d5.querySelector<HTMLElement>('#d5s')!, L$.big5, L$.d5b].forEach((el) => { const r = rel(el); el.style.color = (r.y + r.h / 2) / vh > 0.52 ? 'var(--ink)' : 'var(--color-on-navy)' })
    const rr = rel(L$.rail5); LG.r5 = rr
    ticks5.forEach((tk, k) => tk.classList.toggle('dk', (rr.y + rr.h * k / 12) / vh > 0.5))
    /* S6 */
    L$.list6.style.top = ''; $$('.r6').forEach((r) => { r.style.padding = '' })
    const lr = rel(L$.list6); LG.l6 = lr
    const b6n = L$.big6.querySelector('b') as HTMLElement; b6n.style.fontSize = ''
    const b6 = rel(L$.big6), over6 = lr.y + lr.h + 24 - b6.y
    if (over6 > 0) b6n.style.fontSize = Math.max(56, 120 - over6) + 'px'
    const b6b = rel(L$.big6), over6b = lr.y + lr.h + 24 - b6b.y, t6 = rel(L$.tt6)
    L$.list6.style.top = ''
    if (over6b > 0) {
      const ny = Math.max(t6.y + t6.h + 24 > lr.x ? 0 : 0, lr.y - over6b); L$.list6.style.top = Math.max(vh * 0.1, ny) + 'px'
      LG.l6 = rel(L$.list6); const still = LG.l6.y + LG.l6.h + 24 - b6b.y
      if (still > 0) $$('.r6').forEach((r) => { r.style.padding = Math.max(8, 16 - still / 8) + 'px 0' })
      LG.l6 = rel(L$.list6)
    }
    /* S7 fit: receipt must clear the ruler, left column must clear the receipt */
    L$.rc7.style.transform = 'none'; L$.rc7.style.transformOrigin = '100% 0'
    const rc = rel(L$.rc7), ru = rel(L$.rul7), kr = Math.min(1, (ru.y - 28 - rc.y) / rc.h); LG.k7 = kr
    L$.rc7.style.transform = kr < 1 ? `scale(${kr})` : 'none'
    const room = rc.x + rc.w * (1 - kr) - 40 - pad; L$.col7.style.maxWidth = room + 'px'
    // 원본과 다른 곳: 원본은 이전 빌드에서 정한 flex-wrap을 그대로 둔 채 scrollWidth를 재서, 빌드할 때마다 wrap ↔ nowrap이 번갈아 바뀌었다
    // (빌드 횟수의 홀짝에 따라 결과가 달라짐 — 창 크기를 바꾸면 nowrap이 되어 글자가 영수증 밑으로 들어감). 매 빌드를 첫 빌드와 같은 조건에서 재도록 먼저 비운다.
    L$.big7.style.flexWrap = ''
    L$.big7.style.flexWrap = L$.big7.scrollWidth > room ? 'wrap' : 'nowrap'
    LG.sv = rel(L$.save7)
    /* S8 flow */
    L$.big8.style.top = ''; L$.big8.style.bottom = ''
    const t8 = rel(L$.tt8), b8 = rel(L$.big8), LAB = 62
    const fw = vw - pad * 2, L = clamp(vh * 0.13, 86, 112), mid = L + LAB + 12, fh = mid * 2
    FLY.px = 0
    const yTop = t8.y + t8.h + 20 + L + LAB; let yBot = b8.y - 16 - L - LAB
    if (yBot < yTop) { Object.assign(L$.big8.style, { top: t8.y + 'px', bottom: 'auto' }); yBot = vh - 24 - L - LAB }
    const cy = yBot >= yTop ? (yTop + yBot) / 2 : yTop
    const top = cy - mid
    Object.assign(L$.fl8.style, { left: pad + 'px', top: top + 'px', width: fw + 'px', height: fh + 'px' })
    L$.svg8.setAttribute('width', String(fw)); L$.svg8.setAttribute('height', String(fh)); L$.svg8.setAttribute('viewBox', `0 0 ${fw} ${fh}`)
    const X = (f_: number) => f_ * fw, sx = X(0.46), ys = [mid - L, mid, mid + L]
    L$.pm8.setAttribute('d', `M0,${mid} L${sx},${mid}`)
    ys.forEach((y, i) => lanes8[i].setAttribute('d', `M${sx},${mid} C${X(0.50)},${mid} ${X(0.50)},${y} ${X(0.54)},${y} L${X(0.80)},${y} C${X(0.84)},${y} ${X(0.84)},${mid} ${X(0.88)},${mid} L${fw},${mid}`))
    NODES.forEach((n) => { n.px = X(n.x); n.py = n.lane == null ? mid : ys[n.lane]; n.shift = 0; n.flipped = 0; n.dir = n.dir0 || (n.dir0 = n.dir); Object.assign(n.el.style, { left: n.px + 'px', top: n.py + 'px' }); n.b.textContent = fin(n); placeLab(n) })
    FLY.px = 0; FLY.py = mid + L; FLY.shift = 0; FLY.flipped = 1; FLY.dir = 'dn'; L$.fly8.textContent = won(calc(disp.A, my.r).save); L$.fly8.style.transform = 'none'; placeLab(FLY)
    fixOverlap()
    LG.fly = { x: pad + parseFloat(FLY.lab.style.left), y: top + parseFloat(FLY.lab.style.top) }
    LG.flyH = L$.fly8.getBoundingClientRect().height || 25
    /* S9 character beside the app screen */
    const ap = { x: L$.app9.offsetLeft, y: L$.app9.offsetTop, h: L$.app9.offsetHeight }
    Object.assign(L$.kiroo.style, { left: (ap.x - 44) + 'px', top: (ap.y + ap.h - 70) + 'px' })
    Object.assign(L$.bub9.style, { left: (ap.x + 40) + 'px', top: (ap.y + ap.h - 92) + 'px' })
  }
  function paintLate() {
    const c = calcAt(disp.A, my.r, undefined, my.w), lt = lateTexts(disp.A, my.r, my.w)
    for (const k in lt) LL(k).forEach((e) => setT(e, lt[k]))
    return c
  }
  function renderLate(t: number) {
    if (t < 10.5) { if (L$.late.style.visibility !== 'hidden') vis(L$.late, 0); return }
    vis(L$.late, 1)
    const c = paintLate(), vw = LG.vw, vh = LG.vh
    /* backgrounds: dawn rises from below → teal → sky (swept left→right) → white → ivory */
    const m = seg(t, 10.5, 10.85) * 140 - 40
    L$.lb5.style.webkitMaskImage = L$.lb5.style.maskImage = `linear-gradient(to top,rgb(0,0,0) ${m}%,transparent ${m + 40}%)`
    L$.lb6.style.opacity = String(seg(t, 12.2, 12.5))
    const x2 = seg(t, 14.2, 14.5) * vw
    L$.lb7.style.clipPath = `inset(0 ${vw - x2}px 0 0)`
    L$.lb8.style.opacity = String(seg(t, 16.2, 16.5))
    L$.lb9.style.opacity = String(seg(t, 18.2, 18.5))
    vis(L$.beam6b, x2 > 0 && x2 < vw ? 1 : 0, `translateX(${x2}px)`)

    /* S5 — big withdrawal date + 1-year rail */
    const on5 = t < 12.5; vis(L$.s5, on5 ? 1 : 0)
    if (on5) {
      const out = seg(t, 12.2, 12.4)
      revL(L$.tt5, 10.5, t); vis(L$.tt5, (t >= 10.5 ? 1 : 0) * (1 - out))
      const di = e3o(seg(t, 10.8, 11.1)); vis(L$.d5, di * (1 - out), `translateY(${(1 - di) * 24}px)`)
      vis(L$.rail5, seg(t, 10.85, 11.1) * (1 - out))
      const k = seg(t, 11.1, 12.0), ex = e2io(seg(t, 12.2, 12.5)), r = LG.r5!
      const dy = k * r.h + ex * (vh - r.y - r.h + 60)
      L$.dot5.style.transform = `translateY(${dy}px)`; L$.dot5.style.visibility = t >= 11.0 ? 'visible' : 'hidden'; L$.dot5.style.opacity = '1'
      L$.rf5.style.height = k * 100 + '%'
      setT(L$.cnt5, `보유 ${Math.round(365 * k)}일`); L$.cnt5.style.color = (r.y + dy) / vh > 0.5 ? 'var(--ink)' : 'var(--color-on-navy)'
      ticks5.forEach((tk, i) => tk.classList.toggle('on', k >= i / 12 - 0.001 && t >= 11.1))
      const sk = seg(t, 12.0, 12.15); vis(L$.seal5, sk * (1 - out), `rotate(-12deg) scale(${2.2 - 1.2 * e3o(sk)})`)
    }
    /* S6 — scan beam over the security photo */
    const on6 = t >= 12.2 && t < 14.5; vis(L$.s6, on6 ? 1 : 0)
    if (on6) {
      L$.s6.style.clipPath = x2 > 0 ? `inset(0 0 0 ${x2}px)` : ''
      const pi = seg(t, 12.2, 12.5); L$.ph6a.style.opacity = String(pi)
      revL(L$.tt6, 12.5, t); vis(L$.tt6, t >= 12.5 ? 1 : 0); L$.p6.style.opacity = String(seg(t, 12.6, 12.8))
      const bx = seg(t, 12.8, 13.7) * vw
      vis(L$.beam6, bx > 0 && bx < vw ? 1 : 0, `translateX(${bx}px)`)
      L$.ph6b.style.clipPath = `inset(0 ${vw - bx}px 0 0)`; L$.ph6b.style.opacity = String(pi)
      const l = LG.l6!
      rows6.forEach((row, i) => { row.style.visibility = bx >= l.x ? 'visible' : 'hidden'; ems6[i].style.opacity = String(clamp((bx - (l.x + (i + 1) / 5 * l.w)) / 40)) })
      const gk = seg(t, 13.7, 14.0); vis(L$.big6, gk > 0 ? 1 : 0, `translateY(${(1 - e3o(gk)) * 16}px)`)
      setT(L$.pct6, Math.round(100 - 18 * e3o(gk)) + '%')
    }
    /* S7 — big deduction rate, ruler, printed receipt */
    const on7 = t >= 14.2 && t < 16.55; vis(L$.s7, on7 ? 1 : 0)
    if (on7) {
      L$.s7.style.clipPath = x2 < vw ? `inset(0 ${vw - x2}px 0 0)` : ''
      const out = seg(t, 16.2, 16.35)
      revL(L$.tt7, 14.5, t); vis(L$.tt7, t >= 14.5 ? 1 : 0)
      const bi = e3o(seg(t, 14.55, 14.8)); vis(L$.big7, bi, `translateY(${(1 - bi) * 20}px)`)
      L$.col7.style.opacity = String(1 - out)
      vis(L$.rul7, (t >= 14.8 ? 1 : 0) * (1 - out)); L$.rul7in.style.clipPath = `inset(-40px ${(1 - e2io(seg(t, 14.8, 15.1))) * 100}% -10px 0)`
      const td = seg(t, 15.0, 15.15); L$.today7.style.transform = `scaleY(${td})`; L$.today7.style.opacity = String(td)
      vis(L$.rc7, (t >= 15.05 ? 1 : 0) * (1 - out), LG.k7 < 1 ? `scale(${LG.k7})` : 'none')
      L$.paper.style.clipPath = `inset(0 0 ${(1 - seg(t, 15.05, 15.1 + 0.066 * 9)) * 100}% 0)`
      items7.forEach((el, i) => { const k = seg(t, 15.1 + i * 0.066, 15.1 + i * 0.066 + 0.15); el.style.opacity = String(k) })
      L$.strike.style.transform = `scaleX(${seg(t, 15.55, 15.7)})`
      setT(L$.save7, won(c.save * e3o(seg(t, 15.7, 16.0))))
      L$.save7.style.visibility = t >= 16.2 ? 'hidden' : ''
    }
    /* S8 — full-width fund flow */
    const on8 = t >= 16.2 && t < 18.55; vis(L$.s8, on8 ? 1 : 0); vis(L$.passD, t >= 16.5 ? 1 : 0)
    if (on8) {
      const out = seg(t, 18.2, 18.4)
      L$.s8.style.opacity = String(1 - out)
      const k = e2io(seg(t, 16.2, 16.5)), src = LG.sv!, tg = LG.fly!, sc = LG.flyH ? src.h / LG.flyH : 1
      L$.fly8.style.transform = `translate(${(src.x - tg.x) * (1 - k)}px,${(src.y - tg.y) * (1 - k)}px) scale(${sc + (1 - sc) * k})`
      setT(L$.fly8, won(c.save)); FLY.lab.style.visibility = 'visible'; FLY.lab.querySelector<HTMLElement>('small')!.style.opacity = String(seg(t, 16.5, 16.65))
      revL(L$.tt8, 16.5, t); vis(L$.tt8, t >= 16.5 ? 1 : 0)
      const fp = seg(t, 16.8, 17.7)
      L$.pm8.style.strokeDashoffset = String(1 - seg(fp, 0, 0.35))
      lanes8.forEach((p_) => { p_.style.strokeDashoffset = String(1 - seg(fp, 0.35, 1)) })
      NODES.forEach((n) => {
        const a = n.at, v = fp >= a - 0.005 && t >= 16.8 ? 1 : 0; n.el.style.visibility = n.lab.style.visibility = v ? 'visible' : 'hidden'
        setT(n.b, n.date ? ymd(withdrawDate()) : won(n.val!() * e3o(seg(fp, a, a + 0.17))))
      })
      const bk = seg(t, 17.7, 18.0); vis(L$.big8, bk > 0 ? 1 : 0, `translateY(${(1 - e3o(bk)) * 16}px)`)
      LL('A8').forEach((e) => setT(e, won(disp.A * e3o(bk))))
    }
    /* S9 — service list + one live app screen */
    const on9 = t >= 18.2; vis(L$.s9, on9 ? 1 : 0)
    if (on9) {
      revL(L$.tt9, 18.5, t); vis(L$.tt9, t >= 18.5 ? 1 : 0)
      vis(L$.list9, seg(t, 18.55, 18.75))
      const ai = e3o(seg(t, 18.6, 18.8)); vis(L$.app9, ai, `translateY(${(1 - ai) * 24}px)`)
      const live = t >= 18.8, idx = clamp(Math.floor((t - 18.8) / 0.4), 0, 6)
      items9.forEach((e, i) => e.classList.toggle('on', live && i === idx))
      panels9.forEach((p_, i) => {
        const s0 = 18.8 + i * 0.4, kin = i ? e3o(seg(t, s0, s0 + 0.18)) : 1, kout = i < 6 ? e3o(seg(t, s0 + 0.4, s0 + 0.58)) : 0
        p_.style.visibility = kin > 0 && kout < 1 ? 'visible' : 'hidden'; p_.style.transform = `translateY(${((1 - kin) - kout) * 100}%)`
      })
      tabs9.forEach((e, i) => e.classList.toggle('on', i === TABS9[live ? idx : 0]))
      vis(L$.kiroo, seg(t, 18.7, 18.85)); vis(L$.bub9, seg(t, 18.8, 18.9) * (1 - seg(t, 19.1, 19.2)))
      L$.disc9.style.opacity = String(seg(t, 18.8, 19.0))
    }
  }

  /* ===== frame render ===== */
  const e2o = (q: number) => 1 - (1 - q) * (1 - q), e2io = (q: number) => q < 0.5 ? 2 * q * q : 1 - Math.pow(-2 * q + 2, 2) / 2
  let lastPct = -1, lastDay = -1
  function monitorFrame(t: number) {
    const g = GEO; if (!g) return
    A.sil = t < g.T4 ? 1 : 0
    const on = t >= g.T4 && t < g.TX, rise = e2o(clamp((t - g.T4) / g.dR))
    gsap.set(['#mon', '#monUI'], { autoAlpha: on ? 1 : 0, y: on ? (1 - rise) * g.MOFF : 0 })
    if (t < g.T1x) return                       // S0–S1: map viewport is tween-driven
    if (t < g.T4) { V.o = 0; return }
    const S = g.SCR
    if (t < g.TX) { Object.assign(V, { x: S.x, y: S.y + (1 - rise) * g.MOFF, w: S.w, h: S.h, r: 6, bg: 1, o: 1 }); return }
    const k = e2io(clamp((t - g.TX) / g.dX))
    Object.assign(V, { x: S.x * (1 - k), y: S.y * (1 - k), w: S.w + (g.vw - S.w) * k, h: S.h + (g.vh - S.h) * k, r: 6 * (1 - k), bg: 1, o: 1 - clamp((t - g.TX - g.dX * 0.33) / (g.dX * 0.67)) })
  }
  function onTL() {
    if (!tl) return
    const t = tl.time()
    monitorFrame(t); map.drawMap()
    renderLate(t)
    updBoard(t, boardLive())
    if (K.v !== K.last) { K.last = K.v; paintBig() }
    const pct = Math.round(P.v * 100)
    // 원본과 다른 곳: 원본은 진행률(pct)이 바뀔 때만 #mDay·#mLab1을 갱신해서, 빠른 스크롤로 P.v가 0.995~0.999에서 pct=100이 된 뒤
    // 정확히 1이 되면 D-1 · 예상 금액이 남았다. D-day 단계(day)가 바뀔 때도 갱신하도록 조건만 추가했다.
    const day = P.v >= 1 ? 0 : P.v > 0.5 ? 1 : 2
    if (pct !== lastPct || day !== lastDay) {
      lastPct = pct; lastDay = day; byId('mPct').textContent = `진행률 ${pct}%`
      byId('mDay').textContent = P.v >= 1 ? 'D-0' : P.v > 0.5 ? 'D-1' : 'D-2'
      byId('mLab1').textContent = P.v >= 1 ? '확정 원화 금액' : '예상 원화 금액(가환전)'
    }
    const n = STAMPS.filter((x) => t >= x).length
    if (stampN < 0) { setStamps(n); stampN = n; return }
    if (n !== stampN) {
      if (n === stampN + 1) stampFx(n)
      else { if (passFx) passFx.kill(); gsap.set(pass, { width: 72, height: 88 }); gsap.set('.po', { autoAlpha: 0 }); gsap.set('.pt', { autoAlpha: 1 }); setStamps(n) }
      stampN = n
    }
  }
  const words11 = $$('#w11 .ml>span')
  function render11(p: number) {
    paintLate()
    L$.ph11.style.clipPath = `inset(${(1 - e3o(seg(p, 0, 0.3))) * 100}% 0 0 0)`
    words11.forEach((s_, i) => { const k = e3o(seg(p, 0.3 + i * 0.3, 0.3 + i * 0.3 + 0.22)); s_.style.transform = `translateY(${(1 - k) * 112}%)` })
    const k = e3o(seg(p, 1.2, 1.5)), c = L$.sum11, w = c.offsetWidth || 380, h = c.offsetHeight || 360
    const dx = (LG.pad || 96) - 24, dy = innerHeight * 0.08 - 24
    vis(c, p >= 1.2 ? 1 : 0, `translate(${dx * (1 - k)}px,${dy * (1 - k)}px) scale(${72 / w + (1 - 72 / w) * k},${88 / h + (1 - 88 / h) * k})`)
    L$.sum11bg.style.opacity = String(1 - k); L$.sum11c.style.opacity = String(seg(k, 0.6, 1))
  }

  /* ===== passport tab ===== */
  const STAMPS = [R(5.3), R(6.6), R(8.45), 11.8, 13.75], STL = ['계좌 개설', '입고', '매도', '확정', '외부감시']
  const pass = byId('pass'), stI = $$('.st i'); let stampN = 0, passFx: gsap.core.Timeline | undefined
  function setStamps(n: number) { stI.forEach((st_, i) => gsap.set(st_, { opacity: i < n ? 1 : 0, scale: 1 })); byId('pCount').textContent = `${n}/5`; byId('stLab').textContent = n ? `${STL[n - 1]} 도장` : '' }
  function stampFx(n: number) {
    if (passFx) passFx.kill()
    setStamps(n - 1); byId('pCount').textContent = `${n}/5`; byId('stLab').textContent = `${STL[n - 1]} 도장`
    ctx.add(() => {
      passFx = gsap.timeline()
        .to(pass, { width: 160, height: 212, duration: 0.35, ease: 'power3.out' })
        .to('.pt', { autoAlpha: 0, duration: 0.12 }, 0).to('.po', { autoAlpha: 1, duration: 0.2 }, 0.12)
        .fromTo(stI[n - 1], { opacity: 0, scale: 2.4 }, { opacity: 1, scale: 1, duration: 0.22, ease: 'power3.in' }, 0.38)
        .to('.po', { autoAlpha: 0, duration: 0.15 }, 1.4).to('.pt', { autoAlpha: 1, duration: 0.15 }, 1.5)
        .to(pass, { width: 72, height: 88, duration: 0.3, ease: 'power3.inOut' }, 1.4)
    })
  }
  cleanups.push(() => passFx?.kill())

  /* ===== master timeline (one take) ===== */
  const stageEl = $('#stage')
  const rel = (el: Element) => { const s = stageEl.getBoundingClientRect(), r = el.getBoundingClientRect(); return { x: r.left - s.left, y: r.top - s.top, w: r.width, h: r.height } }
  const r$ = (s: string) => rel($(s))
  const ANIM = '#hdr,#c0,#scrim,#bg1,#bg2,#bg2 img,#bg3,#bg4,#s1,#c1,#c1p,#card1,#seal,.kv b,.gln,#c2,#c2p,#card2,.c2r,.c2res,.c2n,#board,#c3,#mon,#monUI,#c4,#c4a,#c4lab,#hero,#hero img,#slogan,#pass,.ml>span'

  function build() {
    const prog = st ? st.progress : 0
    if (st) st.kill()
    if (tl) tl.kill()
    const vw = innerWidth, vh = innerHeight, mob = vw <= 760
    $('#pinA').style.height = (TOTAL + 1) * vh + 'px'
    map.readColors(document.documentElement) // 캔버스 색은 build() 때 CSS 변수에서 읽는다
    map.resize(vw, vh)
    map.buildGrid()
    gsap.set($$(ANIM).filter((e) => !e.closest('#c0')), { clearProps: 'all' })
    gsap.set(['#hdr', '#c0', '#scrim'], { clearProps: 'all' })

    const sw = $('#s1w'); sw.style.transform = ''
    const SK = Math.min(1, (vh - 56) / sw.offsetHeight); sw.style.transform = SK < 1 ? `scale(${SK})` : ''
    const TB = r$('#thumb'), CD = r$('#card1'), PS = r$('#pass'), BD = r$('#board')

    /* seat-back monitor geometry */
    const mw = Math.min(1040, vw * (mob ? 0.92 : 0.78), ((vh * (mob ? 0.5 : 0.66)) - 28) * 16 / 9 + 28), mh = (mw - 28) * 9 / 16 + 28
    const mx = (vw - mw) / 2, my0 = vh - mh - Math.max(40, vh * 0.07)
    ;[$('#mon'), $('#monUI')].forEach((e) => Object.assign(e.style, { left: mx + 'px', top: my0 + 'px', width: mw + 'px', height: mh + 'px' }))
    Object.assign($('#c4').style, { left: mx + 'px', bottom: (vh - my0 + 32) + 'px' })
    const SCR = { x: mx + 14, y: my0 + 14, w: mw - 28, h: mh - 28 }, MOFF = vh - my0 + 80
    GEO = { SCR, MOFF, vw, vh, T1x: R(4.93), T4: R(8.7), TX: R(11.15), dR: R(9.15) - R(8.7), dX: R(11.6) - R(11.15) }
    buildLate(vw, vh)
    gsap.set('#board', { transformPerspective: 1400, transformOrigin: '0% 50%' })

    Object.assign(V, { x: 0, y: 0, w: vw, h: vh, r: 0, bg: 0, o: 1 })
    Object.assign(C, { cx: MW / 2, cy: MH / 2, z: 1 })
    Object.assign(A, { sw: -0.2, krDot: 0, ro: 0, krLit: 0, lit: 0, dimOn: 0 }); P.v = 0; K.v = 0; K.last = -1

    gsap.set(['#bg1', '#bg2', '#bg3', '#bg4', '#s1', '#c1', '#c1p', '#card1', '#seal', '.kv b', '#c2', '#c2p', '#card2', '.c2res', '.c2n', '#board', '#c3', '#mon', '#monUI', '#c4', '#c4a', '#c4lab', '#hero', '#slogan', '#pass'], { autoAlpha: 0 })
    gsap.set('.ml>span', { yPercent: 0 })

    tl = gsap.timeline({ paused: true, defaults: { ease: 'none' }, onUpdate: onTL })
    wrapTL(tl)
    const FADE = (t: number, sel: string, to: number, d = 0.6) => tl!.fromTo(sel, { autoAlpha: to ? 0 : 1 }, { autoAlpha: to, duration: d }, t)
    const q = (sel: string | string[]) => $$(String(sel))
    const REV = (t: number, sel: string) => { tl!.set(sel, { autoAlpha: 1 }, t); tl!.fromTo($$(sel + ' .ml>span'), { yPercent: 112 }, { yPercent: 0, duration: 0.2, stagger: 0.06, ease: 'power3.out' }, t) }
    const IN = (t: number, sel: string | string[], d = 0.18, y = 14) => tl!.fromTo(q(sel), { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: d, ease: 'power2.out' }, t)
    const OUT = (t: number, sel: string | string[], d = 0.16, y = -10) => tl!.to(q(sel), { autoAlpha: 0, y, duration: d, ease: 'power1.in' }, t)

    /* S0 — whole world in currency symbols, slow approach ×1.35, one light sweep */
    tl.to('#hdr', { autoAlpha: 0, y: -8, duration: 0.22 }, 0.05)
    tl.to(C, { z: 1.35, cy: MH * 0.46, duration: 2.0, ease: 'power1.inOut' }, 0.1)
    tl.fromTo(A, { sw: -0.2 }, { sw: 1.2, duration: 1.1, ease: 'power1.inOut', immediateRender: false }, 0.6)
    tl.to(['#c0', '#scrim'], { autoAlpha: 0, duration: 0.18 }, 1.95)
    /* → map shrinks into the card thumbnail while night turns to ivory */
    FADE(2.4, '#bg1', 1)
    tl.set('#s1', { autoAlpha: 1 }, 2.4)
    tl.fromTo('#card1', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, 2.5)
    tl.to(V, { x: TB.x, y: TB.y, w: TB.w, h: TB.h, r: 10, bg: 1, duration: 0.7, ease: 'power2.inOut' }, 2.3)
    tl.to(C, { cx: MW * 0.5, cy: (Mp.seoul[1] || MH * 0.4), z: 1.25, duration: 0.7, ease: 'power2.inOut' }, 2.3)
    tl.to(A, { krDot: 1, duration: 0.25 }, 2.75)

    /* S1 — account card fills in slowly (≈2 screens) */
    REV(3.0, '#c1'); IN(3.08, '#c1p')
    const glns = $$('.gln'), pulse = (g: HTMLElement, t: number, d: number) => { tl!.fromTo(g, { opacity: 0 }, { opacity: 1, duration: 0.04, immediateRender: false }, t); tl!.to(g, { opacity: 0, duration: 0.06 }, t + d) }
    $$('.kv b').forEach((b, i) => { const t = 3.2 + i * 0.25; tl!.fromTo(b, { autoAlpha: 0, x: -8 }, { autoAlpha: 1, x: 0, duration: 0.12, ease: 'power2.out' }, t); pulse(glns[i], t, 0.19) })
    tl.fromTo(K, { v: 0 }, { v: 1, duration: 0.45, ease: 'power2.out' }, 3.95); pulse(glns[3], 3.95, 0.39)
    tl.fromTo('#seal', { autoAlpha: 0, scale: 2.2, rotate: -28 }, { autoAlpha: 1, scale: 1, rotate: -12, duration: 0.15, ease: 'power3.in' }, 4.4)
    OUT(4.83, ['#c1', '#c1p'])
    tl.to(V, { o: 0, duration: 0.08 }, 4.85)
    const tdx = ((PS.x + PS.w / 2) - (CD.x + CD.w / 2)) / SK, tdy = ((PS.y + PS.h / 2) - (CD.y + CD.h / 2)) / SK
    tl.to('#card1', { scaleY: 0.5, duration: 0.12, ease: 'power2.in' }, 4.85)
    tl.to('#card1', { x: tdx, y: tdy, scaleX: 0.1, scaleY: 0.06, duration: 0.3, ease: 'power2.inOut' }, 4.97)
    tl.to('#card1', { autoAlpha: 0, duration: 0.08 }, 5.19)
    tl.fromTo('#pass', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.06 }, 5.21)
    FADE(4.85, '#bg2', 1)
    tl.set('#s1', { autoAlpha: 0 }, 5.28)

    /* S2 — transfer in: right card, left type */
    REV(5.45, '#c2'); IN(5.63, '#c2p')
    tl.fromTo('#card2', { autoAlpha: 0, x: 64 }, { autoAlpha: 1, x: 0, duration: 0.3, ease: 'power2.out' }, 5.5)
    const rws = $$('.c2r')
    tl.to([rws[0], rws[2]], { opacity: 0.28, duration: 0.15 }, 6.1)
    tl.fromTo('.c2res', { autoAlpha: 0, y: 10 }, { autoAlpha: 1, y: 0, duration: 0.14 }, 6.3)
    tl.fromTo('.c2n', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.1 }, 6.42)
    OUT(6.75, ['#c2', '#c2p']); tl.to('#card2', { autoAlpha: 0, x: -48, duration: 0.18 }, 6.75)
    /* → belt photo slides left, grey wall + ceiling, board lowers from above */
    tl.to('#bg2 img', { x: -vw * 0.18, duration: 0.6, ease: 'power1.inOut' }, 6.85)
    FADE(6.9, '#bg3', 1, 0.5)
    tl.fromTo('#board', { autoAlpha: 1, y: -(BD.y + BD.h + 40) }, { autoAlpha: 1, y: 0, duration: 0.5, ease: 'power2.out' }, 6.9)
    tl.fromTo('#board', { rotateY: -10, rotateX: 3 }, { rotateY: 0, rotateX: 0, duration: 1.5, ease: 'power1.out' }, 6.9)

    /* S3 — departure board: statuses roll top → bottom */
    REV(7.4, '#c3')
    OUT(8.47, '#c3', 0.12, 16)
    /* → board lifts away, seat-back monitor rises from below (monitor + map viewport: monitorFrame) */
    tl.to('#board', { y: -(BD.y + BD.h + 60), duration: 0.45, ease: 'power2.in' }, 8.55)
    FADE(8.65, '#bg4', 1, 0.4)
    tl.set(C, { cx: MW / 2, cy: MH * 0.47, z: 1 }, 8.7)
    tl.set(A, { krDot: 0, sw: 2, ro: 1, dimOn: 1 }, 8.7)

    /* S4 — inflight map: NY & Tokyo → Seoul */
    tl.set('#c4', { autoAlpha: 1 }, 9.15); IN(9.15, '#c4lab'); REV(9.2, '#c4a')
    tl.fromTo(P, { v: 0 }, { v: 1, duration: 1.15, ease: 'power1.inOut', immediateRender: false }, 9.2)
    tl.fromTo(A, { krLit: 0 }, { krLit: 1.15, duration: 0.4, immediateRender: false }, 10.0)

    const kb = Mp.krB || [[1000, 300], [1030, 330]], kh = kb[1][1] - kb[0][1], kcx = (kb[0][0] + kb[1][0]) / 2, kcy = (kb[0][1] + kb[1][1]) / 2
    const kz = (SCR.h * 0.8 / kh) / (SCR.w * 0.9 / MW)
    tl.to(A, { ro: 0, duration: 0.2 }, 10.35)
    tl.to(C, { cx: kcx, cy: kcy, z: kz, duration: 0.7, ease: 'power2.inOut' }, 10.35)
    tl.to(A, { lit: 1.06, duration: 0.5 }, 10.6)
    /* → screen grows to full frame (11.15), ₩ fade while Seoul at night appears */
    OUT(11.1, ['#c4a', '#c4lab'])
    tl.to('#hero', { autoAlpha: 1, duration: 0.4 }, 11.3)
    tl.fromTo('#hero img', { scale: 1.15 }, { scale: 1, duration: 0.85, ease: 'power1.out' }, 11.3)
    // L-6 이후: S5~S9(renderLate)
    tl.add(() => {}, TOTAL)

    st = ScrollTrigger.create({ trigger: '#pinA', start: 'top top', end: 'bottom bottom', scrub: RM ? true : 0.6, animation: tl,
      snap: RM ? { snapTo: SCN.map((s) => s.done / TOTAL), duration: 0.01, delay: 0.05 } : undefined })
    stampN = -1; rowState = rowState.map(() => -1); tl.progress(prog); onTL()
    build11(); updNav()
  }

  /* ===== S11 closing (own pinned section) ===== */
  function build11() {
    const prog = st2 ? st2.progress : 0
    if (st2) st2.kill()
    if (tl2) tl2.kill()
    const pinB = byId('pinB'), w11 = byId('w11'), sum11 = byId('sum11')
    pinB.style.height = innerHeight * 3 + 'px'
    const pad = LG.pad || 96, avail = innerWidth - pad * 2 - (innerWidth <= 760 ? 0 : (sum11.offsetWidth || 380) + 40)
    w11.style.fontSize = ''
    const fs = parseFloat(getComputedStyle(w11).fontSize), tw = w11.scrollWidth
    if (tw > avail) w11.style.fontSize = Math.max(48, fs * avail / tw) + 'px'
    tl2 = gsap.timeline({ paused: true, onUpdate: () => render11(tl2!.time()) })
    tl2.add(() => {}, 2)
    st2 = ScrollTrigger.create({ trigger: '#pinB', start: 'top top', end: 'bottom bottom', scrub: RM ? true : 0.6, animation: tl2,
      snap: RM ? { snapTo: [0, 0.85], duration: 0.01, delay: 0.05 } : undefined })
    tl2.progress(prog); render11(tl2.time())
  }

  /* ===== passport navigation ===== */
  const pnList = byId('pnList'), passWrap = byId('passWrap'), faq = byId('faq')
  const navLis = [...pnList.children] as HTMLElement[]
  const yOfT = (t: number) => (st ? st.start + t / TOTAL * (st.end - st.start) : 0)
  const sceneY = (i: number) => (i < SCN.length ? yOfT(i ? SCN[i].a + 0.3 : 0) : faq.offsetTop)
  const goScene = (i: number) => lenis.scrollTo(sceneY(i), { duration: 1.2 })
  const onNavClick = (e: Event) => {
    const li = (e.target as Element).closest('li')
    const i = li ? navLis.indexOf(li) : -1
    if (i >= 0) goScene(i)
  }
  pnList.addEventListener('click', onNavClick)
  cleanups.push(() => pnList.removeEventListener('click', onNavClick))
  const pnAmt = byId('pnAmt')
  const onPnAmt = () => lenis.scrollTo(yOfT(R(4.6)), { duration: 1.2 })
  pnAmt.addEventListener('click', onPnAmt)
  cleanups.push(() => pnAmt.removeEventListener('click', onPnAmt))
  function curScene() {
    const y = scrollY
    if (y >= faq.offsetTop - innerHeight * 0.5) return SCN.length
    const t = st ? clamp((y - st.start) / ((st.end - st.start) || 1)) * TOTAL : 0
    let i = 0
    SCN.forEach((s, k) => { if (t >= s.a - 0.001) i = k })
    return i
  }
  function updNav() {
    const i = curScene()
    navLis.forEach((li, k) => { li.classList.toggle('past', k < i); li.classList.toggle('cur', k === i) })
    passWrap.classList.toggle('gone', i === 0 || scrollY > byId('pinB').offsetTop - innerHeight * 0.4)
  }
  listen('scroll', updNav, { passive: true })
  listen('keydown', (e) => {
    const tg = e.target as Element | null
    if (tg && tg.closest && tg.closest('input,textarea,select,button,a,[contenteditable],.qa')) return
    const nxt = (e.key === ' ' && !e.shiftKey) || e.key === 'ArrowDown' || e.key === 'PageDown'
    const prv = (e.key === ' ' && e.shiftKey) || e.key === 'ArrowUp' || e.key === 'PageUp'
    if (!nxt && !prv) return
    const pts = [...SCN.map((s_) => yOfT(s_.a)), faq.offsetTop, byId('pinB').offsetTop], y = scrollY
    const tgt = nxt ? pts.find((p_) => p_ > y + 8) : [...pts].reverse().find((p_) => p_ < y - 8)
    if (tgt == null) return
    e.preventDefault(); lenis.scrollTo(tgt, { duration: 1 })
  })

  /* ===== FAQ accordion (one open at a time) ===== */
  $$('.qa').forEach((qa) => on(qa.querySelector('.q') as HTMLElement, 'click', () => {
    const open = !qa.classList.contains('open')
    $$('.qa').forEach((x) => { x.classList.remove('open'); x.querySelector('.q')!.setAttribute('aria-expanded', 'false'); x.querySelector('.q i')!.textContent = '+' })
    if (open) { qa.classList.add('open'); qa.querySelector('.q')!.setAttribute('aria-expanded', 'true'); qa.querySelector('.q i')!.textContent = '−' }
    later(() => ScrollTrigger.refresh(), 380)
  }))

  /* ===== 로그아웃 안내(30분 무조작 로그아웃으로 돌아왔을 때) ===== */
  {
    let show = false
    try {
      if (sessionStorage.getItem(LOGOUT_NOTICE_KEY) === '1') { sessionStorage.removeItem(LOGOUT_NOTICE_KEY); lastNoticeAt = performance.now(); show = true }
      else if (performance.now() - lastNoticeAt < 500) show = true // StrictMode(개발) 재마운트: 앞 마운트가 이미 키를 지웠다
    } catch { /* sessionStorage 불가 환경이면 안내 없음 */ }
    if (show) {
      const d = document.createElement('div')
      d.setAttribute('role', 'status'); d.textContent = '30분이 지나 안전하게 로그아웃됐어요'
      d.style.cssText = 'position:fixed;top:96px;left:50%;transform:translateX(-50%);z-index:200;background:var(--color-surface);color:var(--color-ink);font:500 14px Pretendard,system-ui,sans-serif;padding:10px 16px;border-radius:6px;box-shadow:0 8px 24px rgba(16,24,40,.12)'
      document.body.appendChild(d)
      later(() => d.remove(), 3000)
      cleanups.push(() => d.remove())
    }
  }

  /* ===== 고정 상단 바(#hdr2) — S0 이후 위로 스크롤하면 내려옴 ===== */
  const bar = byId('hdr2')
  let last = window.scrollY, acc = 0, shown = false, hover = false
  const inS0 = () => {
    const hd = byId('hdr')
    return window.scrollY < 4 || (hd && parseFloat(getComputedStyle(hd).opacity) > 0.01 && getComputedStyle(hd).visibility !== 'hidden')
  }
  const set = (v: boolean) => { if (v !== shown) { shown = v; bar.classList.toggle('on', v) } if (v) tone() }
  // 화면 맨 위(0~88px)에 깔린 장면으로 색 세트 결정 — S0~S9는 고정 타임라인 진행 위치로, 이후는 섹션 위치로
  const DARK: Record<string, number> = { S0: 1, S4: 1, S5: 1, S6: 1 }
  const sceneNow = () => {
    if (st && tl && window.scrollY < st.end - 44) {
      const t = tl.time()
      return (SCN.find((x) => t >= x.a && t < x.b) || SCN[SCN.length - 1]).k
    }
    const hit = (id: string) => { const el = document.getElementById(id); if (!el) return false; const r = el.getBoundingClientRect(); return r.top <= 44 && r.bottom > 44 }
    if (hit('ftr')) return 'FTR'
    if (hit('pinB')) return 'S11'
    if (hit('faq')) return 'S10'
    return 'S10'
  }
  let toneK = ''
  const tone = () => {
    const k = sceneNow()
    if (k === toneK) return
    toneK = k
    bar.classList.toggle('lt', !(DARK[k] || k === 'FTR'))
    bar.dataset.scene = k
  }
  const onScroll = () => {
    const y = window.scrollY, d = y - last
    last = y
    if (shown) tone()
    if (inS0()) { acc = 0; set(false); return }
    if (!d) return
    if ((d > 0) !== (acc > 0)) acc = 0
    acc += d
    if (acc <= -8) set(true)
    else if (acc >= 8 && !hover) set(false)
  }
  if (!RM) lenis.on('scroll', onScroll)
  else listen('scroll', onScroll, { passive: true })
  listen('mousemove', (e) => {
    if (e.clientY <= 16 && !inS0()) { hover = true; set(true) }
    else if (hover && e.clientY > 72) { hover = false }
  }, { passive: true })
  const lo = bar.querySelector<HTMLElement>('.lo')!
  const onLogo = (e: Event) => { e.preventDefault(); lenis.scrollTo(0) }
  lo.addEventListener('click', onLogo)
  cleanups.push(() => lo.removeEventListener('click', onLogo))

  /* ===== 시작: 첫 build ===== */
  setP(); ctx.add(build); paintNums()

  /* ===== 스크롤 복원(⑦): 뒤로 가기(POP)면 이전 위치, 그 밖의 진입은 맨 위 ===== */
  const savedY = opts.pop ? readSavedScroll(opts.historyKey) : null
  if (savedY != null && savedY > 0) {
    lenis.scrollTo(savedY, { immediate: true, force: true })
    window.scrollTo(0, savedY) // lenis가 없는 RM 모드에서도 같은 위치
    ScrollTrigger.update()
  } else if (opts.hash === '#faq') {
    // 다른 페이지(커뮤니티 끼루 답변 근거 등)에서 /#faq 로 들어오면 FAQ 위치로 — 원본 landing-journey.html#faq 도 같은 위치(faq.offsetTop)에 선다
    const y = faq.offsetTop
    lenis.scrollTo(y, { immediate: true, force: true })
    window.scrollTo(0, y)
    ScrollTrigger.update()
  } else {
    window.scrollTo(0, 0)
  }
  // 언마운트 시점에는 새 페이지로 DOM이 바뀌며 scrollY가 줄어들 수 있어, 스크롤할 때마다 마지막 위치를 따로 기억한다
  let lastY = window.scrollY, lastKey = opts.historyKey
  // 랜딩 안에서 #faq 링크 등으로 history 항목이 바뀌면(React Router가 history.state.key를 새로 만듦) 그 항목의 키로 저장한다
  listen('scroll', () => { lastY = window.scrollY; lastKey = (history.state && history.state.key) || opts.historyKey }, { passive: true })
  const saveScroll = () => writeSavedScroll(lastKey, lastY)
  listen('pagehide', saveScroll)
  cleanups.push(saveScroll)

  /* ===== 다시 빌드: 글꼴 로드·창 크기·(L-3) 지도 로드 ===== */
  const rebuild = () => ctx.add(() => { build(); ScrollTrigger.refresh(); onTL() })
  // 폰트 <link>는 마운트 때 막 붙었을 수 있어서(원본은 <head>에 있어 렌더 전에 로드됨) 스타일시트 로드를 먼저 기다린다.
  // 안 그러면 fonts.load()가 아직 모르는 글꼴이라 바로 끝나 버리고, 글리프 확인(FONT_OK)이 틀어진다.
  const linkReady = (id: string) => new Promise<void>((resolve) => {
    const el = document.getElementById(id) as HTMLLinkElement | null
    if (!el || el.sheet) return resolve()
    const done = () => { el.removeEventListener('load', done); el.removeEventListener('error', done); resolve() }
    el.addEventListener('load', done); el.addEventListener('error', done)
    cleanups.push(() => { el.removeEventListener('load', done); el.removeEventListener('error', done) })
  })
  const fontsReady = Promise.all(['landing-font-pretendard', 'landing-font-css'].map(linkReady))
    .then(() => Promise.all([document.fonts.load('500 16px Pretendard'), document.fonts.load('600 16px "Noto Sans"', SYM1), document.fonts.load('500 16px "Roboto Condensed"')]))
    .then(() => { [...SYM1].forEach((c) => { map.FONT_OK[c] = document.fonts.check('600 16px "Noto Sans"', c) }); const bad = [...SYM1].filter((c) => !map.FONT_OK[c]); if (bad.length) console.warn('Noto Sans missing:', bad.join(' ')) })
  const loadMap = () => (dead ? Promise.resolve() : map.loadMap(ac.signal))
  fontsReady.then(loadMap).then(() => { if (!dead && Mp.ready) rebuild() }).catch((e) => { if (e?.name !== 'AbortError') console.warn('map', e) })
  document.fonts.ready.then(() => { if (!dead && tl) rebuild() })
  let rT: ReturnType<typeof setTimeout> | undefined
  listen('resize', () => {
    clearTimeout(rT)
    rT = setTimeout(() => { timers.delete(rT!); if (!dead) { ctx.add(() => { build(); ScrollTrigger.refresh() }) } }, 200)
    timers.add(rT)
  })

  /* ===== live numbers ===== */
  const kick = () => ctx.add(() => { gsap.to({}, { duration: 0.7, onUpdate: () => { if (tl) renderLate(tl.time()); if (tl2) render11(tl2.time()) } }) })
  on(amt, 'input', kick)
  $$('#rates7 button').forEach((b) => on(b, 'click', () => {
    my.w = +b.dataset.w!; $$('#rates7 button').forEach((x) => x.classList.toggle('on', x === b)); refreshNums(); kick()
  }))
  cleanups.push(() => gsap.killTweensOf(disp))

  /* ===== 개발 모드에서만 비교용 훅 ===== */
  let hook: object | undefined
  if (import.meta.env.DEV) {
    hook = {
      get tl() { return tl },
      get st() { return st },
      get tl2() { return tl2 },
      get st2() { return st2 },
      get GEO() { return GEO },
      Mp, V, C, A, P, map, my, disp, K, LG,
      get passFx() { return passFx },
      get nudges() { return nudges },
      NODES, FLY,
      lenis, gsap, ScrollTrigger,
    }
    ;(window as unknown as { __landing?: object }).__landing = hook
  }

  return () => {
    dead = true
    timers.forEach(clearTimeout)
    timers.clear()
    cleanups.reverse().forEach((fn) => fn())
    ctx.revert()
    st?.kill(); st2?.kill(); tl?.kill(); tl2?.kill()
    st = st2 = tl = tl2 = undefined
    if (import.meta.env.DEV) {
      const w = window as unknown as { __landing?: object }
      if (w.__landing === hook) delete w.__landing
    }
  }
}
