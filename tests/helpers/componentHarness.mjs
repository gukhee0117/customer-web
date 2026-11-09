import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

export function nodes(value) {
  if (!value || typeof value !== 'object') return []
  if (Array.isArray(value)) return value.flatMap(nodes)
  return [value, ...nodes(value.props?.children)]
}

export function text(value) {
  if (typeof value === 'string' || typeof value === 'number') return String(value)
  if (Array.isArray(value)) return value.map(text).join('')
  return value?.props ? text(value.props.children) : ''
}

export function componentHarness(file, name, props, imports) {
  const slots = []; const timers = new Map()
  let cursor = 0; let effects = []; let dirty = false; let tree; let clock = Date.now(); let timerId = 0
  class TestDate extends Date {
    constructor(...args) { super(...(args.length ? args : [clock])) }
    static now() { return clock }
  }
  // Mock only hooks used by these components; add new hooks alongside the first caller.
  const react = {
    useState(initial) {
      const i = cursor++; slots[i] ??= { value: typeof initial === 'function' ? initial() : initial }
      return [slots[i].value, next => {
        const value = typeof next === 'function' ? next(slots[i].value) : next
        if (!Object.is(value, slots[i].value)) { slots[i].value = value; dirty = true }
      }]
    },
    useRef(initial) { const i = cursor++; return slots[i] ??= { current: initial } },
    useEffect(run, deps) {
      const i = cursor++; const previous = slots[i]
      if (!previous || deps.some((dep, index) => !Object.is(dep, previous.deps[index]))) {
        slots[i] = { deps }
        effects.push(() => { previous?.cleanup?.(); slots[i].cleanup = run() })
      }
    },
  }
  const jsx = { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
  const source = readFileSync(new URL('../../src/' + file, import.meta.url), 'utf8')
  const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
  const module = { exports: {} }
  vm.runInNewContext(compiled, {
    module, exports: module.exports, Date: TestDate,
    setInterval: callback => { timers.set(++timerId, callback); return timerId },
    clearInterval: id => timers.delete(id),
    require(path) {
      if (path === 'react') return react
      if (path === 'react/jsx-runtime') return jsx
      if (path.endsWith('.css')) return {}
      return imports(path)
    },
  })
  function render() {
    for (let i = 0; i < 20; i++) {
      cursor = 0; dirty = false; tree = module.exports[name](props)
      const pending = effects; effects = []; pending.forEach(run => run())
      if (!dirty) return
    }
    throw new Error('Render did not settle')
  }
  function button(label) {
    const result = nodes(tree).find(n => n.type === 'button' && text(n).trim() === label)
    assert.ok(result, label); return result
  }
  async function flush() { await new Promise(resolve => setImmediate(resolve)); render() }
  render()
  return {
    render, flush, button, nodes: () => nodes(tree), text, now: () => clock,
    timerCount: () => timers.size,
    advance(ms) { clock += ms; [...timers.values()].forEach(run => run()); render() },
    async click(label) { const control = button(label); assert.ok(!control.props.disabled, label + ' disabled'); await control.props.onClick(); await flush() },
    input(label, value) {
      const field = nodes(tree).find(n => n.props?.label === label || n.props?.['aria-label'] === label || n.props?.placeholder === label)
      assert.ok(field, label); field.props.onChange({ target: { value } }); render()
    },
    async submit() { nodes(tree).find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); await flush() },
  }
}
