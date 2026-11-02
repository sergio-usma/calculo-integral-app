// E2E etapa 3 (Edge/CDP): cheatsheet + tarjetas, álgebra con práctica y modo OFFLINE real (service worker).
// Uso: node scripts/e2e-stage3.mjs <carpeta-capturas>   (requiere `npx vite preview --port 4173`)
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const OUT = process.argv[2] ?? '.'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9335
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--user-data-dir=' + process.env.TEMP + '/edge-e2e3', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets
for (let i = 0; i < 40; i++) {
  try { targets = await (await fetch(`http://localhost:${PORT}/json`)).json(); if (targets.length) break } catch {}
  await sleep(250)
}
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) pending.get(d.id)(d) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const js = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value
const shot = async (name) => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(`${OUT}/${name}.png`, Buffer.from(r.result.data, 'base64')) }
const click = (text) => js(`[...document.querySelectorAll('button')].find(b => b.textContent.includes(${JSON.stringify(text)}))?.click()`)
const nav = async (hash) => { await send('Page.navigate', { url: `http://localhost:4173/#/${hash}` }); await sleep(1400) }
const setVal = (sel, v) => js(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)

await send('Page.enable'); await send('Network.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1300, deviceScaleFactor: 1, mobile: false })
const ok = []

await nav('cheatsheet')
await js(`document.querySelectorAll('.cs-card')[7].setAttribute('open','')`)
await sleep(300)
ok.push(['cheatsheet con secciones y tarjetas', (await js(`document.querySelectorAll('.cs-card').length`)) >= 30])
await shot('s3_cheat')
await click('Tarjetas de memoria'); await sleep(300)
await click('Mostrar respuesta'); await sleep(300)
await click('La sabía'); await sleep(300)
console.log('cards=', await js(`localStorage.getItem('ci.leitner')`), 'btns=', await js(`[...document.querySelectorAll('button')].map(b=>b.textContent).join('|')`))
ok.push(['tarjeta calificada y mazo avanza', (await js(`localStorage.getItem('ci.leitner')?.includes('"box":2')`)) === true])
await shot('s3_cards')

await nav('algebra/potencias')
const prompt = await js(`document.querySelector('.quiz-q .md')?.innerText`)
// ejercicio determinista (seed 1): resolvemos leyendo el enunciado de la pantalla
const m = prompt.match(/x(\d+)\s*·\s*x(\d+)|x\^\{?(\d+)\}?\s*\\cdot/)
await setVal('.quiz-q .ac-input', '99999')
await click('Comprobar'); await sleep(200)
ok.push(['álgebra rechaza mala respuesta', (await js(`document.body.innerText.includes('Todavía no')`)) === true])
await shot('s3_algebra')

await nav('estudio')
ok.push(['estudio muestra plan', (await js(`document.body.innerText.includes('Plan para antes del examen')`)) === true])

// --- offline real
await nav('')
for (let i = 0; i < 20; i++) { // esperar al service worker
  const active = await js(`navigator.serviceWorker.getRegistration().then(r => !!(r && r.active))`)
  if (active) break
  await sleep(500)
}
await sleep(1500)
await send('Page.navigate', { url: 'http://localhost:4173/#/' }); await sleep(1500) // 2.ª carga: ya controlada por el SW
await send('Network.emulateNetworkConditions', { offline: true, latency: 0, downloadThroughput: 0, uploadThroughput: 0 })
await send('Page.reload'); await sleep(2500)
await nav('taller/5')
const offlineText = await js(`document.body.innerText`)
ok.push(['OFFLINE: la app carga y muestra el ejercicio', offlineText.includes('Ejercicio 5') && offlineText.includes('Sustitución trigonométrica')])
await shot('s3_offline')
console.log(ok.map(([n, v]) => `${v ? '✔' : '✘'} ${n}`).join('\n'))
ws.close(); edge.kill()
process.exit(ok.every(([, v]) => v) ? 0 : 1)
