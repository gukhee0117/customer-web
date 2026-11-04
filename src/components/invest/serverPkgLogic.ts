import type { HoldingItem, OrderResult, PackageDetail, PackageHolding, PackageSummary } from '../../api/stockPackage'
import type { OrderView } from './investHoldingData'
import { weightedGrade } from './investPkgLogic'
import type { PkgItemView, PkgView } from './investPkgLogic'

// 서버 응답(패키지 목록·상세·보유·주문)을 이 화면이 쓰는 모양으로 바꾸는 순수 함수들

const dotDate = (iso: string): string => iso.slice(0, 10).replace(/-/g, '.') // 'YYYY-MM-DD…' → 'YYYY.MM.DD'
const dayOnly = (iso: string | null): string | null => (iso ? iso.slice(0, 10) : null)

function itemOf(h: HoldingItem, detail: PackageDetail | undefined): PkgItemView {
  const d = detail?.items.find((x) => x.domesticProductId === h.domesticProductId)
  const priced = h.price != null && h.evalAmount != null
  const chg = h.changePercent ?? 0
  return {
    pid: h.domesticProductId,
    code: h.ticker,
    name: h.name,
    qty: h.qty,
    avg: h.avgPrice,
    price: h.price,
    chg,
    val: priced ? (h.evalAmount as number) : 0,
    cost: h.cost,
    // 오늘 손익 = (현재가 − 전일 종가) × 보유 주 수
    today: priced && h.previousClose != null ? Math.round((h.price as number) - h.previousClose) * h.qty : 0,
    target: d ? d.weight : 0,
    grade: d ? d.riskGrade : null,
    out: d ? d.outOfProfile : null,
    ack: dayOnly(d ? d.unsuitableConfirmedAt : null),
    priced,
    taxable: h.securityTaxable
  }
}

// summaries는 서버가 준 순서(최근 만든 순)를 그대로 쓴다. created가 클수록 최근
export function viewsFromServer(summaries: PackageSummary[], details: PackageDetail[], holdings: PackageHolding[]): PkgView[] {
  return summaries.map((s, i) => {
    const detail = details.find((d) => d.stockPackageId === s.stockPackageId)
    const hold = holdings.find((h) => h.stockPackageId === s.stockPackageId)
    const items = (hold ? hold.items : []).map((h) => itemOf(h, detail))
    const val = items.reduce((a, it) => a + it.val, 0)
    const cost = items.reduce((a, it) => a + it.cost, 0)
    // 현재가를 못 받은 보유 종목은 평가액이 0이라 원금까지 빼야 손익이 전액 손실로 잘못 나오지 않는다
    const evalCost = items.filter((it) => it.qty === 0 || it.priced).reduce((a, it) => a + it.cost, 0)
    const today = items.reduce((a, it) => a + it.today, 0)
    return {
      id: String(s.stockPackageId),
      made: dotDate(s.createdAt),
      name: s.name,
      total: s.totalAmount,
      seed: s.stockPackageId,
      created: summaries.length - i,
      items,
      val,
      cost,
      evalCost,
      pnl: val - evalCost,
      ret: evalCost ? ((val - evalCost) / evalCost) * 100 : 0,
      today,
      todayPct: val - today ? (today / (val - today)) * 100 : 0,
      grade: weightedGrade(items),
      unpriced: items.filter((it) => it.qty > 0 && !it.priced).length
    }
  })
}

const pad = (n: number): string => String(n).padStart(2, '0')

// 'YYYY-MM-DDTHH:mm:ss' → 'MM.DD HH:mm'
const shortTime = (iso: string): string => iso.slice(5, 7) + '.' + iso.slice(8, 10) + ' ' + pad(Number(iso.slice(11, 13))) + ':' + iso.slice(14, 16)

export function ordersFromServer(list: OrderResult[]): OrderView[] {
  return list.map((o) => ({
    id: String(o.orderId),
    pkg: String(o.stockPackageId),
    time: shortTime(o.processedAt),
    code: o.ticker,
    name: o.name,
    side: o.side === 'BUY' ? 'buy' : 'sell',
    qty: o.qty,
    price: o.price ?? 0,
    status: o.status === 'EXECUTED' ? 'done' : 'reject',
    reason: o.rejectMessage
  }))
}
