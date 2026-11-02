import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { streamChat } from './client'
import type { ChatMessage } from './client'
import { isConfigured, loadSettings, saveSettings } from './settings'
import type { Settings } from './settings'

export interface ProblemCtx {
  id: string
  title: string
  statement: string
  method: string
  mathLines: string[]
  pyLines: string[]
  /** Extra opcional (p. ej. quiz): lo que el alumno escribió. */
  extra?: string
}

export interface Ref {
  kind: 'L' | 'P'
  n: number
  text: string
}

export interface Msg {
  role: 'user' | 'assistant' | 'error'
  content: string
  refs?: Ref[]
}

interface Ctx {
  settings: Settings
  setSettings: (s: Settings) => void
  configured: boolean
  open: boolean
  setOpen: (v: boolean) => void
  messages: Msg[]
  busy: boolean
  problem: ProblemCtx | null
  setProblem: (p: ProblemCtx | null) => void
  ref: Ref | null
  selectRef: (r: Ref | null) => void
  send: (text: string, extraContext?: string) => Promise<void>
  stop: () => void
  clear: () => void
}

const C = createContext<Ctx | null>(null)

export const SYSTEM = `Eres un tutor de Cálculo Integral para un estudiante universitario que parte de cero (sin base fuerte de álgebra), con poca memoria y posible TDAH. Responde SIEMPRE en español.
Reglas:
- Respuestas cortas, en viñetas o pasos numerados; una idea por viñeta. Nada de párrafos largos.
- TODAS las fórmulas en LaTeX: en línea con $...$ y en bloque con $$...$$. Nunca uses texto plano para matemáticas.
- Explica el álgebra implícita (signos, fracciones, potencias, factorización) sin saltarte pasos.
- Si el estudiante hace referencia a una línea (L = línea del procedimiento matemático, P = línea de código Python), explica ESA línea con detalle: qué hace, por qué, y qué sale de la anterior.
- Si hay un código Python, relaciona cada línea con el paso matemático equivalente.
- Termina con una mini-comprobación o una frase para recordar la idea (técnica de memoria).
- En modo quiz o cuando pidan pista: NO reveales la respuesta completa; da una pista graduada.
- La calculadora del estudiante es una Casio fx-570ES PLUS: cuando ayude, indica cómo verificar con ella.`

function buildContext(problem: ProblemCtx | null, refs: Ref[], extra?: string): string {
  if (!problem) return 'No hay un ejercicio abierto ahora mismo.'
  const lines = problem.mathLines.map((t, i) => `L${i + 1}: ${t}`).join('\n')
  const py = problem.pyLines.length ? `\nCódigo Python del ejercicio (numerado):\n${problem.pyLines.map((t, i) => `P${i + 1}: ${t}`).join('\n')}` : ''
  const sel = refs.length ? `\nLÍNEAS REFERENCIADAS POR EL ESTUDIANTE:\n${refs.map((r) => `${r.kind}${r.n}: ${r.text}`).join('\n')}` : ''
  return `EJERCICIO ABIERTO: ${problem.statement}\nMétodo: ${problem.method}\nProcedimiento en LaTeX (numerado):\n${lines}${py}${sel}${extra ? `\n${extra}` : ''}${problem.extra ? `\n${problem.extra}` : ''}`
}

export function AgentProvider({ children }: { children: ReactNode }) {
  const [settings, setS] = useState<Settings>(loadSettings)
  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Msg[]>([])
  const [busy, setBusy] = useState(false)
  const [problem, setProblem] = useState<ProblemCtx | null>(null)
  const [ref, setRef] = useState<Ref | null>(null)
  const abort = useRef<AbortController | null>(null)

  const setSettings = useCallback((s: Settings) => {
    setS(s)
    saveSettings(s)
  }, [])

  const send = useCallback(
    async (text: string, extraContext?: string) => {
      if (!text.trim() || busy) return
      // Resolver @L5 / @P12 escritos en el mensaje
      const refs: Ref[] = []
      if (ref) refs.push(ref)
      for (const m of text.matchAll(/@([LP])(\d+)/g)) {
        const n = Number(m[2])
        const arr = m[1] === 'L' ? problem?.mathLines : problem?.pyLines
        const t = arr?.[n - 1]
        if (t && !refs.some((r) => r.kind === m[1] && r.n === n)) refs.push({ kind: m[1] as 'L' | 'P', n, text: t })
      }
      const userMsg: Msg = { role: 'user', content: text, refs }
      const history = messages.filter((m) => m.role !== 'error')
      setMessages([...history, userMsg, { role: 'assistant', content: '' }])
      setOpen(true)
      if (!isConfigured(settings)) {
        setMessages((m) => [...m.slice(0, -1), { role: 'error', content: 'Aún no has configurado el agente. Ve a **Configuración** y pega tu API key y el ID del modelo.' }])
        return
      }
      const payload: ChatMessage[] = [
        { role: 'system', content: `${SYSTEM}\n\n${buildContext(problem, refs, extraContext)}` },
        ...history.slice(-10).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: text },
      ]
      const ac = new AbortController()
      abort.current = ac
      setBusy(true)
      let acc = ''
      try {
        await streamChat({
          settings,
          messages: payload,
          signal: ac.signal,
          onDelta: (d) => {
            acc += d
            setMessages((m) => [...m.slice(0, -1), { role: 'assistant', content: acc }])
          },
        })
        if (!acc) setMessages((m) => [...m.slice(0, -1), { role: 'error', content: 'El modelo no devolvió texto. Revisa el ID del modelo.' }])
      } catch (e) {
        setMessages((m) => [...m.slice(0, -1), ...(acc ? [{ role: 'assistant' as const, content: acc }] : []), { role: 'error', content: (e as Error).message }])
      } finally {
        setBusy(false)
        abort.current = null
      }
    },
    [busy, messages, problem, ref, settings],
  )

  const value = useMemo<Ctx>(
    () => ({
      settings,
      setSettings,
      configured: isConfigured(settings),
      open,
      setOpen,
      messages,
      busy,
      problem,
      setProblem,
      ref,
      selectRef: setRef,
      send,
      stop: () => abort.current?.abort(),
      clear: () => setMessages([]),
    }),
    [settings, setSettings, open, messages, busy, problem, ref, send],
  )
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useAgent() {
  const c = useContext(C)
  if (!c) throw new Error('useAgent fuera de AgentProvider')
  return c
}
