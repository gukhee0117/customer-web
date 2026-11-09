import type { LandingTexts } from './landingTexts'

export function LandingS8({ t }: { t: LandingTexts }) {
  return (
    <section className="sc" id="s8" data-screen-label="S8 Invest">
      <div className="ttl" id="tt8">
        <div className="h" style={{ fontSize: 'clamp(40px,4.8vw,68px)' }}>
          <span className="ml">
            <span>돌아온 자금은</span>
          </span>
          <span className="ml">
            <span>국내에서 운용해요</span>
          </span>
        </div>
      </div>
      <div id="fl8">
        <svg id="svg8">
          <path id="pm8" pathLength="1" />
          <path className="ln8" pathLength="1" />
          <path className="ln8" pathLength="1" />
          <path className="ln8" pathLength="1" />
        </svg>
        <div className="nlab" id="flyW">
          <b>
            <span id="fly8">
              {t.fly8}
            </span>
          </b>
          <small>이번 구간 예상 절세액</small>
        </div>
      </div>
      <div id="big8">
        <b data-l="A8">₩30,000,000</b>
        <div className="l1">국내에서 운용 중</div>
      </div>
    </section>
  )
}
