import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { LATEX_HINT, useAgent } from '../agent/AgentContext'
import { Md, Tex } from '../components/Tex'
import { FAMILIES, FAMILY_TITLE, LEVELS, TALLER_LABEL, generate } from '../engine'
import { buildQuiz, ghostOf, texPreview } from '../engine/quiz'
import type { Question } from '../engine/quiz'
import { LEVEL_LABEL } from '../engine/types'
import type { Level } from '../engine/types'

const POMO = 15 * 60

function bump(key: string, by = 1) {
  const k = `ci.${key}`
  localStorage.setItem(k, String((Number(localStorage.getItem(k)) || 0) + by))
}

export function Quiz() {
  const { fam, level } = useParams()
  const nav = useNavigate()
  const f = Number(fam ?? 1)
  const lv = (level ?? 'G1') as Level
  const [seed, setSeed] = useState(1)
  const p = useMemo(() => generate(f, lv, seed), [f, lv, seed])
  const qs = useMemo(() => buildQuiz(p), [p])
  return (
    <div className="page">
      <h1>Quiz guiado, un paso a la vez</h1>
      <div className="panel selectors">
        <label>
          Ejercicio
          <select value={f} onChange={(e) => { nav(`/quiz/${e.target.value}/${lv}`); setSeed(1) }}>
            {FAMILIES.map((x) => (
              <option key={x} value={x}>
                {TALLER_LABEL[x]} · {FAMILY_TITLE[x]}
              </option>
            ))}
          </select>
        </label>
        <div className="seg" role="group" aria-label="Nivel">
          {LEVELS.map((l) => (
            <button key={l} className={l === lv ? 'seg-b on' : 'seg-b'} onClick={() => { nav(`/quiz/${f}/${l}`); setSeed(1) }}>
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setSeed(Math.floor(Math.random() * 100000) + 1)} disabled={lv === 'T'}>
          🎲 Otra variante
        </button>
      </div>
      <QuizRun key={p.id} p={p} qs={qs} />
    </div>
  )
}

function QuizRun({ p, qs }: { p: ReturnType<typeof generate>; qs: Question[] }) {
  const agent = useAgent()
  const [i, setI] = useState(0)
  const [text, setText] = useState('')
  const [choice, setChoice] = useState<number | undefined>()
  const [hints, setHints] = useState(0)
  const [result, setResult] = useState<'ok' | 'bad' | null>(null)
  const [tries, setTries] = useState(0)
  const [firstTry, setFirstTry] = useState(0)
  const [hintTotal, setHintTotal] = useState(0)
  const [time, setTime] = useState(POMO)
  const [running, setRunning] = useState(true)
  const input = useRef<HTMLInputElement>(null)
  const q = qs[i]
  const done = i >= qs.length

  useEffect(() => {
    agent.setProblem({
      id: p.id, title: p.title, statement: p.statement, method: p.method,
      mathLines: p.steps.flatMap((s) => s.lines), pyLines: [],
      extra: 'MODO QUIZ: el estudiante está resolviendo por pasos. NO reveles la respuesta de la pregunta actual; da pistas graduadas.',
    })
    return () => agent.setProblem(null)
  }, [p]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!running) return
    const t = setInterval(() => setTime((s) => Math.max(0, s - 1)), 1000)
    return () => clearInterval(t)
  }, [running])
  useEffect(() => {
    input.current?.focus()
  }, [i])

  const ghost = q && q.kind !== 'choice' ? ghostOf(text, hints >= 3 ? q.expected : hints >= 1 && q.expected.length < 18 ? q.expected : '') : ''
  const prev = texPreview(text)

  const check = () => {
    if (!q) return
    const ok = q.check(text, choice)
    setTries((t) => t + 1)
    if (ok) {
      setResult('ok')
      if (tries === 0 && hints === 0) setFirstTry((n) => n + 1)
      setHintTotal((n) => n + hints)
      bump('solved')
    } else setResult('bad')
  }
  const next = () => {
    setI(i + 1); setText(''); setChoice(undefined); setHints(0); setResult(null); setTries(0)
    if (i + 1 >= qs.length) bump('quizzes')
  }
  const accept = () => {
    // Tab: acepta el siguiente "trozo" del autocompletado
    const chunk = ghost.match(/^[A-Za-z0-9_.]+|^./)?.[0] ?? ''
    if (chunk) setText(text + chunk)
  }
  const mm = String(Math.floor(time / 60)).padStart(2, '0')
  const ss = String(time % 60).padStart(2, '0')

  if (qs.length === 0) return <div className="panel">Este ejercicio aún no tiene quiz.</div>
  return (
    <div>
      <div className="panel quiz-bar">
        <div className="progress" aria-label="Progreso"><i style={{ width: `${(Math.min(i, qs.length) / qs.length) * 100}%` }} /></div>
        <span className="muted">Pregunta {Math.min(i + 1, qs.length)} de {qs.length}</span>
        <span className="spacer" />
        <span className={`pomo ${time === 0 ? 'zero' : ''}`}>⏱ {mm}:{ss}</span>
        <button className="btn-tiny" onClick={() => setRunning(!running)}>{running ? 'Pausar' : 'Seguir'}</button>
        <button className="btn-tiny" onClick={() => setTime(POMO)}>Reiniciar 15 min</button>
      </div>
      {time === 0 && <div className="note tip">⏰ ¡15 minutos! Levántate, toma agua y descansa 3 minutos. Después sigues con la mente fresca.</div>}
      <div className="cell card-method">
        <b>Ejercicio</b>
        <Tex block>{p.statement}</Tex>
      </div>

      {done ? (
        <div className="panel ok">
          <h3>🎉 ¡Ejercicio completado!</h3>
          <p>
            Acertaste <b>{firstTry}</b> de {qs.length} a la primera, usando <b>{hintTotal}</b> pistas en total.
          </p>
          <p className="muted">Repite con una variante nueva hasta que salga a la primera y sin pistas. Eso es dominar el método.</p>
          <details>
            <summary>Ver la solución completa (respuesta final)</summary>
            <Tex block>{p.answer}</Tex>
          </details>
        </div>
      ) : (
        <div className="panel quiz-q">
          <span className="badge">{q.label}</span>
          <Md>{q.prompt}</Md>
          {q.kind === 'choice' ? (
            <div className="choices">
              {q.choices!.map((c, k) => (
                <label key={k} className={`choice ${choice === k ? 'on' : ''} ${result && q.correct === k ? 'right' : ''}`}>
                  <input type="radio" name="c" checked={choice === k} onChange={() => { setChoice(k); setResult(null) }} />
                  <Md>{c}</Md>
                </label>
              ))}
            </div>
          ) : (
            <>
              <div className="ac-wrap">
                <input
                  ref={input}
                  className="ac-input"
                  value={text}
                  placeholder="Escribe tu respuesta aquí…"
                  onChange={(e) => { setText(e.target.value); setResult(null) }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') result === 'ok' ? next() : check()
                    if ((e.key === 'Tab' || e.key === 'ArrowRight') && ghost && (e.currentTarget.selectionStart ?? 0) >= text.length) {
                      e.preventDefault()
                      accept()
                    }
                  }}
                  spellCheck={false}
                  autoComplete="off"
                />
                {ghost && (
                  <div className="ghost" aria-hidden>
                    <span className="typed">{text}</span>
                    <span className="rest">{ghost}</span>
                  </div>
                )}
              </div>
              {ghost && <div className="muted small">Autocompletado: pulsa <kbd>Tab</kbd> para aceptar el siguiente trozo.</div>}
              {q.chips && (
                <div className="quick">
                  {q.chips.map((c) => (
                    <button key={c} className="chip" onClick={() => { setText(text + c); input.current?.focus() }}>
                      {c}
                    </button>
                  ))}
                </div>
              )}
              {prev && (
                <div className="calc">
                  Así lo leo yo: <Tex>{prev}</Tex>
                </div>
              )}
            </>
          )}

          {result === 'ok' && (
            <div className="note tip">
              ✅ <b>¡Correcto!</b> <Md>{q.explain}</Md>
            </div>
          )}
          {result === 'bad' && (
            <div className="note warn">
              ❌ Todavía no. Revisa signos, paréntesis y que uses la variable <code>{q.v ?? 'x'}</code>. Pide una pista, no hay prisa.
            </div>
          )}

          {hints > 0 && (
            <div>
              {q.hints.slice(0, Math.min(hints, 3)).map((h, k) => (
                <div key={k} className="note tip">
                  <b>Pista {k + 1}:</b> <Md>{h}</Md>
                </div>
              ))}
              {hints >= 4 && (
                <div className="note warn">
                  <b>Respuesta:</b> <code>{q.expected}</code>
                </div>
              )}
            </div>
          )}

          <div className="row tight">
            {result === 'ok' ? (
              <button className="btn btn-primary" onClick={next}>{i + 1 >= qs.length ? 'Terminar ▶' : 'Siguiente ▶'}</button>
            ) : (
              <button className="btn btn-primary" onClick={check} disabled={q.kind === 'choice' ? choice === undefined : !text.trim()}>
                Comprobar
              </button>
            )}
            <button className="btn" onClick={() => setHints(Math.min(4, hints + 1))} disabled={hints >= 4 || result === 'ok'}>
              💡 Pista {Math.min(hints + 1, 4)}{hints >= 3 ? ' (ver respuesta)' : ''}
            </button>
            <button
              className="btn"
              disabled={agent.busy || result === 'ok'}
              onClick={() =>
                void agent.send(
                  `Estoy en el quiz, pregunta: "${q.label}". Mi intento actual es: "${text || '(nada todavía)'}". Dame UNA pista corta sobre qué sigue, sin darme la respuesta.` + LATEX_HINT,
                  `PREGUNTA ACTUAL DEL QUIZ: ${q.prompt}\nRESPUESTA CORRECTA (SECRETA, NO LA REVELES NI LA DIGAS COMPLETA): ${q.expected}`,
                )
              }
            >
              🤖 Pista del agente
            </button>
            <button className="btn" onClick={() => agent.setOpen(true)}>Abrir chat</button>
          </div>
        </div>
      )}
    </div>
  )
}
