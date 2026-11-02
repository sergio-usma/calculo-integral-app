import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { useAgent } from '../agent/AgentContext'
import { Md, Tex } from './Tex'

const QUICK: [string, string][] = [
  ['🔍 Explica esta línea', 'Explícame con detalle la línea referenciada: qué hace, por qué es válida y qué álgebra hay escondida.'],
  ['➕ ¿Por qué ese signo / número?', 'En la línea referenciada, ¿por qué aparece ese signo o ese número? Justifícalo paso a paso.'],
  ['🧸 Ejemplo más simple', 'Dame un ejemplo con números muy simples que use la misma idea de la línea referenciada.'],
  ['🧮 Álgebra de base', 'Qué reglas de álgebra necesito dominar para entender esta línea? Dame un mini-repaso con un ejemplo.'],
  ['🐍 Relaciónala con Python', 'Muéstrame cómo se relaciona esta línea con el código Python del ejercicio.'],
  ['🧠 Truco para recordarlo', 'Dame una regla mnemotécnica corta para no olvidar esta idea en el examen.'],
]

export function AgentPanel() {
  const a = useAgent()
  const [text, setText] = useState('')
  const end = useRef<HTMLDivElement>(null)
  useEffect(() => end.current?.scrollIntoView({ behavior: 'smooth' }), [a.messages])
  if (!a.open) return null
  const submit = () => {
    const t = text.trim()
    if (!t) return
    setText('')
    void a.send(t)
  }
  return (
    <aside className="agent" aria-label="Agente de IA">
      <div className="agent-head">
        <b>🤖 Agente tutor</b>
        <span className="muted">{a.configured ? `${a.settings.model}` : 'sin configurar'}</span>
        <span className="spacer" />
        <button className="btn-tiny" onClick={a.clear}>Limpiar</button>
        <button className="btn-tiny" onClick={() => a.setOpen(false)} aria-label="Cerrar">✕</button>
      </div>
      {!a.configured && (
        <div className="note warn">
          Falta tu API key o el ID del modelo. <Link to="/config" onClick={() => a.setOpen(false)}>Ir a Configuración</Link>
        </div>
      )}
      <div className="agent-ctx">
        {a.problem ? (
          <>
            <div className="muted">Ejercicio abierto:</div>
            <Tex>{a.problem.statement}</Tex>
          </>
        ) : (
          <span className="muted">Abre un ejercicio para que el agente conozca el contexto.</span>
        )}
        {a.ref && (
          <div className="ref-chip">
            <b>
              {a.ref.kind}
              {a.ref.n}
            </b>
            {a.ref.kind === 'L' ? <Tex>{a.ref.text}</Tex> : <code>{a.ref.text}</code>}
            <button className="btn-tiny" onClick={() => a.selectRef(null)} aria-label="Quitar referencia">✕</button>
          </div>
        )}
        <div className="muted small">Haz clic en una línea (L = procedimiento, P = Python) o escribe <code>@L5</code>, <code>@P12</code> en tu mensaje.</div>
      </div>
      <div className="quick">
        {QUICK.map(([l, q]) => (
          <button key={l} className="chip" disabled={a.busy} onClick={() => void a.send(q)}>
            {l}
          </button>
        ))}
      </div>
      <div className="agent-msgs">
        {a.messages.length === 0 && <p className="muted">Pregunta lo que quieras: el agente responde con fórmulas en LaTeX y paso a paso.</p>}
        {a.messages.map((m, i) => (
          <div key={i} className={`msg ${m.role}`}>
            {m.role === 'user' ? (
              <>
                {m.refs?.map((r) => (
                  <span key={r.kind + r.n} className="badge">
                    {r.kind}
                    {r.n}
                  </span>
                ))}
                <span>{m.content}</span>
              </>
            ) : m.content ? (
              <Md>{m.content}</Md>
            ) : (
              <span className="muted">pensando…</span>
            )}
          </div>
        ))}
        <div ref={end} />
      </div>
      <div className="agent-input">
        <textarea
          value={text}
          rows={2}
          placeholder="Escribe tu duda… (usa @L5 o @P12 para citar una línea)"
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              submit()
            }
          }}
        />
        {a.busy ? (
          <button className="btn" onClick={a.stop}>⏹ Detener</button>
        ) : (
          <button className="btn btn-primary" onClick={submit}>Enviar</button>
        )}
      </div>
    </aside>
  )
}
