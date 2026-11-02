import { compile } from 'mathjs'

export interface Frac {
  n: number
  d: number
}

const gcd = (a: number, b: number): number => (b === 0 ? Math.abs(a) : gcd(b, a % b))

export const fr = (n: number, d = 1): Frac => {
  if (d < 0) {
    n = -n
    d = -d
  }
  const g = gcd(n, d) || 1
  return { n: n / g, d: d / g }
}
export const mul = (a: Frac, b: Frac) => fr(a.n * b.n, a.d * b.d)
export const add = (a: Frac, b: Frac) => fr(a.n * b.d + b.n * a.d, a.d * b.d)
export const neg = (a: Frac) => fr(-a.n, a.d)
export const div = (a: Frac, b: Frac) => fr(a.n * b.d, a.d * b.n)
export const val = (a: Frac) => a.n / a.d

/** Fracción como LaTeX con signo. */
export const fl = (a: Frac): string =>
  a.d === 1 ? `${a.n}` : a.n < 0 ? `-\\frac{${-a.n}}{${a.d}}` : `\\frac{${a.n}}{${a.d}}`

/** Término "coef · cuerpo" con signo; `first` evita el "+" inicial. */
export const term = (c: Frac, body: string, first = false): string => {
  if (c.n === 0) return ''
  const negative = c.n < 0
  const a = { n: Math.abs(c.n), d: c.d }
  let mag: string
  if (a.d === 1) mag = a.n === 1 ? body : `${a.n}${body}`
  else mag = `\\frac{${a.n}}{${a.d}}${body}`
  if (first) return negative ? `-${mag}` : mag
  return `${negative ? ' - ' : ' + '}${mag}`
}

/** "+ 3" / "- 3" para escribir constantes tras una expresión. */
export const sg = (n: number): string => (n < 0 ? `-${-n}` : `+${n}`)
export const sgs = (n: number): string => (n < 0 ? `- ${-n}` : `+ ${n}`)

/** Generador pseudoaleatorio con semilla (mulberry32). */
export function rng(seed: number) {
  let t = seed >>> 0
  const next = () => {
    t += 0x6d2b79f5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
  return {
    next,
    int: (a: number, b: number) => a + Math.floor(next() * (b - a + 1)),
    pick: <T>(arr: T[]): T => arr[Math.floor(next() * arr.length)],
  }
}
export type Rng = ReturnType<typeof rng>

/** Evaluador numérico de expresiones mathjs en x. */
export function fn(expr: string): (x: number) => number {
  const c = compile(expr)
  return (x: number) => {
    const v = c.evaluate({ x })
    return typeof v === 'number' ? v : Number(v)
  }
}

/** Simpson compuesto (independiente de la antiderivada, para verificación y gráficas). */
export function simpson(f: (x: number) => number, a: number, b: number, n = 2000): number {
  if (n % 2) n++
  const h = (b - a) / n
  let s = f(a) + f(b)
  for (let i = 1; i < n; i++) s += f(a + i * h) * (i % 2 ? 4 : 2)
  return (s * h) / 3
}

/** mathjs → texto como se teclea en la Casio. */
export function toCasio(expr: string): string {
  return expr
    .replace(/\s+/g, '')
    .replace(/asin\(/g, 'sin⁻¹(')
    .replace(/acos\(/g, 'cos⁻¹(')
    .replace(/atan\(/g, 'tan⁻¹(')
    .replace(/sqrt\(/g, '√(')
    .replace(/exp\(/g, 'e^(')
    .replace(/log\(/g, 'ln(')
    .replace(/abs\(/g, 'Abs(')
    .replace(/\bpi\b/g, 'π')
    .replace(/\bx\b/g, 'X')
    .replace(/\*/g, '×')
}

export const round = (v: number, d = 6) => Number(v.toFixed(d))
export const fmtNum = (v: number, d = 5) => String(Number(v.toPrecision(d + 3)).toFixed(d)).replace(/\.?0+$/, '')
