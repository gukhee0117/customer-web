import type { Answer, Article, Briefing } from '../../api/news'

export interface SummaryEntry { answer: Answer; expiresAt: number }
export interface SummaryCachePort {
  get(key: string): SummaryEntry | undefined
  set(key: string, entry: SummaryEntry): unknown
  delete(key: string): unknown
}
export function summaryScope(data: Briefing): string {
  return JSON.stringify([data.customerId, data.investorType, data.personalizationStatus,
    data.selectionRuleVersion, data.contextVersion ?? 'legacy', data.summaryVersion ?? 'legacy'])
}
export const summaryArticleKey = (a: Article) => JSON.stringify([a.id, a.version])

/** Tab-memory only. Completed summaries survive route changes, never authentication changes. */
export class NewsSummaryStore {
  private entries = new Map<string, SummaryEntry>()
  private scope = ''
  private generation = 0
  private listeners = new Set<() => void>()
  onReset(listener: () => void) { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  clear() {
    this.generation++; this.entries.clear(); this.scope = ''
    for (const listener of [...this.listeners]) listener()
  }
  bind(scope: string, now: () => number = Date.now): SummaryCachePort {
    if (scope !== this.scope) {
      // Scope transitions invalidate handles held by older requests, even if abort is ignored.
      this.generation++; this.entries.clear(); this.scope = scope
    }
    const generation = this.generation
    const valid = () => generation === this.generation && this.scope === scope
    return {
      get: key => {
        if (!valid()) return undefined
        const entry = this.entries.get(key)
        if (entry && entry.expiresAt <= now()) { this.entries.delete(key); return undefined }
        return entry
      },
      set: (key, entry) => {
        if (!valid()) return
        for (const [id, value] of this.entries) if (value.expiresAt <= now()) this.entries.delete(id)
        this.entries.delete(key)
        while (this.entries.size >= 64) this.entries.delete(this.entries.keys().next().value!)
        this.entries.set(key, entry)
      },
      delete: key => { if (valid()) this.entries.delete(key) },
    }
  }
}
export const newsSummaryStore = new NewsSummaryStore()
