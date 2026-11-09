import { LandingRuler } from './LandingLists'
import type { LandingTexts } from './landingTexts'

export function LandingS7({ t }: { t: LandingTexts }) {
  return (
    <section className="sc" id="s7" data-screen-label="S7 Deduction">
      <div id="col7">
        <div id="tt7">
          <div className="h2">
            <span className="ml">
              <span>일찍 매도할수록</span>
            </span>
            <span className="ml">
              <span>공제율이 높아요</span>
            </span>
          </div>
        </div>
        <div id="big7">
          <b data-l="rate">
            {t.l.rate}
          </b>
        </div>
      </div>
      <div id="rul7">
        <div id="rul7in">
          <i id="today7" style={{ left: t.ruler.today + '%' }}>
            <span>오늘</span>
          </i>
          <LandingRuler t={t} />
        </div>
      </div>
      <div id="rc7">
        <div className="rates" id="rates7">
          <small>공제율</small>
          <button data-w="1" className="on">100%</button>
          <button data-w="0.8">80%</button>
          <button data-w="0.5">50%</button>
        </div>
        <div id="paper">
          <div className="phd">
            <img src="/assets/wordmark.png" alt="Returns." />
            <span>세액 계산서 · 예시</span>
          </div>
          <div className="pr i7">
            <span>매도 금액</span>
            <b data-l="A">
              {t.l.A}
            </b>
          </div>
          <div className="pr i7">
            <span>양도차익</span>
            <b data-l="G">
              {t.l.G}
            </b>
          </div>
          <div className="pr i7">
            <span>기본공제</span>
            <b data-l="basic">
              {t.l.basic}
            </b>
          </div>
          <div className="pr i7">
            <span data-l="dedLab">
              {t.l.dedLab}
            </span>
            <b data-l="ded">
              {t.l.ded}
            </b>
          </div>
          <div className="pr i7">
            <span>과세표준</span>
            <b data-l="base">
              {t.l.base}
            </b>
          </div>
          <div className="pr i7">
            <span>세율</span>
            <b>22%</b>
          </div>
          <div className="pr gen i7">
            <span>일반 계좌 세액</span>
            <b>
              <span data-l="gen">
                {t.l.gen}
              </span>
              <i id="strike" />
            </b>
          </div>
          <div className="pr ria i7">
            <span>RIA 세액</span>
            <b data-l="ria">
              {t.l.ria}
            </b>
          </div>
          <div className="pr sv i7">
            <span>절세액</span>
            <b id="save7" />
          </div>
        </div>
      </div>
    </section>
  )
}
