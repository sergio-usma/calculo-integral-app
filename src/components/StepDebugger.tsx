import { useCallback, useEffect, useMemo, useState } from 'react'
import type { Step } from '../engine/types'
import { Md, Tex } from './Tex'

interface Flat {
  n: number
  step: number
  tex: string
  first: boolean
}

export function StepDebugger({ steps, onSelectLine, onAsk, startAt = 0 }: { steps: Step[]; onSelectLine?: (n: number, flat: Flat[]) => void; onAsk?: (n: number) => void; startAt?: number }) {
  const flat = useMemo<Flat[]>(() => {
    const out: Flat[] = []
    steps.forEach((s, si) => s.lines.forEach((tex, li) => out.push({ n: out.length + 1, step: si, tex, first: li === 0 })))
    return out
  }, [steps])
  const [cur, setCur] = useState(startAt) // 0 = no ejecutado; k = líneas 1..k visibles
  const [bps, setBps] = useState<Set<number>>(new Set())
  const [sel, setSel] = useState<number | null>(null)
  const [focus, setFocus] = useState(false)
  const total = flat.length

  useEffect(() => {
    setCur(startAt)
    setBps(new Set())
    setSel(null)
  }, [steps]) // eslint-disable-line react-hooks/exhaustive-deps

  const next = useCallback(() => setCur((c) => Math.min(total, c + 1)), [total])
  const prev = useCallback(() => setCur((c) => Math.max(0, c - 1)), [])
  const nextStep = useCallback(() => {
    setCur((c) => {
      const s = c === 0 ? -1 : flat[c - 1].step
      const target = flat.filter((l) => l.step === s + 1).pop()
      return target ? target.n : total
    })
  }, [flat, total])
  const run = useCallback(() => {
    setCur((c) => {
      for (let k = c + 1; k <= total; k++) if (bps.has(k)) return k
      return total
    })
  }, [bps, total])

  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT' || (e.target as HTMLElement)?.tagName === 'TEXTAREA') return
      if (e.key === 'F10' || e.key === 'ArrowRight' || e.key === ' ') {
        e.preventDefault()
        next()
      } else if (e.key === 'F11' || e.key === 'ArrowDown') {
        e.preventDefault()
        nextStep()
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault()
        prev()
      } else if (e.key === 'F5') {
        e.preventDefault()
        run()
      }
    }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [next, prev, nextStep, run])

  const curStepIdx = cur === 0 ? 0 : flat[cur - 1].step
  const step = steps[curStepIdx]
  const vars = useMemo(() => {
    const acc: Record<string, string> = {}
    if (cur === 0) return acc
    for (let i = 0; i <= curStepIdx; i++) Object.assign(acc, steps[i].vars ?? {})
    return acc
  }, [cur, curStepIdx, steps])

  const toggleBp = (n: number) =>
    setBps((s) => {
      const t = new Set(s)
      if (t.has(n)) t.delete(n)
      else t.add(n)
      return t
    })

  return (
    <div className="debugger">
      <div className="dbg-bar">
        <button className="btn" onClick={() => setCur(0)} title="Reiniciar">⏮ Reiniciar</button>
        <button className="btn" onClick={prev} disabled={cur === 0} title="← Atrás">◀ Atrás</button>
        <button className="btn btn-primary" onClick={next} disabled={cur === total} title="→ / F10 / Espacio">▶ Siguiente línea</button>
        <button className="btn" onClick={nextStep} disabled={cur === total} title="↓ / F11">⤓ Siguiente paso</button>
        <button className="btn" onClick={run} disabled={cur === total} title="F5">⏩ Continuar</button>
        <label className="check">
          <input type="checkbox" checked={focus} onChange={(e) => setFocus(e.target.checked)} /> Modo foco (solo el paso actual)
        </label>
        <span className="muted">
          Línea {cur}/{total} · atajos: → ← ↓ F5
        </span>
      </div>
      <div className="dbg-body">
        <div className="dbg-code" role="list">
          {steps.map((s, si) => {
            const lines = flat.filter((l) => l.step === si)
            const started = cur >= lines[0].n
            if (focus && si !== curStepIdx) return null
            return (
              <div key={si} className={`dbg-step ${si === curStepIdx && cur > 0 ? 'active' : ''} ${!started ? 'future' : ''}`}>
                <div className="dbg-step-title">
                  <span className="badge">Paso {si + 1}</span> {s.title}
                </div>
                {lines.map((l) => {
                  const shown = cur >= l.n
                  return (
                    <div
                      key={l.n}
                      role="listitem"
                      className={`dbg-line ${cur === l.n ? 'current' : ''} ${sel === l.n ? 'selected' : ''} ${shown ? '' : 'hidden'}`}
                      onClick={() => {
                        setSel(l.n)
                        onSelectLine?.(l.n, flat)
                      }}
                    >
                      <button className={`bp ${bps.has(l.n) ? 'on' : ''}`} onClick={(e) => { e.stopPropagation(); toggleBp(l.n) }} title="Punto de parada (breakpoint)" aria-label={`Punto de parada en la línea ${l.n}`} />
                      <span className="ln">L{l.n}</span>
                      <span className="arrow">{cur === l.n ? '▶' : ''}</span>
                      <span className="code">{shown ? <Tex>{l.tex}</Tex> : <span className="placeholder">· · ·</span>}</span>
                    </div>
                  )
                })}
              </div>
            )
          })}
        </div>
        <aside className="dbg-side">
          <div className="panel">
            <h4>¿Qué pasa en este paso?</h4>
            {cur === 0 ? <p className="muted">Pulsa <b>▶ Siguiente línea</b> para empezar. Un paso = una idea.</p> : (
              <>
                <p className="step-name"><span className="badge">Paso {curStepIdx + 1}</span> {step.title}</p>
                <Md>{step.why}</Md>
                {step.tip && <div className="note tip"><b>💡 Truco:</b> <Md>{step.tip}</Md></div>}
                {step.warn && <div className="note warn"><b>⚠ Cuidado:</b> <Md>{step.warn}</Md></div>}
              </>
            )}
          </div>
          <div className="panel">
            <h4>Variables</h4>
            {Object.keys(vars).length === 0 ? <p className="muted">Aún no hay variables definidas.</p> : (
              <table className="vars">
                <tbody>
                  {Object.entries(vars).map(([k, v]) => (
                    <tr key={k}>
                      <td><Tex>{k.replace(/_/g, '\\_')}</Tex></td>
                      <td>=</td>
                      <td><Tex>{v}</Tex></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {sel !== null && (
            <div className="panel">
              <h4>Línea seleccionada: L{sel}</h4>
              <Tex block>{flat[sel - 1].tex}</Tex>
              {onAsk && <button className="btn btn-primary" onClick={() => onAsk(sel)}>🤖 Pregúntale al agente sobre L{sel}</button>}
              <p className="muted">También puedes escribir @L{sel} en el chat del agente.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}
