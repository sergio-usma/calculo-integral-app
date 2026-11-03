import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { streamChat } from './client'
import type { ChatMessage } from './client'
import { isConfigured, loadSettings, saveSettings } from './settings'
import type { Settings } from './settings'
import { loadSessions, saveSessions, upsertSession } from './history'
import type { Session } from './history'

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
  id: number
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
  /** Archiva el chat actual y empieza uno nuevo. */
  newChat: () => void
  sessions: Session[]
  loadSession: (id: string) => void
  deleteSession: (id: string) => void
  wide: boolean
  setWide: (v: boolean) => void
}

const C = createContext<Ctx | null>(null)

export const SYSTEM = String.raw`Eres un tutor de Cálculo Integral para un estudiante universitario que parte de cero (sin base fuerte de álgebra), con poca memoria y posible TDAH. Responde SIEMPRE en español.
Reglas:
- Respuestas cortas, en viñetas o pasos numerados; una idea por viñeta. Nada de párrafos largos.
- TODAS las fórmulas en LaTeX, SOLO con estos delimitadores: en línea $...$ y en bloque $$...$$ (cada $$ va en su propia línea y SIEMPRE se cierra). Nunca uses \( \) ni \[ \]. Nunca escribas comandos LaTeX (\frac, \int, \theta…) fuera de $. Nunca uses texto plano para matemáticas.
  Correcto: la integral es $\int \cos 2\theta\,d\theta=\frac{\sin 2\theta}{2}+C$.
  Incorrecto: la integral es \int \cos 2\theta d\theta = \frac{\sin 2\theta}{2}$$
- Explica el álgebra implícita (signos, fracciones, potencias, factorización) sin saltarte pasos.
- Si el estudiante hace referencia a una línea (L = línea del procedimiento matemático, P = línea de código Python), explica ESA línea con detalle: qué hace, por qué, y qué sale de la anterior.
- Si hay un código Python, relaciona cada línea con el paso matemático equivalente.
- Termina con una mini-comprobación o una frase para recordar la idea (técnica de memoria).
- En modo quiz o cuando pidan pista: NO reveales la respuesta completa; da una pista graduada.
- La calculadora del estudiante es una Casio fx-570ES PLUS: cuando ayude, indica cómo verificar con ella.`

/** Se añade a los prompts predefinidos para que el modelo responda siempre con fórmulas en LaTeX. */
export const LATEX_HINT = ' Escribe TODAS las expresiones y fórmulas en LaTeX ($...$ en línea, $$...$$ en bloque).'

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
  const [sessions, setSessions] = useState<Session[]>(loadSessions)
  const sessionId = useRef<string | null>(null)
  const [wide, setWideS] = useState(() => localStorage.getItem('ci.agent.wide') === '1')
  const setWide = useCallback((v: boolean) => {
    setWideS(v)
    localStorage.setItem('ci.agent.wide', v ? '1' : '0')
  }, [])

  const setSettings = useCallback((s: Settings) => {
    setS(s)
    saveSettings(s)
  }, [])

  // Refs: la función send() no depende de `messages`/`busy`, así que no se recrea en cada token
  // y nunca lee estado viejo (stale closure).
  const busyRef = useRef(false)
  const messagesRef = useRef<Msg[]>([])
  const problemRef = useRef<ProblemCtx | null>(null)
  const refRef = useRef<Ref | null>(null)
  const settingsRef = useRef(settings)
  const nextId = useRef(1)
  const mounted = useRef(true)
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      abort.current?.abort()
    }
  }, [])
  useEffect(() => {
    messagesRef.current = messages
    problemRef.current = problem
    refRef.current = ref
    settingsRef.current = settings
  })

  /** Actualiza un mensaje por id (no por posición: seguro aunque se pulse «Limpiar» a mitad). */
  const patch = useCallback((id: number, fn: (m: Msg) => Msg) => {
    if (!mounted.current) return
    setMessages((all) => all.map((m) => (m.id === id ? fn(m) : m)))
  }, [])

  const send = useCallback(
    async (text: string, extraContext?: string) => {
      if (!text.trim() || busyRef.current) return
      const problem = problemRef.current
      const settings = settingsRef.current
      // Resolver @L5 / @P12 escritos en el mensaje
      const refs: Ref[] = []
      if (refRef.current) refs.push(refRef.current)
      for (const m of text.matchAll(/@([LP])(\d+)/gi)) {
        const kind = m[1].toUpperCase() as 'L' | 'P'
        const n = Number(m[2])
        const arr = kind === 'L' ? problem?.mathLines : problem?.pyLines
        const t = arr?.[n - 1]
        if (t && !refs.some((r) => r.kind === kind && r.n === n)) refs.push({ kind, n, text: t })
      }
      const history = messagesRef.current.filter((m) => m.role !== 'error' && m.content)
      const userMsg: Msg = { id: nextId.current++, role: 'user', content: text, refs }
      const botId = nextId.current++
      setMessages([...messagesRef.current.filter((m) => m.role !== 'error'), userMsg, { id: botId, role: 'assistant', content: '' }])
      setOpen(true)
      if (!isConfigured(settings)) {
        patch(botId, () => ({ id: botId, role: 'error', content: 'Aún no has configurado el agente. Ve a **Configuración** y pega tu API key y el ID del modelo.' }))
        return
      }
      const payload: ChatMessage[] = [
        { role: 'system', content: `${SYSTEM}

${buildContext(problem, refs, extraContext)}` },
        ...history.slice(-10).map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content })),
        { role: 'user', content: text },
      ]
      const ac = new AbortController()
      abort.current = ac
      busyRef.current = true
      setBusy(true)
      let acc = ''
      try {
        await streamChat({
          settings,
          messages: payload,
          signal: ac.signal,
          onDelta: (d) => {
            acc += d
            patch(botId, (m) => ({ ...m, content: acc }))
          },
        })
        if (!acc && !ac.signal.aborted) patch(botId, () => ({ id: botId, role: 'error', content: 'El modelo no devolvió texto. Revisa el ID del modelo.' }))
        else if (!acc) patch(botId, () => ({ id: botId, role: 'error', content: 'Respuesta detenida.' }))
      } catch (e) {
        const msg = (e as Error)?.message || 'Error desconocido al llamar al agente.'
        if (acc) {
          const errId = nextId.current++
          if (mounted.current) setMessages((all) => [...all, { id: errId, role: 'error', content: msg }])
        } else patch(botId, () => ({ id: botId, role: 'error', content: msg }))
      } finally {
        busyRef.current = false
        abort.current = null
        if (mounted.current) setBusy(false)
      }
    },
    [patch],
  )

  const stop = useCallback(() => abort.current?.abort(), [])

  // Guarda la conversación en el historial cuando termina de responder.
  useEffect(() => {
    if (busy || !messages.some((m) => m.role === 'user')) return
    if (!sessionId.current) sessionId.current = `s${Date.now().toString(36)}`
    const first = messages.find((m) => m.role === 'user')?.content ?? 'Chat'
    setSessions((prev) => {
      const next = upsertSession(prev, {
        id: sessionId.current!,
        title: first.replace(/\s+/g, ' ').slice(0, 60),
        problemId: problemRef.current?.id,
        updatedAt: Date.now(),
        messages,
      })
      saveSessions(next)
      return next
    })
  }, [messages, busy])

  const newChat = useCallback(() => {
    abort.current?.abort()
    sessionId.current = null
    setMessages([])
  }, [])
  const loadSession = useCallback((id: string) => {
    const s = loadSessions().find((x) => x.id === id)
    if (!s) return
    abort.current?.abort()
    sessionId.current = s.id
    nextId.current = Math.max(0, ...s.messages.map((m) => m.id)) + 1
    setMessages(s.messages)
  }, [])
  const deleteSession = useCallback((id: string) => {
    setSessions((prev) => {
      const next = prev.filter((x) => x.id !== id)
      saveSessions(next)
      return next
    })
    if (sessionId.current === id) {
      sessionId.current = null
      setMessages([])
    }
  }, [])

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
      stop,
      newChat,
      sessions,
      loadSession,
      deleteSession,
      wide,
      setWide,
    }),
    [settings, setSettings, open, messages, busy, problem, ref, send, stop, newChat, sessions, loadSession, deleteSession, wide, setWide],
  )
  return <C.Provider value={value}>{children}</C.Provider>
}

export function useAgent() {
  const c = useContext(C)
  if (!c) throw new Error('useAgent fuera de AgentProvider')
  return c
}
