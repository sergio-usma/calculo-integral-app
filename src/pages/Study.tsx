import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { counter, getAlg, getCards, touchStreak } from '../app-storage'
import { ALL_ENTRIES } from '../content/cheatsheet'
import { LESSONS } from '../engine/algebra'

const PLAN: { when: string; what: string; link?: string; to?: string }[] = [
  { when: 'Bloque 1 · 15 min', what: 'Diagnóstico de álgebra y repaso de la lección más débil.', link: 'Álgebra', to: '/algebra' },
  { when: 'Bloque 2 · 15 min', what: 'Ejercicio 1 y 2 del taller con el visor línea por línea (modo foco).', link: 'Taller', to: '/taller' },
  { when: 'Pausa · 3 min', what: 'Levántate, toma agua, mira lejos. No uses el celular.' },
  { when: 'Bloque 3 · 15 min', what: 'Ejercicios 3 y 4 (exponencial y por partes). Dos tarjetas de memoria al terminar.', link: 'Tarjetas', to: '/cheatsheet' },
  { when: 'Bloque 4 · 15 min', what: 'Ejercicio 5 (trigonométrica) con el triángulo dibujado en papel.', link: 'Ejercicio 5', to: '/taller/5' },
  { when: 'Bloque 5 · 15 min', what: 'Ejercicio 6 (fracciones parciales) y verifica A y B con el quiz.', link: 'Quiz', to: '/quiz/6/G1' },
  { when: 'Bloque 6 · 20 min', what: 'Áreas 7a, 7b y 7c: grafica a mano, marca cortes y verifica con la Casio.', link: 'Casio', to: '/casio' },
  { when: 'Bloque 7 · 15 min', what: 'Variantes “Gemela A/B” de lo que más te costó (sin mirar la solución).', link: 'Práctica', to: '/practica' },
  { when: 'Antes de dormir · 10 min', what: 'Tarjetas de memoria (solo las pendientes) y relee la tabla “qué método uso”. Dormir bien consolida lo aprendido.', link: 'Cheatsheet', to: '/cheatsheet' },
  { when: 'Mañana · 30 min antes', what: 'Un modo examen corto: 2 integrales y 1 área. Respira, escribe primero el método.', link: 'Examen', to: '/examen' },
]

const TECHNIQUES = [
  ['⏱ Pomodoro 15/3', 'Trabaja 15 minutos con un solo objetivo y descansa 3. El quiz trae su propio reloj.'],
  ['🎯 Un paso a la vez', 'Usa el modo foco del visor. Tapa con la mano lo que viene. No leas dos pasos a la vez.'],
  ['✍ Escribe, no solo leas', 'Cubre la solución y escribe la siguiente línea en papel antes de verla (recuperación activa).'],
  ['🔁 Espaciado', 'Repasa las tarjetas a los 10 min, 1 h y 6 h. Dormir después de repasar fija la memoria.'],
  ['🧠 Mnemotecnias', 'Cada fórmula del cheatsheet trae una frase. Invéntate una tuya: lo absurdo se recuerda.'],
  ['📋 Checklist de examen', '1) escribe el método, 2) u/du o LIATE, 3) haz el cambio, 4) integra, 5) vuelve a x, 6) deriva para verificar.'],
  ['🧮 Casio como árbitro', 'Resuelve a mano; la calculadora solo confirma. Si no coincide: signos, paréntesis y RADIANES.'],
  ['🎁 Recompensa', 'Después de cada bloque, algo pequeño que disfrutes. Marca los bloques en esta lista.'],
]

export function Study() {
  const [done, setDone] = useState<number[]>(() => JSON.parse(localStorage.getItem('ci.plan') ?? '[]'))
  const [streak, setStreak] = useState(0)
  useEffect(() => setStreak(touchStreak().streak), [])
  const toggle = (i: number) => {
    const n = done.includes(i) ? done.filter((x) => x !== i) : [...done, i]
    setDone(n)
    localStorage.setItem('ci.plan', JSON.stringify(n))
  }
  const cards = getCards()
  const known = ALL_ENTRIES.filter((e) => (cards[e.id]?.box ?? 1) >= 3).length
  const alg = getAlg()
  return (
    <div className="page">
      <h1>Estudio y progreso</h1>
      <div className="grid-3">
        <div className="card"><h3>🔥 Racha</h3><p className="big-num">{streak} día{streak === 1 ? '' : 's'}</p></div>
        <div className="card"><h3>✅ Pasos de quiz acertados</h3><p className="big-num">{counter('solved')}</p></div>
        <div className="card"><h3>🏁 Quizzes terminados</h3><p className="big-num">{counter('quizzes')}</p></div>
        <div className="card"><h3>🃏 Fórmulas dominadas</h3><p className="big-num">{known}/{ALL_ENTRIES.length}</p></div>
        <div className="card">
          <h3>🧱 Álgebra</h3>
          {LESSONS.map((l) => (
            <div key={l.id} className="muted"><Link to={`/algebra/${l.id}`}>{l.icon} {l.title}</Link>: {alg[l.id] ? `${alg[l.id].ok}/${alg[l.id].total}` : '—'}</div>
          ))}
        </div>
      </div>

      <h2>Plan para antes del examen</h2>
      <div className="panel">
        {PLAN.map((p, i) => (
          <label key={i} className={`plan-row ${done.includes(i) ? 'done' : ''}`}>
            <input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} />
            <span><b>{p.when}</b> — {p.what} {p.to && <Link to={p.to}>{p.link} →</Link>}</span>
          </label>
        ))}
      </div>

      <h2>Técnicas que ayudan con la atención y la memoria</h2>
      <div className="grid-3">
        {TECHNIQUES.map(([t, d]) => (
          <div key={t} className="card"><h3>{t}</h3><p>{d}</p></div>
        ))}
      </div>
    </div>
  )
}
