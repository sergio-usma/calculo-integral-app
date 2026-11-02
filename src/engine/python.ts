import type { Problem } from './types'
import { fmtNum } from './util'

export interface PyBlock {
  title: string
  /** Idea matemática equivalente (LaTeX), para relacionar código y papel. */
  math?: string
  /** Explicación en español del bloque. */
  note: string
  code: string
}

export interface PyScript {
  blocks: PyBlock[]
  /** Script completo y ejecutable. */
  full: string
  /** Línea de inicio (1-based) de cada bloque dentro de `full`. */
  starts: number[]
}

/** mathjs → sintaxis Python (sympify). */
export const py = (s: string) => s.replace(/\^/g, '**').replace(/\s+/g, '')
const q = (s: string) => JSON.stringify(py(s))
const arr = (a: number[]) => `[${a.map((v) => Number(v.toFixed(4))).join(', ')}]`

const IMPORTS = `from sympy import (symbols, sympify, diff, integrate, simplify, N, Rational,
                   sin, cos, tan, exp, log, sqrt, pi, Abs, asin, atan, E, oo,
                   Poly, div, fraction, together, cancel, roots, apart,
                   Eq, Interval, solveset, lambdify, latex)`

const HELPERS = (pts: number[], sym = 'x') => `
# Puntos de prueba (donde la función está bien definida) para comparar expresiones.
PUNTOS = ${arr(pts)}

def igual(a, b, var=${sym}, pts=PUNTOS):
    """¿Valen lo mismo a y b? Comparación numérica en varios puntos (más robusta que simplify)."""
    return all(abs(N((a - b).subs(var, p))) < 1e-9 for p in pts)
`

const SIMPSON = `
import math

def simpson(fn, a, b, n=2000):
    """Integral numérica por Simpson, escrita a mano: es nuestra 'prueba independiente'."""
    h = (b - a) / n
    s = fn(a) + fn(b)
    for i in range(1, n):
        s += fn(a + i * h) * (4 if i % 2 else 2)
    return s * h / 3
`

function integralHeader(p: Problem, extraSyms = ''): PyBlock {
  return {
    title: 'Preparación: importar SymPy y definir el integrando',
    math: p.statement,
    note: 'SymPy es una librería de matemática simbólica: maneja letras como `x` en vez de números. Declaramos la variable y escribimos el integrando exactamente como en el enunciado (`**` es la potencia en Python; `^` NO).',
    code: `${IMPORTS}

x${extraSyms} = symbols('x${extraSyms.replace(/, /g, ' ')}', real=True)   # real=True: así SymPy sabe que x es un número real
VARS = {${['x', ...extraSyms.split(', ').filter(Boolean)].map((v) => `"${v}": ${v}`).join(', ')}}

def leer(texto):
    """Convierte texto en expresión simbólica usando nuestras variables."""
    return sympify(texto, locals=VARS)

f = leer(${q(p.fExpr!)})        # f(x): lo que hay dentro de la integral
print("Integrando f(x) =", f)
${HELPERS(p.testPts ?? [0.4, 0.8, 1.2])}`,
  }
}

function finalBlocks(p: Problem): PyBlock[] {
  const [lo, hi] = p.bounds!
  return [
    {
      title: 'Verificación 1: derivar el resultado (debe volver al integrando)',
      math: "F'(x)=f(x)",
      note: 'Es la prueba de oro. Si al derivar tu antiderivada recuperas f, es correcta (la constante C desaparece al derivar).',
      code: `ok = igual(diff(F, x), f)
print("F'(x) == f(x)?", ok)
assert ok, "La antiderivada no coincide con el integrando"`,
    },
    {
      title: 'Verificación 2: integral definida, simbólica vs. numérica a mano',
      math: '\\int_a^b f(x)\\,dx=F(b)-F(a)',
      note: 'Calculamos F(b) − F(a) y lo comparamos con una integral numérica escrita en Python puro (regla de Simpson). Dos caminos distintos, mismo número: confianza total.',
      code: `${SIMPSON}
a, b = ${fmtNum(lo, 4)}, ${fmtNum(hi, 4)}
fnum = lambdify(x, f, "math")                 # convierte f simbólica en función normal de Python
exacto = N(F.subs(x, b) - F.subs(x, a))        # F(b) - F(a)
numerico = simpson(fnum, a, b)
print(f"F(b) - F(a) = {exacto:.8f}")
print(f"Simpson     = {numerico:.8f}")
assert abs(exacto - numerico) < 1e-6
print("✔ Todo coincide")`,
    },
  ]
}

function substScript(p: Problem): PyBlock[] {
  const m = p.py as Extract<NonNullable<Problem['py']>, { kind: 'subst' }>
  return [
    integralHeader(p, ', u'),
    {
      title: 'Paso 1 — Elegir u (la expresión "de adentro")',
      math: `u=${p.steps[0].vars?.u ?? 'g(x)'}`,
      note: 'Misma decisión que a mano: u es la parte cuya derivada aparece (salvo constantes) en el resto de la integral.',
      code: `u_expr = leer(${q(m.u)})
print("u =", u_expr)`,
    },
    {
      title: 'Paso 2 — Calcular du',
      math: 'du=u^{\\prime}(x)\\,dx',
      note: 'En papel: du = (derivada de u) dx. En código, `diff(u_expr, x)` devuelve la derivada u′(x).',
      code: `du_dx = diff(u_expr, x)
print("du/dx =", du_dx)`,
    },
    {
      title: 'Paso 3 — Reescribir la integral solo con u',
      math: 'f(x)\\,dx=g(u)\\,du',
      note: 'Aquí está la clave: proponemos la integral ya cambiada g(u) y comprobamos que g(u(x))·u′(x) vuelve a ser f(x). Si la igualdad se cumple, el cambio de variable es válido.',
      code: `g = leer(${q(m.g)})            # el integrando escrito en la variable u
print("En u:  ∫", g, "du")
assert igual(g.subs(u, u_expr) * du_dx, f), "g(u(x))·u'(x) debería ser f(x)"`,
    },
    {
      title: 'Paso 4 — Integrar en la variable u',
      math: '\\int g(u)\\,du=G(u)',
      note: '`integrate(g, u)` aplica las reglas básicas (potencias, exponenciales, trigonométricas…). SymPy no agrega la constante C: la escribimos nosotros al final.',
      code: `G = integrate(g, u)
print("G(u) =", G)`,
    },
    {
      title: 'Paso 5 — Volver a x',
      math: `F(x)=G\\left(u(x)\\right)+C`,
      note: '`subs(u, u_expr)` sustituye u por su expresión en x. Es el "regresar a la variable original" que nunca debes olvidar.',
      code: `F = G.subs(u, u_expr)
print("F(x) =", F, "+ C")
print("LaTeX:", latex(F))`,
    },
    ...finalBlocks(p),
  ]
}

function partsScript(p: Problem): PyBlock[] {
  const m = p.py as Extract<NonNullable<Problem['py']>, { kind: 'parts' }>
  const us = m.us.map((u) => q(u)).join(', ')
  return [
    integralHeader(p),
    {
      title: 'Paso 1 — Definir la integración por partes como función',
      math: '\\int u\\,dv=uv-\\int v\\,du',
      note: 'Programamos la fórmula una vez. Cada "ronda" elige u (según LIATE); dv es lo que sobra: dv = integrando ÷ u. Llevamos un `signo` porque cada ronda resta la integral que queda.',
      code: `def por_partes(integrando, u):
    """Una ronda: devuelve (término uv, nueva integral v·du)."""
    dv = simplify(integrando / u)        # lo que no es u
    du = diff(u, x)                      # derivar u
    v = integrate(dv, x)                 # integrar dv
    print(f"  u  = {u}\\n  dv = {dv} dx\\n  du = {du} dx\\n  v  = {v}")
    return u * v, simplify(v * du)`,
    },
    {
      title: 'Paso 2 — Aplicar las rondas necesarias',
      math: 'uv-\\int v\\,du',
      note: `Repetimos la fórmula hasta que la integral que queda sea inmediata. Elecciones de u (LIATE): ${m.us.join(' → ')}. Después de la última ronda, la integral restante se resuelve directo.`,
      code: `elecciones_u = [${us}]
resultado = 0
signo = 1
actual = f
for k, u_txt in enumerate(elecciones_u, start=1):
    print(f"Ronda {k}:")
    termino, actual = por_partes(actual, leer(u_txt))
    resultado += signo * termino
    signo = -signo
resultado += signo * integrate(actual, x)   # lo que queda es inmediato
F = simplify(resultado)
print("F(x) =", F, "+ C")
print("LaTeX:", latex(F))`,
    },
    ...finalBlocks(p),
  ]
}

function trigScript(p: Problem): PyBlock[] {
  const m = p.py as Extract<NonNullable<Problem['py']>, { kind: 'trig' }>
  return [
    {
      ...integralHeader(p, ', theta'),
      code: integralHeader(p, ', theta').code.replace('PUNTOS = ', 'PUNTOS_TH = [-1.2, -0.6, 0.2, 0.7, 1.1]   # ángulos en (−π/2, π/2)\nPUNTOS = '),
    },
    {
      title: 'Paso 1 — Proponer la sustitución trigonométrica',
      math: p.steps[0].lines[0],
      note: 'Para la forma √(a² − x²) se usa x = a·sen θ. El diferencial dx se obtiene derivando respecto a θ.',
      code: `x_theta = leer(${q(m.x)})
dx = diff(x_theta, theta)
print("x =", x_theta, "   dx =", dx, "dθ")`,
    },
    {
      title: 'Paso 2 — Sustituir y simplificar con la identidad pitagórica',
      math: '\\sqrt{a^{2}-x^{2}}=a\\cos\\theta',
      note: 'Proponemos el integrando ya simplificado en θ (la raíz desaparece por sen²+cos²=1) y verificamos numéricamente que f(x(θ))·dx/dθ es exactamente eso. En θ ∈ (−π/2, π/2) el coseno es positivo, por eso no hay valor absoluto.',
      code: `h = leer(${q(m.integrand)})        # integrando en θ ya simplificado
print("En θ:  ∫", h, "dθ")
assert igual(f.subs(x, x_theta) * dx, h, var=theta, pts=PUNTOS_TH)`,
    },
    {
      title: 'Paso 3 — Integrar en θ',
      math: '\\int h(\\theta)\\,d\\theta',
      note: 'SymPy aplica por nosotros la identidad del ángulo doble que usaríamos a mano (cos²θ = (1 + cos 2θ)/2) y devuelve algo con sen 2θ.',
      code: `H = integrate(h, theta)
print("H(θ) =", H)`,
    },
    {
      title: 'Paso 4 — Volver a x (el triángulo, en código)',
      math: `\\theta=\\arcsin(\\cdots)`,
      note: 'Del triángulo: sen θ = x/a, así que θ = asin(x/a). Al sustituir, sen(2·asin(x/a)) se reduce a una expresión algebraica; `simplify` hace el trabajo que a mano haces con sen 2θ = 2 sen θ cos θ.',
      code: `theta_de_x = leer(${q(m.back)})
F = simplify(H.subs(theta, theta_de_x))
print("F(x) =", F, "+ C")
print("LaTeX:", latex(F))`,
    },
    ...finalBlocks(p),
  ]
}

function pfScript(p: Problem): PyBlock[] {
  return [
    integralHeader(p),
    {
      title: 'Paso 1 — ¿Fracción propia? Dividir si no',
      math: '\\deg(\\text{num})<\\deg(\\text{den})',
      note: 'Separamos numerador y denominador. Si el grado del numerador es ≥ al del denominador, la división de polinomios `div` saca la parte entera q(x) y deja un residuo r(x) que sí es propio.',
      code: `num, den = fraction(together(f))
num, den = Poly(num, x), Poly(den, x)
q, r = div(num, den)                  # num = q·den + r
print("grado num:", num.degree(), " grado den:", den.degree())
print("parte entera q(x) =", q.as_expr(), "  residuo r(x) =", r.as_expr())`,
    },
    {
      title: 'Paso 2 — Factorizar el denominador (hallar sus raíces)',
      math: '1-x^{2}=(1-x)(1+x)',
      note: '`roots` devuelve las raíces del denominador y su multiplicidad. Cada raíz simple r aporta una fracción A/(x − r).',
      code: `raices = roots(den.as_expr(), x)
print("raíces del denominador:", raices)
assert all(mult == 1 for mult in raices.values()), "Este script maneja raíces simples"`,
    },
    {
      title: 'Paso 3 — Hallar A, B, C con el método del "tapado" (cover-up)',
      math: 'A=\\left.\\frac{r(x)}{\\text{den}/(x-r_k)}\\right|_{x=r_k}',
      note: 'A mano: sustituyes x = (raíz) y "tapas" su factor. En código: multiplicamos por (x − raíz), cancelamos y evaluamos en la raíz.',
      code: `coefs = {}
for raiz in raices:
    A = cancel(r.as_expr() / den.as_expr() * (x - raiz)).subs(x, raiz)
    coefs[raiz] = A
    print(f"coeficiente de 1/(x - ({raiz})) =", A)

# comprobación: la suma de fracciones simples debe ser f
suma = q.as_expr() + sum(A / (x - raiz) for raiz, A in coefs.items())
assert igual(suma, f), "La descomposición no coincide"
print("Descomposición de SymPy (apart):", apart(f, x))`,
    },
    {
      title: 'Paso 4 — Integrar cada fracción simple',
      math: '\\int\\frac{dx}{x-r}=\\ln|x-r|',
      note: 'La parte entera se integra con la regla de la potencia y cada fracción simple da un logaritmo con valor absoluto (sympy devuelve log(x−r) sin barras; las ponemos nosotros).',
      code: `F = integrate(q.as_expr(), x) + sum(A * log(Abs(x - raiz)) for raiz, A in coefs.items())
print("F(x) =", F, "+ C")
print("LaTeX:", latex(F))`,
    },
    ...finalBlocks(p),
  ]
}

function areaScript(p: Problem): PyBlock[] {
  const a = p.area!
  const m = p.py as Extract<NonNullable<Problem['py']>, { kind: 'area' }>
  const dom = m.domain ? `Interval(${m.domain[0]}, ${m.domain[1]})` : 'Interval(-10, 10)'
  const regs = m.regions.map(([lo, hi]) => `(leer("${lo}"), leer("${hi}"))`).join(', ')
  return [
    {
      title: 'Preparación: definir las dos funciones',
      math: p.statement,
      note: 'Cada curva es una expresión simbólica. `f` y `g` son las del enunciado.',
      code: `${IMPORTS}

x = symbols('x', real=True)
VARS = {"x": x}

def leer(texto):
    return sympify(texto, locals=VARS)

f = leer(${q(a.curves[0].expr)})     # ${a.curves[0].tex.replace(/\\/g, '')}
g = leer(${q(a.curves[1].expr)})     # ${a.curves[1].tex.replace(/\\/g, '')}
print("f(x) =", f)
print("g(x) =", g)`,
    },
    {
      title: 'Paso 1 — Puntos de corte: resolver f(x) = g(x)',
      math: 'f(x)=g(x)',
      note: '`solveset` devuelve todas las soluciones dentro del intervalo que le damos. Estos valores (más fronteras como x = 0 o x = 1 si el enunciado las pide) serán los límites de integración.',
      code: `cortes = solveset(Eq(f, g), x, ${dom})
print("Puntos de corte:", cortes)`,
    },
    {
      title: 'Paso 2 — Regiones y límites de integración',
      math: 'a\\le x\\le b',
      note: `Cada región va de un límite a al siguiente b. ${m.regions.length > 1 ? 'Como las curvas se cruzan, hay varias regiones y cada una lleva su propia integral.' : 'Aquí hay una sola región.'}`,
      code: `regiones = [${regs}]
for a_, b_ in regiones:
    print("región de", a_, "a", b_)`,
    },
    {
      title: 'Paso 3 — ¿Quién está arriba? Punto de prueba en el medio',
      math: 'h(x)=f(x)-g(x)',
      note: 'Evaluamos ambas funciones en el punto medio de la región. La mayor es la de arriba. La altura del rectángulo es arriba − abajo, y su área es h·dx.',
      code: `area_total = 0
for a_, b_ in regiones:
    medio = (a_ + b_) / 2
    arriba, abajo = (f, g) if N(f.subs(x, medio)) > N(g.subs(x, medio)) else (g, f)
    h = simplify(arriba - abajo)                      # altura del rectángulo
    A_i = simplify(integrate(h, (x, a_, b_)))         # ∫ (arriba - abajo) dx
    print(f"de {a_} a {b_}:  arriba = {arriba};  A = {A_i} ≈ {N(A_i):.6f}")
    area_total += A_i
area_total = simplify(area_total)
print("ÁREA TOTAL =", area_total, "≈", N(area_total))`,
    },
    {
      title: 'Paso 4 — Verificar con una suma de rectángulos escrita a mano',
      math: 'A\\approx\\sum h(x_i)\\,\\Delta x',
      note: 'Así nació la integral: sumar muchos rectángulos delgados. Con 100 000 rectángulos de ancho dx, la suma ya es casi exacta.',
      code: `def riemann(fn, a, b, n=100_000):
    dx = (b - a) / n
    return sum(fn(a + (i + 0.5) * dx) for i in range(n)) * dx   # punto medio de cada rectángulo

aproximado = 0
for a_, b_ in regiones:
    medio = (a_ + b_) / 2
    arriba, abajo = (f, g) if N(f.subs(x, medio)) > N(g.subs(x, medio)) else (g, f)
    altura = lambdify(x, arriba - abajo, "math")
    aproximado += riemann(altura, float(N(a_)), float(N(b_)))
print(f"Suma de rectángulos ≈ {aproximado:.6f}")
assert abs(aproximado - float(N(area_total))) < 1e-5
assert abs(float(N(area_total)) - ${a.value.toPrecision(12)}) < 1e-8
print("✔ Todo coincide")`,
    },
  ]
}

export function pythonFor(p: Problem): PyScript {
  const k = p.py?.kind
  const blocks =
    p.kind === 'area' ? areaScript(p) : k === 'subst' ? substScript(p) : k === 'parts' ? partsScript(p) : k === 'trig' ? trigScript(p) : pfScript(p)
  const head = `# ${p.method} — ${p.title.replace(/\$/g, '')}\n# Ejecuta con:  pip install sympy  &&  python ejercicio.py\n`
  const starts: number[] = []
  let line = head.split('\n').length
  const parts: string[] = []
  blocks.forEach((b, i) => {
    const banner = `# ${'─'.repeat(6)} ${i === 0 ? '' : ''}${b.title} ${'─'.repeat(6)}\n`
    starts.push(line)
    const text = banner + b.code.replace(/^\n+/, '') + '\n'
    parts.push(text)
    line += text.split('\n').length
  })
  return { blocks, full: head + '\n' + parts.join('\n'), starts }
}
