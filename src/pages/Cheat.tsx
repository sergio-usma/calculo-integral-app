import { useMemo, useState } from 'react'
import { LATEX_HINT, useAgent } from '../agent/AgentContext'
import { bumpCounter, getCards, rateCard, resetCards } from '../app-storage'
import { Md, Tex } from '../components/Tex'
import { ALL_ENTRIES, CHEATSHEET } from '../content/cheatsheet'
import type { Entry } from '../content/cheatsheet'

export function Cheatsheet() {
  const [q, setQ] = useState('')
  const [mode, setMode] = useState<'read' | 'cards'>('read')
  return (
    <div className="page">
      <h1>Cheatsheet explicado</h1>
      <p className="lead">Cada fórmula con su <b>por qué</b>, un ejemplo y una <b>regla para recordarla</b>. Luego practícala con tarjetas de repaso espaciado.</p>
      <div className="seg" role="tablist">
        <button className={mode === 'read' ? 'seg-b on' : 'seg-b'} onClick={() => setMode('read')}>📖 Leer y entender</button>
        <button className={mode === 'cards' ? 'seg-b on' : 'seg-b'} onClick={() => setMode('cards')}>🃏 Tarjetas de memoria</button>
      </div>
      {mode === 'read' ? (
        <>
          <label className="field">
            Buscar
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="p. ej. seno, partes, logaritmo…" />
          </label>
          {CHEATSHEET.map((s) => {
            const es = s.entries.filter((e) => !q.trim() || `${e.name} ${e.mnemonic} ${e.why}`.toLowerCase().includes(q.toLowerCase()))
            if (!es.length) return null
            return (
              <section key={s.id} className="cs-section">
                <h2>{s.icon} {s.title}</h2>
                <Md>{s.intro}</Md>
                {es.map((e) => (
                  <EntryCard key={e.id} e={e} />
                ))}
              </section>
            )
          })}
        </>
      ) : (
        <Flashcards />
      )}
    </div>
  )
}

function EntryCard({ e }: { e: Entry }) {
  const agent = useAgent()
  return (
    <details className="cs-card">
      <summary>
        <span className="cs-name">{e.name}</span>
        <span className="cs-tex"><Tex>{e.tex}</Tex></span>
      </summary>
      <div className="cs-body">
        <h4>¿Por qué?</h4>
        <Md>{e.why}</Md>
        <h4>Ejemplo</h4>
        {e.example.map((t, i) => <Tex key={i} block>{t}</Tex>)}
        <div className="note tip"><b>🧠 Para recordarlo:</b> <Md>{e.mnemonic}</Md></div>
        <button
          className="btn"
          onClick={() => void agent.send(`Explícame con otras palabras y con un ejemplo distinto esta fórmula: ${e.name}: $${e.tex}$. ¿Cuándo la uso y cómo no confundirla?` + LATEX_HINT)}
        >
          🤖 Explícamela con otro ejemplo
        </button>
      </div>
    </details>
  )
}

function Flashcards() {
  const [cards, setCards] = useState(getCards)
  const [i, setI] = useState(0)
  const [flip, setFlip] = useState(false)
  const now = Date.now()
  const deck = useMemo(() => {
    const due = ALL_ENTRIES.filter((e) => (cards[e.id]?.due ?? 0) <= now)
    return due.sort((a, b) => (cards[a.id]?.box ?? 1) - (cards[b.id]?.box ?? 1))
  }, [cards]) // eslint-disable-line react-hooks/exhaustive-deps
  const known = ALL_ENTRIES.filter((e) => (cards[e.id]?.box ?? 1) >= 3).length
  const cur = deck[i % Math.max(1, deck.length)]

  const rate = (r: 'know' | 'doubt' | 'no') => {
    setCards(rateCard(cur.id, r))
    if (r === 'know') bumpCounter('cardsKnown')
    setFlip(false)
    setI(0)
  }

  return (
    <div>
      <div className="panel quiz-bar">
        <div className="progress"><i style={{ width: `${(known / ALL_ENTRIES.length) * 100}%` }} /></div>
        <span className="muted">Dominadas: {known} de {ALL_ENTRIES.length} · Por repasar ahora: {deck.length}</span>
        <span className="spacer" />
        <button className="btn-tiny" onClick={() => { resetCards(); setCards({}) }}>Reiniciar progreso</button>
      </div>
      {!cur ? (
        <div className="panel ok">
          <h3>🎉 ¡Al día!</h3>
          <p>No hay tarjetas pendientes. Vuelve en unos minutos: el repaso espaciado funciona mejor con pausas (10 min, 1 h, 6 h).</p>
        </div>
      ) : (
        <div className="flash">
          <div className="muted">{cur.section} · caja {cards[cur.id]?.box ?? 1}</div>
          <h2 className="flash-title">{cur.name}</h2>
          {!flip ? (
            <>
              <p className="muted">Intenta recordar la fórmula (o escríbela en papel) antes de mirar.</p>
              <button className="btn btn-primary" onClick={() => setFlip(true)}>Mostrar respuesta</button>
            </>
          ) : (
            <>
              <Tex block>{cur.tex}</Tex>
              <div className="note tip"><b>🧠</b> <Md>{cur.mnemonic}</Md></div>
              <div className="row tight">
                <button className="btn" onClick={() => rate('no')}>😵 No la sabía</button>
                <button className="btn" onClick={() => rate('doubt')}>🤔 Dudé</button>
                <button className="btn btn-primary" onClick={() => rate('know')}>✅ La sabía</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  )
}
