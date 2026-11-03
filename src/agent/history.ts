import type { Msg } from './AgentContext'

export interface Session {
  id: string
  title: string
  problemId?: string
  updatedAt: number
  messages: Msg[]
}

const KEY = 'ci.agent.history'
const MAX = 30

export function loadSessions(): Session[] {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) ?? '[]')
    return Array.isArray(raw) ? raw : []
  } catch {
    return []
  }
}

export function saveSessions(list: Session[]): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, MAX)))
  } catch {
    /* almacenamiento lleno o bloqueado: el historial es opcional */
  }
}

/** Inserta/actualiza una sesión (la más reciente primero). Ignora mensajes de error. */
export function upsertSession(list: Session[], s: Session): Session[] {
  const messages = s.messages.filter((m) => m.role !== 'error' && m.content)
  if (!messages.length) return list
  return [{ ...s, messages }, ...list.filter((x) => x.id !== s.id)].slice(0, MAX)
}
