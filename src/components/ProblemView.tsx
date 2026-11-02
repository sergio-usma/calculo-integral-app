import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { useAgent } from '../agent/AgentContext'
import { pythonFor } from '../engine/python'
import { LEVEL_LABEL } from '../engine/types'
import type { Problem } from '../engine/types'
import { KeyChips } from './KeyChips'
import { PythonView } from './PythonView'
import { StepDebugger } from './StepDebugger'
import { Md, Tex } from './Tex'
import { AreaViz, IntegralViz } from './Viz'

type Tab = 'result' | 'steps' | 'graph' | 'casio' | 'py'

export function ProblemView({ p, label }: { p: Problem; label?: string }) {
  const [sp] = useSearchParams()
  const [tab, setTab] = useState<Tab>((sp.get('tab') as Tab) || 'steps')
  const [hint, setHint] = useState(0)
  const [showAns, setShowAns] = useState(false)
  const agent = useAgent()
  const mathLines = useMemo(() => p.steps.flatMap((s) => s.lines), [p])
  const { setProblem, selectRef } = agent
  useEffect(() => {
    setProblem({ id: p.id, title: p.title, statement: p.statement, method: p.method, mathLines, pyLines: pythonFor(p).full.split('\n') })
    selectRef(null)
    return () => setProblem(null)
  }, [p, mathLines, setProblem, selectRef])
  const tabs: [Tab, string][] = [
    ['steps', '① Paso a paso'],
    ['graph', '② Gráfica'],
    ['casio', '③ Comprueba con tu Casio'],
    ['py', '④ 🐍 Python paso a paso'],
    ['result', '⑤ Resultado y pistas'],
  ]
  return (
    <section className="notebook">
      <div className="cell cell-in">
        <span className="io">In[{label ?? p.id}]:=</span>
        <div>
          <div className="problem-meta">
            <span className="badge">{LEVEL_LABEL[p.level]}</span> <span className="badge badge-alt">{p.method}</span>
          </div>
          <Tex block>{p.kind === 'integral' ? p.statement + '\\,' : p.statement}</Tex>
          {p.kind === 'area' && <p className="muted">Encuentre el área de la región comprendida entre las gráficas de las funciones dadas.</p>}
        </div>
      </div>
      <div className="cell card-method">
        <b>🎯 Método: {p.method}</b>
        <Md>{p.methodWhy}</Md>
      </div>
      <nav className="tabs" role="tablist">
        {tabs.map(([k, t]) => (
          <button key={k} role="tab" aria-selected={tab === k} className={tab === k ? 'tab on' : 'tab'} onClick={() => setTab(k)}>
            {t}
          </button>
        ))}
      </nav>
      {tab === 'steps' && <StepDebugger steps={p.steps} startAt={Number(sp.get('line') ?? 0)} onSelectLine={(n, flat) => agent.selectRef({ kind: 'L', n, text: flat[n - 1].tex })} onAsk={(n) => void agent.send(`Explícame con detalle la línea @L${n}: qué hace, por qué es válida y qué álgebra hay escondida.`)} />}
      {tab === 'graph' && (p.kind === 'area' ? <AreaViz p={p} /> : <IntegralViz p={p} />)}
      {tab === 'casio' && (
        <div className="casio-list">
          <p className="muted">
            La Casio fx-570ES PLUS <b>no da la antiderivada</b>: integra y deriva <b>numéricamente</b>. Úsala para <b>verificar</b> lo que hiciste a mano, no para saltarte el procedimiento.
          </p>
          {p.casio.map((c, i) => (
            <div key={i} className="panel casio-card">
              <h4>
                {i + 1}. {c.title}
              </h4>
              <KeyChips keys={c.keys} />
              {c.expect && (
                <p className="calc">
                  Debe mostrar: <b>{c.expect}</b>
                </p>
              )}
              {c.note && <p>{c.note}</p>}
            </div>
          ))}
        </div>
      )}
      {tab === 'py' && <PythonView p={p} />}
      {tab === 'result' && (
        <div>
          <div className="panel">
            <h4>💭 ¿Atascado? Pide una pista (sin ver la solución)</h4>
            {p.hints.slice(0, hint).map((h, i) => (
              <div key={i} className="note tip">
                <b>Pista {i + 1}:</b> <Md>{h}</Md>
              </div>
            ))}
            {hint < p.hints.length ? (
              <button className="btn" onClick={() => setHint(hint + 1)}>
                Pista {hint + 1} de {p.hints.length}
              </button>
            ) : (
              <p className="muted">Ya no hay más pistas: ¡revisa el paso a paso!</p>
            )}
          </div>
          <div className="cell cell-out">
            <span className="io">Out[{label ?? p.id}]=</span>
            <div>
              {showAns ? (
                <Tex block>{p.answer}</Tex>
              ) : (
                <button className="btn btn-primary" onClick={() => setShowAns(true)}>
                  Mostrar la respuesta final
                </button>
              )}
            </div>
          </div>
          {showAns && (
            <div className="panel ok">
              <h4>✅ Verificación (derivar la respuesta / comprobar)</h4>
              {p.verification.map((v, i) => (
                <Tex key={i} block>
                  {v}
                </Tex>
              ))}
            </div>
          )}
        </div>
      )}
    </section>
  )
}
