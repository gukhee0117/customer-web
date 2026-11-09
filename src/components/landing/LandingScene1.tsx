import type { CSSProperties } from 'react'
import type { LandingTexts } from './landingTexts'

export function LandingScene1({ t }: { t: LandingTexts }) {
  return (
    <div id="s1">
      <div id="s1w">
        <div className="tt" id="c1">
          <div className="h">
            <span className="ml">
              <span>RIA 계좌 개설, 매도 한도부터 정해요</span>
            </span>
          </div>
          <div className="p" id="c1p">
            증권사별 1개 계좌를 만들 수 있고,<br />매도 한도는 전 증권사를 합쳐 5,000만 원까지예요.
          </div>
        </div>
        <div id="card1">
          <div id="seal">
            개설 완료
            <small>RIA · OPEN</small>
          </div>
          <div className="tk">
            <div className="tk-h">
              <img src="/assets/wordmark.png" alt="Returns." />
              <span>RIA ACCOUNT · CONFIRMATION</span>
            </div>
            <div id="thumb" />
            <div className="perf" />
            <div className="tk-b">
              <div>
                <h3>RIA 계좌 개설 확인서</h3>
                <div className="kv">
                  <i className="gln" />
                  <small>계좌 유형</small>
                  <b>RIA</b>
                </div>
                <div className="kv">
                  <i className="gln" />
                  <small>개설 증권사</small>
                  <b>Returns</b>
                </div>
                <div className="kv">
                  <i className="gln" />
                  <small>기준일</small>
                  <b>2025.12.23</b>
                </div>
              </div>
              <div className="lim">
                <i className="gln" />
                <small>매도 한도</small>
                <div className="big num" id="limBig">₩30,000,000</div>
                <input id="amt" type="range" min="0" max="55000000" step="1000000" defaultValue="30000000" aria-label="매도 예정 금액" style={{ '--p': '54.54545454545454%' } as CSSProperties} />
                <div className="rates" id="rates">
                  <small>수익률</small>
                  <button data-r="0.1">10%</button>
                  <button data-r="0.3">30%</button>
                  <button data-r="0.5" className="on">50%</button>
                  <button data-r="1">100%</button>
                </div>
                <div className="rem">
                  <small>남은 매도 한도</small>
                  <b className="num" data-n="remain">
                    {t.n.remain}
                  </b>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
