// E2E de interfaz con Edge (CDP): examen con clics en la gráfica, quiz con autocompletado y panel del agente.
// Uso: node scripts/e2e-ui.mjs <carpeta-de-capturas>   (requiere `npx vite preview --port 4173`)
import { spawn } from 'node:child_process'
import { writeFileSync } from 'node:fs'

const OUT = process.argv[2] ?? '.'
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9334
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--window-size=1400,1400', '--user-data-dir=' + process.env.TEMP + '/edge-e2e2', 'about:blank'], { stdio: 'ignore' })
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
const setInput = (sel, v) => js(`(()=>{const el=document.querySelector(${JSON.stringify(sel)}); const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set; set.call(el, ${JSON.stringify(v)}); el.dispatchEvent(new Event('input',{bubbles:true})); return true})()`)

await send('Page.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1400, height: 1400, deviceScaleFactor: 1, mobile: false })
const ok = []

// --- Examen
await send('Page.navigate', { url: 'http://localhost:4173/#/examen' })
await sleep(1500)
await js('window.confirm = () => true')
await click('Empezar examen')
await sleep(800)
await click('7a')
await sleep(600)
// clic en el SVG de la gráfica en el centro
const box = await js(`(()=>{const r=document.querySelector('.graph svg').getBoundingClientRect(); return {x:r.left+r.width*0.45,y:r.top+r.height*0.5}})()`)
for (const dx of [0, 0.1]) {
  await send('Input.dispatchMouseEvent', { type: 'mousePressed', x: box.x + dx * 300, y: box.y, button: 'left', clickCount: 1 })
  await send('Input.dispatchMouseEvent', { type: 'mouseReleased', x: box.x + dx * 300, y: box.y, button: 'left', clickCount: 1 })
}
await sleep(300)
ok.push(['marcas en la gráfica', (await js(`document.body.innerText.match(/Marcas: ([^\\n]*)/)?.[1]`)) !== 'ninguna'])
await shot('e2e_exam_area')
await click('Entregar')
await sleep(300)

// --- Quiz con autocompletado
await send('Page.navigate', { url: 'http://localhost:4173/#/quiz/6/G1' })
await sleep(1500)
await js(`document.querySelectorAll('input[type=radio]')[3].click()`)
await click('Comprobar')
await sleep(400)
ok.push(['quiz método correcto', (await js(`document.body.innerText.includes('Correcto')`)) === true])
await click('Siguiente')
await sleep(400)
await click('Pista 1')
await click('Pista 2')
await click('Pista 3')
await sleep(300)
ok.push(['quiz muestra autocompletado', (await js(`!!document.querySelector('.ghost .rest')`)) === true])
await shot('e2e_quiz_hints')

// --- Panel del agente con referencia de línea
await send('Page.navigate', { url: 'http://localhost:4173/#/taller/4?line=3' })
await sleep(1500)
await js(`document.querySelectorAll('.dbg-line')[1].click()`)
await sleep(200)
await click('Pregúntale al agente')
await sleep(800)
ok.push(['panel agente abierto con referencia', (await js(`!!document.querySelector('.agent .ref-chip')`)) === true])
await shot('e2e_agent')
console.log(ok.map(([n, v]) => `${v ? '✔' : '✘'} ${n}`).join('\n'))
ws.close(); edge.kill()
process.exit(ok.every(([, v]) => v) ? 0 : 1)
