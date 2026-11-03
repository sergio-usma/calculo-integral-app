// E2E del agente: servidor SSE simulado + Edge. Verifica que enviar "@L2 ..." no rompe la app.
// Uso: node scripts/e2e-agent.mjs <carpeta>   (requiere `npx vite preview --port 4173`)
import { spawn } from 'node:child_process'
import { createServer } from 'node:http'
import { writeFileSync } from 'node:fs'

const OUT = process.argv[2] ?? '.'
const MODE = process.argv[3] ?? 'ok'
const W = Number(process.argv[4] ?? 1500), H = Number(process.argv[5] ?? 1000)
const R = String.raw
const chunks = [R`Línea L7\n`.replace('\n', '\n'), R`Sea \(u=x^2+1\) y luego \[\int u^5\,du=\frac{u^6}{6}\]`, '\n- Integrar ', R`\int\cos 2\theta\,d\theta=\frac{\sin 2\theta}{2}`, ' y listo.\n', R`=\frac{1}{2}\cos 2\theta\cdot 2 =\cos 2\theta$$`, '\n', R`Total $$\theta+\frac{\sin 2\theta}{2}+C$$ y un $ suelto`]
const srv = createServer((req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*'); res.setHeader('Access-Control-Allow-Headers', '*')
  if (req.method === 'OPTIONS') return res.end()
  if (MODE === 'e401') { res.statusCode = 401; return res.end('{"error":{"message":"bad key"}}') }
  res.setHeader('Content-Type', 'text/event-stream')
  let i = 0
  const t = setInterval(() => {
    if (i < chunks.length) res.write(`data: ${JSON.stringify({ choices: [{ delta: { content: chunks[i++] } }] })}\n\n`)
    else { res.write('data: [DONE]\n\n'); res.end(); clearInterval(t) }
  }, 150)
})
await new Promise((r) => srv.listen(8787, r))
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9337
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--user-data-dir=' + process.env.TEMP + '/edge-e2e-agent', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets
for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://localhost:${PORT}/json`)).json(); if (targets.length) break } catch {} await sleep(250) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0; const pending = new Map(); const errors = []
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) pending.get(d.id)(d)
  if (d.method === 'Runtime.exceptionThrown') errors.push(d.params.exceptionDetails.exception?.description ?? d.params.exceptionDetails.text)
  if (d.method === 'Runtime.consoleAPICalled' && d.params.type === 'error') errors.push(d.params.args.map((a) => a.value ?? a.description).join(' ').slice(0, 400))
}
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value
const shot = async (n) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${n}.png`, Buffer.from(r.result.data, 'base64')) }
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: W < 800 })
await send('Page.navigate', { url: 'http://localhost:4173/#/taller/1' }); await sleep(1200)
await js(`localStorage.setItem('ci.settings.v1', JSON.stringify({provider:'custom',baseUrl:'http://localhost:8787/v1',apiKey:'test',model:'m'}))`)
await send('Page.navigate', { url: 'http://localhost:4173/#/taller/2' }); await send('Page.reload'); await sleep(3000)
await js(`[...document.querySelectorAll('button')].find(b=>b.textContent.trim()==='Agente' || b.textContent.includes('Agente'))?.click()`); await sleep(500)
await js(`(()=>{const el=document.querySelector('.agent textarea'); Object.getOwnPropertyDescriptor(HTMLTextAreaElement.prototype,'value').set.call(el,'Explica @L2 por favor'); el.dispatchEvent(new Event('input',{bubbles:true}))})()`)
await js(`[...document.querySelectorAll('.agent button')].find(b=>b.textContent==='Enviar')?.click()`)
await sleep(2500)
await sleep(500)
const q = (e) => js(e)
const geo = await q(`(()=>{const a=document.querySelector('.agent').getBoundingClientRect();return {w:Math.round(a.width),h:Math.round(a.height),bottom:Math.round(a.bottom),vh:innerHeight,pageScroll:document.documentElement.scrollHeight>innerHeight+1}})()`)
console.log('geo=', JSON.stringify(geo))
console.log('katex=', await q(`document.querySelectorAll('.agent .msg.assistant .katex').length`), 'katex-error=', await q(`document.querySelectorAll('.agent .katex-error').length`))
console.log('texto-crudo=', await q(`[...document.querySelectorAll('.agent .msg.assistant')].map(m=>{const c=m.cloneNode(true);c.querySelectorAll('.katex').forEach(k=>k.remove());return c.innerText}).join('|').match(/\\[a-z]+|\$\$/g)`))
await shot('agent_' + MODE + '_' + W)
if (W >= 800 && MODE === 'ok') {
  await js(`document.querySelector('.expand-btn').click()`); await sleep(300)
  console.log('ancho-expandido=', await q(`Math.round(document.querySelector('.agent').getBoundingClientRect().width)`))
  await js(`document.querySelector('.expand-btn').click()`)
}
if (MODE === 'ok') {
  await js(`document.querySelector('[aria-label="Nuevo chat"]').click()`); await sleep(300)
  await js(`document.querySelector('[aria-label="Historial"]').click()`); await sleep(300)
  console.log('historial=', await q(`document.querySelectorAll('.hist-item').length`))
  await js(`document.querySelector('.hist-open').click()`); await sleep(300)
  console.log('restaurado=', await q(`document.querySelectorAll('.agent .msg').length`))
}
const alive = await js(`!!document.querySelector('.agent .msg.assistant, .agent .msg.error') && document.body.innerText.length > 200`)
console.log('vivo=', alive, '\nmensajes=', await js(`[...document.querySelectorAll('.agent .msg')].map(m=>m.className+': '+m.innerText.slice(0,150)).join(' || ')`))
console.log('errores:', errors.length ? errors.join('\n---\n') : 'ninguno')
console.log('body=', ((await js('document.body.innerText')) ?? '').slice(0, 300))
console.log('agent=', await js("document.querySelector('.agent')?.innerText"))
ws.close(); edge.kill(); srv.close()
process.exit(alive && !errors.length ? 0 : 1)
