import { Link } from 'react-router-dom'
import { Icon } from './LandingIcon'
import type { LandingTexts } from './landingTexts'

export function LandingClosing({ t, loggedIn }: { t: LandingTexts, loggedIn: boolean }) {
  return (
    <div id="pinB">
      <section id="s11" data-screen-label="S11 Closing">
        <div id="ph11">
          <img src="/assets/photo-closing.jpg" alt="남산 N서울타워" />
          <i />
        </div>
        <div id="w11">
          <span className="ml">
            <span>MORE</span>
          </span>
          <span className="ml">
            <span>VALUE</span>
          </span>
          <span className="ml">
            <span>TOMORROW</span>
          </span>
        </div>
        <div id="sum11">
          <i id="sum11bg" />
          <div id="sum11c">
            <div className="s11h">
              <b>나의 RIA</b>
              <span className="ex">예시</span>
            </div>
            <div className="s11st">
              <i>1</i>
              <i>2</i>
              <i>3</i>
              <i>4</i>
              <i>5</i>
            </div>
            <div>
              <div className="s11r">
                <span>매도 예정</span>
                <b data-l="Aman">
                  {t.l.Aman}
                </b>
              </div>
              <div className="s11r">
                <span>예상 절세 (이번 구간)</span>
                <b data-l="saveMan">
                  {t.l.saveMan}
                </b>
              </div>
              <div className="s11r">
                <span>인출 가능일</span>
                <b data-l="wd">
                  {t.l.wd}
                </b>
              </div>
            </div>
            <Link id="cta11" to={loggedIn ? '/home' : '/login#signup'}>
              {loggedIn ? '홈으로 가기' : '이 금액으로 RIA 계좌 개설하기'}
              <Icon name="arrow-right" />
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
