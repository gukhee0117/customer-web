/** Cancellation is best effort. Identity and generation checks remain mandatory. */
export class NewsRequestGate {
  private sequence = 0
  private controller: AbortController | null = null
  private scope = ''
  cancel() {
    this.sequence += 1
    this.controller?.abort()
    this.controller = null
    this.scope = ''
  }
  start(scope: string) {
    this.cancel()
    this.scope = scope
    const id = this.sequence
    const controller = new AbortController()
    this.controller = controller
    return { signal: controller.signal, current: () => !controller.signal.aborted && this.sequence === id && this.scope === scope }
  }
}
