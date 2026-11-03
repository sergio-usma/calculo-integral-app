import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { HashRouter, NavLink, Route, Routes, useLocation } from 'react-router-dom'
import { AgentProvider, useAgent } from './agent/AgentContext'
import { AgentPanel } from './components/AgentPanel'
import { ErrorBoundary } from './components/ErrorBoundary'
import { AlgebraHome, AlgebraLesson } from './pages/Algebra'
import { Cheatsheet } from './pages/Cheat'
import { Config } from './pages/Config'
import { Exam } from './pages/Exam'
import { Casio, Home, Practica, Taller, TallerItem } from './pages/Pages'
import { Quiz } from './pages/Quiz'
import { Study } from './pages/Study'

function AgentButton() {
  const a = useAgent()
  return (
    <button className="btn-top" onClick={() => a.setOpen(!a.open)} aria-pressed={a.open} aria-label="Agente de IA">
      🤖<span className="btn-top-txt"> Agente{a.configured ? '' : ' (sin configurar)'}</span>
    </button>
  )
}

/** Aísla fallos: un error en una página o en el panel del agente no tumba el resto; se limpia al navegar. */
function Guard({ children }: { children: ReactNode }) {
  const loc = useLocation()
  return <ErrorBoundary resetKey={loc.pathname}>{children}</ErrorBoundary>
}

function Shell() {
  const [menu, setMenu] = useState(false)
  const loc = useLocation()
  useEffect(() => setMenu(false), [loc.pathname])
  useEffect(() => {
    if (!menu) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setMenu(false)
    window.addEventListener('keydown', onKey)
    document.body.classList.add('no-scroll')
    return () => {
      window.removeEventListener('keydown', onKey)
      document.body.classList.remove('no-scroll')
    }
  }, [menu])
  return (
      <div className="app">
        <header className="topbar">
          <button className="burger" onClick={() => setMenu((m) => !m)} aria-label="Menú" aria-expanded={menu} aria-controls="nav">
            <span /><span /><span />
          </button>
          <span className="logo">∫ <b>Cálculo Integral</b> <small>notebook</small></span>
          <span className="spacer" />
          <span className="muted-top">fx-570ES PLUS · LaTeX en todo</span>
          <AgentButton />
        </header>
        <div className="shell">
          {menu && <div className="nav-backdrop" onClick={() => setMenu(false)} />}
          <nav id="nav" className={`sidebar${menu ? ' open' : ''}`} aria-label="Secciones">
            <NavLink to="/" end>🏠 Inicio</NavLink>
            <NavLink to="/taller">① Taller resuelto</NavLink>
            <NavLink to="/practica">② Práctica y variantes</NavLink>
            <NavLink to="/casio">③ Calculadora Casio</NavLink>
            <NavLink to="/quiz/1/G1">④ Quiz guiado (TDAH)</NavLink>
            <NavLink to="/examen">⑤ Modo examen</NavLink>
            <NavLink to="/config">⚙ Configuración · Agente IA</NavLink>
            <NavLink to="/cheatsheet">⑥ Cheatsheet explicado</NavLink>
            <NavLink to="/algebra">⑦ Álgebra desde cero</NavLink>
            <NavLink to="/estudio">⑧ Estudio y progreso</NavLink>
          </nav>
          <main>
            <Guard>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/taller" element={<Taller />} />
              <Route path="/taller/:fam" element={<TallerItem />} />
              <Route path="/practica" element={<Practica />} />
              <Route path="/practica/:fam/:level" element={<Practica />} />
              <Route path="/casio" element={<Casio />} />
              <Route path="/quiz" element={<Quiz />} />
              <Route path="/quiz/:fam/:level" element={<Quiz />} />
              <Route path="/examen" element={<Exam />} />
              <Route path="/config" element={<Config />} />
              <Route path="/cheatsheet" element={<Cheatsheet />} />
              <Route path="/algebra" element={<AlgebraHome />} />
              <Route path="/algebra/:id" element={<AlgebraLesson />} />
              <Route path="/estudio" element={<Study />} />
            </Routes>
            </Guard>
          </main>
          <Guard>
            <AgentPanel />
          </Guard>
        </div>
      </div>
  )
}

export default function App() {
  return (
    <AgentProvider>
      <HashRouter>
        <Shell />
      </HashRouter>
    </AgentProvider>
  )
}
