import { compile } from 'mathjs'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { Region } from '../engine/types'

type View = [number, number, number, number]
type Rect = { x0: number; x1: number; y0: number; y1: number }

export interface GraphProps {
  curves: { expr: string; color: string; label?: string; dashed?: boolean }[]
  regions?: (Region & { fill?: string })[]
  points?: { x: number; y: number; label: string }[]
  view: View
  vline?: number
  rects?: Rect[]
  highlightRect?: Rect | null
  height?: number
  onPick?: (x: number, y: number) => void
  marks?: { x: number; y: number }[]
}

const W = 760

function mk(expr: string) {
  const c = compile(expr)
  return (x: number) => {
    try {
      const v = c.evaluate({ x })
      return typeof v === 'number' && Number.isFinite(v) ? v : NaN
    } catch {
      return NaN
    }
  }
}

function niceStep(range: number) {
  const raw = range / 8
  const p = Math.pow(10, Math.floor(Math.log10(raw)))
  const m = raw / p
  return (m < 1.5 ? 1 : m < 3.5 ? 2 : m < 7.5 ? 5 : 10) * p
}

const fmtTick = (v: number) => {
  const r = Math.round(v * 1000) / 1000
  return Object.is(r, -0) ? '0' : String(r)
}

export function Graph({ curves, regions = [], points = [], view, vline, rects = [], highlightRect, height = 440, onPick, marks = [] }: GraphProps) {
  const [v, setV] = useState<View>(view)
  const viewKey = view.join(',')
  useEffect(() => setV(view), [viewKey]) // eslint-disable-line react-hooks/exhaustive-deps
  const drag = useRef<{ x: number; y: number; v: View; moved: boolean } | null>(null)
  const [x0, x1, y0, y1] = v
  const H = height
  const sx = (x: number) => ((x - x0) / (x1 - x0)) * W
  const sy = (y: number) => H - ((y - y0) / (y1 - y0)) * H
  const fns = useMemo(() => curves.map((c) => mk(c.expr)), [curves])
  const regFns = useMemo(() => regions.map((r) => ({ top: mk(r.top), bottom: mk(r.bottom) })), [regions])

  const path = (f: (x: number) => number) => {
    const N = 500
    let d = ''
    let pen = false
    for (let i = 0; i <= N; i++) {
      const x = x0 + ((x1 - x0) * i) / N
      const y = f(x)
      if (!Number.isFinite(y) || y > y1 + (y1 - y0) * 3 || y < y0 - (y1 - y0) * 3) {
        pen = false
        continue
      }
      d += `${pen ? 'L' : 'M'}${sx(x).toFixed(1)},${sy(y).toFixed(1)}`
      pen = true
    }
    return d
  }
  const regionPath = (i: number) => {
    const r = regions[i]
    const { top, bottom } = regFns[i]
    const N = 160
    const up: string[] = []
    const dn: string[] = []
    for (let k = 0; k <= N; k++) {
      const x = r.a + ((r.b - r.a) * k) / N
      const t = top(x)
      const b = bottom(x)
      if (!Number.isFinite(t) || !Number.isFinite(b)) continue
      up.push(`${sx(x).toFixed(1)},${sy(t).toFixed(1)}`)
      dn.push(`${sx(x).toFixed(1)},${sy(b).toFixed(1)}`)
    }
    if (!up.length) return ''
    return `M${up.join('L')}L${dn.reverse().join('L')}Z`
  }

  const stepX = niceStep(x1 - x0)
  const stepY = niceStep(y1 - y0)
  const xt: number[] = []
  for (let t = Math.ceil(x0 / stepX) * stepX; t <= x1 + 1e-9; t += stepX) xt.push(t)
  const yt: number[] = []
  for (let t = Math.ceil(y0 / stepY) * stepY; t <= y1 + 1e-9; t += stepY) yt.push(t)
  const axisY = Math.min(Math.max(sy(0), 0), H)
  const axisX = Math.min(Math.max(sx(0), 0), W)

  const onWheel = (e: React.WheelEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const mx = x0 + ((e.clientX - rect.left) / rect.width) * (x1 - x0)
    const my = y1 - ((e.clientY - rect.top) / rect.height) * (y1 - y0)
    const k = e.deltaY > 0 ? 1.12 : 1 / 1.12
    setV([mx - (mx - x0) * k, mx + (x1 - mx) * k, my - (my - y0) * k, my + (y1 - my) * k])
  }
  const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId)
    drag.current = { x: e.clientX, y: e.clientY, v, moved: false }
  }
  const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    if (!d) return
    if (Math.hypot(e.clientX - d.x, e.clientY - d.y) > 4) d.moved = true
    if (onPick && !d.moved) return
    const rect = e.currentTarget.getBoundingClientRect()
    const dx = ((e.clientX - d.x) / rect.width) * (d.v[1] - d.v[0])
    const dy = ((e.clientY - d.y) / rect.height) * (d.v[3] - d.v[2])
    setV([d.v[0] - dx, d.v[1] - dx, d.v[2] + dy, d.v[3] + dy])
  }

  const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
    const d = drag.current
    drag.current = null
    if (d && !d.moved && onPick) {
      const rect = e.currentTarget.getBoundingClientRect()
      onPick(x0 + ((e.clientX - rect.left) / rect.width) * (x1 - x0), y1 - ((e.clientY - rect.top) / rect.height) * (y1 - y0))
    }
  }

  return (
    <div className="graph">
      <svg viewBox={`0 0 ${W} ${H}`} onWheel={onWheel} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} role="img" aria-label="Gráfica interactiva">
        <rect width={W} height={H} className="g-bg" />
        {xt.map((t) => (
          <g key={`x${t}`}>
            <line x1={sx(t)} x2={sx(t)} y1={0} y2={H} className="g-grid" />
            <text x={sx(t)} y={Math.min(axisY + 14, H - 3)} className="g-tick" textAnchor="middle">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        {yt.map((t) => (
          <g key={`y${t}`}>
            <line x1={0} x2={W} y1={sy(t)} y2={sy(t)} className="g-grid" />
            <text x={Math.min(axisX + 4, W - 28)} y={sy(t) - 3} className="g-tick">
              {fmtTick(t)}
            </text>
          </g>
        ))}
        <line x1={0} x2={W} y1={axisY} y2={axisY} className="g-axis" />
        <line x1={axisX} x2={axisX} y1={0} y2={H} className="g-axis" />
        {regions.map((r, i) => (
          <path key={i} d={regionPath(i)} fill={r.fill ?? r.color} fillOpacity={0.55} stroke="none" />
        ))}
        {rects.map((r, i) => (
          <rect key={i} x={sx(r.x0)} y={sy(Math.max(r.y0, r.y1))} width={Math.max(0, sx(r.x1) - sx(r.x0))} height={Math.abs(sy(r.y0) - sy(r.y1))} className="g-rect" />
        ))}
        {highlightRect && (
          <rect x={sx(highlightRect.x0)} y={sy(Math.max(highlightRect.y0, highlightRect.y1))} width={Math.max(2, sx(highlightRect.x1) - sx(highlightRect.x0))} height={Math.abs(sy(highlightRect.y0) - sy(highlightRect.y1))} className="g-hl" />
        )}
        {vline !== undefined && <line x1={sx(vline)} x2={sx(vline)} y1={0} y2={H} className="g-vline" />}
        {fns.map((f, i) => (
          <path key={i} d={path(f)} fill="none" stroke={curves[i].color} strokeWidth={2.4} strokeDasharray={curves[i].dashed ? '6 5' : undefined} />
        ))}
        {marks.map((m, i) => (
          <g key={`m${i}`}>
            <circle cx={sx(m.x)} cy={sy(m.y)} r={7} className="g-mark" />
            <text x={sx(m.x) + 10} y={sy(m.y) + 4} className="g-label">
              {i + 1}
            </text>
          </g>
        ))}
        {points.map((p, i) => (
          <g key={i}>
            <circle cx={sx(p.x)} cy={sy(p.y)} r={5} className="g-pt" />
            <text x={sx(p.x) + 8} y={sy(p.y) - 8} className="g-label">
              {p.label}
            </text>
          </g>
        ))}
      </svg>
      <div className="graph-legend">
        {curves
          .filter((c) => c.label)
          .map((c, i) => (
            <span key={i}>
              <i style={{ background: c.color }} /> {c.label}
            </span>
          ))}
        <button className="btn-tiny" onClick={() => setV(view)}>
          ⟲ restablecer vista
        </button>
        <span className="muted">Arrastra para mover · rueda para hacer zoom</span>
      </div>
    </div>
  )
}
