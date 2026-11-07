// 시연 설정 위젯의 항목과 선택지(원본 home.dc.html 그대로). 날짜 바꿔 보기는 넣지 않음 — 업무일은 getBusinessToday() 하나
import type { DemoSettings } from '../../data/returns'

export const DEV_TRADE: [boolean, string][] = [[false, '끔'], [true, '켬']]
export const DEV_ACCT: [DemoSettings['account'], string][] = [['opened', '개설'], ['none', '계좌 없음'], ['reviewing', '심사 중'], ['rejected', '반려']]
export const DEV_BENEFIT: DemoSettings['benefit'][] = ['POSSIBLE', 'REDUCED', 'IMPOSSIBLE']
export const DEV_ASSESS: [string, string][] = [['ok', '유효'], ['risky', '거래 위험'], ['soon', '만료 임박'], ['expired', '만료'], ['none', '미진단']]
