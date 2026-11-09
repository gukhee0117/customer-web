export function LandingScene2() {
  return (
    <div id="s2c">
      <div id="card2" className="app">
        <div className="c2h">
          <div>
            <small>해외주식 A</small>
            <h3>입고 수량 확인</h3>
          </div>
          <span className="ex">예시</span>
        </div>
        <div className="c2r" data-r="0">
          <span>신청 수량</span>
          <b className="num">
            120
            <em>주</em>
          </b>
        </div>
        <div className="c2r" data-r="1">
          <span>2025.12.23 기준 보유</span>
          <b className="num">
            100
            <em>주</em>
          </b>
        </div>
        <div className="c2r" data-r="2">
          <span>현재 보유</span>
          <b className="num">
            110
            <em>주</em>
          </b>
        </div>
        <div className="c2res">
          <span>입고 수량</span>
          <b className="num">
            100
            <em>주</em>
          </b>
        </div>
      </div>
    </div>
  )
}
