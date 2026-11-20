import { useMemo, useState } from 'react'
import { fn, fmtNum, simpson } from '../engine/util'
import type { Problem } from '../engine/types'
import { Graph } from './Graph'
import { Md, Tex } from './Tex'

const colorOf = (i: number) => (i === 0 ? '#9ec5f4' : '#f5b7b1')

/** Gráfica de un problema de área con rectángulo dx y suma de Riemann. */
export function AreaViz({ p }: { p: Problem }) {
  const a = p.area!
  const lo = Math.min(...a.regions.map((r) => r.a))
  const hi = Math.max(...a.regions.map((r) => r.b))
  const [x, setX] = useState(lo + (hi - lo) * 0.3)
  const [dxf, setDxf] = useState(0.04)
  const [n, setN] = useState(8)
  const [showRiemann, setShowRiemann] = useState(false)
  const regs = useMemo(() => a.regions.map((r, i) => ({ ...r, color: colorOf(i), f: fn(r.top), g: fn(r.bottom) })), [a.regions])
  const span = hi - lo
  const dx = dxf * span
  const cur = regs.find((r) => x >= r.a && x <= r.b)
  const rect = cur ? { x0: x - dx / 2, x1: x + dx / 2, y0: cur.g(x), y1: cur.f(x) } : null
  const rects = useMemo(() => {
    if (!showRiemann) return []
    const out: { x0: number; x1: number; y0: number; y1: number }[] = []
    for (const r of regs) {
      const k = Math.max(1, Math.round((n * (r.b - r.a)) / span))
      const w = (r.b - r.a) / k
      for (let i = 0; i < k; i++) {
        const m = r.a + (i + 0.5) * w
        out.push({ x0: r.a + i * w, x1: r.a + (i + 1) * w, y0: r.g(m), y1: r.f(m) })
      }
    }
    return out
  }, [regs, n, showRiemann, span])
  const riemann = rects.reduce((s, r) => s + (r.y1 - r.y0) * (r.x1 - r.x0), 0)

  return (
    <div>
      <Graph
        curves={a.curves.map((c) => ({ expr: c.expr, color: c.color }))}
        regions={regs}
        points={a.points}
        view={a.view}
        vline={a.vline}
        rects={rects}
        highlightRect={rect}
      />
      <div className="panel controls">
        <div className="legend-tex">
          {a.curves.map((c) => (
            <span key={c.label} style={{ color: c.color }}>
              <Tex>{c.tex}</Tex>
            </span>
          ))}
        </div>
        <label>
          Posición del rectángulo: <b>x = {fmtNum(x, 3)}</b>
          <input type="range" min={lo} max={hi} step={span / 200} value={x} onChange={(e) => setX(Number(e.target.value))} />
        </label>
        <label>
          Ancho <Tex>{'dx'}</Tex>: <b>{fmtNum(dx, 3)}</b>
          <input type="range" min={0.005} max={0.2} step={0.005} value={dxf} onChange={(e) => setDxf(Number(e.target.value))} />
        </label>
        {rect && (
          <p className="calc">
            Altura <Tex>{'h=f(x)-g(x)'}</Tex> = <b>{fmtNum(rect.y1 - rect.y0, 4)}</b> · Área de este rectángulo <Tex>{'dA=h\\,dx'}</Tex> ≈ <b>{fmtNum((rect.y1 - rect.y0) * dx, 5)}</b>
          </p>
        )}
        <label className="check">
          <input type="checkbox" checked={showRiemann} onChange={(e) => setShowRiemann(e.target.checked)} /> Mostrar suma de rectángulos (idea de la integral)
        </label>
        {showRiemann && (
          <>
            <label>
              Número de rectángulos: <b>{n}</b>
              <input type="range" min={2} max={80} value={n} onChange={(e) => setN(Number(e.target.value))} />
            </label>
            <p className="calc">
              Suma de rectángulos ≈ <b>{fmtNum(riemann, 4)}</b> · Área exacta = <b>{fmtNum(a.value, 4)}</b> · Más rectángulos ⇒ más cerca: eso es integrar.
            </p>
          </>
        )}
      </div>
    </div>
  )
}

/** Gráfica del integrando con el área bajo la curva y la antiderivada. */
export function IntegralViz({ p }: { p: Problem }) {
  const f = useMemo(() => fn(p.fExpr!), [p.fExpr])
  const F = useMemo(() => fn(p.FExpr!), [p.FExpr])
  const [b0, b1] = p.bounds!
  const span = b1 - b0 || 1
  const [lo, setLo] = useState(b0)
  const [hi, setHi] = useState(b1)
  const view = useMemo<[number, number, number, number]>(() => {
    const xa = b0 - span * 0.6
    const xb = b1 + span * 0.6
    let ymin = 0
    let ymax = 0
    for (let i = 0; i <= 200; i++) {
      const xx = xa + ((xb - xa) * i) / 200
      const y = f(xx)
      if (Number.isFinite(y) && Math.abs(y) < 40) {
        ymin = Math.min(ymin, y)
        ymax = Math.max(ymax, y)
      }
    }
    const pad = (ymax - ymin || 1) * 0.15
    return [xa, xb, ymin - pad, ymax + pad]
  }, [b0, b1, span, f])
  const area = simpson(f, lo, hi)
  const diff = F(hi) - F(lo)
  const regions = [{ a: Math.min(lo, hi), b: Math.max(lo, hi), top: p.fExpr!, bottom: '0', color: '#9ec5f4' }]
  return (
    <div>
      <Graph
        curves={[
          { expr: p.fExpr!, color: '#1f5fa8', label: 'f(x): el integrando' },
          { expr: p.FExpr!, color: '#c0392b', label: 'F(x): tu antiderivada', dashed: true },
        ]}
        regions={regions}
        points={[
          { x: lo, y: f(lo), label: 'a' },
          { x: hi, y: f(hi), label: 'b' },
        ]}
        view={view}
      />
      <div className="panel controls">
        <label>
          Límite inferior <Tex>{'a'}</Tex>: <b>{fmtNum(lo, 3)}</b>
          <input type="range" min={b0} max={b1} step={span / 200} value={lo} onChange={(e) => setLo(Number(e.target.value))} />
        </label>
        <label>
          Límite superior <Tex>{'b'}</Tex>: <b>{fmtNum(hi, 3)}</b>
          <input type="range" min={b0} max={b1} step={span / 200} value={hi} onChange={(e) => setHi(Number(e.target.value))} />
        </label>
        <p className="calc">
          Área sombreada (con signo) <Tex>{'\\int_a^b f(x)\\,dx'}</Tex> ≈ <b>{fmtNum(area, 5)}</b>
        </p>
        <p className="calc">
          Con la antiderivada: <Tex>{'F(b)-F(a)'}</Tex> = <b>{fmtNum(diff, 5)}</b> {Math.abs(area - diff) < 1e-4 ? '✓ coinciden' : '(distintos: revisa el dominio)'}
        </p>
        <p className="muted">Lo sombreado por debajo del eje x cuenta como negativo. La curva punteada es F: su pendiente en cada punto es el valor de f.</p>
      </div>
    </div>
  )
}

const SW = 760
const SH = 300

/** Vista lateral del sólido de revolución: región + su reflejo, y rebanadas (discos/arandelas) con su cara circular. */
function SolidView({ lo, hi, R, r, washer, view, x, dx, slices }: { lo: number; hi: number; R: (x: number) => number; r: (x: number) => number; washer: boolean; view: [number, number, number, number]; x: number; dx: number; slices: { x0: number; x1: number }[] }) {
  const [x0, x1] = view
  const sx = (v: number) => ((v - x0) / (x1 - x0)) * SW
  let ymax = 0
  for (let i = 0; i <= 200; i++) {
    const v = R(lo + ((hi - lo) * i) / 200)
    if (Number.isFinite(v)) ymax = Math.max(ymax, v)
  }
  const ys = (SH / 2 - 22) / (ymax || 1)
  const cy = SH / 2
  const N = 160
  const outline = (f: (x: number) => number) => {
    const up: string[] = []
    const dn: string[] = []
    for (let k = 0; k <= N; k++) {
      const xx = lo + ((hi - lo) * k) / N
      const v = f(xx)
      if (!Number.isFinite(v)) continue
      up.push(`${sx(xx).toFixed(1)},${(cy - v * ys).toFixed(1)}`)
      dn.push(`${sx(xx).toFixed(1)},${(cy + v * ys).toFixed(1)}`)
    }
    return up.length ? `M${up.join('L')}L${dn.reverse().join('L')}Z` : ''
  }
  const face = (xx: number, w: number, rr: number, key: string, cls: string) => {
    const ry = rr * ys
    const rx = Math.max(4, Math.min(16, ry * 0.2))
    return <ellipse key={key} cx={sx(xx) + w / 2} cy={cy} rx={rx} ry={Math.max(0, ry)} className={cls} />
  }
  const wpx = Math.max(2, sx(x + dx / 2) - sx(x - dx / 2))
  const Rx = R(x)
  const rx_ = washer ? r(x) : 0
  return (
    <div className="graph solid-view">
      <svg viewBox={`0 0 ${SW} ${SH}`} role="img" aria-label="Vista lateral del sólido de revolución y su elemento de integración">
        <rect width={SW} height={SH} className="g-bg" />
        <path d={outline(R) + (washer ? outline(r) : '')} fillRule="evenodd" className="sv-solid" />
        <line x1={0} x2={SW} y1={cy} y2={cy} className="sv-axis" />
        <text x={SW - 8} y={cy - 6} className="g-label" textAnchor="end">eje de giro (eje X)</text>
        {slices.map((s, i) => (
          <g key={i}>
            <rect x={sx(s.x0)} y={cy - R((s.x0 + s.x1) / 2) * ys} width={Math.max(0.5, sx(s.x1) - sx(s.x0))} height={2 * R((s.x0 + s.x1) / 2) * ys} className="sv-rect" />
            {face((s.x0 + s.x1) / 2, sx(s.x1) - sx(s.x0), R((s.x0 + s.x1) / 2), `f${i}`, 'sv-edge')}
          </g>
        ))}
        {Number.isFinite(Rx) && (
          <g>
            <rect x={sx(x - dx / 2)} y={cy - Rx * ys} width={wpx} height={2 * Rx * ys} className="sv-slice" />
            {face(x, wpx, Rx, 'big', 'sv-face')}
            {washer && Number.isFinite(rx_) && face(x, wpx, rx_, 'hole', 'sv-hole')}
            <line x1={sx(x) + wpx / 2} x2={sx(x) + wpx / 2} y1={cy} y2={cy - Rx * ys} className="sv-radius" />
            <text x={sx(x) + wpx / 2 + 6} y={cy - (Rx * ys) / 2} className="g-label">R</text>
            {washer && Number.isFinite(rx_) && (
              <>
                <line x1={sx(x) + wpx / 2 + 3} x2={sx(x) + wpx / 2 + 3} y1={cy} y2={cy - rx_ * ys} className="sv-radius sv-radius-in" />
                <text x={sx(x) + wpx / 2 + 8} y={cy - (rx_ * ys) / 2} className="g-label">r</text>
              </>
            )}
          </g>
        )}
      </svg>
    </div>
  )
}

const STAGES = 8

/** Región, elemento de integración (disco/arandela) y sólido de revolución sobre el eje X. */
export function VolumeViz({ p }: { p: Problem }) {
  const a = p.area!
  const reg = a.regions[0]
  const washer = reg.bottom !== '0'
  const R = useMemo(() => fn(reg.top), [reg.top])
  const r = useMemo(() => fn(reg.bottom), [reg.bottom])
  const lo = reg.a
  const hi = reg.b
  const span = hi - lo
  const [x, setX] = useState(lo + span * 0.35)
  const [dxf, setDxf] = useState(0.06)
  const [n, setN] = useState(8)
  const [showSum, setShowSum] = useState(false)
  const [stage, setStage] = useState(STAGES - 1)
  const dx = dxf * span
  const Rx = R(x)
  const rx = r(x)
  const rect = Number.isFinite(Rx) && Number.isFinite(rx) ? { x0: x - dx / 2, x1: x + dx / 2, y0: rx, y1: Rx } : null
  const rects = useMemo(() => {
    if (!showSum || stage < 6) return []
    const w = span / n
    return Array.from({ length: n }, (_, i) => {
      const m = lo + (i + 0.5) * w
      return { x0: lo + i * w, x1: lo + (i + 1) * w, y0: r(m), y1: R(m) }
    })
  }, [showSum, stage, n, span, lo, R, r])
  const sum = rects.reduce((s, q) => s + Math.PI * (q.y1 ** 2 - q.y0 ** 2) * (q.x1 - q.x0), 0)
  const dV = rect ? Math.PI * (Rx ** 2 - rx ** 2) * dx : 0

  // construcción por etapas
  const table = a.table ?? []
  const fns = useMemo(() => a.curves.map((c) => fn(c.expr)), [a.curves])
  const tablePts = useMemo(
    () => (stage >= 1 ? a.curves.flatMap((_, i) => table.map((t) => ({ x: t.x, y: fns[i](t.x), label: '' }))).filter((q) => Number.isFinite(q.y)) : []),
    [stage, a.curves, table, fns],
  )
  const shownCurves = useMemo(() => a.curves.filter((_, i) => (i === 0 ? stage >= 2 : stage >= 3)).map((c) => ({ expr: c.expr, color: c.color, label: c.label })), [a.curves, stage])
  const nCurves = a.curves.length
  const captions = [
    '**1. Ejes y escala.** Dibuja el eje X (horizontal) y el eje Y (vertical) con la misma escala. El eje X es el **eje de giro**.',
    '**2. Puntos de la tabla.** Marca cada par (x, y) de la tabla de valores (abajo). Cada curva tiene los suyos.',
    `**3. Une los puntos de ${a.curves[0].label === 'f' ? 'f' : 'la curva'}** con un trazo suave, siguiendo la forma que reconociste.`,
    nCurves > 1 ? '**4. Une los puntos de g** con otro color. Ya se ven las dos curvas.' : '**4. Frontera con el eje X.** Esta región está limitada por la curva y por el eje X (y = 0)' + (a.vline !== undefined ? ' y la recta vertical marcada.' : '.'),
    '**5. Marca y rotula los puntos de corte.** Son los límites de integración a y b.',
    '**6. Sombrea la región** encerrada entre las fronteras.',
    '**7. Dibuja el elemento de integración:** un rectángulo vertical muy angosto (ancho dx). Muévelo con el control de posición.',
    washer ? '**8. Gira alrededor del eje X:** el rectángulo dibuja una arandela (disco con agujero) y la región entera forma el sólido con hueco.' : '**8. Gira alrededor del eje X:** el rectángulo dibuja un disco y la región entera forma el sólido.',
  ]
  const g = (k: number) => stage >= k
  return (
    <div>
      <div className="panel stage-bar">
        <b>Construye la gráfica paso a paso</b>
        <div className="stage-row">
          <button className="btn" onClick={() => setStage(0)} disabled={stage === 0}>⏮ Empezar</button>
          <button className="btn" onClick={() => setStage((k) => Math.max(0, k - 1))} disabled={stage === 0}>◀ Atrás</button>
          <button className="btn btn-primary" onClick={() => setStage((k) => Math.min(STAGES - 1, k + 1))} disabled={stage === STAGES - 1}>Siguiente ▶</button>
          <button className="btn" onClick={() => setStage(STAGES - 1)} disabled={stage === STAGES - 1}>⏭ Terminar</button>
          <span className="muted">Etapa {stage + 1} de {STAGES}</span>
        </div>
        <Md>{captions[stage]}</Md>
      </div>
      <Graph
        curves={shownCurves}
        regions={g(5) ? [{ ...reg, color: '#9ec5f4' }] : []}
        points={[...tablePts, ...(g(4) ? a.points : [])]}
        view={a.view}
        vline={g(3) ? a.vline : undefined}
        rects={rects}
        highlightRect={g(6) ? rect : null}
      />
      {g(1) && table.length > 0 && (
        <div className="panel value-table">
          <b>Tabla de valores</b>
          <div className="table-scroll">
            <table>
              <thead>
                <tr>
                  <th><Tex>{'x'}</Tex></th>
                  {table.map((t) => (
                    <th key={t.x}><Tex>{t.label}</Tex></th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {a.curves.map((c, i) => (
                  <tr key={c.label}>
                    <th style={{ color: c.color }}>{c.label === 'f' || c.label === 'g' ? `${c.label}(x)` : 'y'}</th>
                    {table.map((t) => {
                      const y = fns[i](t.x)
                      return <td key={t.x}>{Number.isFinite(y) ? fmtNum(y, 2) : '—'}</td>
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {g(7) && <SolidView lo={lo} hi={hi} R={R} r={r} washer={washer} view={[a.view[0], a.view[1], a.view[2], a.view[3]]} x={x} dx={dx} slices={rects.map((q) => ({ x0: q.x0, x1: q.x1 }))} />}
      <div className="panel controls">
        <div className="legend-tex">
          {a.curves.map((c) => (
            <span key={c.label} style={{ color: c.color }}>
              <Tex>{c.tex}</Tex>
            </span>
          ))}
        </div>
        {a.note && <p className="muted">{a.note}</p>}
        {g(6) && (
          <>
            <label>
              Posición del elemento: <b>x = {fmtNum(x, 3)}</b>
              <input type="range" min={lo} max={hi} step={span / 200} value={x} onChange={(e) => setX(Number(e.target.value))} />
            </label>
            <label>
              Grosor <Tex>{'dx'}</Tex>: <b>{fmtNum(dx, 3)}</b>
              <input type="range" min={0.01} max={0.25} step={0.01} value={dxf} onChange={(e) => setDxf(Number(e.target.value))} />
            </label>
          </>
        )}
        {g(6) && rect && (
          <p className="calc">
            {washer ? (
              <>
                Radio exterior <Tex>{'R'}</Tex> = <b>{fmtNum(Rx, 4)}</b> · radio interior <Tex>{'r'}</Tex> = <b>{fmtNum(rx, 4)}</b> · <Tex>{'dV=\\pi\\,(R^{2}-r^{2})\\,dx'}</Tex> ≈ <b>{fmtNum(dV, 5)}</b>
              </>
            ) : (
              <>
                Radio del disco <Tex>{'R'}</Tex> = <b>{fmtNum(Rx, 4)}</b> · <Tex>{'dV=\\pi\\,R^{2}\\,dx'}</Tex> ≈ <b>{fmtNum(dV, 5)}</b>
              </>
            )}
          </p>
        )}
        {g(6) && (
          <label className="check">
            <input type="checkbox" checked={showSum} onChange={(e) => setShowSum(e.target.checked)} /> Mostrar la suma de {washer ? 'arandelas' : 'discos'} (idea de la integral)
          </label>
        )}
        {showSum && g(6) && (
          <>
            <label>
              Número de {washer ? 'arandelas' : 'discos'}: <b>{n}</b>
              <input type="range" min={2} max={60} value={n} onChange={(e) => setN(Number(e.target.value))} />
            </label>
            <p className="calc">
              Suma de {washer ? 'arandelas' : 'discos'} ≈ <b>{fmtNum(sum, 4)}</b> · Volumen exacto = <b>{fmtNum(a.value, 4)}</b> · Más rebanadas ⇒ más cerca: eso es integrar.
            </p>
          </>
        )}
        {g(7) && (
          <p className="muted">
            En la vista del sólido, la <b>cara circular</b> naranja es lo que ve un observador al mirar la rebanada de frente: {washer ? 'un círculo grande (radio R) con un círculo hueco (radio r)' : 'un círculo de radio R'}.
          </p>
        )}
      </div>
    </div>
  )
}
