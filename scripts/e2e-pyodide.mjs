// Prueba E2E: abre la app en Edge (CDP), entra a la pestaña Python, pulsa "Ejecutar" y espera la salida real de Pyodide.
// Uso: node scripts/e2e-pyodide.mjs   (requiere `npx vite preview --port 4173` corriendo y Edge instalado)
import { spawn } from 'node:child_process'

const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'
const PORT = 9333
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--user-data-dir=' + process.env.TEMP + '/edge-e2e', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets
for (let i = 0; i < 40; i++) {
  try {
    targets = await (await fetch(`http://localhost:${PORT}/json`)).json()
    if (targets.length) break
  } catch {}
  await sleep(250)
}
const page = targets.find((t) => t.type === 'page')
const ws = new WebSocket(page.webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0
const pending = new Map()
ws.onmessage = (m) => {
  const d = JSON.parse(m.data)
  if (d.id && pending.has(d.id)) pending.get(d.id)(d)
}
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const evalJs = async (expr) => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value

await send('Page.enable')
await send('Page.navigate', { url: 'http://localhost:4173/#/taller/5?tab=py' })
await sleep(2500)
console.log('título del bloque:', await evalJs(`document.querySelector('.py-title')?.textContent`))
await evalJs(`[...document.querySelectorAll('button')].find(b => b.textContent.includes('Ejecutar aquí')).click()`)
let out = ''
for (let i = 0; i < 120; i++) {
  await sleep(1000)
  out = await evalJs(`document.querySelector('.py-out')?.innerText ?? ''`)
  if (out.includes('Terminó') || out.includes('error') || out.includes('No se pudo')) break
}
console.log('--- salida en el navegador ---\n' + out)
ws.close()
edge.kill()
process.exit(out.includes('✔ Terminó') && !out.includes('Terminó con error') ? 0 : 1)
