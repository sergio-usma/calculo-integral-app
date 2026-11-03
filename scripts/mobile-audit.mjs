// Auditoría móvil: recorre rutas a 390px, lista elementos que desbordan y guarda capturas.
// Uso: node scripts/mobile-audit.mjs <outDir> [width] [height]   (requiere vite preview en 4173)
import { spawn } from 'node:child_process'
import { writeFileSync, mkdirSync } from 'node:fs'
const OUT = process.argv[2] ?? '.'; mkdirSync(OUT, { recursive: true })
const W = Number(process.argv[3] ?? 390), H = Number(process.argv[4] ?? 844)
const clickText = (sel, t) => `[...document.querySelectorAll('${sel}')].find(b=>b.textContent.includes(${JSON.stringify(t)}))?.click()`
const ROUTES = [
  ['/quiz/1/G1', 'dbg', `(()=>{const p=[...document.querySelectorAll('.panel')].find(x=>x.scrollWidth>x.clientWidth+1);document.title=p?[...p.querySelectorAll('*')].filter(e=>e.getBoundingClientRect().right>p.getBoundingClientRect().right-1).map(e=>e.tagName+'.'+e.className+' '+Math.round(e.getBoundingClientRect().right)+'/'+Math.round(p.getBoundingClientRect().right)).slice(0,6).join(' ; '):'none'})()`],
  ['/'], ['/taller'], ['/taller/1'], ['/taller/7'], ['/practica'], ['/practica/1/G1'], ['/practica/7/G1'], ['/casio'], ['/quiz/1/G1'], ['/examen'], ['/config'], ['/cheatsheet'], ['/algebra'], ['/algebra/1'], ['/estudio'],
  ['/taller/1', 'menu', `document.querySelector('.burger').click()`],
  ['/taller/7', 'grafica', `const t=[...document.querySelectorAll('.tab')];document.title=JSON.stringify(t.map(x=>x.textContent));t[1].click()`],
  ['/taller/1', 'casio-tab', clickText('.tab', 'Casio')],
  ['/taller/1', 'python-tab', clickText('.tab', 'Python')],
  ['/taller/1', 'resultado-tab', clickText('.tab', 'Resultado')],
  ['/taller/1', 'siguiente', clickText('button', 'Continuar')],
  ['/examen', 'examen-run', clickText('button', 'Empezar examen')],
  ['/taller/1', 'agente', clickText('button', 'Agente')],
  ['/taller/1', 'agente-ancho', clickText('button', 'Agente') + `;setTimeout(()=>document.querySelector('.expand-btn')?.click(),300)`],
  ['/taller/7', 'agente-ancho-graf', `[...document.querySelectorAll('.tab')][1].click();` + clickText('button', 'Agente') + `;setTimeout(()=>document.querySelector('.expand-btn')?.click(),300)`],
]
const PORT = 9338
const edge = spawn('C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe', ['--headless=new', `--remote-debugging-port=${PORT}`, '--disable-gpu', '--user-data-dir=' + process.env.TEMP + '/edge-audit', 'about:blank'], { stdio: 'ignore' })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
let targets
for (let i = 0; i < 40; i++) { try { targets = await (await fetch(`http://localhost:${PORT}/json`)).json(); if (targets.length) break } catch {} await sleep(250) }
const ws = new WebSocket(targets.find((t) => t.type === 'page').webSocketDebuggerUrl)
await new Promise((r) => (ws.onopen = r))
let id = 0; const pending = new Map()
ws.onmessage = (m) => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) pending.get(d.id)(d) }
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })) })
const js = async (e) => (await send('Runtime.evaluate', { expression: e, returnByValue: true, awaitPromise: true })).result?.result?.value
await send('Page.enable'); await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: W, height: H, deviceScaleFactor: 1, mobile: true })
let bad = 0
for (const [route, tag, action] of ROUTES) {
  const r = route + (tag ? '@' + tag : '')
  await send('Page.navigate', { url: 'http://localhost:4173/#' + route }); await send('Page.reload'); await sleep(1500)
  if (action) { await js(action); await sleep(1200); console.log('  tab activa:', await js("document.title+'|'+document.querySelector('.tab.on')?.textContent+'|'+document.body.innerText.includes('Algo fall')"), '| svg:', await js("document.querySelector('.graph svg')?.getBoundingClientRect().width")) }
  const res = await js(`(()=>{const vw=document.documentElement.clientWidth;const out=[];
    for(const el of document.querySelectorAll('body *')){const b=el.getBoundingClientRect();if(!b.width||!b.height||getComputedStyle(el).visibility==='hidden')continue;
      if(b.right>vw+1||b.left<-1){let p=el,clipped=false;while((p=p.parentElement)&&p!==document.body){const o=getComputedStyle(p).overflowX;if(o==='auto'||o==='scroll'||o==='hidden'){const pb=p.getBoundingClientRect();if(pb.right<=vw+1){clipped=true;break}}}
      if(!clipped)out.push(el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]+' r='+Math.round(b.right))}}
    const SKIP='.katex-display,.tex-block,pre,.tabs,.seg,table,svg,.code,.katex,.agent-body,.agent-hist,.sidebar,.agent-msgs,textarea,select,input';
    const inner=[];for(const el of document.querySelectorAll('main *, .agent *')){if(el.closest('.katex,.katex-display,.tex-block,pre,.tabs,.seg,table,svg,.code'))continue;
      if(el.matches('.agent-body,.agent-hist,.agent-msgs,textarea,select,input,.sidebar'))continue;
      const cs=getComputedStyle(el);if(cs.display==='inline'||cs.visibility==='hidden')continue;
      if(el.scrollWidth>el.clientWidth+1&&el.clientWidth>0)inner.push('W '+el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]+' '+el.scrollWidth+'>'+el.clientWidth);
      else if(el.scrollHeight>el.clientHeight+1&&el.clientHeight>0&&cs.overflowY!=='visible')inner.push('H '+el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]+' '+el.scrollHeight+'>'+el.clientHeight)}
    const sec=document.querySelector('#root > div > div > main > div > section');const sr=sec?.getBoundingClientRect();
    if(sec){for(const el of sec.querySelectorAll('*')){if(el.closest('.katex,.katex-display,.tex-block,pre,.tabs,.seg,table,svg,.code'))continue;const b=el.getBoundingClientRect();if(b.width&&b.right>sr.right+1)inner.push('S '+el.tagName.toLowerCase()+'.'+String(el.className).split(' ')[0]+' '+Math.round(b.right)+'>'+Math.round(sr.right))}}
    return {sh:document.documentElement.scrollHeight,scrollW:document.documentElement.scrollWidth,vw,iw:innerWidth,over:[...new Set(out)].slice(0,8),inner:[...new Set(inner)].slice(0,8)}})()`)
  const ok = res.scrollW <= res.vw + 1 && res.over.length === 0 && res.inner.length === 0
  if (!ok) bad++
  console.log((ok ? 'OK  ' : 'BAD ') + r, JSON.stringify(res))
  const s = await send('Page.captureScreenshot', { format: 'png', captureBeyondViewport: true, clip: { x: 0, y: 0, width: W, height: Math.min(res.sh, 3200), scale: 1 } })
  writeFileSync(`${OUT}/${r.replace(/[\/@]/g, '_') || 'home'}.png`, Buffer.from(s.result.data, 'base64'))
}
ws.close(); edge.kill(); process.exit(bad ? 1 : 0)
