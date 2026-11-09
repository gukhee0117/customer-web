import { LandingRailTicks } from './LandingLists'
import type { LandingTexts } from './landingTexts'

export function LandingS5({ t }: { t: LandingTexts }) {
  return (
    <section className="sc" id="s5" data-screen-label="S5 Hold">
      <div className="ttl" id="tt5">
        <div className="h2">
          <span className="ml">
            <span>확정일부터 1년,</span>
          </span>
          <span className="ml">
            <span>유지하면 혜택이 지켜져요</span>
          </span>
        </div>
      </div>
      <div id="d5">
        <div id="d5s">
          확정일
          {' '}
          <span data-l="conf">
            {t.l.conf}
          </span>
        </div>
        <div id="big5w">
          <div id="big5" data-l="wd">
            {t.l.wd}
          </div>
          <svg id="seal5" viewBox="0 0 120 120" role="img" aria-label="HOLD 1 YEAR">
            <defs>
              <filter id="ink5" x="-5%" y="-5%" width="110%" height="110%">
                <feTurbulence type="fractalNoise" baseFrequency="1.1" numOctaves="2" seed="4" result="n" />
                <feColorMatrix in="n" type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 -3 2.15" result="m" />
                <feComposite in="SourceGraphic" in2="m" operator="in" />
              </filter>
              <path id="arc5" d="M60 60 m-44 0 a44 44 0 1 1 88 0 a44 44 0 1 1 -88 0" />
            </defs>
            <g filter="url(#ink5)" fill="none" stroke="var(--color-gold)">
              <circle cx="60" cy="60" r="56" strokeWidth="3" />
              <circle cx="60" cy="60" r="35" strokeWidth="1.2" />
              <text fill="var(--color-gold)" stroke="none" fontFamily="Pretendard" fontSize="9.5" fontWeight="700" letterSpacing="2.2">
                <textPath href="#arc5">RIA · RETURNS · HOLD · 1 YEAR ·</textPath>
              </text>
              <text x="60" y="60" textAnchor="middle" fill="var(--color-gold)" stroke="none" fontFamily="Pretendard" fontWeight="800" fontSize="17">HOLD</text>
              <text x="60" y="76" textAnchor="middle" fill="var(--color-gold)" stroke="none" fontFamily="Pretendard" fontWeight="700" fontSize="11" letterSpacing="1">1 YEAR</text>
            </g>
          </svg>
        </div>
        <div id="d5b">이 날부터 원금을 인출할 수 있어요</div>
      </div>
      <div id="rail5">
        <i id="rf5" />
        <i id="dot5">
          <span id="cnt5">보유 0일</span>
        </i>
        <LandingRailTicks />
      </div>
    </section>
  )
}
