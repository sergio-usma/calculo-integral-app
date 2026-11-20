import type { Draft } from './integrals'
import type { Curve, Level, PyMeta, Region, Step } from './types'
import type { Frac, Rng } from './util'
import { add, fl, fr, mul, neg, term, val } from './util'

const BLUE = '#1f5fa8'
const RED = '#c0392b'
const FILL = '#9ec5f4'

const S = (title: string, why: string, lines: string[], vars?: Record<string, string>, extra?: { tip?: string; warn?: string }): Step => ({
  title,
  why,
  lines,
  vars,
  ...extra,
})

// ------------------------------------------------------------------ polinomios exactos (coef[k] · x^k)
type Poly = Frac[]
const Z = fr(0)
const pmul = (a: Poly, b: Poly): Poly => {
  const out: Poly = Array.from({ length: a.length + b.length - 1 }, () => fr(0))
  a.forEach((x, i) => b.forEach((y, j) => (out[i + j] = add(out[i + j], mul(x, y)))))
  return out
}
const psub = (a: Poly, b: Poly): Poly => Array.from({ length: Math.max(a.length, b.length) }, (_, i) => add(a[i] ?? Z, neg(b[i] ?? Z)))
const pint = (p: Poly): Poly => [Z, ...p.map((c, k) => fr(c.n, c.d * (k + 1)))]
const peval = (p: Poly, v: Frac): Frac => p.reduceRight((acc, c) => add(mul(acc, v), c), Z)
const P = (...c: number[]): Poly => c.map((n) => fr(n))

const cst = (c: Frac, first: boolean) => (first ? fl(c) : c.n < 0 ? ` - ${fl(neg(c))}` : ` + ${fl(c)}`)

/** Polinomio como LaTeX (de mayor a menor grado). */
const ptex = (p: Poly): string => {
  let s = ''
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k]
    if (c.n === 0) continue
    s += k === 0 ? cst(c, !s) : term(c, k === 1 ? 'x' : `x^{${k}}`, !s)
  }
  return s || '0'
}

/** Polinomio con x := v (con paréntesis alrededor de v) como LaTeX. */
const stex = (p: Poly, v: number): string => {
  let s = ''
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k]
    if (c.n === 0) continue
    s += k === 0 ? cst(c, !s) : term(c, `\\left(${v}\\right)${k === 1 ? '' : `^{${k}}`}`, !s)
  }
  return s || '0'
}

/** n·π, (n/d)·π en LaTeX. */
const piTex = (v: Frac): string => {
  if (v.n === 0) return '0'
  if (v.d === 1) return v.n === 1 ? '\\pi' : `${v.n}\\pi`
  return `\\frac{${v.n === 1 ? '' : v.n}\\pi}{${v.d}}`
}

const linTex = (m: number, n: number): string => {
  const mp = m === 0 ? '' : m === 1 ? 'x' : m === -1 ? '-x' : `${m}x`
  if (!mp) return `${n}`
  return n === 0 ? mp : `${mp}${n < 0 ? '-' : '+'}${Math.abs(n)}`
}
const linExpr = (m: number, n: number) => `(${m})*x+(${n})`
const factor = (r: number) => (r === 0 ? 'x' : `(x${r < 0 ? '+' : '-'}${Math.abs(r)})`)

/** Ventana con la misma escala en x e y (la gráfica mide 760×440). */
const eqView = (x0: number, x1: number, ymin: number): [number, number, number, number] => [x0, x1, ymin, ymin + ((x1 - x0) * 440) / 760]

// ------------------------------------------------------------------ constructor genérico (radios polinómicos al cuadrado)
interface Radius {
  tex: string
  expr: string
  /** Cuadrado del radio, como polinomio en x. */
  sq: Poly
}
interface Spec {
  title: string
  statement: string
  task?: string
  methodWhy: string
  outer: Radius
  inner?: Radius
  a: number
  b: number
  intro: Step[]
  curves: Curve[]
  points: { x: number; y: number; label: string }[]
  view: [number, number, number, number]
  vline?: number
  hints: string[]
  verification: string[]
  py: Extract<PyMeta, { kind: 'volume' }>
  note?: string
}

const TASK = (bounded: string, extra = '') =>
  `Halle el volumen del sólido que se forma al hacer girar **sobre el eje X** la región plana limitada por ${bounded}.${extra}\n\n1. Dibuje la región plana.\n2. Dibuje y defina el elemento de integración.\n3. Plantee la integral correspondiente.\n4. Resuelva la integral.`

const WHY_DISK =
  'Un **sólido de revolución** nace al girar una región plana alrededor de una recta (el eje). Lo cortamos en rebanadas delgadas de grosor $dx$, perpendiculares al eje; si la región **toca el eje**, cada rebanada es un **disco** de volumen $\\pi R^{2}\\,dx$ y la integral los suma todos.'
const WHY_WASHER =
  'Cuando la región **no toca el eje** de giro, el sólido tiene un hueco y cada rebanada es una **arandela** (disco con agujero): volumen $\\pi\\left(R^{2}-r^{2}\\right)dx$, con $R$ el radio exterior y $r$ el interior. La integral suma todas las arandelas.'

function build(s: Spec): Draft {
  const washer = !!s.inner
  const { a, b } = s
  const sq = washer ? psub(s.outer.sq, s.inner!.sq) : s.outer.sq
  const F = pint(sq)
  const Fb = peval(F, fr(b))
  const Fa = peval(F, fr(a))
  const V = add(Fb, neg(Fa))
  const value = Math.PI * val(V)
  const R = s.outer.tex
  const r = s.inner?.tex
  const intLim = `_{${a}}^{${b}}`

  const element: Step = washer
    ? S(
        'Dibujar y definir el elemento de integración',
        'La región no toca el eje X en todo el intervalo, así que al girar deja un **hueco**. El rectángulo vertical de ancho $dx$ va **de la curva de adentro a la de afuera**; al girarlo dibuja una arandela. Radio exterior $R(x)$ = la curva **más lejos** del eje; radio interior $r(x)$ = la **más cerca**.',
        [`R(x)=${R}\\quad\\text{(radio exterior)}`, `r(x)=${r}\\quad\\text{(radio interior)}`, 'dV=\\pi R(x)^{2}dx-\\pi r(x)^{2}dx', `dV=\\pi\\left[\\left(${R}\\right)^{2}-\\left(${r}\\right)^{2}\\right]dx`],
        { R: R, r: r! },
        { warn: 'Es π(R² − r²), NO π(R − r)². Primero se eleva cada radio al cuadrado y DESPUÉS se resta.' },
      )
    : S(
        'Dibujar y definir el elemento de integración',
        'El elemento de integración es un **rectángulo vertical** de ancho $dx$ que va del eje X hasta la curva. Al girarlo alrededor del eje X dibuja un **disco** (un cilindro muy delgado) de radio $R(x)$ = la altura de la curva y grosor $dx$. Volumen del cilindro = área del círculo × grosor.',
        [`R(x)=${R}\\quad\\text{(distancia de la curva al eje X)}`, 'dV=\\pi R(x)^{2}\\,dx', `dV=\\pi\\left(${R}\\right)^{2}dx`],
        { R: R },
        { tip: 'En la pestaña de gráfica mueve el control del rectángulo: verás el disco que se forma al girar.' },
      )

  const setup: Step = S(
    'Plantear la integral',
    `Sumamos (integramos) todas las rebanadas desde $x=${a}$ hasta $x=${b}$ y sacamos $\\pi$ como constante.`,
    washer
      ? [`V=\\pi\\int${intLim}\\left[\\left(${R}\\right)^{2}-\\left(${r}\\right)^{2}\\right]dx`]
      : [`V=\\pi\\int${intLim}\\left(${R}\\right)^{2}dx`],
    { a: `${a}`, b: `${b}` },
  )

  const squares: Step = washer
    ? S(
        'Elevar al cuadrado y restar',
        'Cada radio se eleva al cuadrado **completo** (con su signo y todos sus términos) y después se resta.',
        [`\\left(${R}\\right)^{2}=${ptex(s.outer.sq)}`, `\\left(${r}\\right)^{2}=${ptex(s.inner!.sq)}`, `R^{2}-r^{2}=\\left(${ptex(s.outer.sq)}\\right)-\\left(${ptex(s.inner!.sq)}\\right)=${ptex(sq)}`, `V=\\pi\\int${intLim}\\left(${ptex(sq)}\\right)dx`],
        undefined,
        { warn: 'Un binomio al cuadrado NO es la suma de los cuadrados: (a + b)² = a² + 2ab + b². Y al restar, los signos de TODO el segundo cuadrado cambian.' },
      )
    : S('Elevar al cuadrado el radio', 'Elevar al cuadrado deshace la raíz o expande el binomio.', [`\\left(${R}\\right)^{2}=${ptex(s.outer.sq)}`, `V=\\pi\\int${intLim}\\left(${ptex(sq)}\\right)dx`])

  const evalStep: Step = S(
    'Antiderivada y evaluación',
    'Regla de la potencia término a término y luego $F(b)-F(a)$ **con paréntesis** (cuidado con los negativos). $\\pi$ es una constante que se queda fuera.',
    [
      `F(x)=${ptex(F)}`,
      `F(${b})=${stex(F, b)}=${fl(Fb)}`,
      `F(${a})=${stex(F, a)}=${fl(Fa)}`,
      `V=\\pi\\left[F(${b})-F(${a})\\right]=\\pi\\left[${fl(Fb)}-\\left(${fl(Fa)}\\right)\\right]`,
      `V=${piTex(V)}`,
    ],
    { V: piTex(V) },
  )

  const regions: Region[] = [{ a, b, top: s.outer.expr, bottom: s.inner?.expr ?? '0', color: FILL }]
  return {
    title: s.title,
    statement: s.statement,
    task: s.task,
    method: washer ? 'Volumen por arandelas (eje X)' : 'Volumen por discos (eje X)',
    methodWhy: s.methodWhy + (washer ? ' ' + WHY_WASHER : ' ' + WHY_DISK),
    steps: [...s.intro, element, setup, squares, evalStep],
    answer: `${piTex(V)}\\ \\text{unidades}^{3}\\approx ${value.toFixed(3)}`,
    verification: [...s.verification, `\\text{Casio (pestaña ③): }\\pi\\int${intLim}\\ldots\\approx ${value.toFixed(4)}`],
    hints: s.hints,
    py: s.py,
    area: { curves: s.curves, regions, points: s.points, view: s.view, value, vline: s.vline, note: s.note },
  }
}

// ------------------------------------------------------------------ Familia 10: discos
const sphereExpr = (r: number) => `sqrt(${r * r}-x^2)`
const sphereTex = (r: number) => `\\sqrt{${r * r}-x^{2}}`

type SphereMode = 'full' | 'half' | 'cap'

function sphere(r: number, mode: SphereMode, h = 0): Draft {
  const a = mode === 'full' ? -r : mode === 'half' ? 0 : h
  const b = r
  const r2 = r * r
  const stmtExtra = mode === 'full' ? '' : mode === 'half' ? ',\\quad x=0' : `,\\quad x=${h}`
  const bounded =
    mode === 'full' ? `la gráfica de $y=\\sqrt{${r2}-x^{2}}$ y el eje $X$` : mode === 'half' ? `la gráfica de $y=\\sqrt{${r2}-x^{2}}$, el eje $X$ y el eje $Y$ ($x=0$)` : `la gráfica de $y=\\sqrt{${r2}-x^{2}}$, el eje $X$ y la recta $x=${h}$`
  const title = mode === 'full' ? 'Esfera: semicírculo girando sobre el eje X' : mode === 'half' ? 'Hemisferio: cuarto de círculo girando' : 'Casquete esférico: parte de la esfera'
  const intro: Step[] = [
    S(
      'Dibujar la región plana',
      'Elevamos al cuadrado para reconocer la figura: es la **semicircunferencia superior** (porque $y\\ge 0$) de una circunferencia con centro en el origen.',
      [`y=\\sqrt{${r2}-x^{2}}\\ \\Rightarrow\\ y^{2}=${r2}-x^{2}\\ \\Rightarrow\\ x^{2}+y^{2}=${r2}`, `\\text{centro }(0,0),\\quad \\text{radio }${r},\\quad y\\ge 0`, mode === 'full' ? '\\text{Región: el semicírculo entre la curva y el eje }X' : mode === 'half' ? '\\text{Región: el cuarto de círculo del primer cuadrante}' : `\\text{Región: la parte del semicírculo con }x\\ge ${h}`],
      undefined,
      { tip: 'Dibuja los ejes, marca (−r, 0), (r, 0) y (0, r) y traza el arco por encima del eje X.' },
    ),
    S(
      'Límites de integración',
      mode === 'full' ? 'La curva corta al eje X donde $y=0$.' : mode === 'half' ? 'Desde el eje $Y$ ($x=0$) hasta donde la curva corta al eje $X$.' : `Desde la recta $x=${h}$ hasta donde la curva corta al eje $X$.`,
      mode === 'full' ? [`\\sqrt{${r2}-x^{2}}=0\\ \\Rightarrow\\ x^{2}=${r2}\\ \\Rightarrow\\ x=\\pm ${r}`, `a=-${r},\\qquad b=${r}`] : [`\\sqrt{${r2}-x^{2}}=0\\ \\Rightarrow\\ x=${r}`, `a=${a},\\qquad b=${b}`],
      { a: `${a}`, b: `${b}` },
    ),
  ]
  const pts = [{ x: r, y: 0, label: `(${r}, 0)` }, { x: 0, y: r, label: `(0, ${r})` }]
  if (mode === 'full') pts.push({ x: -r, y: 0, label: `(-${r}, 0)` })
  if (mode === 'cap') pts.push({ x: h, y: Math.sqrt(r2 - h * h), label: `(${h}, ${Number(Math.sqrt(r2 - h * h).toFixed(2))})` })
  const known = mode === 'full' ? `\\text{Comprueba con la fórmula de la esfera: }\\frac{4}{3}\\pi r^{3}=\\frac{4}{3}\\pi\\cdot ${r ** 3}=${fl(fr(4 * r ** 3, 3))}\\pi` : mode === 'half' ? `\\text{Debe ser la mitad de la esfera: }\\frac{1}{2}\\cdot\\frac{4}{3}\\pi\\cdot ${r ** 3}=${fl(fr(2 * r ** 3, 3))}\\pi` : `\\text{Debe ser menor que la media esfera }\\left(${fl(fr(2 * r ** 3, 3))}\\pi\\right)`
  return build({
    title,
    statement: `y=\\sqrt{${r2}-x^{2}},\\quad y=0${stmtExtra}`,
    task: TASK(bounded),
    methodWhy: 'Aquí la región toca el eje X en todo el intervalo, no hay hueco.',
    outer: { tex: sphereTex(r), expr: sphereExpr(r), sq: P(r2, 0, -1) },
    a,
    b,
    intro,
    curves: [{ label: 'f', tex: `y=\\sqrt{${r2}-x^{2}}`, expr: sphereExpr(r), color: BLUE }],
    points: pts,
    view: eqView(-r - 1.5, r + 1.5, -1.2),
    vline: mode === 'full' ? undefined : a,
    hints: ['Eleva al cuadrado para reconocer la circunferencia.', '¿Dónde corta la curva al eje X? (y = 0)', 'V = π ∫ [f(x)]² dx; al elevar al cuadrado la raíz desaparece.'],
    verification: [known],
    py: { kind: 'volume', outer: sphereExpr(r), inner: '0', a: `${a}`, b: `${b}` },
  })
}

/** El enunciado del taller con r general (la gráfica usa r = 3 de ejemplo). */
function sphereSymbolic(): Draft {
  const r0 = 3
  return {
    title: 'Volumen de la esfera (r general)',
    statement: 'y=\\sqrt{r^{2}-x^{2}},\\quad y=0',
    task: 'Encontrar el volumen del sólido formado al hacer girar **sobre el eje X** la región plana limitada por la gráfica de la función $y=\\sqrt{r^{2}-x^{2}}$ y el eje $X$. Para ello haga lo siguiente:\n\n1. Dibuje la región plana.\n2. Dibuje y defina el elemento de integración.\n3. Plantee la integral correspondiente.\n4. Resuelva la integral. *(Debe obtener $V=\\frac{4}{3}\\pi r^{3}$.)*',
    method: 'Volumen por discos (eje X)',
    methodWhy: WHY_DISK + ' Aquí $r$ es un **número fijo** (el radio), no la variable: la variable es $x$.',
    steps: [
      S(
        '1. Dibujar la región plana',
        'Elevamos al cuadrado para reconocer la figura. Como $y\\ge 0$, es la **semicircunferencia superior** de radio $r$ con centro en el origen; la región es el semicírculo entre el arco y el eje $X$.',
        ['y=\\sqrt{r^{2}-x^{2}}\\ \\Rightarrow\\ y^{2}=r^{2}-x^{2}\\ \\Rightarrow\\ x^{2}+y^{2}=r^{2}', '\\text{centro }(0,0),\\quad\\text{radio }r,\\quad y\\ge 0', '\\sqrt{r^{2}-x^{2}}=0\\ \\Rightarrow\\ x=-r\\ \\text{ó}\\ x=r'],
        { a: '-r', b: 'r' },
        { tip: 'Marca (−r, 0), (r, 0) y (0, r) y traza el arco encima del eje X. La gráfica de la app usa r = 3 como ejemplo.' },
      ),
      S(
        '2. Dibujar y definir el elemento de integración',
        'Dibujamos un **rectángulo vertical** de ancho $dx$ y altura $y=\\sqrt{r^{2}-x^{2}}$ que toca el eje $X$. Al girarlo alrededor del eje $X$ genera un **disco** (cilindro delgado) de radio $R(x)=y$ y grosor $dx$.',
        ['R(x)=\\sqrt{r^{2}-x^{2}}\\quad\\text{(radio del disco)}', '\\text{grosor}=dx', 'dV=\\pi R(x)^{2}\\,dx=\\pi\\left(\\sqrt{r^{2}-x^{2}}\\right)^{2}dx'],
        { R: '\\sqrt{r^{2}-x^{2}}' },
        { tip: 'Volumen del cilindro = área de la base (πR²) × altura (dx).' },
      ),
      S('3. Plantear la integral', 'Sumamos todos los discos de $x=-r$ a $x=r$.', ['V=\\pi\\int_{-r}^{r}\\left(\\sqrt{r^{2}-x^{2}}\\right)^{2}dx'], { a: '-r', b: 'r' }),
      S('Simplificar el integrando', 'El cuadrado deshace la raíz (es válido porque $r^{2}-x^{2}\\ge 0$ en $[-r,r]$).', ['\\left(\\sqrt{r^{2}-x^{2}}\\right)^{2}=r^{2}-x^{2}', 'V=\\pi\\int_{-r}^{r}\\left(r^{2}-x^{2}\\right)dx']),
      S(
        '4. Resolver: antiderivada',
        'Aquí $r$ es una **constante**, así que $\\int r^{2}dx=r^{2}x$ (como $\\int 9\\,dx=9x$) y $\\int x^{2}dx=\\frac{x^{3}}{3}$.',
        ['F(x)=r^{2}x-\\frac{x^{3}}{3}'],
        undefined,
        { warn: 'No derives ni integres r: es un número. Un error típico es escribir r³/3 como si r fuera la variable.' },
      ),
      S(
        '4. Resolver: evaluar',
        '$F(r)-F(-r)$ con paréntesis. Las potencias impares de $-r$ conservan el signo negativo.',
        ['F(r)=r^{2}\\cdot r-\\frac{r^{3}}{3}=r^{3}-\\frac{r^{3}}{3}=\\frac{2r^{3}}{3}', 'F(-r)=r^{2}(-r)-\\frac{(-r)^{3}}{3}=-r^{3}+\\frac{r^{3}}{3}=-\\frac{2r^{3}}{3}', 'V=\\pi\\left[\\frac{2r^{3}}{3}-\\left(-\\frac{2r^{3}}{3}\\right)\\right]=\\pi\\cdot\\frac{4r^{3}}{3}', 'V=\\frac{4}{3}\\pi r^{3}'],
        { V: '\\frac{4}{3}\\pi r^{3}' },
      ),
      S('Atajo por simetría', 'El integrando es **par** (simétrico respecto al eje $Y$): $\\int_{-r}^{r}=2\\int_{0}^{r}$. Da lo mismo con menos números negativos.', ['V=2\\pi\\int_{0}^{r}\\left(r^{2}-x^{2}\\right)dx=2\\pi\\left[r^{3}-\\frac{r^{3}}{3}\\right]=2\\pi\\cdot\\frac{2r^{3}}{3}=\\frac{4}{3}\\pi r^{3}']),
    ],
    answer: 'V=\\frac{4}{3}\\pi r^{3}\\ \\text{unidades}^{3}',
    verification: [`\\text{Es la fórmula conocida del volumen de la esfera.}`, `\\text{Con }r=${r0}:\\ \\frac{4}{3}\\pi\\cdot ${r0 ** 3}=36\\pi\\approx 113.097`, `\\text{Casio: }\\pi\\int_{-3}^{3}\\left(9-X^{2}\\right)dX\\approx 113.0973`],
    hints: ['Eleva al cuadrado para ver la circunferencia: x² + y² = r².', 'Elemento: disco de radio y = √(r² − x²) y grosor dx; dV = π y² dx.', 'r es una constante: ∫ r² dx = r² x.'],
    py: { kind: 'volume', outer: 'sqrt(r^2-x^2)', inner: '0', a: '-r', b: 'r', syms: ['r'] },
    area: {
      curves: [{ label: 'f', tex: 'y=\\sqrt{r^{2}-x^{2}}\\ (r=3)', expr: sphereExpr(r0), color: BLUE }],
      regions: [{ a: -r0, b: r0, top: sphereExpr(r0), bottom: '0', color: FILL }],
      points: [{ x: -r0, y: 0, label: '(-r, 0)' }, { x: r0, y: 0, label: '(r, 0)' }, { x: 0, y: r0, label: '(0, r)' }],
      view: eqView(-r0 - 1.5, r0 + 1.5, -1.2),
      value: 36 * Math.PI,
      note: 'Gráfica de ejemplo con r = 3 (volumen 36π). El procedimiento vale para cualquier r.',
    },
  }
}

function ellipse(a: number, b: number): Draft {
  const a2 = a * a
  const b2 = b * b
  const k = fr(b2, a2)
  const tex = `\\frac{${b}}{${a}}\\sqrt{${a2}-x^{2}}`
  const expr = `(${b}/${a})*sqrt(${a2}-x^2)`
  const V = fr(4 * a * b2, 3)
  return build({
    title: 'Elipsoide: media elipse girando sobre el eje X',
    statement: `y=${tex},\\quad y=0`,
    task: TASK(`la gráfica de $y=\\frac{${b}}{${a}}\\sqrt{${a2}-x^{2}}$ y el eje $X$`),
    methodWhy: 'Es una **semielipse**; al girar sobre su eje largo/corto se obtiene un elipsoide.',
    outer: { tex, expr, sq: [fr(b2), Z, neg(k)] },
    a: -a,
    b: a,
    intro: [
      S(
        'Dibujar la región plana',
        'Elevamos al cuadrado y pasamos todo al mismo lado para reconocer la curva: es la mitad superior de una **elipse**.',
        [`y=${tex}\\ \\Rightarrow\\ y^{2}=\\frac{${b2}}{${a2}}\\left(${a2}-x^{2}\\right)`, `\\frac{${a2}y^{2}}{${b2}}=${a2}-x^{2}\\ \\Rightarrow\\ \\frac{x^{2}}{${a2}}+\\frac{y^{2}}{${b2}}=1`, `\\text{semiejes: }${a}\\text{ en }x,\\quad ${b}\\text{ en }y`],
        undefined,
        { tip: 'Marca (±a, 0) y (0, b) y dibuja el arco ovalado por encima del eje X.' },
      ),
      S('Límites de integración', 'La curva corta al eje $X$ donde $y=0$.', [`${tex}=0\\ \\Rightarrow\\ x^{2}=${a2}\\ \\Rightarrow\\ x=\\pm ${a}`, `a=-${a},\\qquad b=${a}`], { a: `-${a}`, b: `${a}` }),
    ],
    curves: [{ label: 'f', tex: `y=${tex}`, expr, color: BLUE }],
    points: [{ x: -a, y: 0, label: `(-${a}, 0)` }, { x: a, y: 0, label: `(${a}, 0)` }, { x: 0, y: b, label: `(0, ${b})` }],
    view: eqView(-a - 1.5, a + 1.5, -1.2),
    hints: ['Elevar al cuadrado quita la raíz, pero también eleva la fracción: (b/a)² = b²/a².', 'Límites: dónde y = 0.', 'Fórmula de comprobación: V = (4/3)·π·a·b².'],
    verification: [`\\text{Fórmula del elipsoide: }\\frac{4}{3}\\pi a\\,b^{2}=\\frac{4}{3}\\pi\\cdot ${a}\\cdot ${b2}=${piTex(V)}`],
    py: { kind: 'volume', outer: expr, inner: '0', a: `-${a}`, b: `${a}` },
  })
}

function sinDisk(): Draft {
  const value = (Math.PI * Math.PI) / 2
  return {
    title: 'Un arco de seno girando sobre el eje X',
    statement: 'y=\\sin x,\\quad y=0,\\quad 0\\le x\\le\\pi',
    task: TASK('la gráfica de $y=\\sin x$ y el eje $X$ entre $x=0$ y $x=\\pi$'),
    method: 'Volumen por discos (eje X)',
    methodWhy: WHY_DISK + ' El integrando queda con $\\sin^{2}x$: se baja la potencia con la identidad del ángulo doble. **Calculadora en radianes.**',
    steps: [
      S('Dibujar la región plana', 'Un "arco" de la onda seno: sube de $0$ a $1$ y baja a $0$.', ['\\sin x=0\\ \\Rightarrow\\ x=0,\\ \\pi', '\\text{Máximo: }(\\tfrac{\\pi}{2},1)'], { a: '0', b: '\\pi' }),
      S('Dibujar y definir el elemento de integración', 'Rectángulo vertical de altura $\\sin x$ y ancho $dx$; al girarlo da un **disco** de radio $\\sin x$.', ['R(x)=\\sin x', 'dV=\\pi\\,\\sin^{2}x\\,dx'], { R: '\\sin x' }),
      S('Plantear la integral', 'Todos los discos de $0$ a $\\pi$.', ['V=\\pi\\int_{0}^{\\pi}\\sin^{2}x\\,dx'], { a: '0', b: '\\pi' }),
      S('Bajar la potencia', 'No se puede integrar $\\sin^{2}x$ directo; usamos $\\sin^{2}x=\\dfrac{1-\\cos 2x}{2}$.', ['V=\\pi\\int_{0}^{\\pi}\\frac{1-\\cos 2x}{2}\\,dx=\\frac{\\pi}{2}\\int_{0}^{\\pi}\\left(1-\\cos 2x\\right)dx'], undefined, { tip: 'Si no recuerdas la identidad: cos 2x = 1 − 2 sin²x → despeja sin²x.' }),
      S('Antiderivada', '$\\int\\cos 2x\\,dx=\\frac{\\sin 2x}{2}$ (dividimos entre el 2 de adentro).', ['F(x)=x-\\frac{\\sin 2x}{2}']),
      S('Evaluar', '$\\sin 2\\pi=0$ y $\\sin 0=0$, así que solo sobrevive el término $x$.', ['F(\\pi)=\\pi-\\frac{\\sin 2\\pi}{2}=\\pi,\\qquad F(0)=0', 'V=\\frac{\\pi}{2}\\left[\\pi-0\\right]=\\frac{\\pi^{2}}{2}']),
    ],
    answer: '\\frac{\\pi^{2}}{2}\\ \\text{unidades}^{3}\\approx 4.935',
    verification: ['\\text{Casio (Rad): }\\pi\\int_{0}^{\\pi}\\sin^{2}X\\,dX\\approx 4.9348'],
    hints: ['El radio del disco es la altura de la curva: sen x.', 'sen²x = (1 − cos 2x)/2.', 'sen 2π = 0 y sen 0 = 0.'],
    usesTrig: true,
    py: { kind: 'volume', outer: 'sin(x)', inner: '0', a: '0', b: 'pi' },
    area: {
      curves: [{ label: 'f', tex: 'y=\\sin x', expr: 'sin(x)', color: BLUE }],
      regions: [{ a: 0, b: Math.PI, top: 'sin(x)', bottom: '0', color: FILL }],
      points: [{ x: 0, y: 0, label: '(0, 0)' }, { x: Math.PI, y: 0, label: '(π, 0)' }, { x: Math.PI / 2, y: 1, label: '(π/2, 1)' }],
      view: [-0.6, Math.PI + 0.8, -1.4, 1.6],
      value,
    },
  }
}

// ------------------------------------------------------------------ Familia 11: arandelas
/** Recta f(x)=m·x+n (radio exterior) y parábola g(x)=x²+c (radio interior); se cortan en x=r1 y x=r2 enteros. */
function lineParab(m: number, n: number, c: number, r1: number, r2: number): Draft {
  const lt = linTex(m, n)
  const pt = c === 0 ? 'x^{2}' : `x^{2}+${c}`
  const pe = c === 0 ? 'x^2' : `x^2+${c}`
  const y1 = m * r1 + n
  const y2 = m * r2 + n
  const mid = fr(r1 + r2, 2)
  const fM = add(mul(fr(m), mid), fr(n))
  const gM = add(mul(mid, mid), fr(c))
  const outerSq = pmul(P(n, m), P(n, m))
  const innerSq = pmul(P(c, 0, 1), P(c, 0, 1))
  const ymax = Math.max(y1, y2, Number(val(fM)), Number(val(gM)), 1)
  const eq = P(c - n, -m, 1)
  return build({
    title: 'Región entre una recta y una parábola, girada sobre el eje X',
    statement: `f(x)=${lt},\\quad g(x)=${pt}`,
    task: TASK(`las funciones $f(x)=${lt}$ y $g(x)=${pt}$`, ' Construya la gráfica y dibuje el elemento de integración.'),
    methodWhy: 'Las dos curvas **encierran** una región que no toca el eje X: al girarla queda un hueco.',
    outer: { tex: lt, expr: linExpr(m, n), sq: outerSq },
    inner: { tex: pt, expr: pe, sq: innerSq },
    a: r1,
    b: r2,
    intro: [
      S(
        'Puntos de corte (límites)',
        'Igualamos las dos funciones y pasamos todo a un lado para factorizar el trinomio. Esas soluciones son los límites $a$ y $b$.',
        [`f(x)=g(x)`, `${lt}=${pt}`, `0=${pt}-\\left(${lt}\\right)=${ptex(eq)}`, `0=${factor(r1)}${factor(r2)}`, `x=${r1},\\qquad x=${r2}`],
        { a: `${r1}`, b: `${r2}` },
        { tip: 'Busca dos números que multipliquen el término libre y sumen el coeficiente de x (con signo contrario).' },
      ),
      S(
        'Dibujar la región plana',
        'La recta pasa por los dos puntos de corte; la parábola se abre hacia arriba. Entre los cortes una queda encima de la otra y **ambas están sobre el eje X**.',
        [`f(${r1})=${y1},\\quad f(${r2})=${y2}\\ \\Rightarrow\\ \\text{puntos }(${r1},${y1})\\text{ y }(${r2},${y2})`, `g(x)=${pt}:\\ \\text{vértice }(0,${c})`],
        undefined,
        { tip: 'Si alguna curva cruzara el eje X dentro del intervalo habría que tener más cuidado (radio = |valor|).' },
      ),
      S(
        '¿Cuál es el radio exterior?',
        'El radio exterior $R$ es la curva **más lejos del eje X**; la otra es el radio interior $r$. Probamos un punto en medio de los cortes.',
        [`x=${fl(mid)}:\\quad f=${fl(fM)},\\quad g=${fl(gM)}`, 'f>g\\ge 0\\ \\Rightarrow\\ R=f\\ \\text{(exterior)},\\quad r=g\\ \\text{(interior)}'],
        undefined,
        { warn: 'Aquí "más lejos del eje" coincide con "más arriba" porque ambas curvas son positivas. Si fueran negativas, sería al revés.' },
      ),
    ],
    curves: [
      { label: 'f', tex: `f(x)=${lt}`, expr: linExpr(m, n), color: BLUE },
      { label: 'g', tex: `g(x)=${pt}`, expr: pe, color: RED },
    ],
    points: [{ x: r1, y: y1, label: `(${r1}, ${y1})` }, { x: r2, y: y2, label: `(${r2}, ${y2})` }],
    view: [Math.min(r1, 0) - 1.5, Math.max(r2, 0) + 1.5, -1, ymax + 2],
    hints: ['Iguala f y g y factoriza para hallar los límites.', 'R es la curva más lejos del eje X, r la más cerca.', 'V = π ∫ (R² − r²) dx. Cuidado: (x² + c)² = x⁴ + 2c x² + c².'],
    verification: [`\\text{Comprueba el signo: }R^{2}-r^{2}>0\\text{ en todo el intervalo, así que }V>0.`],
    py: { kind: 'volume', outer: linExpr(m, n), inner: pe, a: `${r1}`, b: `${r2}` },
  })
}

/** Radio exterior √x y radio interior x/k o x². */
function rootVs(kind: 'line' | 'sq', k = 2): Draft {
  const line = kind === 'line'
  const innerTex = line ? `\\frac{x}{${k}}` : 'x^{2}'
  const innerExpr = line ? `x/${k}` : 'x^2'
  const innerSq: Poly = line ? [Z, Z, fr(1, k * k)] : P(0, 0, 0, 0, 1)
  const end = line ? k * k : 1
  const yEnd = line ? k : 1
  return build({
    title: line ? 'Raíz y recta: la región entre √x y x/k' : 'Raíz y parábola: la región entre √x y x²',
    statement: `f(x)=\\sqrt{x},\\quad g(x)=${innerTex}`,
    task: TASK(`las funciones $f(x)=\\sqrt{x}$ y $g(x)=${innerTex}$`, ' Construya la gráfica y dibuje el elemento de integración.'),
    methodWhy: 'La región queda **entre** dos curvas que se tocan en el origen y en otro punto: al girar se forma un hueco.',
    outer: { tex: '\\sqrt{x}', expr: 'sqrt(x)', sq: P(0, 1) },
    inner: { tex: innerTex, expr: innerExpr, sq: innerSq },
    a: 0,
    b: end,
    intro: [
      S(
        'Puntos de corte (límites)',
        'Igualamos. Para quitar la raíz elevamos al cuadrado ambos lados; después comprobamos que las soluciones sirven en la ecuación original.',
        line ? [`\\sqrt{x}=\\frac{x}{${k}}`, `x=\\frac{x^{2}}{${k * k}}`, `0=x^{2}-${k * k}x=x\\left(x-${k * k}\\right)`, `x=0,\\qquad x=${k * k}`] : ['\\sqrt{x}=x^{2}', 'x=x^{4}', '0=x^{4}-x=x\\left(x^{3}-1\\right)=x(x-1)\\left(x^{2}+x+1\\right)', 'x=0,\\qquad x=1\\quad\\text{(el último factor no tiene raíces reales)}'],
        { a: '0', b: `${end}` },
        { warn: 'Al elevar al cuadrado pueden aparecer soluciones falsas: sustituye cada x en la ecuación original (aquí las dos sirven).' },
      ),
      S(
        'Dibujar la región plana',
        `La raíz sube rápido y luego se aplana; la otra curva (${line ? 'una recta' : 'una parábola'}) arranca igual en el origen.`,
        [`\\text{Puntos de corte: }(0,0)\\text{ y }(${end},${yEnd})`, line ? `\\text{En }x=${k}:\\ \\sqrt{${k}}\\approx ${Math.sqrt(k).toFixed(2)}>\\frac{${k}}{${k}}=1` : '\\text{En }x=\\tfrac12:\\ \\sqrt{0.5}\\approx 0.71>0.25'],
      ),
      S('¿Cuál es el radio exterior?', 'Punto de prueba en el medio: la curva **más lejos del eje X** es el radio exterior.', [line ? `x=1:\\ \\sqrt{1}=1>\\frac{1}{${k}}\\ \\Rightarrow\\ R=\\sqrt{x},\\ r=\\frac{x}{${k}}` : 'x=0.5:\\ \\sqrt{x}\\approx 0.71>x^{2}=0.25\\ \\Rightarrow\\ R=\\sqrt{x},\\ r=x^{2}']),
    ],
    curves: [
      { label: 'f', tex: 'f(x)=\\sqrt{x}', expr: 'sqrt(x)', color: BLUE },
      { label: 'g', tex: `g(x)=${innerTex}`, expr: innerExpr, color: RED },
    ],
    points: [{ x: 0, y: 0, label: '(0, 0)' }, { x: end, y: yEnd, label: `(${end}, ${yEnd})` }],
    view: line ? [-0.8, end + 1.2, -0.8, yEnd + 1.6] : [-0.4, 1.6, -0.3, 1.5],
    hints: ['Elevar al cuadrado (√x)² = x: ¡sin raíz!', 'La curva más lejos del eje es el radio exterior.', 'No olvides elevar el radio interior al cuadrado COMPLETO.'],
    verification: [line ? `\\text{Fórmula guía: }V=\\frac{\\pi k^{4}}{6}=\\frac{\\pi\\cdot ${k ** 4}}{6}` : '\\text{Debe dar un número menor que }\\pi\\int_{0}^{1}x\\,dx=\\frac{\\pi}{2}'],
    py: { kind: 'volume', outer: 'sqrt(x)', inner: innerExpr, a: '0', b: `${end}` },
  })
}

/** Esfera con un agujero cilíndrico: radio exterior √(R²−x²), interior h. */
function ring(R: number, h: number): Draft {
  const c2 = R * R - h * h
  const c = Math.round(Math.sqrt(c2))
  const R2 = R * R
  return build({
    title: 'Esfera perforada (anillo): arco y recta horizontal',
    statement: `y=\\sqrt{${R2}-x^{2}},\\quad y=${h}`,
    task: TASK(`la gráfica de $y=\\sqrt{${R2}-x^{2}}$ y la recta $y=${h}$`, ' Construya la gráfica y dibuje el elemento de integración.'),
    methodWhy: 'La región (un "gorro" circular) está **por encima** de la recta $y=h$, no toca el eje: al girar queda un agujero cilíndrico de radio $h$ en una esfera.',
    outer: { tex: sphereTex(R), expr: sphereExpr(R), sq: P(R2, 0, -1) },
    inner: { tex: `${h}`, expr: `${h}`, sq: P(h * h) },
    a: -c,
    b: c,
    intro: [
      S(
        'Puntos de corte (límites)',
        'Donde el arco de circunferencia se encuentra con la recta horizontal.',
        [`\\sqrt{${R2}-x^{2}}=${h}`, `${R2}-x^{2}=${h * h}\\quad\\text{(al cuadrado)}`, `x^{2}=${c2}\\ \\Rightarrow\\ x=\\pm ${c}`, `a=-${c},\\qquad b=${c}`],
        { a: `-${c}`, b: `${c}` },
        { tip: 'Hay DOS soluciones (±). Los dos cortes son (−c, h) y (c, h).' },
      ),
      S('Dibujar la región plana', `El arco es parte de la circunferencia $x^{2}+y^{2}=${R2}$ (radio ${R}). La región está entre el arco (arriba) y la recta $y=${h}$ (abajo).`, [`x^{2}+y^{2}=${R2},\\ y\\ge0`, `\\text{puntos de corte }(-${c},${h})\\text{ y }(${c},${h})`]),
      S('¿Cuál es el radio exterior?', 'La región queda entre la recta (más cerca del eje) y el arco (más lejos).', [`x=0:\\ \\sqrt{${R2}}=${R}>${h}\\ \\Rightarrow\\ R=\\sqrt{${R2}-x^{2}},\\ r=${h}`]),
    ],
    curves: [
      { label: 'f', tex: `y=\\sqrt{${R2}-x^{2}}`, expr: sphereExpr(R), color: BLUE },
      { label: 'g', tex: `y=${h}`, expr: `${h}`, color: RED },
    ],
    points: [{ x: -c, y: h, label: `(-${c}, ${h})` }, { x: c, y: h, label: `(${c}, ${h})` }, { x: 0, y: R, label: `(0, ${R})` }],
    view: eqView(-R - 1.5, R + 1.5, -1.2),
    hints: ['Iguala el arco con la recta y eleva al cuadrado.', 'R es el arco, r es la recta horizontal.', 'Dato curioso: el volumen solo depende de la mitad del largo del agujero, c.'],
    verification: [`\\text{Dato curioso (anillo): }V=\\frac{4}{3}\\pi c^{3}=\\frac{4}{3}\\pi\\cdot ${c ** 3}=${piTex(fr(4 * c ** 3, 3))}\\ \\text{(no depende del radio de la esfera).}`],
    py: { kind: 'volume', outer: sphereExpr(R), inner: `${h}`, a: `-${c}`, b: `${c}` },
  })
}

function trigWasher(): Draft {
  const value = Math.PI / 2
  return {
    title: 'Coseno y seno girando sobre el eje X',
    statement: 'f(x)=\\cos x,\\quad g(x)=\\sin x,\\quad x=0',
    task: TASK('las funciones $f(x)=\\cos x$ y $g(x)=\\sin x$ y el eje $Y$ ($x=0$)', ' Construya la gráfica y dibuje el elemento de integración.'),
    method: 'Volumen por arandelas (eje X)',
    methodWhy: 'La región queda entre dos curvas: al girar se forma un hueco. ' + WHY_WASHER + ' Con identidades trigonométricas el integrando se simplifica mucho. **Calculadora en radianes.**',
    steps: [
      S('Puntos de corte (límites)', 'Igualamos seno y coseno. Dividimos entre $\\cos x$ y usamos que $\\tan x=1$. El otro límite es el eje $Y$ ($x=0$).', ['\\sin x=\\cos x\\ \\Rightarrow\\ \\tan x=1', 'x=\\frac{\\pi}{4}\\quad\\text{(primer corte con }x>0\\text{)}', 'a=0,\\qquad b=\\frac{\\pi}{4}'], { a: '0', b: '\\frac{\\pi}{4}' }, { tip: 'sen(π/4) = cos(π/4) = √2/2.' }),
      S('Dibujar la región plana', 'Entre $x=0$ y $x=\\frac{\\pi}{4}$ el coseno baja de $1$ a $\\frac{\\sqrt2}{2}$ y el seno sube de $0$ a $\\frac{\\sqrt2}{2}$.', ['x=0:\\ \\cos 0=1,\\ \\sin 0=0', 'x=\\tfrac{\\pi}{4}:\\ \\cos=\\sin=\\tfrac{\\sqrt{2}}{2}\\approx 0.707']),
      S('Dibujar y definir el elemento de integración', 'Rectángulo vertical que va del seno al coseno. Como el coseno está **más lejos** del eje, $R=\\cos x$ y $r=\\sin x$.', ['R(x)=\\cos x,\\quad r(x)=\\sin x', 'dV=\\pi\\left[\\cos^{2}x-\\sin^{2}x\\right]dx'], { R: '\\cos x', r: '\\sin x' }, { warn: 'Es π(R² − r²), no π(R − r)².' }),
      S('Plantear la integral', 'Todas las arandelas de $0$ a $\\frac{\\pi}{4}$.', ['V=\\pi\\int_{0}^{\\pi/4}\\left(\\cos^{2}x-\\sin^{2}x\\right)dx']),
      S('Identidad del ángulo doble', '$\\cos^{2}x-\\sin^{2}x=\\cos 2x$: el integrando se simplifica solo.', ['V=\\pi\\int_{0}^{\\pi/4}\\cos 2x\\,dx'], undefined, { tip: 'Si no la recuerdas: cos 2x = cos²x − sin²x es la definición del ángulo doble.' }),
      S('Antiderivada y evaluación', '$\\int\\cos 2x\\,dx=\\frac{\\sin 2x}{2}$.', ['F(x)=\\frac{\\sin 2x}{2}', 'F\\left(\\tfrac{\\pi}{4}\\right)=\\frac{\\sin\\frac{\\pi}{2}}{2}=\\frac{1}{2},\\qquad F(0)=0', 'V=\\pi\\left[\\frac{1}{2}-0\\right]=\\frac{\\pi}{2}']),
    ],
    answer: '\\frac{\\pi}{2}\\ \\text{unidades}^{3}\\approx 1.571',
    verification: ['\\text{Casio (Rad): }\\pi\\int_{0}^{\\pi/4}\\left(\\cos^{2}X-\\sin^{2}X\\right)dX\\approx 1.5708'],
    hints: ['sen x = cos x ⇒ tan x = 1.', 'En x = 0: cos 0 = 1 > sen 0 = 0, así que R = cos x.', 'cos²x − sen²x = cos 2x.'],
    usesTrig: true,
    py: { kind: 'volume', outer: 'cos(x)', inner: 'sin(x)', a: '0', b: 'pi/4' },
    area: {
      curves: [
        { label: 'f', tex: 'f(x)=\\cos x', expr: 'cos(x)', color: BLUE },
        { label: 'g', tex: 'g(x)=\\sin x', expr: 'sin(x)', color: RED },
      ],
      regions: [{ a: 0, b: Math.PI / 4, top: 'cos(x)', bottom: 'sin(x)', color: FILL }],
      points: [{ x: 0, y: 1, label: '(0, 1)' }, { x: 0, y: 0, label: '(0, 0)' }, { x: Math.PI / 4, y: Math.SQRT1_2, label: '(π/4, √2/2)' }],
      view: [-0.3, Math.PI / 2 + 0.3, -0.3, 1.3],
      value,
      vline: 0,
    },
  }
}

// ------------------------------------------------------------------ catálogo
type Gen = (r: Rng) => Draft

export const VOLUME_FAMILIES: Record<number, Record<Level, Gen>> = {
  10: {
    T: () => sphereSymbolic(),
    G1: (r) => sphere(r.pick([2, 3, 4, 5]), 'full'),
    G2: (r) => (r.next() < 0.5 ? sphere(r.pick([2, 3, 4, 6]), 'half') : sphere(r.pick([3, 4, 5]), 'cap', r.pick([1, 2]))),
    H1: (r) => {
      const [a, b] = r.pick([[3, 2], [4, 3], [5, 3], [2, 1], [5, 4]])
      return ellipse(a, b)
    },
    H2: () => sinDisk(),
  },
  11: {
    T: () => lineParab(-4, 0, 3, -3, -1),
    G1: (r) => {
      const [p, q] = r.pick([[1, 3], [1, 2], [2, 3], [1, 4], [2, 4], [3, 4]])
      return r.next() < 0.5 ? lineParab(p + q, 0, p * q, p, q) : lineParab(-(p + q), 0, p * q, -q, -p)
    },
    G2: (r) => {
      const [p, q] = r.pick([[-1, 2], [-1, 3], [-2, 1], [-2, 2], [-1, 1], [0, 2], [0, 3], [-3, 1]])
      return lineParab(p + q, -p * q, 0, p, q)
    },
    H1: (r) => (r.next() < 0.5 ? rootVs('line', r.pick([2, 3])) : rootVs('sq')),
    H2: (r) => {
      const i = r.int(0, 3)
      return i === 3 ? trigWasher() : ring(...r.pick<[number, number]>([[5, 3], [5, 4], [10, 8], [10, 6]]))
    },
  },
}
