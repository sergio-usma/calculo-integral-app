import type { Settings } from './settings'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

/** Extrae eventos "data: ..." completos de un buffer SSE; devuelve lo que sobra para el siguiente trozo. */
export function splitSSE(buffer: string): { events: string[]; rest: string } {
  const parts = buffer.split(/\r?\n\r?\n/)
  const rest = parts.pop() ?? ''
  const events: string[] = []
  for (const block of parts) {
    const data = block
      .split(/\r?\n/)
      .filter((l) => l.startsWith('data:'))
      .map((l) => l.slice(5).trimStart())
      .join('\n')
    if (data) events.push(data)
  }
  return { events, rest }
}

/** Texto nuevo contenido en un evento SSE de chat.completions ('' si no hay; null si es [DONE]). */
export function deltaOf(event: string): string | null {
  if (event.trim() === '[DONE]') return null
  try {
    const j = JSON.parse(event)
    const c = j.choices?.[0]
    return c?.delta?.content ?? c?.message?.content ?? ''
  } catch {
    return ''
  }
}

export function friendlyError(status: number, body: string): string {
  let msg = ''
  try {
    msg = JSON.parse(body)?.error?.message ?? ''
  } catch {
    msg = body.slice(0, 200)
  }
  if (status === 401 || status === 403) return `La clave fue rechazada (${status}). Revisa que la API key sea correcta y tenga acceso al modelo. ${msg}`
  if (status === 404) return `No se encontró el modelo o la ruta (404). Revisa el ID del modelo y la URL base. ${msg}`
  if (status === 429) return `Demasiadas solicitudes o sin saldo (429). ${msg}`
  if (status >= 500) return `El servidor del proveedor falló (${status}). Intenta de nuevo. ${msg}`
  return `Error ${status}. ${msg}`
}

export async function streamChat(opts: {
  settings: Settings
  messages: ChatMessage[]
  signal?: AbortSignal
  onDelta: (text: string) => void
}): Promise<void> {
  const { settings, messages, signal, onDelta } = opts
  const url = `${settings.baseUrl.replace(/\/+$/, '')}/chat/completions`
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey.trim()}` },
      body: JSON.stringify({ model: settings.model.trim(), messages, stream: true }),
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    throw new Error('No se pudo conectar. Puede ser falta de internet o que el proveedor no permita llamadas desde el navegador (CORS).')
  }
  if (!res.ok) throw new Error(friendlyError(res.status, await res.text()))
  if (!res.body) {
    const j = await res.json()
    onDelta(j.choices?.[0]?.message?.content ?? '')
    return
  }
  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const { events, rest } = splitSSE(buf)
    buf = rest
    for (const ev of events) {
      const d = deltaOf(ev)
      if (d === null) return
      if (d) onDelta(d)
    }
  }
  const tail = splitSSE(buf + '\n\n').events
  for (const ev of tail) {
    const d = deltaOf(ev)
    if (d) onDelta(d)
  }
}
