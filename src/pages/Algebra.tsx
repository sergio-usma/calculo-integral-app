import { useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { useAgent } from '../agent/AgentContext'
import { getAlg, recordAlg } from '../app-storage'
import { Md, Tex } from '../components/Tex'
import { LESSONS, diagnostic } from '../engine/algebra'
import { rng } from '../engine/util'
import { texPreview } from '../engine/quiz'

export function AlgebraHome() {
  const [alg, setAlg] = useState(getAlg)
  const [diag, setDiag] = useState(false)
  return (
    <div className="page">
      <h1>Álgebra desde cero</h1>
      <p className="lead">Si el cálculo se te enreda, casi siempre es por el álgebra. Aquí repasas solo lo que necesitas, con ejemplos mínimos y práctica inmediata.</p>
      <div className="row">
        <button className="btn btn-primary" onClick={() => setDiag(true)}>🩺 Hacer diagnóstico (7 preguntas)</button>
      </div>
      {diag && <Diagnostic onDone={() => { setAlg(getAlg()); setDiag(false) }} />}
      <div className="grid-3">
        {LESSONS.map((l) => {
          const s = alg[l.id]
          const pct = s ? Math.round((s.ok / s.total) * 100) : null
          return (
            <Link key={l.id} className="card" to={`/algebra/${l.id}`}>
              <h3>{l.icon} {l.title}</h3>
              <p className="muted">{s ? `Aciertos: ${s.ok}/${s.total}` : 'Sin practicar todavía'}</p>
              {pct !== null && <div className="progress"><i style={{ width: `${pct}%`, background: pct >= 70 ? 'var(--ok-line)' : 'var(--orange)' }} /></div>}
              {pct !== null && pct < 70 && <small className="weak">Conviene repasarla</small>}
            </Link>
          )
        })}
      </div>
    </div>
  )
}

function Diagnostic({ onDone }: { onDone: () => void }) {
  const seed = useMemo(() => Math.floor(Math.random() * 1e6), [])
  const qs = useMemo(() => diagnostic(seed), [seed])
  const [i, setI] = useState(0)
  const [ans, setAns] = useState('')
  const [res, setRes] = useState<boolean[]>([])
  const [shown, setShown] = useState<boolean | null>(null)
  const done = i >= qs.length
  const q = qs[i]
  const submit = () => {
    const ok = q.ex.check(ans)
    recordAlg(q.lesson.id, ok)
    setRes([...res, ok])
    setShown(ok)
  }
  const next = () => { setI(i + 1); setAns(''); setShown(null) }
  if (done) {
    const weak = qs.filter((_, k) => !res[k]).map((x) => x.lesson)
    return (
      <div className="panel ok">
        <h3>Resultado: {res.filter(Boolean).length} de {qs.length}</h3>
        {weak.length ? <p>Te recomiendo repasar: {weak.map((w) => <Link key={w.id} to={`/algebra/${w.id}`}> {w.icon} {w.title} ·</Link>)}</p> : <p>¡Excelente base! Pasa directo a los ejercicios del taller.</p>}
        <button className="btn btn-primary" onClick={onDone}>Cerrar</button>
      </div>
    )
  }
  return (
    <div className="panel">
      <span className="badge">{q.lesson.icon} {q.lesson.title}</span> <span className="muted">Pregunta {i + 1}/{qs.length}</span>
      <Md>{q.ex.prompt}</Md>
      <input className="ac-input" value={ans} onChange={(e) => { setAns(e.target.value); setShown(null) }} onKeyDown={(e) => e.key === 'Enter' && (shown === null ? submit() : next())} placeholder="Tu respuesta…" spellCheck={false} />
      {shown !== null && <div className={`note ${shown ? 'tip' : 'warn'}`}>{shown ? '✅ Correcto.' : '❌ No exactamente.'} <Md>{q.ex.explain}</Md></div>}
      <div className="row tight">
        {shown === null ? <button className="btn btn-primary" disabled={!ans.trim()} onClick={submit}>Comprobar</button> : <button className="btn btn-primary" onClick={next}>Siguiente</button>}
      </div>
    </div>
  )
}

export function AlgebraLesson() {
  const { id } = useParams()
  const l = LESSONS.find((x) => x.id === id) ?? LESSONS[0]
  const agent = useAgent()
  const [step, setStep] = useState(0)
  const [seed, setSeed] = useState(1)
  const ex = useMemo(() => l.gen(rng(seed * 977 + l.id.length)), [l, seed])
  const [ans, setAns] = useState('')
  const [res, setRes] = useState<boolean | null>(null)
  const [hint, setHint] = useState(false)
  const [streak, setStreak] = useState(0)
  const prev = texPreview(ans)
  const check = () => {
    const ok = ex.check(ans)
    recordAlg(l.id, ok)
    setRes(ok)
    setStreak(ok ? streak + 1 : 0)
  }
  const another = () => { setSeed(seed + 1); setAns(''); setRes(null); setHint(false) }
  return (
    <div className="page">
      <div className="crumbs"><Link to="/algebra">← Álgebra</Link></div>
      <h1>{l.icon} {l.title}</h1>
      <div className="panel"><b>¿Por qué importa?</b> <Md>{l.why}</Md></div>
      <h3>Reglas</h3>
      {l.rules.map((r, i) => (
        <div key={i} className="panel rule">
          <Tex block>{r.tex}</Tex>
          <Md>{r.say}</Md>
        </div>
      ))}
      <h3>Ejemplo paso a paso</h3>
      <div className="panel">
        <Md>{l.example.title}</Md>
        {l.example.steps.slice(0, step + 1).map((s, i) => (
          <div key={i} className="ex-step">
            <Tex block>{s.tex}</Tex>
            <Md>{s.say}</Md>
          </div>
        ))}
        {step < l.example.steps.length - 1 ? <button className="btn btn-primary" onClick={() => setStep(step + 1)}>Siguiente paso ▶</button> : <button className="btn" onClick={() => setStep(0)}>Ver otra vez</button>}
      </div>
      <div className="note tip"><b>🧠 Para recordarlo:</b> <Md>{l.memory}</Md></div>
      <h3>Practica</h3>
      <div className="panel quiz-q">
        <span className="badge">Racha: {streak}</span>
        <Md>{ex.prompt}</Md>
        <input className="ac-input" value={ans} onChange={(e) => { setAns(e.target.value); setRes(null) }} onKeyDown={(e) => e.key === 'Enter' && (res ? another() : check())} placeholder="Tu respuesta…" spellCheck={false} />
        {prev && ex.kind === 'expr' && <div className="calc">Así lo leo yo: <Tex>{prev}</Tex></div>}
        {hint && <div className="note tip"><b>Pista:</b> <Md>{ex.hint}</Md></div>}
        {res !== null && <div className={`note ${res ? 'tip' : 'warn'}`}>{res ? '✅ ¡Bien!' : '❌ Todavía no.'} <Md>{ex.explain}</Md></div>}
        <div className="row tight">
          {res ? <button className="btn btn-primary" onClick={another}>Otro ejercicio ▶</button> : <button className="btn btn-primary" onClick={check} disabled={!ans.trim()}>Comprobar</button>}
          <button className="btn" onClick={() => setHint(true)}>💡 Pista</button>
          <button className="btn" onClick={another}>Saltar</button>
          <button className="btn" onClick={() => void agent.send(`Soy principiante. Explícame paso a paso, con un ejemplo distinto, esta idea de álgebra: ${l.title}. Mi ejercicio actual era: ${ex.prompt}`)}>🤖 Explícame más</button>
        </div>
      </div>
    </div>
  )
}
