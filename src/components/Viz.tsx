import { useMemo, useState } from 'react'
import { fn, fmtNum, simpson } from '../engine/util'
import type { Problem } from '../engine/types'
import { Graph } from './Graph'
import { Tex } from './Tex'

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
