import type { Draft } from './integrals'
import type { Level, Region, Step } from './types'
import type { Rng } from './util'
import { fl, fr, neg, term } from './util'

const BLUE = '#1f5fa8'
const RED = '#c0392b'
const S = (title: string, why: string, lines: string[], vars?: Record<string, string>, extra?: { tip?: string; warn?: string }): Step => ({
  title,
  why,
  lines,
  vars,
  ...extra,
})

const METHOD = 'Área entre dos curvas'
const WHY = 'El área entre dos gráficas es la integral de (curva de arriba − curva de abajo). Cada rectángulo delgado tiene ancho $dx$ y altura $f(x)-g(x)$; la integral los suma todos.'
const PRO = (extra = '') => `${WHY}${extra}`

const lineTex = (slope: number, icpt: number): string => {
  const a = Math.abs(slope)
  const sx = slope === 0 ? '' : `${slope < 0 ? '-' : ''}${a === 1 ? '' : a}x`
  if (slope === 0) return `${icpt}`
  if (icpt === 0) return sx
  return `${sx}${icpt < 0 ? '-' : '+'}${Math.abs(icpt)}`
}
const lineExpr = (slope: number, icpt: number) => `(${slope})*x+(${icpt})`

// ------------------------------------------------------------------ Familia 7: rectas / parábolas simples
function a7Lines(m: number, n: number, c: number, t: number): Draft {
  // f = -m x + b1, g = n x + c ; se cortan en x = t > 0
  const b1 = c + (m + n) * t
  const ftex = lineTex(-m, b1)
  const gtex = lineTex(n, c)
  const d = m + n
  const diffTex = `-${d}x+${b1 - c}`
  const half = fr(d, 2)
  const area = (b1 - c) * t / 2
  const y = n * t + c
  const regions: Region[] = [{ a: 0, b: t, top: lineExpr(-m, b1), bottom: lineExpr(n, c), color: '#9ec5f4' }]
  return {
    title: 'Área entre dos rectas (región cerrada con el eje y)',
    statement: `f(x)=${ftex},\\quad g(x)=${gtex}`,
    method: METHOD,
    methodWhy: PRO(' Dos rectas se cortan **una sola vez**; para encerrar una región las cerramos con el eje $y$ ($x=0$): es la costumbre en este tipo de ejercicio. Si tu profesor indica otra frontera, solo cambian los límites.'),
    steps: [
      S('Punto de corte', 'Igualamos las funciones y despejamos $x$: ahí se cruzan.', [`f(x)=g(x)`, `${ftex}=${gtex}`, `${b1 - c}=${d === 1 ? '' : d}x`, `x=${t},\\qquad y=g(${t})=${y}`], { x_corte: `${t}` },
        { tip: 'Pasa las x a un lado y los números al otro. Al final evalúa en CUALQUIERA de las dos funciones para hallar y.' }),
      S('Límites de integración', 'Izquierda: el eje $y$ ($x=0$). Derecha: el punto de corte.', ['a=0,\\qquad b=' + t], { a: '0', b: `${t}` }),
      S('¿Quién está arriba?', 'Probamos un $x$ dentro del intervalo.', [`x=1:\\quad f(1)=${-m + b1},\\quad g(1)=${n + c}`, `f(1)>g(1)\\ \\Rightarrow\\ f\\text{ está arriba}`]),
      S('Plantear la integral', 'Arriba menos abajo. **Pon la resta entre paréntesis.**', [`A=\\int_{0}^{${t}}\\left[\\left(${ftex}\\right)-\\left(${gtex}\\right)\\right]dx`, `A=\\int_{0}^{${t}}\\left(${diffTex}\\right)dx`], undefined,
        { warn: 'Al restar una función con varios términos, los signos de TODA la segunda cambian.' }),
      S('Antiderivada y evaluación', 'Integramos con la regla de la potencia y evaluamos $F(b)-F(a)$.', [`F(x)=${term(neg(half), 'x^{2}', true)}+${b1 - c}x`, `A=F(${t})-F(0)=\\left(${fl(fr(-d * t * t + 2 * (b1 - c) * t, 2))}\\right)-0`, `A=${fl(fr((b1 - c) * t, 2))}`]),
    ],
    answer: `${fl(fr((b1 - c) * t, 2))}\\ \\text{unidades}^{2}`,
    verification: [`\\text{Triángulo: base}=${b1 - c}\\ (\\text{sobre el eje }y),\\ \\text{altura}=${t}\\ \\Rightarrow\\ A=\\frac{1}{2}\\cdot ${b1 - c}\\cdot ${t}=${fl(fr((b1 - c) * t, 2))}`],
    hints: ['Iguala f y g para hallar el corte.', '¿Qué función vale más en un punto de prueba?', 'A = ∫ (arriba − abajo) dx de 0 al corte.'],
    py: { kind: 'area', regions: [['0', `${t}`]] },
    area: {
      curves: [
        { label: 'f', tex: `f(x)=${ftex}`, expr: lineExpr(-m, b1), color: BLUE },
        { label: 'g', tex: `g(x)=${gtex}`, expr: lineExpr(n, c), color: RED },
      ],
      regions,
      points: [
        { x: 0, y: b1, label: `(0, ${b1})` },
        { x: 0, y: c, label: `(0, ${c})` },
        { x: t, y, label: `(${t}, ${y})` },
      ],
      view: [-1, t * 2 + 0.5, Math.min(0, c) - 1, b1 + 1.2],
      value: area,
      vline: 0,
    },
  }
}

function a7PiLines(): Draft {
  return {
    title: 'Área entre rectas con π',
    statement: 'f(x)=\\pi-x,\\quad g(x)=x',
    method: METHOD,
    methodWhy: PRO(' Aquí $\\pi$ es solo un número (≈3.1416). Cerramos la región con el eje $y$.'),
    steps: [
      S('Punto de corte', 'Igualamos.', ['\\pi-x=x', '\\pi=2x', 'x=\\frac{\\pi}{2},\\qquad y=\\frac{\\pi}{2}']),
      S('Límites', 'Del eje $y$ al corte.', ['a=0,\\qquad b=\\frac{\\pi}{2}']),
      S('¿Quién está arriba?', 'Probamos $x=0$ (dentro del intervalo): $f(0)=\\pi\\approx 3.14$ y $g(0)=0$.', ['f(0)=\\pi>g(0)=0\\ \\Rightarrow\\ f\\text{ arriba}']),
      S('Plantear', 'Arriba − abajo, con paréntesis.', ['A=\\int_{0}^{\\pi/2}\\left[(\\pi-x)-x\\right]dx=\\int_{0}^{\\pi/2}\\left(\\pi-2x\\right)dx']),
      S('Antiderivada y evaluación', '$\\pi$ es una constante: su integral es $\\pi x$.', ['F(x)=\\pi x-x^{2}', 'A=\\pi\\cdot\\frac{\\pi}{2}-\\left(\\frac{\\pi}{2}\\right)^{2}-0=\\frac{\\pi^{2}}{2}-\\frac{\\pi^{2}}{4}', 'A=\\frac{\\pi^{2}}{4}']),
    ],
    answer: '\\frac{\\pi^{2}}{4}\\approx 2.467\\ \\text{unidades}^{2}',
    verification: ['\\text{Triángulo: base}=\\pi,\\ \\text{altura}=\\frac{\\pi}{2}\\Rightarrow A=\\frac{1}{2}\\cdot\\pi\\cdot\\frac{\\pi}{2}=\\frac{\\pi^{2}}{4}'],
    hints: ['π es un número.', 'Corte: π − x = x.', 'La integral de π es πx.'],
    py: { kind: 'area', regions: [['0', 'pi/2']] },
    area: {
      curves: [
        { label: 'f', tex: 'f(x)=\\pi-x', expr: 'pi-x', color: BLUE },
        { label: 'g', tex: 'g(x)=x', expr: 'x', color: RED },
      ],
      regions: [{ a: 0, b: Math.PI / 2, top: 'pi-x', bottom: 'x', color: '#9ec5f4' }],
      points: [
        { x: 0, y: Math.PI, label: '(0, π)' },
        { x: 0, y: 0, label: '(0, 0)' },
        { x: Math.PI / 2, y: Math.PI / 2, label: '(π/2, π/2)' },
      ],
      view: [-1, 4.5, -1, 4.5],
      value: (Math.PI * Math.PI) / 4,
      vline: 0,
    },
  }
}

function a7Parab(m: number): Draft {
  const c = 2 * m * m
  const mm = fr(8 * m * m * m, 3)
  return {
    title: 'Área entre dos parábolas',
    statement: `f(x)=${c}-x^{2},\\quad g(x)=x^{2}`,
    method: METHOD,
    methodWhy: PRO(' Dos parábolas que se abren en sentidos opuestos encierran una región con dos cortes simétricos.'),
    steps: [
      S('Puntos de corte', 'Igualamos y despejamos $x^{2}$; la raíz da **dos** soluciones ($\\pm$).', [`${c}-x^{2}=x^{2}`, `${c}=2x^{2}`, `x^{2}=${m * m}`, `x=-${m}\\quad\\text{y}\\quad x=${m}`], undefined, { warn: 'No olvides la solución negativa.' }),
      S('¿Quién está arriba?', 'Probamos $x=0$: $f(0)=' + c + '$ y $g(0)=0$.', ['f(0)>g(0)\\ \\Rightarrow\\ f\\text{ arriba}']),
      S('Plantear', 'Arriba − abajo.', [`A=\\int_{-${m}}^{${m}}\\left[\\left(${c}-x^{2}\\right)-x^{2}\\right]dx=\\int_{-${m}}^{${m}}\\left(${c}-2x^{2}\\right)dx`]),
      S('Usar la simetría', 'La función es par (simétrica respecto al eje $y$): $\\int_{-a}^{a}=2\\int_{0}^{a}$. Así evitamos evaluar en números negativos.', [`A=2\\int_{0}^{${m}}\\left(${c}-2x^{2}\\right)dx`]),
      S('Antiderivada y evaluación', 'Regla de la potencia.', [`F(x)=${c}x-\\frac{2x^{3}}{3}`, `A=2\\left[${c}\\cdot${m}-\\frac{2\\cdot${m * m * m}}{3}\\right]=2\\left[${c * m}-\\frac{${2 * m * m * m}}{3}\\right]`, `A=${fl(mm)}`]),
    ],
    answer: `${fl(mm)}\\ \\text{unidades}^{2}`,
    verification: ['\\text{Con la Casio: }\\int_{-' + m + '}^{' + m + '}(' + c + '-2X^{2})dx'],
    hints: ['Iguala las dos funciones.', 'x² = número → dos soluciones.', 'Función par → duplica la mitad.'],
    py: { kind: 'area', regions: [[`-${m}`, `${m}`]] },
    area: {
      curves: [
        { label: 'f', tex: `f(x)=${c}-x^{2}`, expr: `${c}-x^2`, color: BLUE },
        { label: 'g', tex: 'g(x)=x^{2}', expr: 'x^2', color: RED },
      ],
      regions: [{ a: -m, b: m, top: `${c}-x^2`, bottom: 'x^2', color: '#9ec5f4' }],
      points: [
        { x: -m, y: m * m, label: `(-${m}, ${m * m})` },
        { x: m, y: m * m, label: `(${m}, ${m * m})` },
      ],
      view: [-m * 2, m * 2, -1, c + 1],
      value: (8 * m * m * m) / 3,
    },
  }
}

// ------------------------------------------------------------------ Familia 8: cúbica, parábola/recta, exponenciales
function a8Cubic(j: number, c: number): Draft {
  const k = j * j
  const ctex = c > 0 ? `+${c}` : `${c}`
  const ftex = `x^{3}${ctex}`
  const gtex = k === 1 ? `x${ctex}` : `${k}x${ctex}`
  const q = j ** 4 / 4
  const ct = c === 0 ? '' : ctex
  void ct
  return {
    title: 'Cúbica y recta: dos regiones',
    statement: `f(x)=${ftex},\\quad g(x)=${gtex}`,
    method: METHOD + ' (con cruce)',
    methodWhy: PRO(' Cuando hay **tres** cortes hay **dos** regiones y las curvas se cruzan en el medio: ¡hay que partir la integral!'),
    steps: [
      S('Puntos de corte', 'Igualamos, pasamos todo a un lado (la constante se cancela) y factorizamos.', [`${ftex}=${gtex}`, `x^{3}-${k === 1 ? '' : k}x=0`, `x\\left(x^{2}-${k}\\right)=0`, `x(x-${j})(x+${j})=0`, `x=-${j},\\quad x=0,\\quad x=${j}`], undefined, { tip: 'Saca factor común x; luego $x^{2}-a^{2}=(x-a)(x+a)$.' }),
      S('¿Quién está arriba en cada tramo?', 'Hay dos tramos. Probamos un punto en cada uno.', [`x=-\\frac{${j}}{2}:\\ f-g=x^{3}-${k}x>0\\ \\Rightarrow\\ f\\text{ arriba}`, `x=\\frac{${j}}{2}:\\ f-g<0\\ \\Rightarrow\\ g\\text{ arriba}`]),
      S('Plantear dos integrales', 'Una por región; en cada una, arriba − abajo.', [`A_{1}=\\int_{-${j}}^{0}\\left(x^{3}-${k === 1 ? '' : k}x\\right)dx`, `A_{2}=\\int_{0}^{${j}}\\left(${k === 1 ? '' : k}x-x^{3}\\right)dx`]),
      S('Evaluar A₁', 'Antiderivada $\\frac{x^{4}}{4}-\\frac{' + k + 'x^{2}}{2}$. Las potencias pares de un número negativo son positivas.', [`A_{1}=\\left[\\frac{x^{4}}{4}-\\frac{${k}x^{2}}{2}\\right]_{-${j}}^{0}=0-\\left(\\frac{${j ** 4}}{4}-\\frac{${k * k}}{2}\\right)=${fl(fr(j ** 4, 4))}`]),
      S('Evaluar A₂ y sumar', 'Por simetría impar $A_{2}=A_{1}$.', [`A_{2}=\\left[\\frac{${k}x^{2}}{2}-\\frac{x^{4}}{4}\\right]_{0}^{${j}}=${fl(fr(j ** 4, 4))}`, `A=A_{1}+A_{2}=${fl(fr(j ** 4, 2))}`], undefined, { warn: '∫ de −j a j de (x³−kx) da 0 por ser impar. ¡Por eso se parte!' }),
    ],
    answer: `${fl(fr(j ** 4, 2))}\\ \\text{unidades}^{2}`,
    verification: [`\\text{Atajo: }A=2A_{1}=2\\cdot${fl(fr(j ** 4, 4))}=${fl(fr(j ** 4, 2))}`],
    hints: ['Iguala y factoriza: ¿cuántos cortes?', 'Con cruce se parte la integral.', 'Prueba un punto en cada tramo.'],
    py: { kind: 'area', regions: [[`-${j}`, '0'], ['0', `${j}`]] },
    area: {
      curves: [
        { label: 'f', tex: `f(x)=${ftex}`, expr: `x^3+(${c})`, color: BLUE },
        { label: 'g', tex: `g(x)=${gtex}`, expr: `${k}*x+(${c})`, color: RED },
      ],
      regions: [
        { a: -j, b: 0, top: `x^3+(${c})`, bottom: `${k}*x+(${c})`, color: '#9ec5f4' },
        { a: 0, b: j, top: `${k}*x+(${c})`, bottom: `x^3+(${c})`, color: '#f5b7b1' },
      ],
      points: [
        { x: -j, y: -k * j + c, label: `(-${j}, ${-k * j + c})` },
        { x: 0, y: c, label: `(0, ${c})` },
        { x: j, y: k * j + c, label: `(${j}, ${k * j + c})` },
      ],
      view: [-j - 1, j + 1, -k * j + c - 2, k * j + c + 2],
      value: 2 * q,
    },
  }
}

function a8ParabLine(r: number, s: number): Draft {
  const sum = r + s
  const prod = r * s
  const G = (x: number) => -(x ** 3) / 3 + (sum * x * x) / 2 - prod * x
  const gt = fr(Math.round(-6 * 0), 1)
  void gt
  const area = (s - r) ** 3 / 6
  const gline = `${sum === 0 ? '' : sum === 1 ? 'x' : sum === -1 ? '-x' : `${sum}x`}${prod === 0 ? '' : prod > 0 ? `-${prod}` : `+${-prod}`}` || '0'
  const mid = (r + s) / 2
  return {
    title: 'Parábola y recta',
    statement: `f(x)=x^{2},\\quad g(x)=${gline}`,
    method: METHOD,
    methodWhy: PRO(' Una parábola y una recta se cortan en dos puntos: esos son los límites.'),
    steps: [
      S('Puntos de corte', 'Igualamos, pasamos todo a un lado y factorizamos el trinomio.', [`x^{2}=${gline}`, `x^{2}${sum === 0 ? '' : sum > 0 ? `-${sum}x` : `+${-sum}x`}${prod === 0 ? '' : prod > 0 ? `+${prod}` : `-${-prod}`}=0`, `(x${r < 0 ? '+' : '-'}${Math.abs(r)})(x${s < 0 ? '+' : '-'}${Math.abs(s)})=0`.replace('x-0', 'x').replace('x+0', 'x'), `x=${r},\\quad x=${s}`], undefined, { tip: 'Busca dos números que sumen el coeficiente de x (con signo contrario) y multipliquen el término libre.' }),
      S('¿Quién está arriba?', `Punto de prueba en el medio, $x=${mid}$.`, [`f(${mid})=${mid * mid},\\quad g(${mid})=${sum * mid - prod}`, `g\\text{ está arriba (la recta sobre la parábola)}`]),
      S('Plantear', 'Arriba − abajo.', [`A=\\int_{${r}}^{${s}}\\left[\\left(${gline}\\right)-x^{2}\\right]dx`]),
      S('Antiderivada y evaluación', 'Integramos término a término.', [`F(x)=-\\frac{x^{3}}{3}+${sum}\\cdot\\frac{x^{2}}{2}${prod === 0 ? '' : `-${prod}x`}`.replace('+-', '-'), `F(${s})=${fl(fr(Math.round(G(s) * 6), 6))},\\quad F(${r})=${fl(fr(Math.round(G(r) * 6), 6))}`, `A=F(${s})-F(${r})=${fl(fr(Math.round(area * 6), 6))}`]),
    ],
    answer: `${fl(fr(Math.round(area * 6), 6))}\\ \\text{unidades}^{2}`,
    verification: [`\\text{Fórmula rápida: }A=\\frac{(s-r)^{3}}{6}=\\frac{${s - r}^{3}}{6}=${fl(fr(Math.round(area * 6), 6))}`],
    hints: ['Iguala y factoriza.', 'La recta queda sobre la parábola entre los cortes.', 'A = ∫ (recta − parábola).'],
    py: { kind: 'area', regions: [[`${r}`, `${s}`]] },
    area: {
      curves: [
        { label: 'f', tex: 'f(x)=x^{2}', expr: 'x^2', color: BLUE },
        { label: 'g', tex: `g(x)=${gline}`, expr: `(${sum})*x-(${prod})`, color: RED },
      ],
      regions: [{ a: r, b: s, top: `(${sum})*x-(${prod})`, bottom: 'x^2', color: '#9ec5f4' }],
      points: [
        { x: r, y: r * r, label: `(${r}, ${r * r})` },
        { x: s, y: s * s, label: `(${s}, ${s * s})` },
      ],
      view: [r - 2, s + 2, -2, Math.max(r * r, s * s) + 3],
      value: area,
    },
  }
}

function a8Pi(): Draft {
  const A = Math.PI ** 3 / 6
  return {
    title: 'Parábola y recta con π',
    statement: 'f(x)=x^{2},\\quad g(x)=\\pi x',
    method: METHOD,
    methodWhy: PRO(' Los cortes serán $0$ y $\\pi$ (número ≈ 3.1416).'),
    steps: [
      S('Puntos de corte', 'Igualamos y factorizamos sacando $x$.', ['x^{2}=\\pi x', 'x^{2}-\\pi x=0', 'x(x-\\pi)=0', 'x=0,\\quad x=\\pi']),
      S('¿Quién está arriba?', 'En $x=\\frac{\\pi}{2}$: $f=\\frac{\\pi^{2}}{4}\\approx 2.47$ y $g=\\frac{\\pi^{2}}{2}\\approx 4.93$.', ['g\\text{ arriba}']),
      S('Plantear', 'Arriba − abajo.', ['A=\\int_{0}^{\\pi}\\left(\\pi x-x^{2}\\right)dx']),
      S('Antiderivada y evaluación', '$\\pi$ es constante.', ['F(x)=\\frac{\\pi x^{2}}{2}-\\frac{x^{3}}{3}', 'A=\\frac{\\pi\\cdot\\pi^{2}}{2}-\\frac{\\pi^{3}}{3}=\\frac{\\pi^{3}}{2}-\\frac{\\pi^{3}}{3}=\\frac{3\\pi^{3}-2\\pi^{3}}{6}', 'A=\\frac{\\pi^{3}}{6}']),
    ],
    answer: '\\frac{\\pi^{3}}{6}\\approx 5.168\\ \\text{unidades}^{2}',
    verification: ['\\text{Fórmula rápida: }A=\\frac{(s-r)^{3}}{6}=\\frac{\\pi^{3}}{6}'],
    hints: ['Saca x de factor común.', 'π es un número.', 'Mismo patrón que (s−r)³/6.'],
    py: { kind: 'area', regions: [['0', 'pi']] },
    area: {
      curves: [
        { label: 'f', tex: 'f(x)=x^{2}', expr: 'x^2', color: BLUE },
        { label: 'g', tex: 'g(x)=\\pi x', expr: 'pi*x', color: RED },
      ],
      regions: [{ a: 0, b: Math.PI, top: 'pi*x', bottom: 'x^2', color: '#9ec5f4' }],
      points: [
        { x: 0, y: 0, label: '(0, 0)' },
        { x: Math.PI, y: Math.PI ** 2, label: '(π, π²)' },
      ],
      view: [-1, 5, -1, 12],
      value: A,
    },
  }
}

function a8Exp(): Draft {
  const A = Math.E + 1 / Math.E - 2
  return {
    title: 'Exponenciales $e^{x}$ y $e^{-x}$',
    statement: 'f(x)=e^{x},\\quad g(x)=e^{-x},\\quad x=1',
    method: METHOD,
    methodWhy: PRO(' Aquí la frontera derecha la da la recta vertical $x=1$.'),
    steps: [
      S('Punto de corte', 'Igualamos; usamos que $e^{a}=e^{b}\\Rightarrow a=b$.', ['e^{x}=e^{-x}', 'x=-x', 'x=0,\\qquad y=1']),
      S('Límites', 'Izquierda: el corte $x=0$. Derecha: la recta $x=1$.', ['a=0,\\qquad b=1']),
      S('¿Quién está arriba?', 'En $x=1$: $f=e\\approx 2.72$ y $g=e^{-1}\\approx 0.37$.', ['f\\text{ arriba}']),
      S('Plantear', 'Arriba − abajo.', ['A=\\int_{0}^{1}\\left(e^{x}-e^{-x}\\right)dx']),
      S('Antiderivada', '$\\int e^{x}dx=e^{x}$ y $\\int e^{-x}dx=-e^{-x}$ (dividimos entre −1).', ['F(x)=e^{x}+e^{-x}'], undefined, { warn: 'Al restar, el menos y el menos de $-e^{-x}$ dan más.' }),
      S('Evaluar', '$F(1)-F(0)$; recuerda $e^{0}=1$.', ['A=\\left(e+e^{-1}\\right)-\\left(1+1\\right)', 'A=e+\\frac{1}{e}-2']),
    ],
    answer: 'e+\\frac{1}{e}-2\\approx 1.086\\ \\text{unidades}^{2}',
    verification: ['\\text{Casio: }\\int_{0}^{1}(e^{X}-e^{-X})dX\\approx 1.0862'],
    hints: ['e^a = e^b → a = b.', 'Antiderivada de e^{-x} es −e^{-x}.', 'e⁰ = 1.'],
    py: { kind: 'area', regions: [['0', '1']] },
    area: {
      curves: [
        { label: 'f', tex: 'f(x)=e^{x}', expr: 'exp(x)', color: BLUE },
        { label: 'g', tex: 'g(x)=e^{-x}', expr: 'exp(-x)', color: RED },
      ],
      regions: [{ a: 0, b: 1, top: 'exp(x)', bottom: 'exp(-x)', color: '#9ec5f4' }],
      points: [
        { x: 0, y: 1, label: '(0, 1)' },
        { x: 1, y: Math.E, label: '(1, e)' },
        { x: 1, y: 1 / Math.E, label: '(1, 1/e)' },
      ],
      view: [-1, 2, -0.5, 3.2],
      value: A,
      vline: 1,
    },
  }
}

// ------------------------------------------------------------------ Familia 9: trigonométricas
const TRIGPTS = (xs: [number, number, string][]) => xs.map(([x, y, label]) => ({ x, y, label }))

function a9Sin(a: number): Draft {
  const ac = a === 1 ? '' : `${a}`
  const k = a + 1
  const A = 2 * k
  return {
    title: 'Seno y seno desfasado',
    statement: `f(x)=${ac}\\sin x,\\quad g(x)=\\sin(x-\\pi)`,
    method: METHOD,
    methodWhy: PRO(' Primero simplificamos $g$ con la resta de ángulos. Las calculadoras deben estar en **radianes**.'),
    steps: [
      S('Simplificar g(x)', 'Resta de ángulos: $\\sin(a-b)=\\sin a\\cos b-\\cos a\\sin b$ con $b=\\pi$, donde $\\cos\\pi=-1$ y $\\sin\\pi=0$.', ['\\sin(x-\\pi)=\\sin x\\cos\\pi-\\cos x\\sin\\pi', '=\\sin x\\cdot(-1)-\\cos x\\cdot 0=-\\sin x'], { g: '-\\sin x' }),
      S('Puntos de corte', `Igualamos: $${ac}\\sin x=-\\sin x$.`, [`${ac}\\sin x+\\sin x=0`, `${k === 2 ? '2' : k}\\sin x=0`, '\\sin x=0\\ \\Rightarrow\\ x=0,\\ \\pi,\\ 2\\pi,\\dots'], undefined, { tip: 'Como hay infinitos cortes, tomamos la región entre dos cortes consecutivos: de $0$ a $\\pi$.' }),
      S('¿Quién está arriba?', `En $x=\\frac{\\pi}{2}$: $f=${a}$ y $g=-1$.`, ['f\\text{ arriba}']),
      S('Plantear', 'Restar un negativo suma: $a\\sin x-(-\\sin x)=(a+1)\\sin x$.', [`A=\\int_{0}^{\\pi}\\left[${ac}\\sin x-(-\\sin x)\\right]dx=\\int_{0}^{\\pi}${k}\\sin x\\,dx`]),
      S('Integrar y evaluar', '$\\int\\sin x\\,dx=-\\cos x$. Con $\\cos\\pi=-1$ y $\\cos 0=1$.', [`A=\\left[-${k}\\cos x\\right]_{0}^{\\pi}=-${k}\\cos\\pi+${k}\\cos 0`, `A=${k}+${k}=${A}`]),
    ],
    answer: `${A}\\ \\text{unidades}^{2}`,
    verification: [`\\text{Casio (Rad): }\\int_{0}^{\\pi}(${a}\\sin X-\\sin(X-\\pi))dX=${A}`],
    hints: ['Simplifica sin(x−π) = −sin x.', 'sin x = 0 en 0 y π.', 'cos π = −1 y cos 0 = 1.'],
    usesTrig: true,
    py: { kind: 'area', regions: [['0', 'pi']], domain: ['0', '2*pi'] },
    area: {
      curves: [
        { label: 'f', tex: `f(x)=${ac}\\sin x`, expr: `${a}*sin(x)`, color: BLUE },
        { label: 'g', tex: 'g(x)=\\sin(x-\\pi)', expr: 'sin(x-pi)', color: RED },
      ],
      regions: [{ a: 0, b: Math.PI, top: `${a}*sin(x)`, bottom: 'sin(x-pi)', color: '#9ec5f4' }],
      points: TRIGPTS([[0, 0, '(0, 0)'], [Math.PI, 0, '(π, 0)'], [2 * Math.PI, 0, '(2π, 0)']]),
      view: [-0.5, 2 * Math.PI + 0.5, -a - 0.8, a + 0.8],
      value: A,
    },
  }
}

function a9SinCos(): Draft {
  const A = 2 * Math.SQRT2
  return {
    title: 'Seno y coseno',
    statement: 'f(x)=\\sin x,\\quad g(x)=\\cos x',
    method: METHOD,
    methodWhy: PRO(' Región encerrada entre dos cortes consecutivos.'),
    steps: [
      S('Puntos de corte', 'Dividimos entre $\\cos x$ (cuando no es 0): $\\frac{\\sin x}{\\cos x}=\\tan x$.', ['\\sin x=\\cos x', '\\tan x=1', 'x=\\frac{\\pi}{4},\\qquad x=\\frac{5\\pi}{4}']),
      S('¿Quién está arriba?', 'En $x=\\frac{\\pi}{2}$: $\\sin=1$ y $\\cos=0$.', ['f\\text{ arriba entre }\\frac{\\pi}{4}\\text{ y }\\frac{5\\pi}{4}']),
      S('Plantear', 'Arriba − abajo.', ['A=\\int_{\\pi/4}^{5\\pi/4}\\left(\\sin x-\\cos x\\right)dx']),
      S('Antiderivada', '$\\int\\sin x=-\\cos x$ y $\\int\\cos x=\\sin x$.', ['F(x)=-\\cos x-\\sin x']),
      S('Evaluar', 'Valores: $\\cos\\frac{5\\pi}{4}=\\sin\\frac{5\\pi}{4}=-\\frac{\\sqrt{2}}{2}$ y $\\cos\\frac{\\pi}{4}=\\sin\\frac{\\pi}{4}=\\frac{\\sqrt{2}}{2}$.', ['F\\left(\\frac{5\\pi}{4}\\right)=\\frac{\\sqrt{2}}{2}+\\frac{\\sqrt{2}}{2}=\\sqrt{2}', 'F\\left(\\frac{\\pi}{4}\\right)=-\\frac{\\sqrt{2}}{2}-\\frac{\\sqrt{2}}{2}=-\\sqrt{2}', 'A=\\sqrt{2}-(-\\sqrt{2})=2\\sqrt{2}']),
    ],
    answer: '2\\sqrt{2}\\approx 2.828\\ \\text{unidades}^{2}',
    verification: ['\\text{Casio (Rad): }\\int_{\\pi/4}^{5\\pi/4}(\\sin X-\\cos X)dX=2.8284'],
    hints: ['sin = cos → tan = 1.', 'En el medio, sin vale más.', 'Usa los valores del círculo unitario.'],
    usesTrig: true,
    py: { kind: 'area', regions: [['pi/4', '5*pi/4']], domain: ['0', '2*pi'] },
    area: {
      curves: [
        { label: 'f', tex: 'f(x)=\\sin x', expr: 'sin(x)', color: BLUE },
        { label: 'g', tex: 'g(x)=\\cos x', expr: 'cos(x)', color: RED },
      ],
      regions: [{ a: Math.PI / 4, b: (5 * Math.PI) / 4, top: 'sin(x)', bottom: 'cos(x)', color: '#9ec5f4' }],
      points: TRIGPTS([[Math.PI / 4, Math.SQRT1_2, '(π/4, √2/2)'], [(5 * Math.PI) / 4, -Math.SQRT1_2, '(5π/4, −√2/2)']]),
      view: [-0.5, 2 * Math.PI + 0.5, -1.6, 1.6],
      value: A,
    },
  }
}

function a9Double(): Draft {
  return {
    title: 'Seno y seno de ángulo doble (dos regiones)',
    statement: 'f(x)=\\sin x,\\quad g(x)=\\sin 2x,\\quad 0\\le x\\le\\pi',
    method: METHOD + ' (con cruce)',
    methodWhy: PRO(' Hay un cruce en el medio: dos regiones, dos integrales.'),
    steps: [
      S('Puntos de corte', 'Usamos $\\sin 2x=2\\sin x\\cos x$ y factorizamos $\\sin x$.', ['\\sin x=2\\sin x\\cos x', '\\sin x-2\\sin x\\cos x=0', '\\sin x\\left(1-2\\cos x\\right)=0', '\\sin x=0\\ \\Rightarrow\\ x=0,\\ \\pi\\qquad\\cos x=\\frac{1}{2}\\ \\Rightarrow\\ x=\\frac{\\pi}{3}'], undefined, { warn: 'No cancelar sin x: se pierden soluciones. Se factoriza.' }),
      S('¿Quién está arriba en cada tramo?', 'Probamos un punto en cada uno.', ['x=\\frac{\\pi}{6}:\\ \\sin 2x=0.866>\\sin x=0.5\\Rightarrow g\\text{ arriba}', 'x=\\frac{\\pi}{2}:\\ \\sin x=1>\\sin 2x=0\\Rightarrow f\\text{ arriba}']),
      S('Plantear dos integrales', 'Una por región.', ['A_{1}=\\int_{0}^{\\pi/3}\\left(\\sin 2x-\\sin x\\right)dx', 'A_{2}=\\int_{\\pi/3}^{\\pi}\\left(\\sin x-\\sin 2x\\right)dx']),
      S('Antiderivadas', '$\\int\\sin 2x\\,dx=-\\frac{\\cos 2x}{2}$ (dividimos entre el 2 de adentro).', ['F_{1}(x)=-\\frac{\\cos 2x}{2}+\\cos x', 'F_{2}(x)=-\\cos x+\\frac{\\cos 2x}{2}']),
      S('Evaluar A₁', '$\\cos\\frac{2\\pi}{3}=-\\frac12$, $\\cos\\frac{\\pi}{3}=\\frac12$.', ['F_{1}\\left(\\frac{\\pi}{3}\\right)=\\frac{1}{4}+\\frac{1}{2}=\\frac{3}{4},\\quad F_{1}(0)=-\\frac{1}{2}+1=\\frac{1}{2}', 'A_{1}=\\frac{3}{4}-\\frac{1}{2}=\\frac{1}{4}']),
      S('Evaluar A₂ y sumar', '$\\cos\\pi=-1$, $\\cos 2\\pi=1$.', ['F_{2}(\\pi)=1+\\frac{1}{2}=\\frac{3}{2},\\quad F_{2}\\left(\\frac{\\pi}{3}\\right)=-\\frac{1}{2}-\\frac{1}{4}=-\\frac{3}{4}', 'A_{2}=\\frac{3}{2}+\\frac{3}{4}=\\frac{9}{4}', 'A=A_{1}+A_{2}=\\frac{1}{4}+\\frac{9}{4}=\\frac{5}{2}']),
    ],
    answer: '\\frac{5}{2}\\ \\text{unidades}^{2}',
    verification: ['\\text{Casio (Rad): }\\int_{0}^{\\pi}|\\sin X-\\sin 2X|dX=2.5'],
    hints: ['sin 2x = 2 sin x cos x.', 'Factoriza, no canceles.', 'Hay cruce: dos integrales.'],
    usesTrig: true,
    py: { kind: 'area', regions: [['0', 'pi/3'], ['pi/3', 'pi']], domain: ['0', 'pi'] },
    area: {
      curves: [
        { label: 'f', tex: 'f(x)=\\sin x', expr: 'sin(x)', color: BLUE },
        { label: 'g', tex: 'g(x)=\\sin 2x', expr: 'sin(2*x)', color: RED },
      ],
      regions: [
        { a: 0, b: Math.PI / 3, top: 'sin(2*x)', bottom: 'sin(x)', color: '#f5b7b1' },
        { a: Math.PI / 3, b: Math.PI, top: 'sin(x)', bottom: 'sin(2*x)', color: '#9ec5f4' },
      ],
      points: TRIGPTS([[0, 0, '(0, 0)'], [Math.PI / 3, Math.sin(Math.PI / 3), '(π/3, √3/2)'], [Math.PI, 0, '(π, 0)']]),
      view: [-0.3, Math.PI + 0.5, -1.4, 1.4],
      value: 2.5,
    },
  }
}

function a9Shift(): Draft {
  return {
    title: 'Seno y seno desfasado π/3',
    statement: 'f(x)=\\sin x,\\quad g(x)=\\sin\\left(x-\\frac{\\pi}{3}\\right)',
    method: METHOD,
    methodWhy: PRO(' Región entre dos cortes consecutivos.'),
    steps: [
      S('Puntos de corte', 'Dos senos iguales: $\\sin a=\\sin b$ cuando $a=\\pi-b$ (además de $a=b$, que aquí nunca ocurre).', ['\\sin x=\\sin\\left(x-\\frac{\\pi}{3}\\right)', 'x=\\pi-\\left(x-\\frac{\\pi}{3}\\right)=\\frac{4\\pi}{3}-x', '2x=\\frac{4\\pi}{3}\\ \\Rightarrow\\ x=\\frac{2\\pi}{3}', '\\text{Siguiente corte: }x=\\frac{2\\pi}{3}+\\pi=\\frac{5\\pi}{3}'], undefined, { tip: 'Verifica: sen(2π/3) = √3/2 = sen(π/3) ✓.' }),
      S('¿Quién está arriba?', 'En $x=\\pi$: $f=\\sin\\pi=0$ y $g=\\sin\\frac{2\\pi}{3}=\\frac{\\sqrt{3}}{2}$.', ['g\\text{ arriba entre }\\frac{2\\pi}{3}\\text{ y }\\frac{5\\pi}{3}']),
      S('Plantear', 'Arriba − abajo.', ['A=\\int_{2\\pi/3}^{5\\pi/3}\\left[\\sin\\left(x-\\frac{\\pi}{3}\\right)-\\sin x\\right]dx']),
      S('Antiderivada', 'Para $\\sin(x-\\frac{\\pi}{3})$ la derivada interna es 1, así que no hay que dividir.', ['F(x)=-\\cos\\left(x-\\frac{\\pi}{3}\\right)+\\cos x']),
      S('Evaluar', '$\\cos\\frac{4\\pi}{3}=-\\frac12$, $\\cos\\frac{5\\pi}{3}=\\frac12$, $\\cos\\frac{\\pi}{3}=\\frac12$, $\\cos\\frac{2\\pi}{3}=-\\frac12$.', ['F\\left(\\frac{5\\pi}{3}\\right)=-\\cos\\frac{4\\pi}{3}+\\cos\\frac{5\\pi}{3}=\\frac{1}{2}+\\frac{1}{2}=1', 'F\\left(\\frac{2\\pi}{3}\\right)=-\\cos\\frac{\\pi}{3}+\\cos\\frac{2\\pi}{3}=-\\frac{1}{2}-\\frac{1}{2}=-1', 'A=1-(-1)=2']),
    ],
    answer: '2\\ \\text{unidades}^{2}',
    verification: ['\\text{Casio (Rad): }\\int_{2\\pi/3}^{5\\pi/3}(\\sin(X-\\pi/3)-\\sin X)dX=2'],
    hints: ['sin A = sin B ⇒ A = π − B.', 'Evalúa en el punto medio.', 'Valores del círculo unitario.'],
    usesTrig: true,
    py: { kind: 'area', regions: [['2*pi/3', '5*pi/3']], domain: ['0', '2*pi'] },
    area: {
      curves: [
        { label: 'f', tex: 'f(x)=\\sin x', expr: 'sin(x)', color: BLUE },
        { label: 'g', tex: 'g(x)=\\sin(x-\\pi/3)', expr: 'sin(x-pi/3)', color: RED },
      ],
      regions: [{ a: (2 * Math.PI) / 3, b: (5 * Math.PI) / 3, top: 'sin(x-pi/3)', bottom: 'sin(x)', color: '#9ec5f4' }],
      points: TRIGPTS([[(2 * Math.PI) / 3, Math.sin((2 * Math.PI) / 3), '(2π/3, √3/2)'], [(5 * Math.PI) / 3, Math.sin((5 * Math.PI) / 3), '(5π/3, −√3/2)']]),
      view: [-0.3, 2 * Math.PI + 0.3, -1.4, 1.4],
      value: 2,
    },
  }
}

type Gen = (r: Rng) => Draft

export const AREA_FAMILIES: Record<number, Record<Level, Gen>> = {
  7: {
    T: () => a7Lines(1, 1, 0, 2),
    G1: (r) => a7Lines(r.pick([1, 2, 3]), 1, 0, r.pick([2, 3])),
    G2: (r) => a7Lines(r.pick([1, 2]), r.pick([1, 2]), r.pick([1, 2]), r.pick([2, 3])),
    H1: () => a7PiLines(),
    H2: (r) => a7Parab(r.pick([1, 2])),
  },
  8: {
    T: () => a8Cubic(1, 1),
    G1: (r) => a8Cubic(r.pick([2, 3]), r.pick([1, 2, 3, -1, -2])),
    G2: (r) => {
      const rr = r.pick([-3, -2, -1, 0])
      return a8ParabLine(rr, rr + r.pick([2, 3, 4]))
    },
    H1: () => a8Pi(),
    H2: () => a8Exp(),
  },
  9: {
    T: () => a9Sin(1),
    G1: (r) => a9Sin(r.pick([2, 3])),
    G2: () => a9SinCos(),
    H1: () => a9Double(),
    H2: () => a9Shift(),
  },
}

