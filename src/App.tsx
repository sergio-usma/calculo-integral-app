import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { AgentProvider, useAgent } from './agent/AgentContext'
import { AgentPanel } from './components/AgentPanel'
import { Config } from './pages/Config'
import { Exam } from './pages/Exam'
import { Casio, Home, Practica, Taller, TallerItem } from './pages/Pages'
import { Quiz } from './pages/Quiz'

function AgentButton() {
  const a = useAgent()
  return (
    <button className="btn-top" onClick={() => a.setOpen(!a.open)} aria-pressed={a.open}>
      🤖 Agente {a.configured ? '' : '(sin configurar)'}
    </button>
  )
}

export default function App() {
  return (
    <AgentProvider>
    <HashRouter>
      <div className="app">
        <header className="topbar">
          <span className="logo">∫ <b>Cálculo Integral</b> <small>notebook</small></span>
          <span className="spacer" />
          <span className="muted-top">fx-570ES PLUS · LaTeX en todo</span>
          <AgentButton />
        </header>
        <div className="shell">
          <nav className="sidebar" aria-label="Secciones">
            <NavLink to="/" end>🏠 Inicio</NavLink>
            <NavLink to="/taller">① Taller resuelto</NavLink>
            <NavLink to="/practica">② Práctica y variantes</NavLink>
            <NavLink to="/casio">③ Calculadora Casio</NavLink>
            <NavLink to="/quiz/1/G1">④ Quiz guiado (TDAH)</NavLink>
            <NavLink to="/examen">⑤ Modo examen</NavLink>
            <NavLink to="/config">⚙ Configuración · Agente IA</NavLink>
            <div className="soon">Próximamente</div>
            <span className="disabled">⑥ Cheatsheet explicado</span>
            <span className="disabled">⑦ Álgebra desde cero</span>
          </nav>
          <main>
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
            </Routes>
          </main>
          <AgentPanel />
        </div>
      </div>
    </HashRouter>
    </AgentProvider>
  )
}
