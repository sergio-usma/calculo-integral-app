import type { Draft } from './integrals'
import type { Curve, Level, PyMeta, Region, Step } from './types'
import type { Frac, Rng } from './util'
import { add, fl, fn, fr, mul, neg, term, val } from './util'

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

const gcdN = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcdN(b, a % b))
const lcm = (a: number, b: number) => Math.abs(a * b) / gcdN(a, b)
const fracOver = (n: number, D: number) => (D === 1 ? `${n}` : n < 0 ? `-\\frac{${-n}}{${D}}` : `\\frac{${n}}{${D}}`)

const cst = (c: Frac, first: boolean) => (first ? fl(c) : c.n < 0 ? ` - ${fl(neg(c))}` : ` + ${fl(c)}`)
const xpow = (k: number, v = 'x') => (k === 1 ? v : `${v}^{${k}}`)

/** Polinomio como LaTeX (de mayor a menor grado). */
const ptex = (p: Poly): string => {
  let s = ''
  for (let k = p.length - 1; k >= 0; k--) {
    const c = p[k]
    if (c.n === 0) continue
    s += k === 0 ? cst(c, !s) : term(c, xpow(k), !s)
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

/** Reemplaza la variable x por (v) dentro de una expresión LaTeX. */
const subTex = (tex: string, v: number | string) => tex.replace(/x/g, `\\left(${v}\\right)`)

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
const factorLine = (r: number) => (r === 0 ? 'x=0' : `x${r < 0 ? '+' : '-'}${Math.abs(r)}=0\\ \\Rightarrow\\ x=${r}`)

/** Ventana con la misma escala en x e y (la gráfica mide 760×440). */
const eqView = (x0: number, x1: number, ymin: number): [number, number, number, number] => [x0, x1, ymin, ymin + ((x1 - x0) * 440) / 760]

// ------------------------------------------------------------------ tablas de valores
const fmtN = (v: number) => {
  const r = Math.round(v * 100) / 100
  return Object.is(r, -0) ? '0' : String(r)
}
const isRound = (v: number) => Math.abs(v * 100 - Math.round(v * 100)) < 1e-9

/** Valores de x para la tabla: paso "bonito" que dé entre 5 y 13 columnas dentro de [lo, hi]. */
export function tableXs(lo: number, hi: number): number[] {
  let xs: number[] = []
  for (const step of [1, 0.5, 0.25, 0.125]) {
    xs = []
    for (let x = Math.ceil(lo / step - 1e-9) * step; x <= hi + 1e-9; x += step) xs.push(Math.round(x * 1000) / 1000)
    if (xs.length >= 5 && xs.length <= 13) return xs
  }
  return xs
}

const arrayTex = (header: string[], rows: [string, string[]][]) =>
  `\\begin{array}{c|${'c'.repeat(header.length)}} x & ${header.join(' & ')} \\\\ \\hline ${rows.map(([n, v]) => `${n} & ${v.join(' & ')}`).join(' \\\\ ')} \\end{array}`

const tableLine = (rows: { name: string; expr: string }[], cols: { x: number; label: string }[]) =>
  arrayTex(
    cols.map((c) => c.label),
    rows.map(({ name, expr }) => {
      const f = fn(expr)
      return [name, cols.map((c) => { const y = f(c.x); return Number.isFinite(y) ? fmtN(y) : '\\text{—}' })] as [string, string[]]
    }),
  )

// ------------------------------------------------------------------ radios con su desarrollo del cuadrado
interface Radius {
  tex: string
  expr: string
  /** Cuadrado del radio, como polinomio en x. */
  sq: Poly
  /** Líneas de LaTeX que muestran cómo se eleva al cuadrado. */
  expand: string[]
  /** Explicación (markdown) de cómo se eleva al cuadrado. */
  expandWhy: string
}

const radLine = (m: number, n: number): Radius => {
  const tex = linTex(m, n)
  const sq = pmul(P(n, m), P(n, m))
  if (m === 0)
    return { tex, expr: `${n}`, sq, expandWhy: 'Es un número: se eleva al cuadrado como cualquier número.', expand: [`\\left(${n}\\right)^{2}=${n * n}`] }
  if (n === 0)
    return {
      tex,
      expr: linExpr(m, n),
      sq,
      expandWhy: 'Es un **monomio**: el cuadrado afecta al número **y** a la letra: $(ax)^2=a^2x^2$. Ojo con el signo: un número negativo al cuadrado es **positivo**.',
      expand: [`\\left(${tex}\\right)^{2}=\\left(${m}\\right)^{2}\\cdot x^{2}`, `\\left(${m}\\right)^{2}=${m * m}`, `\\left(${tex}\\right)^{2}=${ptex(sq)}`],
    }
  const mx = m === 1 ? 'x' : m === -1 ? '-x' : `${m}x`
  return {
    tex,
    expr: linExpr(m, n),
    sq,
    expandWhy: 'Es un **binomio** (dos términos). Se usa $(a+b)^2=a^2+2ab+b^2$: el término del medio **no desaparece**.',
    expand: [`\\left(${tex}\\right)^{2}=a^{2}+2ab+b^{2}\\quad\\text{con }a=${mx},\\ b=${n}`, `a^{2}=\\left(${mx}\\right)^{2}=${ptex(pmul(P(0, m), P(0, m)))}`, `2ab=2\\left(${mx}\\right)\\left(${n}\\right)=${ptex(P(0, 2 * m * n))}`, `b^{2}=\\left(${n}\\right)^{2}=${n * n}`, `\\left(${tex}\\right)^{2}=${ptex(sq)}`],
  }
}

const radParab = (c: number): Radius => {
  const tex = c === 0 ? 'x^{2}' : `x^{2}+${c}`
  const sq = pmul(P(c, 0, 1), P(c, 0, 1))
  if (c === 0)
    return { tex, expr: 'x^2', sq, expandWhy: 'Potencia de una potencia: **se multiplican los exponentes**, $(x^m)^n=x^{mn}$.', expand: ['\\left(x^{2}\\right)^{2}=x^{2\\cdot 2}=x^{4}'] }
  return {
    tex,
    expr: `x^2+${c}`,
    sq,
    expandWhy: 'Es un **binomio**: $(a+b)^2=a^2+2ab+b^2$. El término del medio **no desaparece** (error muy común: escribir $x^4+9$).',
    expand: [`\\left(${tex}\\right)^{2}=a^{2}+2ab+b^{2}\\quad\\text{con }a=x^{2},\\ b=${c}`, 'a^{2}=\\left(x^{2}\\right)^{2}=x^{4}', `2ab=2\\cdot x^{2}\\cdot ${c}=${2 * c}x^{2}`, `b^{2}=${c}^{2}=${c * c}`, `\\left(${tex}\\right)^{2}=${ptex(sq)}`],
  }
}

const radArc = (R: number): Radius => {
  const R2 = R * R
  const tex = `\\sqrt{${R2}-x^{2}}`
  const sq = P(R2, 0, -1)
  return { tex, expr: `sqrt(${R2}-x^2)`, sq, expandWhy: 'La raíz cuadrada y el cuadrado son operaciones **inversas**: se cancelan, $(\\sqrt{u})^2=u$, siempre que $u\\ge 0$ (aquí lo es entre los límites).', expand: [`\\left(${tex}\\right)^{2}=${R2}-x^{2}`, '\\text{(la raíz desaparece)}'] }
}

const radConst = (h: number): Radius => ({ tex: `${h}`, expr: `${h}`, sq: P(h * h), expandWhy: 'Es un número constante (una recta horizontal): su cuadrado es otro número.', expand: [`\\left(${h}\\right)^{2}=${h * h}`] })

// ------------------------------------------------------------------ pasos de álgebra comunes
const subtractLines = (o: Poly, i: Poly): string[] => {
  const lines: string[] = [`R^{2}-r^{2}=\\left(${ptex(o)}\\right)-\\left(${ptex(i)}\\right)`]
  let expanded = ptex(o)
  for (let k = i.length - 1; k >= 0; k--) {
    const c = neg(i[k])
    if (c.n === 0) continue
    expanded += k === 0 ? cst(c, false) : term(c, xpow(k), false)
  }
  lines.push(`R^{2}-r^{2}=${expanded}`)
  for (let k = Math.max(o.length, i.length) - 1; k >= 0; k--) {
    const a = o[k] ?? Z
    const b = i[k] ?? Z
    if (a.n === 0 && b.n === 0) continue
    const body = k === 0 ? '\\text{número}' : `x^{${k}}`
    lines.push(`\\text{coef. de }${body}:\\ ${fl(a)}-${b.n < 0 ? `\\left(${fl(b)}\\right)` : fl(b)}=${fl(add(a, neg(b)))}`)
  }
  lines.push(`R^{2}-r^{2}=${ptex(psub(o, i))}`)
  return lines
}

const antiderivLines = (sq: Poly): string[] => {
  const out: string[] = []
  const F = pint(sq)
  for (let k = sq.length - 1; k >= 0; k--) {
    const c = sq[k]
    if (c.n === 0) continue
    const t = k === 0 ? fl(c) : term(c, xpow(k), true)
    const cc = c.n < 0 ? `\\left(${fl(c)}\\right)` : fl(c)
    out.push(`\\int ${t}\\,dx=${cc}\\cdot\\frac{x^{${k + 1}}}{${k + 1}}=${term(F[k + 1], xpow(k + 1), true)}`)
  }
  out.push(`F(x)=${ptex(F)}`)
  out.push(`F^{\\prime}(x)=${ptex(sq)}\\ \\checkmark`)
  return out
}

const evalLines = (F: Poly, v: number): string[] => {
  const vals: Frac[] = []
  for (let k = F.length - 1; k >= 0; k--) {
    const c = F[k]
    if (c.n === 0) continue
    const t = mul(c, fr(v ** k))
    if (t.n !== 0) vals.push(t)
  }
  const total = vals.reduce((a, b) => add(a, b), Z)
  const out = [`F(${v})=${stex(F, v)}`]
  if (!vals.length) return [...out, `F(${v})=0`]
  const joined = vals.map((x, i) => (i === 0 ? fl(x) : x.n < 0 ? `-${fl(neg(x))}` : `+${fl(x)}`)).join('')
  out.push(`F(${v})=${joined}`)
  const D = vals.reduce((a, x) => lcm(a, x.d), 1)
  if (vals.length > 1 && D > 1) {
    const over = vals.map((x, i) => { const n = x.n * (D / x.d); return i === 0 ? fracOver(n, D) : n < 0 ? `-${fracOver(-n, D)}` : `+${fracOver(n, D)}` }).join('')
    out.push(`F(${v})=${over}\\quad\\text{(denominador común }${D}\\text{)}`)
  }
  out.push(`F(${v})=${fl(total)}`)
  return out
}

const maxOf = (f: (x: number) => number, a: number, b: number) => {
  let m = 0
  for (let i = 0; i <= 400; i++) {
    const v = f(a + ((b - a) * i) / 400)
    if (Number.isFinite(v)) m = Math.max(m, v)
  }
  return m
}

// ------------------------------------------------------------------ constructor genérico (radios polinómicos al cuadrado)
interface Spec {
  title: string
  statement: string
  task?: string
  methodWhy: string
  outer: Radius
  inner?: Radius
  a: number
  b: number
  /** Reconocer cada curva (tipo, forma, puntos notables). */
  recon: Step
  /** Cálculo de los límites de integración. */
  cuts: Step
  /** Solo arandelas: cuál curva es el radio exterior. */
  radii?: Step
  curves: Curve[]
  points: { x: number; y: number; label: string }[]
  view: [number, number, number, number]
  vline?: number
  hints: string[]
  verification: string[]
  py: Extract<PyMeta, { kind: 'volume' }>
  note?: string
  /** Texto extra para el trazado de la gráfica. */
  traceExtra?: string
}

const TASK = (bounded: string, extra = '') =>
  `Halle el volumen del sólido que se forma al hacer girar **sobre el eje X** la región plana limitada por ${bounded}.${extra}\n\n1. Dibuje la región plana.\n2. Dibuje y defina el elemento de integración.\n3. Plantee la integral correspondiente.\n4. Resuelva la integral.`

const WHY_DISK =
  'Un **sólido de revolución** nace al girar una región plana alrededor de una recta (el eje). Lo cortamos en rebanadas delgadas de grosor $dx$, perpendiculares al eje; si la región **toca el eje**, cada rebanada es un **disco** de volumen $\\pi R^{2}\\,dx$ y la integral los suma todos.'
const WHY_WASHER =
  'Cuando la región **no toca el eje** de giro, el sólido tiene un hueco y cada rebanada es una **arandela** (disco con agujero): volumen $\\pi\\left(R^{2}-r^{2}\\right)dx$, con $R$ el radio exterior y $r$ el interior. La integral suma todas las arandelas.'

const understand = (statement: string): Step =>
  S(
    'Entender el enunciado',
    'Un **sólido de revolución** se obtiene al girar una región plana 360° alrededor de una recta fija, el **eje de giro** (como una pieza en un torno o una vasija en la rueda del alfarero). Aquí el eje de giro es el **eje X**. Antes de calcular nada, identifica: ¿qué curvas hay?, ¿alrededor de qué eje giran?, ¿qué me piden?',
    [`\\text{Curvas / fronteras: }${statement}`, '\\text{Eje de giro: el eje }X', '\\text{Se pide: el volumen }V\\ (\\text{en unidades}^{3})'],
    undefined,
    { tip: 'Escribe en tu hoja estas tres cosas antes de empezar: curvas, eje de giro, qué se pide. Evita el 90 % de los errores de lectura.' },
  )

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
  const xs = tableXs(a, b)
  const cols = xs.map((x) => ({ x, label: fmtN(x) }))
  const rows = s.curves.map((c) => ({ name: c.label === 'f' || c.label === 'g' ? `${c.label}(x)` : 'y', expr: c.expr }))
  const approx = s.curves.some((c) => cols.some((k) => { const y = fn(c.expr)(k.x); return Number.isFinite(y) && !isRound(y) }))
  const mid = xs[Math.floor(xs.length / 2)]
  const exLines = s.curves.map((c, i) => {
    const tx = i === 0 ? s.outer.tex : s.inner?.tex ?? s.outer.tex
    const f = fn(c.expr)
    return `${rows[i].name.replace('(x)', '')}\\left(${mid}\\right)=${subTex(tx, mid)}=${fmtN(f(mid))}${isRound(f(mid)) ? '' : '\\ (\\text{aprox.})'}`
  })
  const pointsTxt = s.curves.map((c, i) => {
    const f = fn(c.expr)
    return `${rows[i].name}:\\ ${cols.filter((k) => Number.isFinite(f(k.x))).map((k) => `(${k.label},${fmtN(f(k.x))})`).join(',\\ ')}`
  })

  const table: Step = S(
    'Tabla de valores (para poder dibujar)',
    `Sin calculadora gráfica, una curva se dibuja con una **tabla de valores**: eliges varios valores de $x$ **entre los límites** ($${a}\\le x\\le ${b}$), sustituyes cada uno en la función y obtienes la altura $y$. Cada columna es un **punto** $(x,y)$ de la gráfica.${approx ? ' Los valores con decimales están **aproximados** a dos cifras.' : ''}`,
    [tableLine(rows, cols), `\\text{Ejemplo con }x=${mid}:`, ...exLines],
    undefined,
    { tip: 'Usa los extremos (los límites) y varios puntos en medio. Con 5 puntos ya se ve la forma de la curva.' },
  )

  const trace: Step = S(
    'Cómo trazar la gráfica, paso a paso',
    [
      '1. **Ejes:** dibuja el eje $X$ (horizontal) y el eje $Y$ (vertical) y elige una escala (por ejemplo, un cuadro = 1 unidad). Usa la **misma escala** en los dos ejes para no deformar el dibujo.',
      '2. **Puntos:** marca con una cruz cada punto $(x,y)$ de la tabla, curva por curva (usa un color distinto para cada una).',
      '3. **Unir:** conecta los puntos de cada curva con un trazo suave (nunca en zig-zag): ' + (s.traceExtra ?? 'sigue la forma que reconociste en el paso anterior.'),
      '4. **Cortes:** marca y rotula los puntos donde las curvas se cruzan (o tocan el eje): esos son los límites $a$ y $b$.',
      '5. **Sombrear:** pinta la región encerrada por las fronteras entre $x=a$ y $x=b$.',
      '6. **Eje de giro:** resalta el eje $X$ (línea gruesa o discontinua): es alrededor de él que gira la región.',
    ].join('\n\n'),
    [...pointsTxt, `\\text{Cortes (límites): }a=${a},\\quad b=${b}`],
    { a: `${a}`, b: `${b}` },
    { tip: 'En la pestaña ② Gráfica puedes ver esta construcción etapa por etapa con los botones ◀ ▶.' },
  )

  const regionStep: Step =
    s.radii ??
    S(
      '¿Hay hueco? La región toca el eje de giro',
      'Mira tu dibujo: el borde de abajo de la región es el propio **eje X** ($y=0$), que es el eje de giro. Como la región está **pegada al eje** en todo el intervalo, al girar **no queda hueco**: el elemento de integración será un **disco** (macizo).',
      ['\\text{borde inferior de la región: }y=0\\ (\\text{el eje de giro})', '\\text{no hay espacio vacío entre la región y el eje}\\ \\Rightarrow\\ \\text{DISCO}'],
    )

  const rect: Step = washer
    ? S(
        'Dibujar el elemento de integración (el rectángulo)',
        'Elige un $x$ cualquiera entre los límites y dibuja un **rectángulo vertical muy angosto** (ancho $dx$). Su borde de **arriba** toca la curva de afuera y su borde de **abajo** toca la curva de adentro: no llega hasta el eje, porque entre el eje y la región hay un hueco.',
        [`x\\in[${a},${b}]\\ \\text{(posición del rectángulo)}`, '\\text{ancho}=dx', `\\text{borde de arriba (más lejos del eje): }R(x)=${R}`, `\\text{borde de abajo (más cerca del eje): }r(x)=${r}`],
        { R, r: r! },
        { tip: 'En ② Gráfica mueve el control "Posición del elemento": verás que el rectángulo siempre va de r(x) a R(x).' },
      )
    : S(
        'Dibujar el elemento de integración (el rectángulo)',
        'Elige un $x$ cualquiera entre los límites y dibuja un **rectángulo vertical muy angosto** (ancho $dx$). Su base descansa sobre el eje $X$ y su altura llega hasta la curva.',
        [`x\\in[${a},${b}]\\ \\text{(posición del rectángulo)}`, '\\text{ancho}=dx', `\\text{altura}=y=${R}`],
        { R },
        { tip: 'En ② Gráfica mueve el control "Posición del elemento": la altura del rectángulo cambia según la curva.' },
      )

  const spin: Step = washer
    ? S(
        'Girar el rectángulo: ¿qué figura se forma?',
        'Al girar el rectángulo 360° alrededor del eje $X$, cada punto describe una circunferencia. El rectángulo completo dibuja una **arandela**: un disco de radio $R$ al que se le quitó el círculo central de radio $r$. Su espesor es $dx$.',
        [`\\text{radio exterior }R(x)=${R}`, `\\text{radio interior }r(x)=${r}`, '\\text{espesor}=dx'],
      )
    : S(
        'Girar el rectángulo: ¿qué figura se forma?',
        'Al girar el rectángulo 360° alrededor del eje $X$, su altura describe una circunferencia: se forma un **disco** (un cilindro muy delgado, como una moneda). Su **radio** es la altura del rectángulo y su **espesor** es $dx$.',
        [`\\text{radio del disco }R(x)=${R}`, '\\text{espesor}=dx'],
      )

  const slice: Step = washer
    ? S(
        'Volumen de una arandela',
        'Un cilindro mide $\\pi\\,(\\text{radio})^2\\cdot(\\text{altura})$. Aquí la "altura" del cilindro es el espesor $dx$. La arandela es el cilindro grande **menos** el cilindro del hueco.',
        ['V_{\\text{cilindro}}=\\pi\\,(\\text{radio})^{2}\\cdot(\\text{altura})', 'dV=\\underbrace{\\pi R^{2}dx}_{\\text{cilindro grande}}-\\underbrace{\\pi r^{2}dx}_{\\text{hueco}}', 'dV=\\pi\\left[R(x)^{2}-r(x)^{2}\\right]dx', `dV=\\pi\\left[\\left(${R}\\right)^{2}-\\left(${r}\\right)^{2}\\right]dx`],
        undefined,
        { warn: 'Es π(R² − r²), NO π(R − r)². Primero se eleva cada radio al cuadrado y DESPUÉS se resta.' },
      )
    : S(
        'Volumen de un disco',
        'Un cilindro mide $\\pi\\,(\\text{radio})^2\\cdot(\\text{altura})$. En un disco, la "altura" del cilindro es el espesor $dx$.',
        ['V_{\\text{cilindro}}=\\pi\\,(\\text{radio})^{2}\\cdot(\\text{altura})', 'dV=\\pi R(x)^{2}\\,dx', `dV=\\pi\\left(${R}\\right)^{2}dx`],
      )

  const riemann: Step = S(
    'De sumar rebanadas a integrar',
    `El sólido está formado por **muchísimas** rebanadas. Si usamos $n$ rebanadas de espesor $\\Delta x=\\frac{b-a}{n}$, el volumen es aproximadamente la **suma** de sus volúmenes. Cuando $n\\to\\infty$ las rebanadas se vuelven infinitamente delgadas ($\\Delta x\\to dx$) y la suma se convierte en la **integral definida** entre los límites $a=${a}$ y $b=${b}$. Como $\\pi$ es una constante, sale de la integral.`,
    [washer ? 'V\\approx\\sum_{i=1}^{n}\\pi\\left[R(x_i)^{2}-r(x_i)^{2}\\right]\\Delta x' : 'V\\approx\\sum_{i=1}^{n}\\pi\\,R(x_i)^{2}\\,\\Delta x', 'n\\to\\infty:\\quad V=\\int dV', washer ? `V=\\pi\\int${intLim}\\left[\\left(${R}\\right)^{2}-\\left(${r}\\right)^{2}\\right]dx` : `V=\\pi\\int${intLim}\\left(${R}\\right)^{2}dx`],
    { a: `${a}`, b: `${b}` },
  )

  const sqOuter: Step = S(`Elevar al cuadrado${washer ? ' el radio exterior R(x)' : ' el radio'}`, s.outer.expandWhy, s.outer.expand)
  const sqInner: Step | null = washer ? S('Elevar al cuadrado el radio interior r(x)', s.inner!.expandWhy, s.inner!.expand, undefined, { warn: 'Se eleva al cuadrado el radio COMPLETO, con todos sus términos y su signo.' }) : null
  const diff: Step = washer
    ? S('Restar R² − r² y agrupar términos semejantes', 'Se resta el cuadrado interior del exterior. El signo menos afecta a **todos** los términos del segundo paréntesis. Después se agrupan los términos con el **mismo exponente**.', [...subtractLines(s.outer.sq, s.inner!.sq), `V=\\pi\\int${intLim}\\left(${ptex(sq)}\\right)dx`])
    : S('Integrando listo', 'Ya no hay raíces ni potencias de paréntesis: el integrando es un polinomio.', [`V=\\pi\\int${intLim}\\left(${ptex(sq)}\\right)dx`])

  const anti: Step = S(
    'Antiderivada término a término',
    'Regla de la potencia: $\\int c\\,x^{k}dx=c\\cdot\\frac{x^{k+1}}{k+1}$ (se sube el exponente en 1 y se divide entre el nuevo exponente). Un número solo se integra como $\\int c\\,dx=c\\,x$. El $\\pi$ se queda fuera.',
    antiderivLines(sq),
    undefined,
    { tip: 'Comprueba siempre derivando: si F′(x) es el integrando, la antiderivada es correcta.' },
  )

  const evB: Step = S(`Evaluar F en el límite superior, x = ${b}`, 'Sustituye $x$ por el límite **con paréntesis** (sobre todo si es negativo), calcula las potencias y suma las fracciones con denominador común.', evalLines(F, b))
  const evA: Step = S(`Evaluar F en el límite inferior, x = ${a}`, 'Igual que antes, ahora con el límite inferior. Cuidado: una potencia **impar** de un número negativo sigue siendo negativa; una **par** es positiva.', evalLines(F, a))

  const D = lcm(Fb.d, Fa.d)
  const fin: Step = S(
    'Restar F(b) − F(a) y multiplicar por π',
    'Teorema fundamental del cálculo: $\\int_a^b g\\,dx=F(b)-F(a)$. Pon la segunda entre **paréntesis** para no equivocar el signo; al final multiplica por $\\pi$.',
    [
      `V=\\pi\\left[F(${b})-F(${a})\\right]`,
      `V=\\pi\\left[${fl(Fb)}-\\left(${fl(Fa)}\\right)\\right]`,
      ...(D > 1 && (Fb.d !== D || Fa.d !== D) ? [`V=\\pi\\left[${fracOver(Fb.n * (D / Fb.d), D)}-\\left(${fracOver(Fa.n * (D / Fa.d), D)}\\right)\\right]\\quad\\text{(denominador común }${D}\\text{)}`] : []),
      `V=\\pi\\cdot ${fl(V)}`,
      `V=${piTex(V)}`,
      `V\\approx ${value.toFixed(3)}`,
    ],
    { V: piTex(V) },
  )

  const Rmax = maxOf(fn(s.outer.expr), a, b)
  const cyl = Math.PI * Rmax * Rmax * (b - a)
  const sanity: Step = S(
    '¿Tiene sentido el resultado? (comprobación)',
    'Antes de entregar, hazte dos preguntas: ¿es **positivo**? (un volumen nunca es negativo) y ¿es **razonable**? Una cota: el sólido cabe dentro de un cilindro de radio $R_{\\max}$ y largo $b-a$, así que su volumen debe ser menor que el de ese cilindro.',
    [`V\\approx ${value.toFixed(3)}>0\\ \\checkmark`, `R_{\\max}\\approx ${fmtN(Rmax)},\\quad b-a=${b - a}`, `\\pi R_{\\max}^{2}(b-a)\\approx ${cyl.toFixed(3)}`, `${value.toFixed(3)}<${cyl.toFixed(3)}\\ \\checkmark`, ...s.verification],
    undefined,
    { tip: 'Si te sale negativo, revisa cuál radio es el exterior y el signo al restar F(b) − F(a).' },
  )

  const regions: Region[] = [{ a, b, top: s.outer.expr, bottom: s.inner?.expr ?? '0', color: FILL }]
  return {
    title: s.title,
    statement: s.statement,
    task: s.task,
    method: washer ? 'Volumen por arandelas (eje X)' : 'Volumen por discos (eje X)',
    methodWhy: s.methodWhy + (washer ? ' ' + WHY_WASHER : ' ' + WHY_DISK),
    steps: [
      understand(s.statement), s.recon, s.cuts, table, trace, regionStep, rect, spin, slice, riemann, sqOuter, ...(sqInner ? [sqInner] : []), diff, anti, evB, evA, fin, sanity,
      S('Respuesta final', 'Escribe la respuesta **con unidades**: un volumen se mide en unidades cúbicas.', [`V=${piTex(V)}\\ \\text{unidades}^{3}`, `V\\approx ${value.toFixed(3)}\\ \\text{unidades}^{3}`]),
    ],
    answer: `${piTex(V)}\\ \\text{unidades}^{3}\\approx ${value.toFixed(3)}`,
    verification: [...s.verification, `\\text{Casio (pestaña ③): }\\pi\\int${intLim}\\ldots\\approx ${value.toFixed(4)}`],
    hints: s.hints,
    py: s.py,
    area: { curves: s.curves, regions, points: s.points, view: s.view, value, vline: s.vline, note: s.note, table: cols },
  }
}

// ------------------------------------------------------------------ Familia 10: discos
const sphereExpr = (r: number) => `sqrt(${r * r}-x^2)`

type SphereMode = 'full' | 'half' | 'cap'

function sphere(r: number, mode: SphereMode, h = 0): Draft {
  const a = mode === 'full' ? -r : mode === 'half' ? 0 : h
  const b = r
  const r2 = r * r
  const stmtExtra = mode === 'full' ? '' : mode === 'half' ? ',\\quad x=0' : `,\\quad x=${h}`
  const bounded =
    mode === 'full' ? `la gráfica de $y=\\sqrt{${r2}-x^{2}}$ y el eje $X$` : mode === 'half' ? `la gráfica de $y=\\sqrt{${r2}-x^{2}}$, el eje $X$ y el eje $Y$ ($x=0$)` : `la gráfica de $y=\\sqrt{${r2}-x^{2}}$, el eje $X$ y la recta $x=${h}$`
  const title = mode === 'full' ? 'Esfera: semicírculo girando sobre el eje X' : mode === 'half' ? 'Hemisferio: cuarto de círculo girando' : 'Casquete esférico: parte de la esfera'
  const pts = [{ x: r, y: 0, label: `(${r}, 0)` }, { x: 0, y: r, label: `(0, ${r})` }]
  if (mode === 'full') pts.push({ x: -r, y: 0, label: `(-${r}, 0)` })
  if (mode === 'cap') pts.push({ x: h, y: Math.sqrt(r2 - h * h), label: `(${h}, ${Number(Math.sqrt(r2 - h * h).toFixed(2))})` })
  const known = mode === 'full' ? `\\text{Fórmula de la esfera: }\\frac{4}{3}\\pi r^{3}=\\frac{4}{3}\\pi\\cdot ${r ** 3}=${fl(fr(4 * r ** 3, 3))}\\pi\\ \\checkmark` : mode === 'half' ? `\\text{Mitad de la esfera: }\\frac{1}{2}\\cdot\\frac{4}{3}\\pi\\cdot ${r ** 3}=${fl(fr(2 * r ** 3, 3))}\\pi\\ \\checkmark` : `\\text{Debe ser menor que la media esfera }\\left(${fl(fr(2 * r ** 3, 3))}\\pi\\right)`
  return build({
    title,
    statement: `y=\\sqrt{${r2}-x^{2}},\\quad y=0${stmtExtra}`,
    task: TASK(bounded),
    methodWhy: 'Aquí la región toca el eje X en todo el intervalo, no hay hueco.',
    outer: radArc(r),
    a,
    b,
    recon: S(
      'Reconocer la curva',
      'Una raíz cuadrada con $a^{2}-x^{2}$ dentro es la pista de una **circunferencia**. Para verlo, eleva al cuadrado ambos lados y pasa la $x^{2}$ al otro lado. Como una raíz nunca es negativa ($y\\ge0$), solo queda la **mitad de arriba**.',
      [`y=\\sqrt{${r2}-x^{2}}`, `y^{2}=${r2}-x^{2}`, `x^{2}+y^{2}=${r2}\\quad\\text{(circunferencia)}`, `\\text{centro }(0,0),\\quad\\text{radio }\\sqrt{${r2}}=${r}`, 'y\\ge 0\\ \\Rightarrow\\ \\text{semicircunferencia SUPERIOR}', mode === 'full' ? '\\text{Región: el semicírculo entre el arco y el eje }X' : mode === 'half' ? '\\text{Región: el cuarto de círculo del primer cuadrante}' : `\\text{Región: la parte del semicírculo con }x\\ge ${h}`],
      undefined,
      { tip: 'Si dentro de la raíz hay "número − x²", piensa siempre en un círculo.' },
    ),
    cuts: S(
      'Límites de integración',
      mode === 'full' ? 'La curva toca el eje $X$ donde $y=0$: iguala la función a cero y despeja. La raíz da **dos** soluciones ($\\pm$).' : mode === 'half' ? 'Izquierda: el eje $Y$ ($x=0$). Derecha: donde la curva toca el eje $X$ ($y=0$).' : `Izquierda: la recta $x=${h}$. Derecha: donde la curva toca el eje $X$ ($y=0$).`,
      mode === 'full'
        ? [`\\sqrt{${r2}-x^{2}}=0`, `${r2}-x^{2}=0\\quad\\text{(elevo al cuadrado)}`, `x^{2}=${r2}`, `x=\\pm\\sqrt{${r2}}=\\pm ${r}`, `a=-${r},\\qquad b=${r}`]
        : [`\\sqrt{${r2}-x^{2}}=0`, `x^{2}=${r2}\\ \\Rightarrow\\ x=\\pm ${r}\\ \\text{(solo sirve }x=${r}\\text{ en esta región)}`, `a=${a},\\qquad b=${b}`],
      { a: `${a}`, b: `${b}` },
    ),
    curves: [{ label: 'f', tex: `y=\\sqrt{${r2}-x^{2}}`, expr: sphereExpr(r), color: BLUE }],
    points: pts,
    view: eqView(-r - 1.5, r + 1.5, -1.2),
    vline: mode === 'full' ? undefined : a,
    traceExtra: 'es un arco de circunferencia, redondo y simétrico.',
    hints: ['Eleva al cuadrado para reconocer la circunferencia.', '¿Dónde corta la curva al eje X? (y = 0)', 'V = π ∫ [f(x)]² dx; al elevar al cuadrado la raíz desaparece.'],
    verification: [known],
    py: { kind: 'volume', outer: sphereExpr(r), inner: '0', a: `${a}`, b: `${b}` },
  })
}

/** El enunciado del taller con r general (la gráfica usa r = 3 de ejemplo). */
function sphereSymbolic(): Draft {
  const r0 = 3
  const symTable = arrayTex(['-r', '-\\frac{r}{2}', '0', '\\frac{r}{2}', 'r'], [['y', ['0', '\\frac{\\sqrt{3}}{2}r', 'r', '\\frac{\\sqrt{3}}{2}r', '0']]])
  const numTable = arrayTex(['-3', '-1.5', '0', '1.5', '3'], [['y\\ (r=3)', ['0', '2.6', '3', '2.6', '0']]])
  return {
    title: 'Volumen de la esfera (r general)',
    statement: 'y=\\sqrt{r^{2}-x^{2}},\\quad y=0',
    task: 'Encontrar el volumen del sólido formado al hacer girar **sobre el eje X** la región plana limitada por la gráfica de la función $y=\\sqrt{r^{2}-x^{2}}$ y el eje $X$. Para ello haga lo siguiente:\n\n1. Dibuje la región plana.\n2. Dibuje y defina el elemento de integración.\n3. Plantee la integral correspondiente.\n4. Resuelva la integral. *(Debe obtener $V=\\frac{4}{3}\\pi r^{3}$.)*',
    method: 'Volumen por discos (eje X)',
    methodWhy: WHY_DISK + ' Aquí $r$ es un **número fijo** (el radio), no la variable: la variable es $x$.',
    steps: [
      understand('y=\\sqrt{r^{2}-x^{2}},\\quad y=0'),
      S(
        '1a. Reconocer la curva',
        'Una raíz con "$r^{2}-x^{2}$" dentro es la pista de una **circunferencia**. Para verlo, eleva al cuadrado ambos lados y pasa la $x^{2}$ al otro lado. Como una raíz cuadrada nunca es negativa ($y\\ge 0$), solo queda la **mitad de arriba**. Además, para que la raíz exista hace falta $r^{2}-x^{2}\\ge 0$.',
        ['y=\\sqrt{r^{2}-x^{2}}', 'y^{2}=r^{2}-x^{2}', 'x^{2}+y^{2}=r^{2}\\quad\\text{(circunferencia)}', '\\text{centro }(0,0),\\quad\\text{radio }r', 'y\\ge 0\\ \\Rightarrow\\ \\text{semicircunferencia SUPERIOR}', 'r^{2}-x^{2}\\ge 0\\ \\Rightarrow\\ -r\\le x\\le r\\quad\\text{(dominio)}'],
        undefined,
        { tip: 'Aquí r es un número (por ejemplo 3), no una variable. La variable de la función es x.' },
      ),
      S(
        '1b. Puntos donde la curva toca el eje X (límites)',
        'La región está encerrada entre el arco y el eje $X$. Los extremos son donde el arco toca el eje, es decir donde $y=0$. La raíz da **dos** soluciones ($\\pm$).',
        ['\\sqrt{r^{2}-x^{2}}=0', 'r^{2}-x^{2}=0\\quad\\text{(elevo al cuadrado)}', 'x^{2}=r^{2}', 'x=\\pm r', 'a=-r,\\qquad b=r'],
        { a: '-r', b: 'r' },
      ),
      S(
        '1c. Tabla de valores',
        'Para dibujar el arco calculamos algunos puntos. Elegimos $x$ entre $-r$ y $r$ y sustituimos en $y=\\sqrt{r^{2}-x^{2}}$. Ejemplo con $x=\\frac{r}{2}$: $y=\\sqrt{r^{2}-\\frac{r^{2}}{4}}=\\sqrt{\\frac{3r^{2}}{4}}=\\frac{\\sqrt{3}}{2}r$. Con un radio concreto ($r=3$) los valores son números que puedes marcar en la hoja.',
        [symTable, '\\text{Ejemplo con }x=\\tfrac{r}{2}:\\ y=\\sqrt{r^{2}-\\left(\\tfrac{r}{2}\\right)^{2}}=\\sqrt{\\tfrac{3r^{2}}{4}}=\\tfrac{\\sqrt{3}}{2}r', numTable, '\\text{Con }r=3,\\ x=1.5:\\ y=\\sqrt{9-2.25}=\\sqrt{6.75}\\approx 2.6'],
        undefined,
        { tip: 'Para la hoja de examen basta con los 3 puntos clave: (−r, 0), (0, r) y (r, 0), más el redondeo del arco.' },
      ),
      S(
        '1d. Cómo trazar la gráfica, paso a paso',
        ['1. **Ejes:** dibuja el eje $X$ y el eje $Y$ con la **misma escala** (así el arco se ve circular, no ovalado).', '2. **Puntos:** marca $(-r,0)$, $(r,0)$ y $(0,r)$, y los puntos intermedios de la tabla.', '3. **Unir:** traza un arco suave de circunferencia que pase por $(-r,0)$, suba hasta $(0,r)$ y baje hasta $(r,0)$. Debe ser perpendicular al eje $X$ en los extremos.', '4. **Rotular:** escribe $y=\\sqrt{r^{2}-x^{2}}$ junto a la curva.', '5. **Sombrear:** pinta el semicírculo entre el arco y el eje $X$ (esa es la región plana).', '6. **Eje de giro:** resalta el eje $X$.'].join('\n\n'),
        ['\\text{puntos clave: }(-r,0),\\ (0,r),\\ (r,0)', '\\text{región: semicírculo de radio }r\\text{ sobre el eje }X'],
        { a: '-r', b: 'r' },
        { tip: 'La pestaña ② Gráfica dibuja esta misma figura (con r = 3) y la va construyendo con los botones ◀ ▶.' },
      ),
      S(
        '2a. ¿Hay hueco? La región toca el eje de giro',
        'Mira tu dibujo: el borde de abajo del semicírculo es el propio **eje $X$**, que es el eje de giro. Como la región está pegada al eje en todo el intervalo, al girar **no queda hueco**: el elemento será un **disco** (macizo).',
        ['\\text{borde inferior: }y=0\\ (\\text{eje de giro})\\ \\Rightarrow\\ \\text{sin hueco}\\ \\Rightarrow\\ \\text{DISCO}'],
      ),
      S(
        '2b. Dibujar el elemento de integración (el rectángulo)',
        'Elige un $x$ cualquiera entre $-r$ y $r$ y dibuja un **rectángulo vertical muy angosto** de ancho $dx$. Su base está sobre el eje $X$ y su altura llega hasta el arco: mide $y=\\sqrt{r^{2}-x^{2}}$.',
        ['x\\in[-r,r]\\ \\text{(posición del rectángulo)}', '\\text{ancho}=dx', '\\text{altura}=y=\\sqrt{r^{2}-x^{2}}'],
        { R: '\\sqrt{r^{2}-x^{2}}' },
        { tip: 'Rotula en el dibujo: "dx" en la base del rectángulo y "y" a su costado.' },
      ),
      S(
        '2c. Girar el rectángulo: ¿qué figura se forma?',
        'Al girar el rectángulo 360° alrededor del eje $X$, su altura describe una circunferencia: se forma un **disco** (un cilindro muy delgado, como una moneda). Su **radio** es la altura del rectángulo y su **espesor** es $dx$. Todos los discos apilados forman la esfera.',
        ['\\text{radio del disco: }R(x)=\\sqrt{r^{2}-x^{2}}', '\\text{espesor}=dx'],
      ),
      S(
        '2d. Volumen de un disco',
        'Un cilindro mide $\\pi\\,(\\text{radio})^{2}\\cdot(\\text{altura})$. En el disco, la "altura" del cilindro es el espesor $dx$.',
        ['V_{\\text{cilindro}}=\\pi\\,(\\text{radio})^{2}\\cdot(\\text{altura})', 'dV=\\pi R(x)^{2}\\,dx', 'dV=\\pi\\left(\\sqrt{r^{2}-x^{2}}\\right)^{2}dx'],
      ),
      S(
        '3. Plantear la integral (de sumar discos a integrar)',
        'El sólido está formado por muchísimos discos. Su volumen es aproximadamente la **suma** de los volúmenes de todos los discos; cuando los discos se vuelven infinitamente delgados, la suma se convierte en la **integral definida** entre los límites $-r$ y $r$. Como $\\pi$ es constante, sale de la integral.',
        ['V\\approx\\sum_{i=1}^{n}\\pi\\,R(x_i)^{2}\\,\\Delta x', 'n\\to\\infty:\\quad V=\\int dV', 'V=\\pi\\int_{-r}^{r}\\left(\\sqrt{r^{2}-x^{2}}\\right)^{2}dx'],
        { a: '-r', b: 'r' },
      ),
      S('4a. Simplificar el integrando', 'La raíz cuadrada y el cuadrado son operaciones **inversas**: se cancelan, $(\\sqrt{u})^{2}=u$ (válido porque $r^{2}-x^{2}\\ge 0$ entre $-r$ y $r$).', ['\\left(\\sqrt{r^{2}-x^{2}}\\right)^{2}=r^{2}-x^{2}', 'V=\\pi\\int_{-r}^{r}\\left(r^{2}-x^{2}\\right)dx']),
      S(
        '4b. Antiderivada término a término',
        'Aquí **$r$ es una constante** (como si fuera el 3): $\\int r^{2}dx=r^{2}x$, igual que $\\int 9\\,dx=9x$. Y $\\int x^{2}dx=\\frac{x^{3}}{3}$ por la regla de la potencia ($\\frac{x^{k+1}}{k+1}$).',
        ['\\int r^{2}\\,dx=r^{2}x', '\\int\\left(-x^{2}\\right)dx=-\\frac{x^{3}}{3}', 'F(x)=r^{2}x-\\frac{x^{3}}{3}', 'F^{\\prime}(x)=r^{2}-x^{2}\\ \\checkmark'],
        undefined,
        { warn: 'No trates a r como variable: integrar "r²" respecto a x da r²·x (no r³/3).' },
      ),
      S('4c. Evaluar F en el límite superior, x = r', 'Sustituimos $x=r$ y reducimos: $r^{2}\\cdot r=r^{3}$.', ['F(r)=r^{2}\\cdot r-\\frac{r^{3}}{3}', 'F(r)=r^{3}-\\frac{r^{3}}{3}', 'F(r)=\\frac{3r^{3}}{3}-\\frac{r^{3}}{3}\\quad\\text{(denominador común)}', 'F(r)=\\frac{2r^{3}}{3}']),
      S('4d. Evaluar F en el límite inferior, x = −r', 'Ahora $x=-r$, **con paréntesis**. Una potencia impar de un negativo sigue siendo negativa: $(-r)^{3}=-r^{3}$.', ['F(-r)=r^{2}\\cdot(-r)-\\frac{(-r)^{3}}{3}', 'F(-r)=-r^{3}-\\frac{-r^{3}}{3}', 'F(-r)=-r^{3}+\\frac{r^{3}}{3}', 'F(-r)=-\\frac{3r^{3}}{3}+\\frac{r^{3}}{3}=-\\frac{2r^{3}}{3}'], undefined, { warn: 'El menos de −r³/3 se vuelve + porque restamos un número negativo: −(−a) = +a.' }),
      S('4e. Restar F(r) − F(−r) y multiplicar por π', 'Pon el segundo valor entre paréntesis para no perder el signo.', ['V=\\pi\\left[F(r)-F(-r)\\right]', 'V=\\pi\\left[\\frac{2r^{3}}{3}-\\left(-\\frac{2r^{3}}{3}\\right)\\right]', 'V=\\pi\\left[\\frac{2r^{3}}{3}+\\frac{2r^{3}}{3}\\right]', 'V=\\pi\\cdot\\frac{4r^{3}}{3}', 'V=\\frac{4}{3}\\pi r^{3}'], { V: '\\frac{4}{3}\\pi r^{3}' }),
      S('Atajo por simetría (opcional)', 'El integrando $r^{2}-x^{2}$ es **par** (simétrico respecto al eje $Y$): $\\int_{-r}^{r}=2\\int_{0}^{r}$. Da lo mismo con menos números negativos.', ['V=2\\pi\\int_{0}^{r}\\left(r^{2}-x^{2}\\right)dx', 'V=2\\pi\\left[r^{2}x-\\frac{x^{3}}{3}\\right]_{0}^{r}=2\\pi\\left(r^{3}-\\frac{r^{3}}{3}\\right)', 'V=2\\pi\\cdot\\frac{2r^{3}}{3}=\\frac{4}{3}\\pi r^{3}']),
      S('¿Tiene sentido el resultado? (comprobación)', 'Es **la fórmula conocida** del volumen de la esfera: ¡el procedimiento reproduce el resultado que pide el enunciado! Además, la esfera cabe en un cilindro de radio $r$ y largo $2r$, de volumen $2\\pi r^{3}$; y $\\frac{4}{3}\\pi r^{3}<2\\pi r^{3}$.', ['V=\\frac{4}{3}\\pi r^{3}\\ \\checkmark\\ \\text{(fórmula de la esfera)}', '\\text{Con }r=3:\\ V=\\frac{4}{3}\\pi\\cdot 27=36\\pi\\approx 113.097', '\\text{Cilindro que la contiene: }\\pi r^{2}\\cdot 2r=2\\pi r^{3}=54\\pi\\approx 169.6>113.1\\ \\checkmark', '\\text{Casio: }\\pi\\int_{-3}^{3}\\left(9-X^{2}\\right)dX\\approx 113.0973']),
      S('Respuesta final', 'Un volumen se escribe con unidades cúbicas.', ['V=\\frac{4}{3}\\pi r^{3}\\ \\text{unidades}^{3}']),
    ],
    answer: 'V=\\frac{4}{3}\\pi r^{3}\\ \\text{unidades}^{3}',
    verification: ['\\text{Es la fórmula conocida del volumen de la esfera.}', '\\text{Con }r=3:\\ \\frac{4}{3}\\pi\\cdot 27=36\\pi\\approx 113.097', '\\text{Casio: }\\pi\\int_{-3}^{3}\\left(9-X^{2}\\right)dX\\approx 113.0973'],
    hints: ['Eleva al cuadrado para ver la circunferencia: x² + y² = r².', 'Elemento: disco de radio y = √(r² − x²) y grosor dx; dV = π y² dx.', 'r es una constante: ∫ r² dx = r² x.'],
    py: { kind: 'volume', outer: 'sqrt(r^2-x^2)', inner: '0', a: '-r', b: 'r', syms: ['r'] },
    area: {
      curves: [{ label: 'f', tex: 'y=\\sqrt{r^{2}-x^{2}}\\ (r=3)', expr: sphereExpr(r0), color: BLUE }],
      regions: [{ a: -r0, b: r0, top: sphereExpr(r0), bottom: '0', color: FILL }],
      points: [{ x: -r0, y: 0, label: '(-r, 0)' }, { x: r0, y: 0, label: '(r, 0)' }, { x: 0, y: r0, label: '(0, r)' }],
      view: eqView(-r0 - 1.5, r0 + 1.5, -1.2),
      value: 36 * Math.PI,
      note: 'Gráfica de ejemplo con r = 3 (volumen 36π). El procedimiento vale para cualquier r.',
      table: [-3, -2, -1, 0, 1, 2, 3].map((x) => ({ x, label: fmtN(x) })),
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
  const outer: Radius = {
    tex,
    expr,
    sq: [fr(b2), Z, neg(k)],
    expandWhy: 'Se eleva al cuadrado **cada factor**: la fracción y la raíz. La raíz y el cuadrado se cancelan; la fracción se eleva completa: $\\left(\\frac{b}{a}\\right)^2=\\frac{b^2}{a^2}$. Luego se distribuye.',
    expand: [`\\left(${tex}\\right)^{2}=\\left(\\frac{${b}}{${a}}\\right)^{2}\\cdot\\left(\\sqrt{${a2}-x^{2}}\\right)^{2}`, `=\\frac{${b2}}{${a2}}\\left(${a2}-x^{2}\\right)`, `=\\frac{${b2}}{${a2}}\\cdot ${a2}-\\frac{${b2}}{${a2}}x^{2}`, `=${ptex([fr(b2), Z, neg(k)])}`],
  }
  return build({
    title: 'Elipsoide: media elipse girando sobre el eje X',
    statement: `y=${tex},\\quad y=0`,
    task: TASK(`la gráfica de $y=\\frac{${b}}{${a}}\\sqrt{${a2}-x^{2}}$ y el eje $X$`),
    methodWhy: 'Es una **semielipse**; al girar sobre el eje X se obtiene un elipsoide.',
    outer,
    a: -a,
    b: a,
    recon: S(
      'Reconocer la curva',
      'Despeja para ver la figura: eleva al cuadrado y reordena hasta tener $x^{2}$ y $y^{2}$ a un mismo lado igualados a 1. Esa es la ecuación de una **elipse**; como $y\\ge 0$, es solo su mitad superior.',
      [`y=${tex}`, `y^{2}=\\frac{${b2}}{${a2}}\\left(${a2}-x^{2}\\right)`, `\\frac{${a2}}{${b2}}\\,y^{2}=${a2}-x^{2}`, `\\frac{x^{2}}{${a2}}+\\frac{y^{2}}{${b2}}=1\\quad\\text{(elipse)}`, `\\text{semieje en }x:\\ ${a},\\quad\\text{semieje en }y:\\ ${b}`, 'y\\ge 0\\ \\Rightarrow\\ \\text{mitad SUPERIOR}'],
    ),
    cuts: S('Límites de integración', 'La curva toca el eje $X$ donde $y=0$.', [`${tex}=0`, `${a2}-x^{2}=0`, `x^{2}=${a2}`, `x=\\pm ${a}`, `a=-${a},\\qquad b=${a}`], { a: `-${a}`, b: `${a}` }),
    curves: [{ label: 'f', tex: `y=${tex}`, expr, color: BLUE }],
    points: [{ x: -a, y: 0, label: `(-${a}, 0)` }, { x: a, y: 0, label: `(${a}, 0)` }, { x: 0, y: b, label: `(0, ${b})` }],
    view: eqView(-a - 1.5, a + 1.5, -1.2),
    traceExtra: 'es un arco ovalado (más aplastado o más alto que un círculo).',
    hints: ['Elevar al cuadrado quita la raíz, pero también eleva la fracción: (b/a)² = b²/a².', 'Límites: dónde y = 0.', 'Fórmula de comprobación: V = (4/3)·π·a·b².'],
    verification: [`\\text{Fórmula del elipsoide: }\\frac{4}{3}\\pi a\\,b^{2}=\\frac{4}{3}\\pi\\cdot ${a}\\cdot ${b2}=${piTex(V)}\\ \\checkmark`],
    py: { kind: 'volume', outer: expr, inner: '0', a: `-${a}`, b: `${a}` },
  })
}

function sinDisk(): Draft {
  const value = (Math.PI * Math.PI) / 2
  const cols = [0, Math.PI / 6, Math.PI / 4, Math.PI / 3, Math.PI / 2, (2 * Math.PI) / 3, (3 * Math.PI) / 4, (5 * Math.PI) / 6, Math.PI]
  const labs = ['0', '\\frac{\\pi}{6}', '\\frac{\\pi}{4}', '\\frac{\\pi}{3}', '\\frac{\\pi}{2}', '\\frac{2\\pi}{3}', '\\frac{3\\pi}{4}', '\\frac{5\\pi}{6}', '\\pi']
  return {
    title: 'Un arco de seno girando sobre el eje X',
    statement: 'y=\\sin x,\\quad y=0,\\quad 0\\le x\\le\\pi',
    task: TASK('la gráfica de $y=\\sin x$ y el eje $X$ entre $x=0$ y $x=\\pi$'),
    method: 'Volumen por discos (eje X)',
    methodWhy: WHY_DISK + ' El integrando queda con $\\sin^{2}x$: se baja la potencia con la identidad del ángulo doble. **Calculadora en radianes.**',
    steps: [
      understand('y=\\sin x,\\quad y=0,\\quad 0\\le x\\le\\pi'),
      S('Reconocer la curva', 'La gráfica de $y=\\sin x$ es una onda: sube desde $0$ hasta $1$ (en $x=\\frac{\\pi}{2}$), baja hasta $0$ (en $x=\\pi$) y luego sigue hacia valores negativos. Entre $0$ y $\\pi$ forma un único "arco" **por encima** del eje $X$.', ['\\sin 0=0,\\quad \\sin\\tfrac{\\pi}{2}=1,\\quad\\sin\\pi=0', '0\\le\\sin x\\le 1\\ \\text{ si }\\ 0\\le x\\le\\pi'], undefined, { warn: 'Calculadora en RADIANES: π ≈ 3.1416 radianes, no grados.' }),
      S('Límites de integración', 'El enunciado da el intervalo $0\\le x\\le\\pi$. Coincide con los puntos donde el seno toca el eje $X$ ($\\sin x=0$), así que el arco queda completo.', ['\\sin x=0\\ \\Rightarrow\\ x=0,\\ \\pi,\\ 2\\pi,\\dots', 'a=0,\\qquad b=\\pi'], { a: '0', b: '\\pi' }),
      S('Tabla de valores', 'Usamos los ángulos notables del círculo unidad entre $0$ y $\\pi$ (en radianes) y sus senos. Se muestran el valor exacto y el decimal para ubicar el punto.', [arrayTex(labs, [['y=\\sin x', ['0', '\\frac{1}{2}', '\\frac{\\sqrt2}{2}', '\\frac{\\sqrt3}{2}', '1', '\\frac{\\sqrt3}{2}', '\\frac{\\sqrt2}{2}', '\\frac12', '0']], ['\\text{decimal}', cols.map((x) => fmtN(Math.sin(x)))]]), '\\text{Ejemplo: }\\sin\\tfrac{\\pi}{4}=\\tfrac{\\sqrt{2}}{2}\\approx 0.71'], undefined, { tip: 'Marca en el eje X los múltiplos de π: π/2 ≈ 1.57 y π ≈ 3.14.' }),
      S('Cómo trazar la gráfica, paso a paso', ['1. **Ejes:** en $X$ marca $\\frac{\\pi}{2}\\approx1.57$ y $\\pi\\approx 3.14$; en $Y$ marca $1$.', '2. **Puntos:** marca $(0,0)$, $(\\frac{\\pi}{6},0.5)$, $(\\frac{\\pi}{2},1)$, $(\\frac{5\\pi}{6},0.5)$ y $(\\pi,0)$.', '3. **Unir:** traza una "montaña" suave que sube de $(0,0)$ al máximo $(\\frac{\\pi}{2},1)$ y baja a $(\\pi,0)$.', '4. **Sombrear:** pinta la región bajo la montaña, encima del eje $X$.', '5. **Eje de giro:** resalta el eje $X$.'].join('\n\n'), ['\\text{puntos clave: }(0,0),\\ (\\tfrac{\\pi}{2},1),\\ (\\pi,0)'], { a: '0', b: '\\pi' }),
      S('¿Hay hueco? La región toca el eje de giro', 'La región está **pegada al eje $X$** (su borde inferior es $y=0$): al girar no queda hueco, el elemento es un **disco**.', ['\\text{borde inferior: }y=0\\ (\\text{eje de giro})\\ \\Rightarrow\\ \\text{DISCO}']),
      S('Dibujar el elemento de integración (el rectángulo)', 'Rectángulo vertical de ancho $dx$ con base en el eje $X$ y altura hasta la curva: mide $\\sin x$.', ['x\\in[0,\\pi]', '\\text{ancho}=dx', '\\text{altura}=\\sin x'], { R: '\\sin x' }),
      S('Girar el rectángulo: ¿qué figura se forma?', 'Al girar alrededor del eje $X$ se forma un **disco** de radio $\\sin x$ y espesor $dx$. Los discos apilados forman un sólido con forma de "huevo" alargado.', ['\\text{radio del disco: }R(x)=\\sin x', '\\text{espesor}=dx']),
      S('Volumen de un disco', 'Cilindro: $\\pi(\\text{radio})^{2}\\cdot(\\text{altura})$, con altura $dx$.', ['dV=\\pi R(x)^{2}dx', 'dV=\\pi\\left(\\sin x\\right)^{2}dx=\\pi\\sin^{2}x\\,dx']),
      S('Plantear la integral (de sumar discos a integrar)', 'Suma de todos los discos de $x=0$ a $x=\\pi$; $\\pi$ sale de la integral.', ['V\\approx\\sum\\pi\\sin^{2}x_i\\,\\Delta x', 'V=\\int dV', 'V=\\pi\\int_{0}^{\\pi}\\sin^{2}x\\,dx'], { a: '0', b: '\\pi' }),
      S('Bajar la potencia: identidad del ángulo doble', 'No existe una antiderivada directa de $\\sin^{2}x$. Se usa $\\cos 2x=1-2\\sin^{2}x$ y se despeja $\\sin^{2}x$.', ['\\cos 2x=1-2\\sin^{2}x', '2\\sin^{2}x=1-\\cos 2x', '\\sin^{2}x=\\frac{1-\\cos 2x}{2}'], undefined, { tip: 'Para cos²x es la versión con + : cos²x = (1 + cos 2x)/2.' }),
      S('Sustituir y sacar el 1/2', 'Reemplazamos $\\sin^{2}x$ y sacamos la constante $\\frac12$ fuera de la integral.', ['V=\\pi\\int_{0}^{\\pi}\\frac{1-\\cos 2x}{2}\\,dx', 'V=\\frac{\\pi}{2}\\int_{0}^{\\pi}\\left(1-\\cos 2x\\right)dx']),
      S('Antiderivada término a término', '$\\int 1\\,dx=x$. Para $\\int\\cos 2x\\,dx$ usamos $u=2x$: $du=2\\,dx$, así que $dx=\\frac{du}{2}$ y $\\int\\cos u\\,\\frac{du}{2}=\\frac{\\sin u}{2}$. Es decir, **se divide entre el 2** de adentro.', ['\\int 1\\,dx=x', '\\int\\cos 2x\\,dx=\\frac{\\sin 2x}{2}', 'F(x)=x-\\frac{\\sin 2x}{2}', 'F^{\\prime}(x)=1-\\frac{2\\cos 2x}{2}=1-\\cos 2x\\ \\checkmark']),
      S('Evaluar F en x = π', 'Recuerda: $\\sin 2\\pi=0$ (una vuelta completa).', ['F(\\pi)=\\pi-\\frac{\\sin 2\\pi}{2}', 'F(\\pi)=\\pi-\\frac{0}{2}=\\pi']),
      S('Evaluar F en x = 0', '$\\sin 0=0$.', ['F(0)=0-\\frac{\\sin 0}{2}=0-0=0']),
      S('Restar y multiplicar', 'No olvides la constante $\\frac{\\pi}{2}$ que sacamos al inicio.', ['V=\\frac{\\pi}{2}\\left[F(\\pi)-F(0)\\right]', 'V=\\frac{\\pi}{2}\\left[\\pi-0\\right]', 'V=\\frac{\\pi}{2}\\cdot\\pi=\\frac{\\pi^{2}}{2}', 'V\\approx 4.935']),
      S('¿Tiene sentido el resultado? (comprobación)', 'La curva nunca pasa de $1$ y el largo es $\\pi$: el sólido cabe en un cilindro de radio $1$ y largo $\\pi$ (volumen $\\pi^{2}\\approx9.87$). Nuestro volumen es **justo la mitad**, lo cual es razonable porque $\\sin^{2}x$ promedia $\\frac12$.', ['V\\approx 4.935>0\\ \\checkmark', '\\pi\\cdot 1^{2}\\cdot\\pi=\\pi^{2}\\approx 9.870', '4.935<9.870\\ \\checkmark', '\\text{Casio (Rad): }\\pi\\int_{0}^{\\pi}\\sin^{2}X\\,dX\\approx 4.9348']),
      S('Respuesta final', 'Con unidades cúbicas.', ['V=\\frac{\\pi^{2}}{2}\\ \\text{unidades}^{3}\\approx 4.935']),
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
      table: cols.map((x, i) => ({ x, label: labs[i] })),
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
  const ymax = Math.max(y1, y2, Number(val(fM)), Number(val(gM)), 1)
  const eq = P(c - n, -m, 1)
  const bq = -m
  const cq = c - n
  const dirTxt = m === 0 ? 'recta **horizontal**' : m > 0 ? 'recta que **sube** de izquierda a derecha' : 'recta que **baja** de izquierda a derecha'
  const pp = c === 0 ? '(0,0)' : `(0,${c})`
  const fac = (r: number) => (r === 0 ? 'x' : `\\left(x${r < 0 ? '+' : '-'}${Math.abs(r)}\\right)`)
  return build({
    title: 'Región entre una recta y una parábola, girada sobre el eje X',
    statement: `f(x)=${lt},\\quad g(x)=${pt}`,
    task: TASK(`las funciones $f(x)=${lt}$ y $g(x)=${pt}$`, ' Construya la gráfica y dibuje el elemento de integración.'),
    methodWhy: 'Las dos curvas **encierran** una región que no toca el eje X: al girarla queda un hueco.',
    outer: radLine(m, n),
    inner: radParab(c),
    a: r1,
    b: r2,
    recon: S(
      'Reconocer cada curva',
      `**$f(x)=${lt}$** tiene la forma $y=mx+n$: es una ${dirTxt}. **$g(x)=${pt}$** tiene la forma $y=x^2+c$: es una **parábola** que se abre hacia arriba con vértice en $${pp}$ y simétrica respecto al eje $Y$.`,
      [m === 0 ? `f(x)=${n}\\ \\Rightarrow\\ \\text{recta horizontal a la altura }${n}` : `f(x)=${lt}\\ \\Rightarrow\\ \\text{pendiente }m=${m},\\quad\\text{corta el eje }Y\\text{ en }${n}`, `g(x)=${pt}\\ \\Rightarrow\\ \\text{parábola, vértice }${pp},\\ \\text{abre hacia arriba}`],
      undefined,
      { tip: 'Recta = una sola x sin exponente. Parábola = x al cuadrado.' },
    ),
    cuts: S(
      'Puntos de corte (límites de integración)',
      'Los puntos donde se **cruzan** las curvas tienen la misma $y$: igualamos $f(x)=g(x)$. Pasamos todo a un lado para tener una ecuación cuadrática $x^{2}+bx+c=0$ y la factorizamos buscando dos números que **multipliquen** $c$ y **sumen** $b$. Cada factor igualado a 0 da un límite.',
      [
        'f(x)=g(x)',
        `${lt}=${pt}`,
        `0=${pt}-\\left(${lt}\\right)\\quad\\text{(paso todo a un lado)}`,
        `0=${ptex(eq)}`,
        `\\text{busco }p,\\ q\\text{ con }p\\cdot q=${cq}\\ \\text{y}\\ p+q=${bq}`,
        `p=${-r1},\\quad q=${-r2}`,
        `0=${fac(r1)}${fac(r2)}`,
        factorLine(r1),
        factorLine(r2),
        `a=${r1},\\qquad b=${r2}`,
      ],
      { a: `${r1}`, b: `${r2}` },
      { tip: 'Comprueba: al sustituir cada límite en f y en g debe dar la MISMA y (siguiente paso).' },
    ),
    radii: S(
      'Dibujar la región y decidir: ¿cuál es el radio exterior?',
      `Primero hallamos la **altura** de los dos puntos de corte (en $f$ o en $g$, deben coincidir). Luego probamos un punto **en medio** de los límites, $x=${fl(mid)}$: la curva que da el valor mayor está más lejos del eje $X$ y es el **radio exterior $R$**; la otra es el **radio interior $r$**. Aquí ambas curvas están por encima del eje $X$, así que "más lejos del eje" coincide con "más arriba".`,
      [`f(${r1})=${subTex(lt, r1)}=${y1},\\qquad g(${r1})=${subTex(pt, r1)}=${r1 * r1 + c}`, `f(${r2})=${subTex(lt, r2)}=${y2},\\qquad g(${r2})=${subTex(pt, r2)}=${r2 * r2 + c}`, `\\text{puntos de corte: }(${r1},${y1})\\text{ y }(${r2},${y2})`, `\\text{prueba en }x=${fl(mid)}:\\quad f=${fl(fM)},\\quad g=${fl(gM)}`, 'f>g\\ge 0\\ \\Rightarrow\\ R(x)=f(x),\\quad r(x)=g(x)'],
      { R: lt, r: pt },
      { warn: 'Si las curvas estuvieran por debajo del eje X, el radio exterior sería la MÁS ALEJADA del eje (la de menor valor), no la de arriba.' },
    ),
    curves: [
      { label: 'f', tex: `f(x)=${lt}`, expr: linExpr(m, n), color: BLUE },
      { label: 'g', tex: `g(x)=${pt}`, expr: pe, color: RED },
    ],
    points: [{ x: r1, y: y1, label: `(${r1}, ${y1})` }, { x: r2, y: y2, label: `(${r2}, ${y2})` }],
    view: [Math.min(r1, 0) - 1.5, Math.max(r2, 0) + 1.5, -1, ymax + 2],
    traceExtra: 'la recta con regla; la parábola como una "U" suave y simétrica.',
    hints: ['Iguala f y g y factoriza para hallar los límites.', 'R es la curva más lejos del eje X, r la más cerca.', 'V = π ∫ (R² − r²) dx. Cuidado: (x² + c)² = x⁴ + 2c x² + c².'],
    verification: ['R^{2}-r^{2}>0\\text{ en todo el intervalo}\\ \\Rightarrow\\ V>0\\ \\checkmark'],
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
  const outer: Radius = { tex: '\\sqrt{x}', expr: 'sqrt(x)', sq: P(0, 1), expandWhy: 'La raíz cuadrada y el cuadrado son **inversas**: se cancelan, $(\\sqrt{x})^2=x$ (válido porque $x\\ge0$ en la región).', expand: ['\\left(\\sqrt{x}\\right)^{2}=x'] }
  const inner: Radius = line
    ? { tex: innerTex, expr: innerExpr, sq: innerSq, expandWhy: 'El cuadrado de una fracción eleva numerador **y** denominador: $\\left(\\frac{a}{b}\\right)^2=\\frac{a^2}{b^2}$.', expand: [`\\left(\\frac{x}{${k}}\\right)^{2}=\\frac{x^{2}}{${k}^{2}}=\\frac{x^{2}}{${k * k}}`, `\\frac{x^{2}}{${k * k}}=${ptex(innerSq)}`] }
    : radParab(0)
  return build({
    title: line ? 'Raíz y recta: la región entre √x y x/k' : 'Raíz y parábola: la región entre √x y x²',
    statement: `f(x)=\\sqrt{x},\\quad g(x)=${innerTex}`,
    task: TASK(`las funciones $f(x)=\\sqrt{x}$ y $g(x)=${innerTex}$`, ' Construya la gráfica y dibuje el elemento de integración.'),
    methodWhy: 'La región queda **entre** dos curvas que se tocan en el origen y en otro punto: al girar se forma un hueco.',
    outer,
    inner,
    a: 0,
    b: end,
    recon: S(
      'Reconocer cada curva',
      `**$f(x)=\\sqrt{x}$**: raíz cuadrada; solo existe para $x\\ge0$, arranca en el origen, sube rápido y luego se aplana (es la mitad de una parábola acostada). **$g(x)=${innerTex}$**: ${line ? 'una recta que pasa por el origen con pendiente $\\frac{1}{' + k + '}$ (sube muy suave)' : 'una parábola con vértice en el origen que se abre hacia arriba'}.`,
      ['f(x)=\\sqrt{x}\\ \\Rightarrow\\ \\text{dominio }x\\ge 0,\\ f(0)=0,\\ f(1)=1', line ? `g(x)=\\frac{x}{${k}}\\ \\Rightarrow\\ \\text{recta por el origen, pendiente }\\frac{1}{${k}}` : 'g(x)=x^{2}\\ \\Rightarrow\\ \\text{parábola, vértice }(0,0)'],
    ),
    cuts: S(
      'Puntos de corte (límites de integración)',
      'Igualamos $f(x)=g(x)$. Para quitar la raíz **elevamos al cuadrado ambos lados**; después factorizamos sacando $x$ como factor común. Al elevar al cuadrado pueden aparecer soluciones falsas, así que comprobamos cada solución en la ecuación original.',
      line
        ? [`\\sqrt{x}=\\frac{x}{${k}}`, `x=\\frac{x^{2}}{${k * k}}\\quad\\text{(elevo al cuadrado)}`, `${k * k}x=x^{2}\\quad\\text{(multiplico por }${k * k}\\text{)}`, `0=x^{2}-${k * k}x`, `0=x\\left(x-${k * k}\\right)\\quad\\text{(factor común }x\\text{)}`, `x=0\\quad\\text{ó}\\quad x=${k * k}`, `\\text{Comprobación en }x=${k * k}:\\ \\sqrt{${k * k}}=${k}=\\frac{${k * k}}{${k}}\\ \\checkmark`, `a=0,\\qquad b=${k * k}`]
        : ['\\sqrt{x}=x^{2}', 'x=x^{4}\\quad\\text{(elevo al cuadrado)}', '0=x^{4}-x', '0=x\\left(x^{3}-1\\right)\\quad\\text{(factor común }x\\text{)}', 'x=0\\quad\\text{ó}\\quad x^{3}=1\\ \\Rightarrow\\ x=1', '\\text{Comprobación en }x=1:\\ \\sqrt{1}=1=1^{2}\\ \\checkmark', 'a=0,\\qquad b=1'],
      { a: '0', b: `${end}` },
      { warn: 'Elevar al cuadrado puede crear soluciones falsas: sustituye siempre en la ecuación original.' },
    ),
    radii: S(
      'Dibujar la región y decidir: ¿cuál es el radio exterior?',
      'Probamos un punto **en medio** de los límites: la curva que da el valor mayor está más lejos del eje $X$ y es el **radio exterior $R$**; la otra es el **radio interior $r$**.',
      [`\\text{puntos de corte: }(0,0)\\text{ y }(${end},${yEnd})`, line ? `\\text{prueba en }x=1:\\ \\sqrt{1}=1,\\quad\\frac{1}{${k}}\\approx ${(1 / k).toFixed(2)}` : '\\text{prueba en }x=0.5:\\ \\sqrt{0.5}\\approx 0.71,\\quad 0.5^{2}=0.25', line ? `1>\\frac{1}{${k}}\\ \\Rightarrow\\ R(x)=\\sqrt{x},\\quad r(x)=\\frac{x}{${k}}` : '0.71>0.25\\ \\Rightarrow\\ R(x)=\\sqrt{x},\\quad r(x)=x^{2}'],
      { R: '\\sqrt{x}', r: innerTex },
    ),
    curves: [
      { label: 'f', tex: 'f(x)=\\sqrt{x}', expr: 'sqrt(x)', color: BLUE },
      { label: 'g', tex: `g(x)=${innerTex}`, expr: innerExpr, color: RED },
    ],
    points: [{ x: 0, y: 0, label: '(0, 0)' }, { x: end, y: yEnd, label: `(${end}, ${yEnd})` }],
    view: line ? [-0.8, end + 1.2, -0.8, yEnd + 1.6] : [-0.4, 1.6, -0.3, 1.5],
    traceExtra: 'la raíz como una curva que sube rápido y se aplana; la otra según su forma.',
    hints: ['Elevar al cuadrado (√x)² = x: ¡sin raíz!', 'La curva más lejos del eje es el radio exterior.', 'No olvides elevar el radio interior al cuadrado COMPLETO.'],
    verification: [line ? `\\text{Fórmula guía: }V=\\frac{\\pi k^{4}}{6}=\\frac{\\pi\\cdot ${k ** 4}}{6}\\ \\checkmark` : '\\text{Debe ser menor que }\\pi\\int_{0}^{1}x\\,dx=\\frac{\\pi}{2}\\ \\checkmark'],
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
    outer: radArc(R),
    inner: radConst(h),
    a: -c,
    b: c,
    recon: S(
      'Reconocer cada curva',
      `**$f(x)=\\sqrt{${R2}-x^{2}}$** es la semicircunferencia superior de la circunferencia $x^{2}+y^{2}=${R2}$ (radio $${R}$). **$g(x)=${h}$** es una recta horizontal a la altura $${h}$.`,
      [`y=\\sqrt{${R2}-x^{2}}\\ \\Rightarrow\\ x^{2}+y^{2}=${R2},\\ y\\ge 0`, `\\text{centro }(0,0),\\ \\text{radio }${R}`, `y=${h}\\ \\Rightarrow\\ \\text{recta horizontal}`],
    ),
    cuts: S(
      'Puntos de corte (límites de integración)',
      'Donde el arco se encuentra con la recta horizontal: igualamos y elevamos al cuadrado para quitar la raíz. Habrá **dos** soluciones ($\\pm$).',
      [`\\sqrt{${R2}-x^{2}}=${h}`, `${R2}-x^{2}=${h * h}\\quad\\text{(elevo al cuadrado)}`, `x^{2}=${R2}-${h * h}=${c2}`, `x=\\pm\\sqrt{${c2}}=\\pm ${c}`, `a=-${c},\\qquad b=${c}`],
      { a: `-${c}`, b: `${c}` },
      { tip: 'Los dos cortes son (−c, h) y (c, h): simétricos respecto al eje Y.' },
    ),
    radii: S(
      'Dibujar la región y decidir: ¿cuál es el radio exterior?',
      'La región está entre la recta (abajo) y el arco (arriba). Probamos un punto en medio, $x=0$: el arco queda más lejos del eje $X$ que la recta.',
      [`\\text{puntos de corte: }(-${c},${h})\\text{ y }(${c},${h})`, `\\text{prueba en }x=0:\\ \\sqrt{${R2}}=${R},\\quad ${h}`, `${R}>${h}\\ \\Rightarrow\\ R(x)=\\sqrt{${R2}-x^{2}},\\quad r(x)=${h}`],
      { R: `\\sqrt{${R2}-x^{2}}`, r: `${h}` },
    ),
    curves: [
      { label: 'f', tex: `y=\\sqrt{${R2}-x^{2}}`, expr: sphereExpr(R), color: BLUE },
      { label: 'g', tex: `y=${h}`, expr: `${h}`, color: RED },
    ],
    points: [{ x: -c, y: h, label: `(-${c}, ${h})` }, { x: c, y: h, label: `(${c}, ${h})` }, { x: 0, y: R, label: `(0, ${R})` }],
    view: eqView(-R - 1.5, R + 1.5, -1.2),
    traceExtra: 'el arco redondo con compás o a mano; la recta horizontal con regla.',
    hints: ['Iguala el arco con la recta y eleva al cuadrado.', 'R es el arco, r es la recta horizontal.', 'Dato curioso: el volumen solo depende de la mitad del largo del agujero, c.'],
    verification: [`\\text{Dato curioso (anillo): }V=\\frac{4}{3}\\pi c^{3}=\\frac{4}{3}\\pi\\cdot ${c ** 3}=${piTex(fr(4 * c ** 3, 3))}\\ \\checkmark`],
    py: { kind: 'volume', outer: sphereExpr(R), inner: `${h}`, a: `-${c}`, b: `${c}` },
  })
}

function trigWasher(): Draft {
  const value = Math.PI / 2
  const labs = ['0', '\\frac{\\pi}{16}', '\\frac{\\pi}{8}', '\\frac{3\\pi}{16}', '\\frac{\\pi}{4}']
  const xs = [0, 1, 2, 3, 4].map((k) => (k * Math.PI) / 16)
  return {
    title: 'Coseno y seno girando sobre el eje X',
    statement: 'f(x)=\\cos x,\\quad g(x)=\\sin x,\\quad x=0',
    task: TASK('las funciones $f(x)=\\cos x$ y $g(x)=\\sin x$ y el eje $Y$ ($x=0$)', ' Construya la gráfica y dibuje el elemento de integración.'),
    method: 'Volumen por arandelas (eje X)',
    methodWhy: 'La región queda entre dos curvas: al girar se forma un hueco. ' + WHY_WASHER + ' Con identidades trigonométricas el integrando se simplifica mucho. **Calculadora en radianes.**',
    steps: [
      understand('f(x)=\\cos x,\\quad g(x)=\\sin x,\\quad x=0'),
      S('Reconocer cada curva', '**$\\cos x$** arranca en $1$ (cuando $x=0$) y baja; **$\\sin x$** arranca en $0$ y sube. Las dos son ondas del mismo tamaño, una desplazada respecto a la otra, así que se cruzan.', ['\\cos 0=1,\\quad \\sin 0=0', '\\text{cos baja y sen sube }\\Rightarrow\\ \\text{se cruzan}'], undefined, { warn: 'Calculadora en RADIANES.' }),
      S('Puntos de corte (límites de integración)', 'Igualamos seno y coseno. Dividimos ambos lados entre $\\cos x$ (que no es 0 aquí) para obtener la tangente. El otro límite es la recta $x=0$ (el eje $Y$), que da el enunciado.', ['\\sin x=\\cos x', '\\frac{\\sin x}{\\cos x}=1\\quad\\text{(divido entre }\\cos x\\text{)}', '\\tan x=1', 'x=\\frac{\\pi}{4}\\quad\\text{(primer corte con }x>0\\text{)}', '\\text{Comprobación: }\\sin\\tfrac{\\pi}{4}=\\cos\\tfrac{\\pi}{4}=\\tfrac{\\sqrt{2}}{2}\\ \\checkmark', 'a=0,\\qquad b=\\frac{\\pi}{4}'], { a: '0', b: '\\frac{\\pi}{4}' }),
      S('Tabla de valores', 'Entre $0$ y $\\frac{\\pi}{4}\\approx0.785$ tomamos varios ángulos (múltiplos de $\\frac{\\pi}{16}$) y calculamos coseno y seno con la calculadora en radianes. Valores aproximados a 2 cifras.', [arrayTex(labs, [['\\cos x', xs.map((x) => fmtN(Math.cos(x)))], ['\\sin x', xs.map((x) => fmtN(Math.sin(x)))]]), '\\text{Ejemplo: }x=\\tfrac{\\pi}{8}:\\ \\cos\\tfrac{\\pi}{8}\\approx 0.92,\\quad\\sin\\tfrac{\\pi}{8}\\approx 0.38']),
      S('Cómo trazar la gráfica, paso a paso', ['1. **Ejes:** en $X$ marca $\\frac{\\pi}{4}\\approx0.79$ y $\\frac{\\pi}{2}\\approx1.57$; en $Y$ marca $1$ y $\\frac{\\sqrt2}{2}\\approx0.71$.', '2. **Puntos:** marca los puntos de la tabla del coseno (baja de $1$ a $0.71$) y los del seno (sube de $0$ a $0.71$).', '3. **Unir:** une cada grupo con un trazo suave; las curvas se encuentran en $(\\frac{\\pi}{4},\\frac{\\sqrt2}{2})$.', '4. **Rotular:** marca $(0,1)$, $(0,0)$ y el corte $(\\frac{\\pi}{4},\\frac{\\sqrt2}{2})$.', '5. **Sombrear:** pinta la región entre las dos curvas, desde el eje $Y$ hasta el corte.', '6. **Eje de giro:** resalta el eje $X$.'].join('\n\n'), ['\\text{cos: }(0,1)\\to(\\tfrac{\\pi}{4},\\tfrac{\\sqrt2}{2})', '\\text{sen: }(0,0)\\to(\\tfrac{\\pi}{4},\\tfrac{\\sqrt2}{2})'], { a: '0', b: '\\frac{\\pi}{4}' }),
      S('Dibujar la región y decidir: ¿cuál es el radio exterior?', 'Probamos dos puntos entre los límites. La curva que da el valor mayor está más lejos del eje $X$ y es el **radio exterior $R$**.', ['x=0:\\ \\cos 0=1>\\sin 0=0', 'x=\\tfrac{\\pi}{8}:\\ \\cos\\tfrac{\\pi}{8}\\approx 0.92>\\sin\\tfrac{\\pi}{8}\\approx 0.38', 'R(x)=\\cos x,\\quad r(x)=\\sin x'], { R: '\\cos x', r: '\\sin x' }),
      S('Dibujar el elemento de integración (el rectángulo)', 'Rectángulo vertical de ancho $dx$ que va **del seno (abajo) al coseno (arriba)**; no toca el eje $X$ (salvo en $x=0$).', ['x\\in\\left[0,\\tfrac{\\pi}{4}\\right]', '\\text{ancho}=dx', '\\text{borde de arriba: }R(x)=\\cos x', '\\text{borde de abajo: }r(x)=\\sin x']),
      S('Girar el rectángulo: ¿qué figura se forma?', 'Al girar alrededor del eje $X$ se forma una **arandela**: disco de radio $\\cos x$ con un agujero de radio $\\sin x$.', ['\\text{radio exterior }R=\\cos x', '\\text{radio interior }r=\\sin x', '\\text{espesor}=dx']),
      S('Volumen de una arandela', 'Cilindro grande menos cilindro del hueco.', ['dV=\\pi R^{2}dx-\\pi r^{2}dx', 'dV=\\pi\\left[\\cos^{2}x-\\sin^{2}x\\right]dx'], undefined, { warn: 'Es π(R² − r²), no π(R − r)².' }),
      S('Plantear la integral (de sumar arandelas a integrar)', 'Sumamos todas las arandelas desde $x=0$ hasta $x=\\frac{\\pi}{4}$.', ['V\\approx\\sum\\pi\\left[R(x_i)^{2}-r(x_i)^{2}\\right]\\Delta x', 'V=\\pi\\int_{0}^{\\pi/4}\\left(\\cos^{2}x-\\sin^{2}x\\right)dx'], { a: '0', b: '\\frac{\\pi}{4}' }),
      S('Identidad del ángulo doble', 'Se demuestra con la suma de ángulos: $\\cos(x+x)=\\cos x\\cos x-\\sin x\\sin x$. Así el integrando se vuelve algo que **sí** sabemos integrar.', ['\\cos 2x=\\cos(x+x)=\\cos x\\cos x-\\sin x\\sin x', '\\cos 2x=\\cos^{2}x-\\sin^{2}x', 'V=\\pi\\int_{0}^{\\pi/4}\\cos 2x\\,dx'], undefined, { tip: 'Cuando veas cos² − sen² en un integrando, piensa en cos 2x.' }),
      S('Antiderivada', 'Con $u=2x$: $du=2\\,dx\\Rightarrow dx=\\frac{du}{2}$, así que $\\int\\cos 2x\\,dx=\\frac{\\sin 2x}{2}$ (se **divide entre el 2** de adentro).', ['\\int\\cos 2x\\,dx=\\frac{\\sin 2x}{2}', 'F(x)=\\frac{\\sin 2x}{2}', 'F^{\\prime}(x)=\\frac{2\\cos 2x}{2}=\\cos 2x\\ \\checkmark']),
      S('Evaluar F en x = π/4', 'El doble de $\\frac{\\pi}{4}$ es $\\frac{\\pi}{2}$ y $\\sin\\frac{\\pi}{2}=1$.', ['F\\left(\\tfrac{\\pi}{4}\\right)=\\frac{\\sin\\left(2\\cdot\\frac{\\pi}{4}\\right)}{2}', 'F\\left(\\tfrac{\\pi}{4}\\right)=\\frac{\\sin\\frac{\\pi}{2}}{2}=\\frac{1}{2}']),
      S('Evaluar F en x = 0', '$\\sin 0=0$.', ['F(0)=\\frac{\\sin 0}{2}=0']),
      S('Restar y multiplicar por π', 'Teorema fundamental: $F(b)-F(a)$.', ['V=\\pi\\left[F\\left(\\tfrac{\\pi}{4}\\right)-F(0)\\right]', 'V=\\pi\\left[\\frac{1}{2}-0\\right]', 'V=\\frac{\\pi}{2}\\approx 1.571']),
      S('¿Tiene sentido el resultado? (comprobación)', 'Positivo, y menor que el cilindro de radio $1$ (el mayor valor de $\\cos x$) y largo $\\frac{\\pi}{4}$.', ['V\\approx 1.571>0\\ \\checkmark', '\\pi\\cdot 1^{2}\\cdot\\frac{\\pi}{4}\\approx 2.467', '1.571<2.467\\ \\checkmark', '\\text{Casio (Rad): }\\pi\\int_{0}^{\\pi/4}\\left(\\cos^{2}X-\\sin^{2}X\\right)dX\\approx 1.5708']),
      S('Respuesta final', 'Con unidades cúbicas.', ['V=\\frac{\\pi}{2}\\ \\text{unidades}^{3}\\approx 1.571']),
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
      table: xs.map((x, i) => ({ x, label: labs[i] })),
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
