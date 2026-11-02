import { useMemo, useState } from 'react'
import { useAgent } from '../agent/AgentContext'
import { pythonFor } from '../engine/python'
import type { Problem } from '../engine/types'
import { runPython } from './pyrun'
import { Md, Tex } from './Tex'

const KW = /\b(def|return|for|in|if|else|assert|import|from|lambda|as|and|or|not|True|False|None)\b/
const TOKEN = new RegExp(`(#.*$)|("(?:[^"\\\\]|\\\\.)*"|'(?:[^'\\\\]|\\\\.)*')|${KW.source}|(\\b\\d[\\d_]*\\.?\\d*(?:e-?\\d+)?\\b)|(\\b[A-Za-z_]\\w*)(?=\\()`, 'g')

function Hl({ line }: { line: string }) {
  const out: React.ReactNode[] = []
  let last = 0
  line.replace(TOKEN, (m: string, com, str, kw, num, fn, off: number) => {
    if (off > last) out.push(line.slice(last, off))
    const cls = com ? 'py-c' : str ? 'py-s' : kw ? 'py-k' : num ? 'py-n' : fn ? 'py-f' : ''
    out.push(
      <span key={off} className={cls}>
        {m}
      </span>,
    )
    last = off + m.length
    return m
  })
  if (last < line.length) out.push(line.slice(last))
  return <>{out.length ? out : ' '}</>
}

export function PythonView({ p }: { p: Problem }) {
  const script = useMemo(() => pythonFor(p), [p])
  const lines = useMemo(() => script.full.split('\n'), [script])
  const agent = useAgent()
  const [cur, setCur] = useState(0)
  const [all, setAll] = useState(false)
  const [sel, setSel] = useState<number | null>(null)
  const [run, setRun] = useState<{ status: string; out: string; err: string | null } | null>(null)
  const [copied, setCopied] = useState(false)

  const bounds = (i: number) => [script.starts[i], (script.starts[i + 1] ?? lines.length + 1) - 1] as const
  const shown = all ? script.blocks.map((_, i) => i) : [cur]

  const copy = async () => {
    await navigator.clipboard.writeText(script.full)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  const download = () => {
    const blob = new Blob([script.full], { type: 'text/x-python' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `ejercicio_${p.id}.py`
    a.click()
    URL.revokeObjectURL(a.href)
  }
  const exec = async () => {
    setRun({ status: 'Iniciando…', out: '', err: null })
    try {
      const r = await runPython(script.full, (s) => setRun((x) => ({ status: s, out: x?.out ?? '', err: null })))
      setRun({ status: r.err ? 'Terminó con error' : '✔ Terminó', ...r })
    } catch (e) {
      setRun({ status: 'No se pudo ejecutar', out: '', err: (e as Error).message })
    }
  }
  const pick = (n: number) => {
    setSel(n)
    agent.selectRef({ kind: 'P', n, text: lines[n - 1] ?? '' })
  }

  return (
    <div className="pyview">
      <div className="panel">
        <b>🐍 El mismo ejercicio, en Python</b>
        <p>
          Cada bloque de código hace lo mismo que un paso de papel, usando <b>SymPy</b> (matemática simbólica). Al final, el script verifica su propio resultado de dos formas: derivando y con una integral numérica escrita a mano.
        </p>
        <div className="row tight">
          <button className="btn btn-primary" onClick={exec}>▶ Ejecutar aquí (Pyodide)</button>
          <button className="btn" onClick={copy}>{copied ? '✔ Copiado' : '📋 Copiar script'}</button>
          <button className="btn" onClick={download}>⬇ Descargar .py</button>
          <label className="check">
            <input type="checkbox" checked={all} onChange={(e) => setAll(e.target.checked)} /> Ver todo el script
          </label>
        </div>
        <p className="muted">
          En tu máquina: <code>pip install sympy</code> y <code>python ejercicio_{p.id}.py</code>. “Ejecutar aquí” descarga Python al navegador la primera vez (necesita internet).
        </p>
      </div>

      {!all && (
        <div className="dbg-bar">
          <button className="btn" onClick={() => setCur(Math.max(0, cur - 1))} disabled={cur === 0}>◀ Bloque anterior</button>
          <button className="btn btn-primary" onClick={() => setCur(Math.min(script.blocks.length - 1, cur + 1))} disabled={cur === script.blocks.length - 1}>Siguiente bloque ▶</button>
          <span className="muted">Bloque {cur + 1} de {script.blocks.length}</span>
        </div>
      )}

      {shown.map((i) => {
        const b = script.blocks[i]
        const [from, to] = bounds(i)
        return (
          <div key={i} className="py-block">
            <div className="py-title">
              <span className="badge">{i + 1}</span> {b.title}
            </div>
            {b.math && (
              <div className="py-math">
                <span className="muted">En papel: </span>
                <Tex>{b.math}</Tex>
              </div>
            )}
            <Md>{b.note}</Md>
            <pre className="py-code">
              {lines.slice(from - 1, to).map((ln, k) => {
                const n = from + k
                return (
                  <div key={n} className={`py-line ${sel === n ? 'selected' : ''}`} onClick={() => pick(n)} title="Clic: citar esta línea al agente (P{n})">
                    <span className="ln">P{n}</span>
                    <span className="src">
                      <Hl line={ln} />
                    </span>
                  </div>
                )
              })}
            </pre>
          </div>
        )
      })}

      {sel !== null && (
        <div className="panel">
          <b>Línea P{sel}</b> <code>{lines[sel - 1]}</code>
          <div className="row tight">
            <button className="btn" onClick={() => void agent.send(`Explícame con detalle la línea @P${sel} del código: qué hace y a qué paso matemático corresponde.`)}>🤖 Explícame @P{sel}</button>
          </div>
        </div>
      )}

      {run && (
        <div className="panel py-out">
          <b>Salida</b> <span className="muted">· {run.status}</span>
          <pre>{run.out || '(sin salida todavía)'}</pre>
          {run.err && <pre className="py-err">{run.err}</pre>}
        </div>
      )}
    </div>
  )
}
