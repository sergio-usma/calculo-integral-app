/* Persistencia local sencilla (localStorage) para progreso y flashcards. */
const read = <T,>(k: string, d: T): T => {
  try {
    const raw = localStorage.getItem(k)
    return raw ? (JSON.parse(raw) as T) : d
  } catch {
    return d
  }
}
const write = (k: string, v: unknown) => localStorage.setItem(k, JSON.stringify(v))

export interface Card {
  box: number
  due: number
}
/** Intervalos por caja (minutos) pensados para estudiar un día antes del examen. */
export const BOX_MIN = [0, 0, 10, 60, 360]

export const getCards = () => read<Record<string, Card>>('ci.leitner', {})
export function rateCard(id: string, rating: 'know' | 'doubt' | 'no') {
  const cards = getCards()
  const cur = cards[id] ?? { box: 1, due: 0 }
  const box = rating === 'know' ? Math.min(4, cur.box + 1) : rating === 'doubt' ? cur.box : 1
  cards[id] = { box, due: Date.now() + BOX_MIN[box] * 60_000 }
  write('ci.leitner', cards)
  return cards
}
export const resetCards = () => localStorage.removeItem('ci.leitner')

export interface AlgScore {
  ok: number
  total: number
}
export const getAlg = () => read<Record<string, AlgScore>>('ci.alg', {})
export function recordAlg(id: string, ok: boolean) {
  const a = getAlg()
  const cur = a[id] ?? { ok: 0, total: 0 }
  a[id] = { ok: cur.ok + (ok ? 1 : 0), total: cur.total + 1 }
  write('ci.alg', a)
}

export const counter = (k: string) => Number(localStorage.getItem(`ci.${k}`)) || 0
export function bumpCounter(k: string, by = 1) {
  localStorage.setItem(`ci.${k}`, String(counter(k) + by))
}

/** Racha de días consecutivos con actividad. */
export function touchStreak(): { streak: number; days: string[] } {
  const today = new Date().toISOString().slice(0, 10)
  const s = read<{ last: string; streak: number; days: string[] }>('ci.streak', { last: '', streak: 0, days: [] })
  if (s.last !== today) {
    const y = new Date(Date.now() - 864e5).toISOString().slice(0, 10)
    s.streak = s.last === y ? s.streak + 1 : 1
    s.last = today
    s.days = [...s.days.filter((d) => d !== today), today].slice(-30)
    write('ci.streak', s)
  }
  return { streak: s.streak, days: s.days }
}
