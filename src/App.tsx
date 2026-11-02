import { HashRouter, NavLink, Route, Routes } from 'react-router-dom'
import { Casio, Home, Practica, Taller, TallerItem } from './pages/Pages'

export default function App() {
  return (
    <HashRouter>
      <div className="app">
        <header className="topbar">
          <span className="logo">∫ <b>Cálculo Integral</b> <small>notebook</small></span>
          <span className="spacer" />
          <span className="muted-top">Examen: fx-570ES PLUS · LaTeX en todo</span>
        </header>
        <div className="shell">
          <nav className="sidebar" aria-label="Secciones">
            <NavLink to="/" end>🏠 Inicio</NavLink>
            <NavLink to="/taller">① Taller resuelto</NavLink>
            <NavLink to="/practica">② Práctica y variantes</NavLink>
            <NavLink to="/casio">③ Calculadora Casio</NavLink>
            <div className="soon">Próximamente</div>
            <span className="disabled">④ Agente IA</span>
            <span className="disabled">⑤ Quiz guiado</span>
            <span className="disabled">⑥ Modo examen</span>
            <span className="disabled">⑦ Cheatsheet explicado</span>
            <span className="disabled">⑧ Álgebra desde cero</span>
          </nav>
          <main>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/taller" element={<Taller />} />
              <Route path="/taller/:fam" element={<TallerItem />} />
              <Route path="/practica" element={<Practica />} />
              <Route path="/practica/:fam/:level" element={<Practica />} />
              <Route path="/casio" element={<Casio />} />
            </Routes>
          </main>
        </div>
      </div>
    </HashRouter>
  )
}
