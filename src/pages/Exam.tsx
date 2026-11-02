import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Graph } from '../components/Graph'
import { Md, Tex } from '../components/Tex'
import { generate } from '../engine'
import { METHODS, derivativeIs, numberOf } from '../engine/quiz'
import { fmtNum, fn } from '../engine/util'
import type { Level, Problem } from '../engine/types'

interface Answer {
  method?: number
  text: string
  marks: { x: number; y: number }[]
  top?: number
}

const PLAN: [number, Level[]][] = [
  [1, ['G1', 'G2']], [2, ['G1', 'G2', 'H1']], [3, ['G1', 'G2']], [4, ['G1', 'G2', 'H1']], [5, ['G1', 'G2']], [6, ['G1', 'G2']],
  [7, ['G1', 'G2']], [8, ['G1', 'G2']], [9, ['G1', 'G2']],
]
const label = (i: number) => (i < 6 ? `${i + 1}` : `7${'abc'[i - 6]}`)

function methodIdx(p: Problem) {
  return p.py?.kind === 'subst' ? 0 : p.py?.kind === 'parts' ? 1 : p.py?.kind === 'trig' ? 2 : p.py?.kind === 'pf' ? 3 : -1
}

interface Score {
  total: number
  max: number
  parts: { name: string; ok: boolean; pts: number }[]
}

function grade(p: Problem, a: Answer): Score {
  const parts: Score['parts'] = []
  if (p.kind === 'integral') {
    parts.push({ name: 'Método identificado', ok: a.method === methodIdx(p), pts: 1 })
    const f = fn(p.fExpr!)
    parts.push({ name: 'Resultado (la derivada de tu respuesta es el integrando)', ok: !!a.text && derivativeIs(a.text, f, p.testPts ?? [0.4, 0.8, 1.3]), pts: 3 })
  } else {
    const ar = p.area!
    const cuts = [...new Set(ar.regions.flatMap((r) => [r.a, r.b]))]
    const span = ar.view[1] - ar.view[0]
    const hit = cuts.every((c) => a.marks.some((m) => Math.abs(m.x - c) < 0.05 * span))
    parts.push({ name: 'Gráfica: marcaste todos los límites / cortes', ok: hit, pts: 1 })
    const top0 = ar.regions[0].top === ar.curves[0].expr ? 0 : 1
    parts.push({ name: 'Gráfica: identificaste la curva de arriba', ok: a.top === top0, pts: 1 })
    const n = numberOf(a.text)
    parts.push({ name: 'Área correcta', ok: n !== null && Math.abs(n - ar.value) < 1e-3 * Math.max(1, ar.value), pts: 3 })
  }
  const max = parts.reduce((s, x) => s + x.pts, 0)
  return { total: parts.reduce((s, x) => s + (x.ok ? x.pts : 0), 0), max, parts }
}

export function Exam() {
  const [minutes, setMinutes] = useState(90)
  const [seed, setSeed] = useState<number | null>(null)
  if (seed === null)
    return (
      <div className="page">
        <h1>Modo examen</h1>
        <p className="lead">6 integrales y 3 áreas como en el taller. Sin ver la solución hasta que entregues. En las áreas debes <b>marcar los puntos de corte en la gráfica</b> y elegir qué curva queda arriba.</p>
        <div className="panel">
          <label className="field">
            Tiempo (minutos)
            <input type="number" min={10} max={240} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} />
          </label>
          <ul>
            <li>Escribe las respuestas con <code>^</code> para potencias, <code>sqrt( )</code>, <code>exp( )</code>, <code>log( )</code>, <code>pi</code>.</li>
            <li>Para integrales: tu respuesta se corrige <b>derivándola</b> (la constante <code>+C</code> no se escribe).</li>
            <li>Puedes tener tu Casio al lado. ¡Ensáyala!</li>
          </ul>
          <button className="btn btn-primary" onClick={() => setSeed(Math.floor(Math.random() * 90000) + 1)}>🚀 Empezar examen</button>
        </div>
      </div>
    )
  return <ExamRun seed={seed} minutes={minutes} onExit={() => setSeed(null)} />
}

function ExamRun({ seed, minutes, onExit }: { seed: number; minutes: number; onExit: () => void }) {
  const problems = useMemo(
    () => PLAN.map(([fam, lvls], i) => generate(fam, lvls[(seed + i) % lvls.length], seed + i * 13)),
    [seed],
  )
  const [ans, setAns] = useState<Answer[]>(() => problems.map(() => ({ text: '', marks: [] })))
  const [left, setLeft] = useState(minutes * 60)
  const [submitted, setSubmitted] = useState(false)
  const [cur, setCur] = useState(0)

  useEffect(() => {
    if (submitted) return
    const t = setInterval(() => setLeft((s) => s - 1), 1000)
    return () => clearInterval(t)
  }, [submitted])
  useEffect(() => {
    if (left <= 0) setSubmitted(true)
  }, [left])

  const upd = (i: number, patch: Partial<Answer>) => setAns((a) => a.map((x, k) => (k === i ? { ...x, ...patch } : x)))
  const scores = useMemo(() => (submitted ? problems.map((p, i) => grade(p, ans[i])) : []), [submitted, problems, ans])
  const total = scores.reduce((s, x) => s + x.total, 0)
  const max = scores.reduce((s, x) => s + x.max, 0)
  const grade5 = max ? (total / max) * 5 : 0
  const mm = String(Math.max(0, Math.floor(left / 60))).padStart(2, '0')
  const ss = String(Math.max(0, left % 60)).padStart(2, '0')

  if (submitted)
    return (
      <div className="page">
        <h1>Resultados del examen</h1>
        <div className="panel ok">
          <h2>
            Nota: {grade5.toFixed(1)} / 5.0 <small className="muted">({total} de {max} puntos)</small>
          </h2>
        </div>
        {problems.map((p, i) => (
          <div key={p.id} className="panel">
            <span className="badge">Ejercicio {label(i)}</span> <span className="badge badge-alt">{scores[i].total}/{scores[i].max}</span>
            <Tex block>{p.statement}</Tex>
            <ul className="rubric">
              {scores[i].parts.map((r) => (
                <li key={r.name} className={r.ok ? 'ok' : 'bad'}>
                  {r.ok ? '✔' : '✘'} {r.name} <span className="muted">({r.pts} pt)</span>
                </li>
              ))}
            </ul>
            <details>
              <summary>Ver respuesta y procedimiento</summary>
              <Tex block>{p.answer}</Tex>
              <p className="muted">Tu respuesta: <code>{ans[i].text || '(vacía)'}</code></p>
              <Link className="btn" to={`/practica/${p.family}/${p.level}?seed=${p.id.split('-')[2]}`}>Abrir paso a paso →</Link>
            </details>
          </div>
        ))}
        <div className="row"><button className="btn btn-primary" onClick={onExit}>Nuevo examen</button></div>
      </div>
    )

  const p = problems[cur]
  const a = ans[cur]
  return (
    <div className="page">
      <div className="panel quiz-bar">
        <b>Examen</b>
        <span className={`pomo ${left < 300 ? 'zero' : ''}`}>⏱ {mm}:{ss}</span>
        <span className="spacer" />
        <button className="btn btn-primary" onClick={() => { if (confirm('¿Entregar el examen?')) setSubmitted(true) }}>Entregar</button>
      </div>
      <div className="seg exam-nav" role="group">
        {problems.map((_, i) => (
          <button key={i} className={`seg-b ${i === cur ? 'on' : ''} ${ans[i].text || ans[i].marks.length ? 'done' : ''}`} onClick={() => setCur(i)}>
            {label(i)}
          </button>
        ))}
      </div>
      <div className="cell cell-in">
        <span className="io">{label(cur)}.</span>
        <div>
          <Tex block>{p.statement}</Tex>
          {p.kind === 'area' && <p className="muted">Encuentre el área de la región comprendida entre las gráficas de las funciones dadas.</p>}
        </div>
      </div>
      {p.kind === 'integral' ? (
        <div className="panel">
          <label className="field">
            Método (identifícalo antes de resolver)
            <select value={a.method ?? ''} onChange={(e) => upd(cur, { method: e.target.value === '' ? undefined : Number(e.target.value) })}>
              <option value="">— elige —</option>
              {METHODS.map((m, k) => <option key={k} value={k}>{m}</option>)}
            </select>
          </label>
          <label className="field">
            Resultado F(x) (sin +C)
            <input className="ac-input" value={a.text} onChange={(e) => upd(cur, { text: e.target.value })} placeholder="p. ej. (x^2+1)^6/12" spellCheck={false} />
          </label>
        </div>
      ) : (
        <AreaExam p={p} a={a} upd={(patch) => upd(cur, patch)} />
      )}
      <div className="row">
        <button className="btn" disabled={cur === 0} onClick={() => setCur(cur - 1)}>← Anterior</button>
        <button className="btn" disabled={cur === problems.length - 1} onClick={() => setCur(cur + 1)}>Siguiente →</button>
      </div>
    </div>
  )
}

function AreaExam({ p, a, upd }: { p: Problem; a: Answer; upd: (x: Partial<Answer>) => void }) {
  const ar = p.area!
  return (
    <div>
      <div className="panel">
        <b>① Grafica: haz clic en el gráfico para marcar cada punto de corte / límite de integración</b> (sobre el eje x).
        <Graph
          curves={ar.curves.map((c) => ({ expr: c.expr, color: c.color }))}
          view={ar.view}
          vline={ar.vline}
          onPick={(x, y) => upd({ marks: [...a.marks, { x, y }] })}
          marks={a.marks}
          height={360}
        />
        <div className="row tight">
          <span className="muted">Marcas: {a.marks.length ? a.marks.map((m) => fmtNum(m.x, 2)).join(' · ') : 'ninguna'}</span>
          <button className="btn-tiny" onClick={() => upd({ marks: a.marks.slice(0, -1) })}>Deshacer</button>
          <button className="btn-tiny" onClick={() => upd({ marks: [] })}>Borrar todas</button>
        </div>
        <p className="muted">Usa las <b>curvas dadas</b> para ubicar los cruces. La tolerancia es de ~5 % del ancho de la ventana.</p>
      </div>
      <div className="panel">
        <b>② ¿Cuál curva queda arriba en la primera región?</b>
        <div className="choices">
          {ar.curves.map((c, k) => (
            <label key={k} className={`choice ${a.top === k ? 'on' : ''}`}>
              <input type="radio" name="top" checked={a.top === k} onChange={() => upd({ top: k })} />
              <Md>{`$${c.tex}$`}</Md>
            </label>
          ))}
        </div>
      </div>
      <div className="panel">
        <label className="field">
          <span>③ Área (número o expresión, p. ej. <code>pi^2/4</code>)</span>
          <input className="ac-input" value={a.text} onChange={(e) => upd({ text: e.target.value })} placeholder="p. ej. 4  ó  2*sqrt(2)" spellCheck={false} />
        </label>
      </div>
    </div>
  )
}
