import { Icon } from './LandingIcon'
import type { LandingTexts } from './landingTexts'

export function LandingS9({ t }: { t: LandingTexts }) {
  return (
    <section className="sc" id="s9" data-screen-label="S9 Services">
      <div className="ttl" id="tt9">
        <div className="h2">
          <span className="ml">
            <span>RIA의 모든 단계를</span>
          </span>
          <span className="ml">
            <span>리턴증권이 함께해요</span>
          </span>
        </div>
      </div>
      <ol id="list9">
        <li className="l9">
          <small>01</small>
          끼루 뉴스 브리핑
        </li>
        <li className="l9">
          <small>02</small>
          오늘의 종목 · 성향별 주식·ETF
        </li>
        <li className="l9">
          <small>03</small>
          주식 패키지 만들기 도우미
        </li>
        <li className="l9">
          <small>04</small>
          매도 가이드
        </li>
        <li className="l9">
          <small>05</small>
          커뮤니티와 끼루 답변
        </li>
        <li className="l9">
          <small>06</small>
          끼루 AI 챗봇
        </li>
        <li className="l9">
          <small>07</small>
          놓치지 않는 알림
        </li>
      </ol>
      <div id="app9">
        <div className="a9bar">
          <img src="/assets/wordmark.png" alt="Returns." />
          <span>
            <Icon name="search" />
            <Icon name="bell" />
          </span>
        </div>
        <div className="a9tab">
          <span>홈</span>
          <span>내 계좌</span>
          <span>주식 패키지</span>
          <span>커뮤니티</span>
          <span className="ex">예시</span>
        </div>
        <div className="a9body">
          <div className="a9p">
            <h4>뉴스 브리핑</h4>
            <div className="a9c">
              <small>내 보유 종목 뉴스</small>
              <b>해외주식 A, 분기 인도량 예상 웃돌아</b>
              <p>끼루 요약 3줄 · 원문 보기</p>
            </div>
            <div className="ba">
              분기 인도량이 시장 예상보다 많았어요. 에너지 저장 부문도 늘었어요.
              <small>기사 내용 기준</small>
            </div>
            <p className="a9s">보유·관심 종목 기사만 골라 끼루가 요약해요</p>
          </div>
          <div className="a9p">
            <h4>오늘의 종목</h4>
            <div className="a9kv">
              <span>투자성향</span>
              <b>적극투자형 · 2~6등급</b>
            </div>
            <div className="a9e">
              <b>국내 주식 A</b>
              <small>위험 2등급 · 20일 +4.2% · 많이 산 업종</small>
            </div>
            <div className="a9e">
              <b>국내 ETF B</b>
              <small>위험 3등급 · 20일 -1.8% · 많이 산 테마</small>
            </div>
            <p className="a9s">설문·거래 경향 기준, 보유 종목은 빼고 투자성향 범위 안에서 골라요</p>
            <span className="a9btn">패키지에 담기</span>
          </div>
          <div className="a9p">
            <h4>나만의 주식 패키지</h4>
            <div className="bq">배당 위주로 500만 원</div>
            <div className="ba">
              성향에 맞는 종목 3개로 구성했어요.
              <small>주 수·금액은 시스템이 계산해요</small>
            </div>
            <div className="a9r">
              <span>국내 ETF B</span>
              <b>40%</b>
            </div>
            <div className="a9r">
              <span>국내 주식 C</span>
              <b>30%</b>
            </div>
            <div className="a9r">
              <span>국내 주식 D</span>
              <b>30%</b>
            </div>
            <span className="a9btn">한 번에 사기</span>
          </div>
          <div className="a9p">
            <h4>매도 가이드</h4>
            <div className="a9kv">
              <span>남은 한도</span>
              <b data-l="remainMan">
                {t.l.remainMan}
              </b>
            </div>
            <div className="a9kv">
              <span>이번 구간 마감</span>
              <b data-l="dday">
                {t.l.dday}
              </b>
            </div>
            <p className="a9s">남은 한도 안에서 공제가 가장 커지는 조합</p>
            <div className="a9r">
              <span>해외주식 A · 차익률 52%</span>
              <b data-l="R1">
                {t.l.R1}
              </b>
            </div>
            <div className="a9r">
              <span>해외주식 B · 31%</span>
              <b data-l="R2">
                {t.l.R2}
              </b>
            </div>
            <div className="a9r">
              <span>해외주식 C · 28% · 한도까지만</span>
              <b data-l="R3">
                {t.l.R3}
              </b>
            </div>
            <div className="bq">C는 남기고 싶어</div>
            <div className="ba">조건에 맞춰 다시 계산했어요.</div>
          </div>
          <div className="a9p">
            <h4>커뮤니티</h4>
            <div className="bm">
              <b>투자자 1</b>
              국내 주식 A 공시 내용 정리된 거 있나요?
              <small style={{ display: 'block', marginTop: '4px', fontSize: '12px', color: 'var(--color-navy)' }}>✓ 끼루에게 물어보기</small>
            </div>
            <div className="bm">
              <b>투자자 2</b>
              저도 궁금해요
            </div>
            <div className="ba">
              <b>끼루 AI</b>
              <span data-l="disc">
                {t.l.disc}
              </span>
              {' '}
              공시 기준으로 생산 능력을 늘린다는 계획이 확인돼요.
              <small>근거 · 전자공시 · 기사 원문</small>
            </div>
            <p className="a9s">고객끼리 나누는 종목 토론방이에요. 물어본 글에만 끼루가 근거와 함께 답해요</p>
          </div>
          <div className="a9p">
            <h4>끼루 AI 챗봇</h4>
            <div className="bq">언제부터 인출할 수 있어요?</div>
            <div className="ba">
              원화 환전이 확정된 날부터 1년이 지나면 인출할 수 있어요. 지금 기준으로는
              {' '}
              <strong data-l="wd">
                {t.l.wd}
              </strong>
              부터예요.
              <small>근거 · RIA 상품 가이드라인</small>
            </div>
            <p className="a9s">보고 있는 화면에 맞는 질문을 먼저 제안해요</p>
          </div>
          <div className="a9p lock">
            <div className="lk">
              <b id="lkT">
                {t.lkT}
              </b>
              <small>잠금 화면</small>
            </div>
            <div className="nt">
              <img src="/assets/wordmark.png" alt="" />
              <div>
                <b>매도 대금이 원화로 확정됐어요</b>
                <p>
                  <span data-l="A">
                    {t.l.A}
                  </span>
                  {' '}
                  · 정산 완료 · 1년 유지 시작
                </p>
              </div>
            </div>
            <p style={{ fontSize: '12px', opacity: '.75', textAlign: 'center' }}>앱 푸시 · 문자 · 이메일 중 고르면 돼요</p>
          </div>
        </div>
      </div>
      <img id="kiroo" src="/assets/char-front.png" alt="끼루" />
      <div id="bub9">궁금한 건 끼루에게 물어보세요</div>
      <p id="disc9">투자 판단은 고객님께 있으며, 끼루 AI는 정보를 안내합니다.</p>
    </section>
  )
}
