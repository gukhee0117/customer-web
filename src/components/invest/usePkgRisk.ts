import { useCallback, useEffect, useState } from 'react'
import { checkPackage } from '../../api/stockPackage'
import type { CheckRequestItem, Tendency } from '../../api/stockPackage'
import type { PkgRisk } from './InvestPkgDetail'
import type { PkgView } from './investPkgLogic'

const NOTE_OK = '(과거 3년 데이터 기준, 예측 아님)'
const NOTE_FAIL = '(지금은 계산하지 못했어요)'

// 선택한 패키지의 위험 요약(서버 값). 변동성은 목표 비중으로 서버가 계산하고, 못 구하면 '-'로 둔다.
// 패키지를 바꾸거나 다시 검사를 누르면 서버에서 다시 받아 온다.
export function usePkgRisk(pkg: PkgView | undefined, survey: Tendency['survey'] | undefined): PkgRisk & { recheck: () => void } {
  const [nonce, setNonce] = useState(0)
  const [res, setRes] = useState<{ run: string; vol: string; note: string }>({ run: '', vol: '-', note: '' })
  const recheck = useCallback(() => setNonce((n) => n + 1), [])

  // 목표 비중이 있는 종목만 서버에 보낸다(비중 합은 서버가 100으로 맞춰 둔다)
  const weights: CheckRequestItem[] = pkg ? pkg.items.filter((i) => i.target > 0 && i.pid > 0).map((i) => ({ domesticProductId: i.pid, weight: i.target })) : []
  const weightsKey = JSON.stringify(weights)
  const run = pkg ? pkg.id + '#' + nonce + '#' + weightsKey : ''

  useEffect(() => {
    if (!run) return
    let alive = true
    const items = JSON.parse(weightsKey) as CheckRequestItem[]
    const done = (vol: string, note: string) => {
      if (alive) setRes({ run, vol, note })
    }
    if (!items.length) {
      done('-', '')
      return
    }
    checkPackage(items).then(
      (r) => (r.volatilityPercent != null ? done(r.volatilityPercent.toFixed(1) + '%', NOTE_OK) : done('-', NOTE_FAIL)),
      () => done('-', NOTE_FAIL)
    )
    return () => {
      alive = false
    }
  }, [run, weightsKey])

  const checking = run !== '' && res.run !== run
  const allowed = survey?.available && survey.allowedMinGrade != null ? survey.allowedMinGrade : null
  return {
    profRange: allowed != null ? (survey?.label ?? '') + ', ' + allowed + '등급까지' : '-',
    vol: checking ? '-' : res.vol,
    volNote: checking ? '(검사 중)' : res.note,
    checking,
    recheck
  }
}
