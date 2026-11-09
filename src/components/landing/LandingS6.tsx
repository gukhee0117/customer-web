export function LandingS6() {
  return (
    <section className="sc" id="s6" data-screen-label="S6 Check">
      <div className="ph6" id="ph6a">
        <img src="/assets/photo-security.jpg" alt="공항 보안 검색대" />
        <i />
      </div>
      <div className="ph6" id="ph6b">
        <img src="/assets/photo-security.jpg" alt="" />
        <i />
      </div>
      <div className="beam" id="beam6" />
      <div className="ttl" id="tt6">
        <div className="h" style={{ fontSize: 'clamp(40px,4.8vw,68px)' }}>
          <span className="ml">
            <span>다른 계좌의 해외주식 순매수도</span>
          </span>
          <span className="ml">
            <span>함께 확인해요</span>
          </span>
        </div>
        <p className="p2" id="p6">
          2026년 1월부터 12월까지, RIA가 아닌 계좌에서 해외주식을 순매수하면 그 금액에 비례해 공제가 줄어요.
        </p>
      </div>
      <div id="list6">
        <div className="r6">
          <span>Returns RIA 계좌</span>
          <em className="ok">대상 계좌</em>
        </div>
        <div className="r6">
          <span>일반 계좌 1</span>
          <em className="ok">순매수 없음 ✓</em>
        </div>
        <div className="r6">
          <span>일반 계좌 2</span>
          <em className="wr">
            <i />
            순매수 있음
            <span className="ex">예시</span>
          </em>
        </div>
        <div className="r6">
          <span>연금 계좌</span>
          <em className="ok">순매수 없음 ✓</em>
        </div>
      </div>
      <div id="big6">
        <b id="pct6">82%</b>
        <div className="ln">
          공제 인정 비율
          <span className="ex">예시</span>
        </div>

      </div>
    </section>
  )
}
