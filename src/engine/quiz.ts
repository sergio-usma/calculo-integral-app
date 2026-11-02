import { compile, parse } from 'mathjs'
import type { Problem } from './types'
import { fmtNum, fn } from './util'

/* ---------- entrada del alumno: texto plano → función evaluable ---------- */
export function normalizeInput(s: string): string {
  return s
    .replace(/\*\*/g, '^')
    .replace(/π/g, 'pi')
    .replace(/√/g, 'sqrt')
    .replace(/\bln\s*\(/gi, 'log(')
    .replace(/\bsen\s*\(/gi, 'sin(')
    .replace(/\barcsin\b/gi, 'asin')
    .replace(/\barctan\b/gi, 'atan')
    .replace(/\be\^/g, 'exp(1)^')
    .replace(/[×·]/g, '*')
    .replace(/[−–]/g, '-')
    .replace(/,/g, '.')
    .trim()
}

export function toFn(src: string, vars: string[]): ((...a: number[]) => number) | null {
  try {
    const node = parse(normalizeInput(src))
    const c = node.compile()
    return (...args: number[]) => {
      const scope: Record<string, number> = {}
      vars.forEach((v, i) => (scope[v] = args[i]))
      const r = c.evaluate(scope)
      return typeof r === 'number' ? r : Number(r)
    }
  } catch {
    return null
  }
}

export function texPreview(src: string): string | null {
  if (!src.trim()) return null
  try {
    return parse(normalizeInput(src)).toTex({ parenthesis: 'auto', implicit: 'hide' })
  } catch {
    return null
  }
}

const PTS: Record<string, number[]> = { x: [0.37, 0.83, 1.21, 1.77], u: [0.41, 0.93, 1.6, 2.3], theta: [-1.1, -0.5, 0.25, 0.8, 1.2] }

/** ¿La expresión del alumno coincide numéricamente con la esperada en varios puntos? */
export function sameExpr(student: string, expected: string, v: string, pts?: number[]): boolean {
  const a = toFn(student, [v])
  const b = toFn(expected, [v])
  if (!a || !b) return false
  const P = pts ?? PTS[v] ?? PTS.x
  let n = 0
  for (const p of P) {
    let ya: number, yb: number
    try {
      ya = a(p)
      yb = b(p)
    } catch {
      return false
    }
    if (!Number.isFinite(yb)) continue
    if (!Number.isFinite(ya)) return false
    n++
    if (Math.abs(ya - yb) > 1e-6 * Math.max(1, Math.abs(yb))) return false
  }
  return n > 0
}

/** ¿La derivada de la expresión del alumno es `target`? (cualquier constante C sirve) */
export function derivativeIs(student: string, target: (x: number) => number, pts: number[], v = 'x'): boolean {
  const a = toFn(student, [v])
  if (!a) return false
  let n = 0
  for (const p of pts) {
    const h = 1e-5
    let d: number
    try {
      d = (a(p + h) - a(p - h)) / (2 * h)
    } catch {
      return false
    }
    const t = target(p)
    if (!Number.isFinite(t)) continue
    if (!Number.isFinite(d)) return false
    n++
    if (Math.abs(d - t) > 1e-4 * Math.max(1, Math.abs(t))) return false
  }
  return n > 0
}

export function numberOf(student: string): number | null {
  try {
    const v = compile(normalizeInput(student)).evaluate({ pi: Math.PI, e: Math.E })
    const n = typeof v === 'number' ? v : Number(v)
    return Number.isFinite(n) ? n : null
  } catch {
    return null
  }
}

/* ---------- preguntas ---------- */
export interface Question {
  id: string
  label: string
  /** Enunciado: markdown con $LaTeX$. */
  prompt: string
  kind: 'expr' | 'num' | 'nums' | 'choice'
  /** Variable de la expresión pedida. */
  v?: string
  /** Respuesta esperada en texto plano (para autocompletado y para revelar). */
  expected: string
  choices?: string[]
  correct?: number
  hints: string[]
  explain: string
  /** Fragmentos sugeridos para insertar. */
  chips?: string[]
  check: (answer: string, choice?: number) => boolean
}

const J = (s: string) => s.replace(/\*\*/g, '^')
const nonPy = (s: string) => J(s).replace(/\s+/g, '')

export const METHODS = ['Sustitución (cambio de variable)', 'Integración por partes', 'Sustitución trigonométrica', 'Fracciones parciales']

function methodIndex(p: Problem): number {
  switch (p.py?.kind) {
    case 'subst': return 0
    case 'parts': return 1
    case 'trig': return 2
    case 'pf': return 3
    default: return -1
  }
}

function finalQ(p: Problem): Question {
  const f = fn(p.fExpr!)
  return {
    id: 'final',
    label: 'Resultado final',
    prompt: 'Escribe la **antiderivada final** $F(x)$ (sin la constante $+C$). Usa `^` para potencias, `sqrt( )`, `exp( )`, `log( )`, `sin( )`, `pi`…',
    kind: 'expr',
    v: 'x',
    expected: J(p.FExpr!),
    hints: ['Reúne lo que obtuviste en los pasos anteriores y vuelve a la variable $x$.', 'Comprueba derivando: al derivar tu respuesta debe volver el integrando.', 'Revisa signos y constantes (el $\\frac12$, el $-\\frac13$…).'],
    explain: 'Se acepta cualquier expresión cuya derivada sea el integrando (la constante C no importa).',
    chips: ['^', 'sqrt(', 'exp(', 'log(', 'abs(', 'sin(', 'cos(', 'asin(', 'pi'],
    check: (a) => derivativeIs(a, f, p.testPts ?? [0.4, 0.8, 1.3]),
  }
}

export function buildQuiz(p: Problem): Question[] {
  const qs: Question[] = []
  const mi = methodIndex(p)
  if (mi >= 0 && p.kind === 'integral')
    qs.push({
      id: 'method',
      label: 'Identificar el método',
      prompt: `Mira el integrando: $${p.statement}$\n\n¿Qué método conviene usar?`,
      kind: 'choice',
      choices: METHODS,
      correct: mi,
      expected: METHODS[mi],
      hints: ['¿Hay una función "dentro" de otra y su derivada afuera? → sustitución.', '¿Hay un producto de tipos distintos, o un logaritmo solo? → por partes.', '¿Hay una raíz de $a^{2}-x^{2}$? → trigonométrica. ¿Cociente de polinomios? → fracciones parciales.'],
      explain: p.methodWhy,
      check: (_a, c) => c === mi,
    })
  const m = p.py
  if (p.kind === 'integral' && m?.kind === 'subst') {
    const u = J(m.u)
    const g = J(m.g)
    qs.push(
      {
        id: 'u', label: 'Elegir u', prompt: 'Escribe la **sustitución** $u=\\;?$ (la parte "de adentro" cuya derivada aparece en el resto).', kind: 'expr', v: 'x', expected: u,
        hints: ['Busca una expresión dentro de un paréntesis, una raíz, un exponente o el argumento de un seno.', 'Su derivada debe aparecer (salvo una constante) fuera de ella.', `Empieza con: ${u.slice(0, Math.ceil(u.length / 2))}…`],
        explain: 'u es la expresión interna: así du aparece en la integral.', chips: ['x^', 'sqrt(', 'exp(', 'sin(', 'cos(', 'pi'],
        check: (a) => sameExpr(a, u, 'x', p.testPts),
      },
      {
        id: 'du', label: 'Calcular du/dx', prompt: `Con $u=${p.steps[0].vars?.u ?? 'u(x)'}$, escribe la **derivada** $\\dfrac{du}{dx}$.`, kind: 'expr', v: 'x',
        expected: '(derivada de u)',
        hints: ['Deriva término a término; la derivada de una constante es 0.', 'Regla de la cadena: deriva "lo de afuera" y multiplica por la derivada de "lo de adentro".', 'Usa $\\frac{d}{dx}x^{n}=nx^{n-1}$.'],
        explain: 'du = u′(x) dx. De aquí se despeja el pedazo que aparece en la integral.', chips: ['^', 'sin(', 'cos(', 'exp(', 'pi'],
        check: (a) => derivativeIs(u, (x) => toFn(a, ['x'])?.(x) ?? NaN, p.testPts ?? [0.4, 0.8, 1.3]),
      },
      {
        id: 'g', label: 'Integrando en u', prompt: 'Escribe la integral **ya cambiada a la variable $u$** (solo la función $g(u)$, sin $du$; usa la letra `u`). Incluye las constantes que salen de $du$.', kind: 'expr', v: 'u', expected: g,
        hints: ['Reemplaza todo lo de adentro por $u$ y el pedazo $dx$ por $\\frac{du}{\\text{constante}}$.', 'Si te sobra una $x$, despéjala de la ecuación de $u$.', `Tiene la forma: ${g.replace(/[0-9]/g, '#')}`],
        explain: 'No debe quedar ninguna x mezclada con la u.', chips: ['u', '^', 'sqrt(', 'exp(', 'sin(', 'cos(', 'pi', '/'],
        check: (a) => sameExpr(a, g, 'u'),
      },
      finalQ(p),
    )
  } else if (p.kind === 'integral' && m?.kind === 'parts') {
    const u1 = J(m.us[0])
    const f = fn(p.fExpr!)
    const u1f = fn(u1)
    qs.push(
      {
        id: 'u', label: 'Elegir u (LIATE)', prompt: 'Con la regla **LIATE**, escribe la función que conviene como $u$.', kind: 'expr', v: 'x', expected: u1,
        hints: ['LIATE: Logarítmica, Inversa trig., Algebraica, Trigonométrica, Exponencial.', 'Lo que aparezca primero en LIATE es $u$.', `Es una expresión que se simplifica al derivarla: ${u1.slice(0, 3)}…`],
        explain: 'u debe simplificarse al derivar; dv debe poder integrarse.', chips: ['log(', 'x', '^', 'sin(', 'exp('],
        check: (a) => sameExpr(a, u1, 'x', [0.6, 1.1, 1.7, 2.4]),
      },
      {
        id: 'dv', label: 'Hallar v', prompt: 'Con ese $u$, $dv$ es lo que sobra (integrando ÷ $u$). Escribe $v=\\int dv$ (sin constante).', kind: 'expr', v: 'x', expected: '(antiderivada de dv)',
        hints: ['Primero halla $dv=\\dfrac{f(x)}{u}$.', 'Integra $dv$ con la regla de la potencia o de la exponencial.', 'Compruébalo: al derivar $v$ debe volver $dv$.'],
        explain: 'v es la antiderivada de dv.', chips: ['^', 'exp(', 'sin(', 'cos(', 'pi', '/'],
        check: (a) => derivativeIs(a, (x) => f(x) / u1f(x), [0.6, 1.1, 1.7, 2.4]),
      },
      finalQ(p),
    )
  } else if (p.kind === 'integral' && m?.kind === 'trig') {
    const xt = J(m.x)
    const h = J(m.integrand)
    qs.push(
      {
        id: 'x', label: 'Sustitución trigonométrica', prompt: 'La raíz es de la forma $\\sqrt{a^{2}-x^{2}}$ (o con $b\\,x$). Escribe la sustitución $x=\\;?$ en función de `theta`.', kind: 'expr', v: 'theta', expected: xt,
        hints: ['Para $a^{2}-x^{2}$ se usa seno: $x=a\\sin\\theta$.', 'Si es $a^{2}-b^{2}x^{2}$ entonces $x=\\frac{a}{b}\\sin\\theta$.', 'Recuerda: $a=\\sqrt{\\text{(número)}}$.'],
        explain: 'Con x = a·sen θ la raíz se vuelve a·cos θ.', chips: ['sqrt(', 'sin(theta)', 'theta', '/'],
        check: (a) => sameExpr(a, xt, 'theta'),
      },
      {
        id: 'h', label: 'Integrando en θ', prompt: 'Después de sustituir ($f(x)\\,dx$) y simplificar con $\\sin^{2}+\\cos^{2}=1$, ¿cuál es el integrando **en $\\theta$**? (escribe `theta`)', kind: 'expr', v: 'theta', expected: h,
        hints: ['La raíz se vuelve $a\\cos\\theta$ y $dx=\\dots\\cos\\theta\\,d\\theta$.', 'Multiplica: queda una constante por $\\cos^{2}\\theta$ (o $\\sin^{2}\\theta$ si $x^{2}$ está arriba).', `Tiene la forma: ${h.replace(/[0-9]+/g, '#')}`],
        explain: 'Un seno o coseno al cuadrado: luego se baja la potencia con el ángulo doble.', chips: ['cos(theta)^2', 'sin(theta)^2', 'theta', '/'],
        check: (a) => sameExpr(a, h, 'theta'),
      },
      finalQ(p),
    )
  } else if (p.kind === 'integral' && m?.kind === 'pf') {
    const labels = ['A', 'B', 'C']
    m.roots.forEach((r, i) => {
      const den = m.dens?.[i] ?? (r === 0 ? 'x' : r > 0 ? `x-${r}` : `x+${-r}`)
      qs.push({
        id: labels[i], label: `Hallar ${labels[i]}`, prompt: `En la descomposición, ${labels[i]} es el número sobre $\\dfrac{${labels[i]}}{${den}}$. Usa el valor $x=${r}$ que anula los otros factores. Escribe ${labels[i]} (puede ser una fracción como \`-3/2\`).`,
        kind: 'num', expected: fmtNum(m.coefs[i], 6),
        hints: [`Sustituye $x=${r}$ en la ecuación sin denominadores: solo sobrevive un término.`, 'Despeja la letra: queda una ecuación de primer grado.', `El resultado vale ${fmtNum(m.coefs[i], 3)}… (verifica el signo).`],
        explain: 'Cada raíz anula todos los términos menos uno.', chips: ['-', '/'],
        check: (a) => { const n = numberOf(a); return n !== null && Math.abs(n - m.coefs[i]) < 1e-6 },
      })
    })
    qs.push(finalQ(p))
  } else if (p.kind === 'area' && p.area) {
    const a = p.area
    const bs = [...new Set(a.regions.flatMap((r) => [r.a, r.b]))].sort((x, y) => x - y)
    const top0 = a.regions[0].top === a.curves[0].expr ? 0 : 1
    const h0 = `(${a.regions[0].top})-(${a.regions[0].bottom})`
    qs.push(
      {
        id: 'cuts', label: 'Límites de integración', prompt: `Halla los **puntos de corte / límites** (valores de $x$) de la región${bs.length > 2 ? ' (hay varias regiones)' : ''}. Escríbelos de menor a mayor **separados por punto y coma**: p. ej. \`0; pi/2\`.`, kind: 'nums', expected: bs.map((b) => fmtNum(b, 4)).join('; '),
        hints: ['Iguala $f(x)=g(x)$ y despeja $x$.', 'Si el enunciado trae una recta vertical o el eje y ($x=0$), también es un límite.', `Hay ${bs.length} valores.`],
        explain: 'Los cortes son los límites a y b de la integral.', chips: ['pi', ';', '/', 'sqrt('],
        check: (s) => { const v = s.split(';').map(numberOf); return v.length === bs.length && v.every((n, i) => n !== null && Math.abs(n - bs[i]) < 1e-3) },
      },
      {
        id: 'top', label: '¿Quién está arriba?', prompt: `En la **primera región** (de $x=${fmtNum(a.regions[0].a, 3)}$ a $x=${fmtNum(a.regions[0].b, 3)}$), ¿cuál curva queda **arriba**? (usa un punto de prueba en el medio)`, kind: 'choice',
        choices: a.curves.map((c) => `$${c.tex}$`), correct: top0, expected: a.curves[top0].label,
        hints: ['Evalúa ambas funciones en el punto medio de la región.', 'La que da el número mayor está arriba.', 'Sin graficar: sustituye y compara.'],
        explain: 'Arriba − abajo siempre da una altura positiva.', check: (_a, c) => c === top0,
      },
      {
        id: 'h', label: 'Altura del rectángulo', prompt: 'Escribe la **altura** $h(x)=\\text{arriba}-\\text{abajo}$ de la primera región (¡con paréntesis al restar!).', kind: 'expr', v: 'x', expected: J(h0),
        hints: ['Resta la curva de abajo a la de arriba.', 'Pon la segunda entre paréntesis para que cambien todos sus signos.', 'Simplifica si puedes (no es obligatorio).'],
        explain: 'dA = h dx; la integral suma todos los rectángulos.', chips: ['(', ')', '^', 'sin(', 'cos(', 'exp(', 'pi'],
        check: (s) => sameExpr(s, h0, 'x', [0.3 + a.regions[0].a, (a.regions[0].a + a.regions[0].b) / 2, a.regions[0].b - 0.1]),
      },
      {
        id: 'area', label: 'Área total', prompt: `Calcula el **área total**. Puedes escribir un número (\`${fmtNum(a.value, 3)}\`) o una expresión (\`pi^2/4\`, \`2*sqrt(2)\`). Verifica con tu Casio.`, kind: 'num', expected: fmtNum(a.value, 6),
        hints: ['Evalúa $F(b)-F(a)$ con paréntesis.', 'Si hay varias regiones, suma las áreas (todas positivas).', `El área es aproximadamente ${fmtNum(a.value, 2)}.`],
        explain: 'Comprueba con la Casio: ∫ (arriba − abajo) dx entre los límites.', chips: ['pi', 'sqrt(', '/', '^', 'e'],
        check: (s) => { const n = numberOf(s); return n !== null && Math.abs(n - a.value) < 1e-3 * Math.max(1, Math.abs(a.value)) },
      },
    )
  }
  return qs
}

/** Parte de `expected` que aún no se ha escrito (autocompletado fantasma). */
export function ghostOf(typed: string, expected: string): string {
  const t = typed.replace(/\s+/g, '')
  const e = expected.replace(/\s+/g, '')
  if (!t) return e
  if (e.toLowerCase().startsWith(t.toLowerCase())) return e.slice(t.length)
  return ''
}

export { nonPy }
