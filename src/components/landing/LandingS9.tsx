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
          매도 가이드
        </li>
        <li className="l9">
          <small>02</small>
          놓치지 않는 알림
        </li>
        <li className="l9">
          <small>03</small>
          오늘의 종목 · 성향별 주식·ETF
        </li>
        <li className="l9">
          <small>04</small>
          주식 패키지 만들기 도우미
        </li>
        <li className="l9">
          <small>05</small>
          끼루 뉴스 브리핑
        </li>
        <li className="l9">
          <small>06</small>
          끼루 AI 챗봇
        </li>
        <li className="l9">
          <small>07</small>
          커뮤니티와 끼루 답변
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
            <span className="a9btn">이 안으로 채우기</span>
          </div>
          <div className="a9p lock">
            <div className="lk">
              <b id="lkT">
                {t.lkT}
              </b>
              <small>잠금 화면</small>
            </div>
            <div className="nt">
              <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
              <div>
                <b>정산 완료 안내 메일을 보냈어요</b>
                <p>받은편지함을 확인해보세요</p>
              </div>
            </div>
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
            <div className="a9e">
              <b>국내 주식 C</b>
              <small>위험 2등급 · 20일 +2.7% · 많이 산 업종</small>
            </div>
            <span className="a9btn">패키지에 담기</span>
          </div>
          <div className="a9p">
            <h4>나만의 주식 패키지</h4>
            <div className="bq">배당 ETF, 위험 2등급까지만</div>
            <div className="ba">
              조건 2개로 바꿨어요. 종목은 직접 골라요.
            </div>
            <div className="a9r">
              <span>국내 ETF B</span>
              <b>50%</b>
            </div>
            <div className="a9r">
              <span>국내 ETF C</span>
              <b>50%</b>
            </div>
            <div className="a9r">
              <span style={{ color: 'var(--navy)', fontWeight: 600 }}>비중 합계 100%</span>
              <b style={{ color: 'var(--navy)' }}>✓</b>
            </div>
            <span className="a9btn">검사하고 한 번에 사기</span>
          </div>
          <div className="a9p">
            <h4>뉴스 브리핑</h4>
            <div className="a9c">
              <small>내 보유 종목 뉴스</small>
              <b>3분기 영업이익,<br />시장 예상 웃돌아</b>
              <p>끼루 요약 3줄 · 원문 보기</p>
            </div>
            <div className="ba">
              주력 사업 매출이 예상보다 빠르게 회복됐어요. 비용 절감 효과도 함께 반영됐어요.
              <small>기사 내용 기준</small>
            </div>
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
            <div className="bq">다른 증권사 계좌에서 해외주식을 사면 어떻게 돼요?</div>
            <div className="ba">
              RIA가 아닌 계좌에서 해외주식을 순매수하면, 그 금액만큼 세제혜택이 비례해서 줄어요.
              <small>근거 · RIA 상품 가이드라인</small>
            </div>
          </div>
          <div className="a9p">
            <h4>커뮤니티</h4>
            {/* 투자자 1 포스트 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <img src="/assets/kkiru-avatar-active.png" alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '3px' }}>
                  <b style={{ fontSize: '13px' }}>투자자 1</b>
                  <small style={{ color: 'var(--color-sub)', fontSize: '12px' }}>적극투자형 · 14:22</small>
                </div>
                <p style={{ fontSize: '13px', margin: '0 0 6px' }}><span style={{ color: 'var(--color-navy)', fontWeight: 600 }}>@끼루</span> 국내 주식 A 공시 내용 정리된 거 있나요?</p>
                <div style={{ fontSize: '12px', color: 'var(--color-sub)', display: 'flex', gap: '10px', marginBottom: '4px' }}>
                  <span>좋아요 3</span><span>답글 2 ∨</span><span>공유</span>
                </div>
                <div style={{ fontSize: '12px', color: 'var(--color-navy)' }}>끼루가 답했어요 · 답글에서 보기</div>
              </div>
            </div>
            {/* 답글 영역 */}
            <div style={{ marginLeft: '20px', paddingLeft: '12px', borderLeft: '2px solid var(--color-line)', marginBottom: '14px', display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', gap: '8px' }}>
                <img src="/assets/kkiru-avatar-neutral.png" alt="" style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0 }} />
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '2px' }}>
                    <b style={{ fontSize: '13px' }}>투자자 2</b>
                    <small style={{ color: 'var(--color-sub)', fontSize: '12px' }}>위험중립형 · 14:25</small>
                  </div>
                  <p style={{ fontSize: '13px', margin: '0 0 4px' }}>저도 궁금해요</p>
                  <div style={{ fontSize: '12px', color: 'var(--color-sub)', display: 'flex', gap: '10px' }}>
                    <span>좋아요 1</span><span>답글</span>
                  </div>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <img src="/assets/kkiru-ai-face.png" alt="끼루" style={{ width: '24px', height: '24px', borderRadius: '50%', flexShrink: 0 }} />
                <div>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '2px' }}>
                    <b style={{ fontSize: '13px' }}>끼루 AI</b>
                    <small style={{ color: 'var(--color-sub)', fontSize: '12px' }}>14:28</small>
                  </div>
                  <p style={{ fontSize: '13px', margin: '0 0 4px' }}>
                    <span data-l="disc">{t.l.disc}</span>{' '}공시 기준으로 생산 능력을 늘린다는 계획이 확인돼요.
                  </p>
                  <div style={{ fontSize: '12px', color: 'var(--color-sub)' }}>
                    <b style={{ fontWeight: 600 }}>근거</b> · 전자공시 · 기사 원문
                  </div>
                </div>
              </div>
            </div>
            {/* 투자자 3 포스트 */}
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
              <img src="/assets/kkiru-avatar-stable-seek.png" alt="" style={{ width: '28px', height: '28px', borderRadius: '50%', flexShrink: 0 }} />
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', gap: '6px', alignItems: 'baseline', marginBottom: '3px' }}>
                  <b style={{ fontSize: '13px' }}>투자자 3</b>
                  <small style={{ color: 'var(--color-sub)', fontSize: '12px' }}>안정추구형 · 15:04</small>
                </div>
                <p style={{ fontSize: '13px', margin: '0 0 6px' }}>국내 주식 B 배당 수익률이 올해 많이 올랐나요?</p>
                <div style={{ fontSize: '12px', color: 'var(--color-sub)', display: 'flex', gap: '10px' }}>
                  <span>좋아요 2</span><span>답글</span><span>공유</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <img id="kiroo" src="/assets/char-front.png" alt="끼루" />
      <div id="bub9">궁금한 건 끼루에게 물어보세요</div>
      <p id="disc9">투자 판단은 고객님께 있으며, 끼루 AI는 정보를 안내합니다.</p>
    </section>
  )
}
