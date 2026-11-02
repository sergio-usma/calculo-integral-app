import { useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { KeyChips } from '../components/KeyChips'
import { ProblemView } from '../components/ProblemView'
import { Md, Tex } from '../components/Tex'
import { FAMILIES, FAMILY_TITLE, LEVELS, TALLER_LABEL, generate } from '../engine'
import { LEVEL_LABEL } from '../engine/types'
import type { Level } from '../engine/types'

export function Home() {
  return (
    <div className="page">
      <h1>Cálculo Integral desde cero</h1>
      <p className="lead">
        Una guía para aprobar el examen paso a paso: ejercicios del taller resueltos, variantes ilimitadas, gráficas interactivas y cómo comprobar todo con tu <b>Casio fx-570ES PLUS</b>.
      </p>
      <div className="grid-3">
        <Link className="card big" to="/taller">
          <h3>① Taller resuelto</h3>
          <p>Los 9 ejercicios del taller, línea por línea, con gráfica y verificación.</p>
        </Link>
        <Link className="card big" to="/practica">
          <h3>② Práctica con variantes</h3>
          <p>Por cada ejercicio: 2 gemelos y 2 retos con trigonometría, π y más. Infinitos nuevos con un clic.</p>
        </Link>
        <Link className="card big" to="/casio">
          <h3>③ Tu calculadora Casio</h3>
          <p>Aprende las teclas exactas para verificar integrales, derivadas, cortes y áreas.</p>
        </Link>
      </div>
      <div className="panel">
        <h3>Cómo estudiar esto (plan anti-bloqueo)</h3>
        <ol>
          <li><b>Un ejercicio a la vez.</b> Abre uno del taller y avanza con <kbd>→</kbd> línea por línea. Si te cansas, usa el <b>Modo foco</b>.</li>
          <li><b>Trabaja en bloques de 15 minutos</b> y descansa 3. Tu cerebro retiene más con pausas.</li>
          <li><b>Primero lo intentas, luego miras.</b> Usa las pistas antes de ver la solución.</li>
          <li><b>Después de cada ejercicio: verifica con la Casio.</b> Es lo que harás en el examen.</li>
          <li><b>Repite con una variante gemela</b> hasta que salga sin mirar. Ahí está la nota.</li>
        </ol>
      </div>
      <div className="grid-3">
        <Link className="card big" to="/quiz/1/G1">
          <h3>④ Quiz guiado</h3>
          <p>Un paso a la vez, con autocompletado y pistas graduadas. Pensado para mantener el foco.</p>
        </Link>
        <Link className="card big" to="/examen">
          <h3>⑤ Modo examen</h3>
          <p>6 integrales + 3 áreas con temporizador. En las áreas debes graficar y marcar los cortes.</p>
        </Link>
        <Link className="card big" to="/config">
          <h3>⚙ Agente de IA</h3>
          <p>Pega tu API key (OpenAI u opencode Go) y pide explicaciones de cualquier línea del procedimiento o del código Python.</p>
        </Link>
      </div>
      <div className="panel">
        <h3>🐍 Para quien programa</h3>
        <p>Cada ejercicio trae su <b>versión en Python (SymPy)</b>, bloque por bloque, que puedes ejecutar en el navegador, copiar o descargar. Abre cualquier ejercicio y busca la pestaña <b>“Python paso a paso”</b>.</p>
      </div>
      <div className="grid-3">
        <Link className="card big" to="/cheatsheet">
          <h3>⑥ Cheatsheet explicado</h3>
          <p>Cada fórmula con su porqué, un ejemplo y una frase para recordarla. Con tarjetas de repaso espaciado.</p>
        </Link>
        <Link className="card big" to="/algebra">
          <h3>⑦ Álgebra desde cero</h3>
          <p>Signos, fracciones, potencias, factorizar, despejar, trigonometría y logaritmos, con práctica y diagnóstico.</p>
        </Link>
        <Link className="card big" to="/estudio">
          <h3>⑧ Estudio y progreso</h3>
          <p>Plan para antes del examen, técnicas para la atención y la memoria, y tu racha.</p>
        </Link>
      </div>
      <div className="panel note tip">
        <b>Sin internet:</b> después de la primera visita la app queda guardada en el navegador y funciona offline (menos el agente de IA y “Ejecutar Python aquí”).
      </div>
    </div>
  )
}

export function Taller() {
  return (
    <div className="page">
      <h1>Taller de Cálculo Integral</h1>
      <p className="lead">Escuela Naval de Cadetes “Almirante Padilla” · Identifica el método y resuelve cada integral.</p>
      <div className="grid-3">
        {FAMILIES.map((f) => {
          const p = generate(f, 'T')
          return (
            <Link key={f} className="card" to={`/taller/${f}`}>
              <span className="badge">Ejercicio {TALLER_LABEL[f]}</span>
              <div className="card-tex">
                <Tex>{p.kind === 'integral' ? p.statement : p.statement.split(',\\quad')[0] + ',\\ \\dots'}</Tex>
              </div>
              <small>{p.method}</small>
            </Link>
          )
        })}
      </div>
    </div>
  )
}

export function TallerItem() {
  const { fam } = useParams()
  const f = Number(fam)
  const p = useMemo(() => generate(f, 'T'), [f])
  const nav = useNavigate()
  return (
    <div className="page">
      <div className="crumbs">
        <Link to="/taller">← Taller</Link> / Ejercicio {TALLER_LABEL[f]}
      </div>
      <h1>
        Ejercicio {TALLER_LABEL[f]} · {FAMILY_TITLE[f]}
      </h1>
      <ProblemView p={p} label={TALLER_LABEL[f]} />
      <div className="row">
        {f > 1 && <button className="btn" onClick={() => nav(`/taller/${f - 1}`)}>← Anterior</button>}
        <button className="btn btn-primary" onClick={() => nav(`/practica/${f}/G1`)}>Practicar variantes de este ejercicio →</button>
        {f < 9 && <button className="btn" onClick={() => nav(`/taller/${f + 1}`)}>Siguiente →</button>}
      </div>
    </div>
  )
}

export function Practica() {
  const { fam, level } = useParams()
  const nav = useNavigate()
  const f = Number(fam ?? 1)
  const lv = (level ?? 'G1') as Level
  const [sp] = useSearchParams()
  const [seed, setSeed] = useState(Number(sp.get('seed')) || 1)
  const p = useMemo(() => generate(f, lv, seed), [f, lv, seed])
  return (
    <div className="page">
      <h1>Práctica con variantes</h1>
      <div className="panel selectors">
        <label>
          Ejercicio del taller
          <select value={f} onChange={(e) => { nav(`/practica/${e.target.value}/${lv}`); setSeed(1) }}>
            {FAMILIES.map((x) => (
              <option key={x} value={x}>
                {TALLER_LABEL[x]} · {FAMILY_TITLE[x]}
              </option>
            ))}
          </select>
        </label>
        <div className="seg" role="group" aria-label="Nivel">
          {LEVELS.map((l) => (
            <button key={l} className={l === lv ? 'seg-b on' : 'seg-b'} onClick={() => { nav(`/practica/${f}/${l}`); setSeed(1) }}>
              {LEVEL_LABEL[l]}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" onClick={() => setSeed(Math.floor(Math.random() * 100000) + 1)} disabled={lv === 'T'}>
          🎲 Otra variante
        </button>
      </div>
      <p className="muted">
        <b>Gemela</b> = misma dificultad que el taller con otros números · <b>Reto</b> = más difícil (trigonometría, π, dos pasos). Variante #{seed}.
      </p>
      <ProblemView key={p.id} p={p} label={`${TALLER_LABEL[f]}${lv}`} />
    </div>
  )
}

export function Casio() {
  return (
    <div className="page">
      <h1>Tu Casio fx-570ES PLUS</h1>
      <p className="lead">
        La calculadora puede <b>verificar</b> casi todo lo del taller. No te da la antiderivada, pero sí valores numéricos para comprobar que tu respuesta es correcta.
      </p>
      <div className="note warn">
        <b>Nota de fiabilidad:</b> el modo (MODE 1 COMP, MODE 7 TABLE), SETUP→Rad, CALC y SOLVE están confirmados en el manual oficial de Casio. Los nombres exactos de teclas físicas pueden variar un poco según el idioma de tu equipo (busca los símbolos impresos).
      </div>
      <Block title="1. Antes de empezar: modo y radianes" keys={['MODE', '1 (COMP)']} text="Todo se hace en modo COMP. Si vas a usar seno, coseno o π en una integral, pon RADIANES:" keys2={['SHIFT', 'MODE (SETUP)', '4 (Rad)']} text2="Verás una R pequeña en la pantalla. Si olvidas esto, las integrales con seno/coseno darán mal. Es el error número 1." />
      <Block title="2. Integral numérica ∫" keys={['∫', 'f(X)', '▶', 'límite inferior', '▶', 'límite superior', '=']} text={'Escribe la variable con ALPHA + ) (aparece X). Ejemplo: ∫ de 0 a 2 de (−X+4−X): se obtiene 4. Si sale “Time Out” o tarda, parte el intervalo en trozos. Con funciones con cruce, integra por separado cada región.'} />
      <Block title="3. Derivada numérica d/dx (verificar tu antiderivada)" keys={['SHIFT', '∫ (d/dx)', 'F(X)', '▶', 'a', '=']} text={'Escribe tu respuesta F(X) y el punto a. El resultado debe ser igual a f(a), el integrando evaluado en a. Si coincide en 2 o 3 puntos distintos, tu antiderivada es correcta. (Casio: no se pueden anidar ∫ ni d/dx dentro de otros.)'} />
      <Block title="4. CALC: evaluar sin reescribir" keys={['f(X)', 'CALC', '3', '=']} text="Escribe la expresión una vez con X; CALC te pide el valor de X. Presiona = para evaluar y CALC de nuevo para probar otro valor. Perfecto para F(b) − F(a)." />
      <Block title="5. SOLVE: puntos de corte" keys={['f(X) − g(X)', 'SHIFT', 'CALC (SOLVE)', 'valor inicial', '=', '=']} text="La calculadora resuelve f(X) − g(X) = 0. Solo da UNA solución a la vez, cercana a tu valor inicial. Cambia el valor inicial para hallar los otros cortes. Con seno/coseno, ¡radianes!" />
      <Block title="6. TABLE: ver quién está arriba" keys={['MODE', '7 (TABLE)', 'f(X) − g(X)', '=', 'Start', '=', 'End', '=', 'Step', '=']} text="Muestra una tabla de valores. Positivo = f arriba; negativo = g arriba. Máximo 30 filas (si ves Stack ERROR, aumenta el paso). Para volver: MODE 1." />
      <Block title="7. Fracciones, π, e, raíces y logaritmos" keys={['a b/c', 'SHIFT', '×10ˣ (π)', 'SHIFT', 'ln (eˣ)', '√', 'ln']} text="La tecla de fracción pone una fracción en la pantalla. π está en SHIFT + ×10ˣ. e^x en SHIFT + ln. Para convertir un resultado a decimal o fracción usa la tecla S⇔D." />
      <div className="panel">
        <h3>Estrategia para el examen</h3>
        <ol>
          <li>Resuelve <b>a mano</b> (eso da los puntos del procedimiento).</li>
          <li>Verifica la antiderivada con <b>d/dx</b> en un punto.</li>
          <li>Para áreas, verifica con <b>∫</b> y los cortes con <b>SOLVE</b>.</li>
          <li>Si el resultado de la Casio no coincide: revisa signos, paréntesis y que estés en <b>radianes</b>.</li>
        </ol>
        <p className="muted">
          Fórmula guía: <Tex>{'\\int_a^b f(x)\\,dx\\approx\\text{Casio}'}</Tex>
        </p>
      </div>
      <Md>{'_Cada ejercicio de la app trae su sección “Comprueba con tu Casio” con las teclas y el valor esperado exactos._'}</Md>
    </div>
  )
}

function Block({ title, keys, text, keys2, text2 }: { title: string; keys: string[]; text: string; keys2?: string[]; text2?: string }) {
  return (
    <div className="panel casio-card">
      <h3>{title}</h3>
      <KeyChips keys={keys} />
      <p>{text}</p>
      {keys2 && <KeyChips keys={keys2} />}
      {text2 && <p>{text2}</p>}
    </div>
  )
}
