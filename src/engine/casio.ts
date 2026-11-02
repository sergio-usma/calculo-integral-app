import type { CasioKeys, Problem } from './types'
import { fmtNum, fn, simpson, toCasio } from './util'

const PREP = (trig: boolean): CasioKeys => ({
  title: 'Preparar la calculadora',
  keys: trig ? ['MODE', '1 (COMP)', 'SHIFT', 'MODE (SETUP)', '4 (Rad)'] : ['MODE', '1 (COMP)'],
  note: trig
    ? 'Esta integral lleva funciones trigonométricas: la calculadora debe estar en RADIANES (aparece una R pequeña arriba).'
    : 'MODE 1 es el modo de cálculo normal (COMP). Las integrales y derivadas numéricas solo funcionan ahí.',
})

export function casioForIntegral(p: Omit<Problem, 'casio'>): CasioKeys[] {
  const f = fn(p.fExpr!)
  const F = fn(p.FExpr!)
  const [lo, hi] = p.bounds!
  const pt = p.testPts?.[Math.floor((p.testPts?.length ?? 1) / 2)] ?? (lo + hi) / 2
  const num = simpson(f, lo, hi)
  return [
    PREP(!!p.usesTrig),
    {
      title: 'Comprobar tu antiderivada derivándola',
      keys: ['SHIFT', '∫ (d/dx)', toCasio(p.FExpr!), '▶', fmtNum(pt, 4), '='],
      expect: `≈ ${fmtNum(f(pt))}`,
      note: `Escribe tu respuesta F(X) dentro de d/dx y evalúa en X = ${fmtNum(pt, 4)}. Debe darte el mismo número que el integrando evaluado ahí: f(${fmtNum(pt, 4)}) ≈ ${fmtNum(f(pt))}. Si coincide, tu antiderivada es correcta (salvo la constante C).`,
    },
    {
      title: `Comprobar el valor de la integral definida de ${fmtNum(lo, 4)} a ${fmtNum(hi, 4)}`,
      keys: ['∫', toCasio(p.fExpr!), '▶', fmtNum(lo, 4), '▶', fmtNum(hi, 4), '='],
      expect: `≈ ${fmtNum(num)}`,
      note: `La calculadora integra numéricamente. Compárala con F(${fmtNum(hi, 4)}) − F(${fmtNum(lo, 4)}) = ${fmtNum(F(hi) - F(lo))}. Si tu pantalla pide primero otra casilla, muévete con las flechas: lo importante es que queden el integrando y los dos límites.`,
    },
    {
      title: 'Evaluar F(X) en varios puntos sin reescribir (CALC)',
      keys: [toCasio(p.FExpr!), 'CALC', fmtNum(lo, 4), '=', 'CALC', fmtNum(hi, 4), '='],
      note: 'Escribe F(X) una sola vez; CALC te pide el valor de X cada vez. Útil para F(b) − F(a).',
    },
  ]
}

export function casioForArea(p: Omit<Problem, 'casio'>): CasioKeys[] {
  const a = p.area!
  const [c1, c2] = a.curves
  const diff = `${toCasio(c1.expr)}-(${toCasio(c2.expr)})`
  const cuts = a.points.filter((q) => Math.abs(q.x) > 1e-9)
  const trig = !!p.usesTrig
  const lo = Math.min(...a.regions.map((r) => r.a))
  const hi = Math.max(...a.regions.map((r) => r.b))
  const items: CasioKeys[] = [PREP(trig)]
  if (cuts.length) {
    const c = cuts[0]
    items.push({
      title: 'Encontrar un punto de corte con SOLVE',
      keys: [diff, 'SHIFT', 'CALC (SOLVE)', fmtNum(c.x + 0.2, 3), '=', '='],
      expect: `X ≈ ${fmtNum(c.x)}`,
      note: 'Escribe f(X) − g(X) (la calculadora lo toma como "= 0"). Te pide un valor inicial de X: pon uno cercano al corte que buscas; con otro valor inicial encontrarás otro corte. SOLVE da solo UNA solución a la vez.',
    })
  }
  items.push({
    title: 'Ver quién está arriba (TABLE)',
    keys: ['MODE', '7 (TABLE)', diff, '=', fmtNum(lo, 3), '=', fmtNum(hi, 3), '=', fmtNum((hi - lo) / 6, 3), '='],
    note: 'La tabla muestra f(X) − g(X). Positivo: f está arriba. Negativo: g está arriba. Donde cambia de signo hay un cruce. (Máximo 30 filas; si dice Stack ERROR, aumenta el paso.)',
  })
  items.push({
    title: 'Comprobar el área total',
    keys: ['MODE', '1 (COMP)', '∫', `Abs(${diff})`, '▶', fmtNum(lo, 4), '▶', fmtNum(hi, 4), '='],
    expect: `≈ ${fmtNum(a.value)}`,
    note: 'Abs(…) vuelve positiva la diferencia, así que suma las áreas aunque las curvas se crucen. Con cruces la calculadora puede perder precisión: mejor integra cada región por separado (de corte a corte) y suma.',
  })
  return items
}
