import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const tick = () => new Promise(resolve => setImmediate(resolve))
function deferred() { let resolve, reject; const promise = new Promise((a,b) => { resolve=a; reject=b }); return { promise, resolve, reject } }
const item = (id, readAt = null) => ({ notificationId:id,title:'알림 '+id,content:'내용',readAt,createdAt:'2026-11-08T10:00:00' })

function harness(api) {
  const slots=[]; let cursor=0,dirty=false,effects=[],output,uid
  const streams=[]; const timers=new Set(); const focus=new Map(); const toasts=[]
  const onToast = message => toasts.push(message)
  const same = (a,b) => a && b && a.length===b.length && a.every((v,i)=>Object.is(v,b[i]))
  const react = {
    useRef(value) { const i=cursor++; slots[i] ??= {current:value}; return slots[i] },
    useState(value) { const i=cursor++; slots[i] ??= {value}; return [slots[i].value,next=>{ const v=typeof next==='function'?next(slots[i].value):next; if (!Object.is(v,slots[i].value)) { slots[i].value=v; dirty=true } }] },
    useEffect(fn,deps) { const i=cursor++,old=slots[i]; if (!old||!same(old.deps,deps)) effects.push(()=>{old?.cleanup?.(); slots[i]={deps,cleanup:fn()} }) },
    useCallback(fn,deps) { const i=cursor++; if (!slots[i]||!same(slots[i].deps,deps)) slots[i]={deps,value:fn}; return slots[i].value },
  }
  const source=readFileSync(new URL('../src/components/common/useCustomerNotifications.ts',import.meta.url),'utf8')
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText
  const module={exports:{}}
  vm.runInNewContext(code,{module,exports:module.exports,
    setInterval(fn) { timers.add(fn); return fn }, clearInterval(fn) { timers.delete(fn) },
    window:{ addEventListener:(name,fn)=>focus.set(name,fn),removeEventListener:name=>focus.delete(name) },
    require(name) {
      if (name==='react') return react
      if (name.endsWith('/api/notifications')) return { ...api,subscribeCustomerNotifications(changed,connected) { const stream={changed,connected,closed:false}; streams.push(stream); return ()=>{stream.closed=true} } }
      throw new Error(name)
    },
  })
  function render(...next) {
    if (next.length) uid=next[0]
    for(let i=0;i<20;i++) { cursor=0; dirty=false; output=module.exports.useCustomerNotifications(uid,onToast); const pending=effects;effects=[];pending.forEach(fn=>fn());if(!dirty)return output }
    throw new Error('Render did not settle')
  }
  return {render,streams,toasts,timers,focus,unmount(){slots.forEach(s=>s?.cleanup?.())}}
}

test('server history loads silently, realtime event announces only a new unread item',async()=>{
  let list=[item(1)]
  const h=harness({fetchCustomerNotifications:async()=>list})
  h.render(1);await tick();assert.equal(h.render().unread,1);assert.equal(h.toasts.length,0)
  list=[item(2),item(1)];h.streams[0].changed();await tick();assert.equal(h.render().unread,2);assert.equal(h.toasts.at(-1),'알림 2')
  h.streams[0].changed();await tick();h.render();assert.equal(h.toasts.length,1)
  h.unmount();assert.equal(h.streams[0].closed,true);assert.equal(h.timers.size,0)
})

test('account change clears old history immediately and ignores old inflight response',async()=>{
  const old=deferred();let calls=0
  const h=harness({fetchCustomerNotifications:()=>++calls===1?old.promise:Promise.resolve([item(20)])})
  h.render(1);assert.equal(h.render(2).items.length,0);old.resolve([item(10)]);await tick()
  assert.equal(h.render().items[0].notificationId,20);assert.equal(h.streams[0].closed,true)
  assert.equal(h.render(null).items.length,0);h.unmount()
})

test('slow old fetch cannot undo successful server read-all',async()=>{
  let list=[item(1)];const old=deferred();let calls=0
  const h=harness({fetchCustomerNotifications:()=>++calls===2?old.promise:Promise.resolve(list),markAllCustomerNotificationsRead:async()=>{list=[item(1,'2026-11-08T11:00:00')]}})
  h.render(1);await tick();h.render().reload();h.render().markRead();await tick();old.resolve([item(1)]);await tick()
  assert.equal(h.render().unread,0);h.unmount()
})

test('read-all failure keeps unread state and explains failure',async()=>{
  const h=harness({fetchCustomerNotifications:async()=>[item(1)],markAllCustomerNotificationsRead:async()=>{throw new Error('offline')}})
  h.render(1);await tick();h.render().markRead();await tick()
  assert.equal(h.render().unread,1);assert.match(h.toasts.at(-1),/읽음 처리에 실패/);h.unmount()
})

test('reconnect and polling recover missed history without replaying push toasts',async()=>{
  let list=[];const h=harness({fetchCustomerNotifications:async()=>list})
  h.render(1);await tick();h.render();list=[item(1)]
  h.streams[0].connected();await tick();assert.equal(h.render().unread,1)
  list=[item(2),item(1)];for(const timer of h.timers)timer();await tick();assert.equal(h.render().unread,2)
  assert.equal(h.toasts.length,0);h.unmount()
})
