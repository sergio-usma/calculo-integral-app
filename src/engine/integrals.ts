import type { Level, Problem, Step } from './types'
import type { Frac, Rng } from './util'
import { fl, fr, mul, sg, term, val } from './util'

export type Draft = Omit<Problem, 'casio' | 'id' | 'family' | 'level' | 'kind'>

const S = (
  title: string,
  why: string,
  lines: string[],
  vars?: Record<string, string>,
  extra?: { tip?: string; warn?: string },
): Step => ({ title, why, lines, vars, ...extra })

const ABS_PTS = [-1.3, -0.7, 0.4, 0.9, 1.4]
const POS_PTS = [0.6, 1.1, 1.7, 2.4]

// ------------------------------------------------------------------ FAMILIA 1: sustitución con potencia
function f1Poly(c: number, n: number): Draft {
  const inner = `x^{2}${sg(c)}`
  const U = `\\left(${inner}\\right)`
  const xx = c > 0 ? `u-${c}` : `u+${-c}`
  const c1 = fr(1, 2 * (n + 2))
  const c2 = fr(-c, 2 * (n + 1))
  return {
    title: `Sustitución $u=x^{2}${sg(c)}$`,
    statement: `\\int x^{3}${U}^{${n}}\\,dx`,
    method: 'Sustitución (cambio de variable)',
    methodWhy: `Dentro del paréntesis hay $${inner}$ y su derivada es $2x$. En $x^{3}$ hay un $x$ escondido ($x^{3}=x^{2}\\cdot x$): esa es la derivada que buscamos.`,
    steps: [
      S('Elegir u', 'Escogemos como $u$ la expresión "de adentro": la que está dentro del paréntesis.', [`u=${inner}`], { u: inner }),
      S('Calcular du', 'Derivamos $u$ respecto a $x$ y multiplicamos por $dx$. Luego despejamos el pedazo $x\\,dx$, que es el que aparece en la integral.',
        ['\\frac{du}{dx}=2x', 'du=2x\\,dx', 'x\\,dx=\\frac{du}{2}'], { du: '2x\\,dx' }),
      S('Separar x³ y despejar x²', 'Como $x^{3}=x^{2}\\cdot x$, reservamos un $x\\,dx$ para el $du$ y nos sobra un $x^{2}$. Ese $x^{2}$ se escribe usando $u$ (despejando de $u=' + inner + '$).',
        ['x^{3}dx=x^{2}\\cdot\\left(x\\,dx\\right)', `x^{2}=${xx}`], { 'x^2': xx },
        { tip: 'Si sobra una potencia de x, despéjala de la ecuación de u.' }),
      S('Sustituir todo', 'Cambiamos todo a la variable $u$. **Nunca** debe quedar una $x$ mezclada con la $u$.',
        [`\\int x^{3}${U}^{${n}}dx=\\int \\left(${xx}\\right)u^{${n}}\\cdot\\frac{du}{2}`, `=\\frac{1}{2}\\int \\left(${xx}\\right)u^{${n}}\\,du`],
        undefined, { warn: 'Olvidar el 1/2 que viene de $du=2x\\,dx$ es el error número uno.' }),
      S('Distribuir (álgebra)', `Multiplicamos $u^{${n}}$ por cada término del paréntesis. Recuerda: $u\\cdot u^{${n}}=u^{${n + 1}}$ (se suman los exponentes).`,
        [`\\left(${xx}\\right)u^{${n}}=u^{${n + 1}}${c > 0 ? '-' : '+'}${Math.abs(c)}u^{${n}}`, `\\frac{1}{2}\\int\\left(u^{${n + 1}}${c > 0 ? '-' : '+'}${Math.abs(c)}u^{${n}}\\right)du`]),
      S('Integrar término a término', 'Regla de la potencia: $\\int u^{k}du=\\frac{u^{k+1}}{k+1}$ (subimos el exponente en 1 y dividimos entre el nuevo exponente).',
        [`\\frac{1}{2}\\left(\\frac{u^{${n + 2}}}{${n + 2}}${c > 0 ? '-' : '+'}${Math.abs(c)}\\cdot\\frac{u^{${n + 1}}}{${n + 1}}\\right)+C`]),
      S('Repartir el ½ y volver a x', `Multiplicamos el $\\frac12$ por cada término y regresamos a $x$ con $u=${inner}$.`,
        [`${term(c1, `u^{${n + 2}}`, true)}${term(c2, `u^{${n + 1}}`)}+C`, `${term(c1, `${U}^{${n + 2}}`, true)}${term(c2, `${U}^{${n + 1}}`)}+C`]),
    ],
    answer: `${term(c1, `${U}^{${n + 2}}`, true)}${term(c2, `${U}^{${n + 1}}`)}+C`,
    verification: [
      `\\frac{d}{dx}\\left[${term(c1, `${U}^{${n + 2}}`, true)}\\right]=x${U}^{${n + 1}}`,
      `\\frac{d}{dx}\\left[${term(c2, `${U}^{${n + 1}}`, true)}\\right]=${term(fr(-c), `x${U}^{${n}}`, true)}`,
      `x${U}^{${n}}\\left[${U}${c > 0 ? '-' : '+'}${Math.abs(c)}\\right]=x${U}^{${n}}\\cdot x^{2}=x^{3}${U}^{${n}}`,
    ],
    hints: ['¿Qué expresión está "dentro" de otra? Esa es $u$.', 'Calcula $du$ y busca ese pedazo en la integral. ¿Qué sobra?', 'Lo que sobra ($x^{2}$) se despeja de la ecuación de $u$.'],
    py: { kind: 'subst', u: `x**2${sg(c)}`, g: `(u-(${c}))*u**${n}/2` },
    fExpr: `x^3*(x^2${sg(c)})^${n}`,
    FExpr: `(x^2${sg(c)})^${n + 2}/(${2 * (n + 2)}) - ${c}*(x^2${sg(c)})^${n + 1}/(${2 * (n + 1)})`,
    testPts: ABS_PTS,
    bounds: [0, 1],
  }
}

function f1SinPi(b: number): Draft {
  const bx = b === 1 ? '' : `${b}`
  const inner = `${bx}x^{3}+\\pi`
  const k = 3 * b
  return {
    title: `Sustitución con seno y π`,
    statement: `\\int x^{2}\\sin\\left(${inner}\\right)dx`,
    method: 'Sustitución (cambio de variable)',
    methodWhy: `El seno tiene adentro $${inner}$, cuya derivada es $${k}x^{2}$. Y justo hay un $x^{2}$ afuera. ¡Señal clara de sustitución!`,
    steps: [
      S('Elegir u', 'Escogemos el ángulo del seno (lo de adentro). Ojo: $\\pi$ es solo un número (≈3.14), no una variable.', [`u=${inner}`], { u: inner }),
      S('Calcular du', 'La derivada de $\\pi$ es 0 (es una constante). La de $' + bx + 'x^{3}$ es $' + k + 'x^{2}$.', [`du=${k}x^{2}\\,dx`, `x^{2}\\,dx=\\frac{du}{${k}}`], { du: `${k}x^{2}dx` }),
      S('Sustituir', 'Todo el $x^{2}dx$ se vuelve $\\frac{du}{' + k + '}$ y el ángulo se vuelve $u$.', [`\\int x^{2}\\sin(${inner})dx=\\int \\sin u\\cdot\\frac{du}{${k}}`, `=\\frac{1}{${k}}\\int\\sin u\\,du`]),
      S('Integrar', 'La integral del seno es **menos coseno**: $\\int\\sin u\\,du=-\\cos u$.', [`\\frac{1}{${k}}\\left(-\\cos u\\right)+C`, `-\\frac{1}{${k}}\\cos u+C`], undefined, { warn: 'El signo menos de ∫sen = −cos se olvida mucho.' }),
      S('Volver a x', `Cambiamos $u$ por $${inner}$.`, [`-\\frac{1}{${k}}\\cos\\left(${inner}\\right)+C`]),
    ],
    answer: `-\\frac{1}{${k}}\\cos\\left(${inner}\\right)+C`,
    verification: [`\\frac{d}{dx}\\left[-\\frac{1}{${k}}\\cos(${inner})\\right]=-\\frac{1}{${k}}\\cdot\\left(-\\sin(${inner})\\right)\\cdot ${k}x^{2}=x^{2}\\sin(${inner})`],
    hints: ['¿Qué hay dentro del seno?', 'Deriva eso: ¿aparece en la integral (salvo constantes)?', '∫ sen u du = −cos u.'],
    py: { kind: 'subst', u: `${b}*x**3+pi`, g: `sin(u)/${k}` },
    fExpr: `x^2*sin(${b}*x^3+pi)`,
    FExpr: `-cos(${b}*x^3+pi)/${k}`,
    testPts: ABS_PTS,
    bounds: [0, 1],
    usesTrig: true,
  }
}

function f1SinCos(): Draft {
  return {
    title: 'Potencias de seno y coseno (una impar)',
    statement: '\\int \\sin^{3}x\\,\\cos^{2}x\\,dx',
    method: 'Sustitución con identidad trigonométrica',
    methodWhy: 'El seno tiene potencia **impar** (3). Separamos un $\\sin x$ para formar el $du$ de $u=\\cos x$; el resto de senos se convierte en cosenos con $\\sin^{2}x=1-\\cos^{2}x$.',
    steps: [
      S('Separar un seno', 'Escribimos $\\sin^{3}x=\\sin^{2}x\\cdot\\sin x$. El $\\sin x$ suelto nos servirá para $du$.', ['\\int \\sin^{2}x\\,\\cos^{2}x\\,\\sin x\\,dx']),
      S('Identidad pitagórica', 'Cambiamos $\\sin^{2}x$ por $1-\\cos^{2}x$ (viene de $\\sin^{2}x+\\cos^{2}x=1$).', ['\\sin^{2}x=1-\\cos^{2}x', '\\int \\left(1-\\cos^{2}x\\right)\\cos^{2}x\\,\\sin x\\,dx']),
      S('Elegir u', 'Ahora todo está en cosenos, salvo el $\\sin x\\,dx$ que será el $du$.', ['u=\\cos x', 'du=-\\sin x\\,dx', '\\sin x\\,dx=-du'], { u: '\\cos x', du: '-\\sin x\\,dx' },
        { warn: 'La derivada de coseno es MENOS seno: por eso aparece el signo −.' }),
      S('Sustituir', 'Reemplazamos todo por $u$.', ['\\int\\left(1-u^{2}\\right)u^{2}\\left(-du\\right)', '=-\\int\\left(u^{2}-u^{4}\\right)du']),
      S('Integrar', 'Regla de la potencia en cada término.', ['-\\left(\\frac{u^{3}}{3}-\\frac{u^{5}}{5}\\right)+C', '-\\frac{u^{3}}{3}+\\frac{u^{5}}{5}+C']),
      S('Volver a x', 'Cambiamos $u$ por $\\cos x$.', ['-\\frac{\\cos^{3}x}{3}+\\frac{\\cos^{5}x}{5}+C']),
    ],
    answer: '-\\frac{\\cos^{3}x}{3}+\\frac{\\cos^{5}x}{5}+C',
    verification: ['\\frac{d}{dx}\\left[-\\frac{\\cos^{3}x}{3}+\\frac{\\cos^{5}x}{5}\\right]=\\cos^{2}x\\sin x-\\cos^{4}x\\sin x=\\cos^{2}x\\sin x\\left(1-\\cos^{2}x\\right)=\\sin^{3}x\\cos^{2}x'],
    hints: ['Una potencia impar se "parte": deja uno suelto.', 'El resto se pasa al otro con $\\sin^{2}=1-\\cos^{2}$.', '$u=\\cos x$, $du=-\\sin x\\,dx$.'],
    py: { kind: 'subst', u: 'cos(x)', g: '-(1-u**2)*u**2' },
    fExpr: 'sin(x)^3*cos(x)^2',
    FExpr: '-cos(x)^3/3 + cos(x)^5/5',
    testPts: ABS_PTS,
    bounds: [0, 3.14159265],
    usesTrig: true,
  }
}

// ------------------------------------------------------------------ FAMILIA 2: sustitución con raíz
function f2Root(m: number, a: number, minus: boolean): Draft {
  const sgn = minus ? '-' : '+'
  const inner = `${a}${sgn}x^{${m}}`.replace(/^1([-+])/, '1$1')
  const innerTex = minus ? `${a}-x^{${m}}` : `${a}+x^{${m}}`
  const xm = m === 2 ? 'x' : `x^{${m - 1}}`
  const coef = fr(minus ? -2 : 2, m)
  void inner
  return {
    title: `Sustitución con raíz: $u=${innerTex}$`,
    statement: `\\int \\frac{${xm}}{\\sqrt{${innerTex}}}\\,dx`,
    method: 'Sustitución (cambio de variable)',
    methodWhy: `Dentro de la raíz está $${innerTex}$; su derivada es $${minus ? '-' : ''}${m}${xm}$ y en el numerador tenemos $${xm}$ (¡salvo la constante ${minus ? '−' : ''}${m}!). Una constante que falta o sobra no es problema.`,
    steps: [
      S('Elegir u', 'Escogemos lo que está dentro de la raíz.', [`u=${innerTex}`], { u: innerTex }),
      S('Calcular du', `Derivamos. La derivada de la constante ${a} es 0.`, [`du=${minus ? '-' : ''}${m}${xm}\\,dx`, `${xm}\\,dx=${minus ? '-' : ''}\\frac{du}{${m}}`], { du: `${minus ? '-' : ''}${m}${xm}dx` },
        minus ? { warn: 'Cuidado con el signo menos al despejar: se divide entre −' + m + '.' } : undefined),
      S('Raíz como potencia', 'Una raíz en el denominador es una potencia **negativa**: $\\frac{1}{\\sqrt{u}}=u^{-1/2}$.', ['\\frac{1}{\\sqrt{u}}=u^{-1/2}']),
      S('Sustituir', 'Cambiamos todo a $u$.', [`\\int\\frac{${xm}\\,dx}{\\sqrt{${innerTex}}}=\\int u^{-1/2}\\cdot\\left(${minus ? '-' : ''}\\frac{du}{${m}}\\right)`, `=${minus ? '-' : ''}\\frac{1}{${m}}\\int u^{-1/2}du`]),
      S('Integrar', 'Regla de la potencia con $k=-\\frac12$: $k+1=\\frac12$. Dividir entre $\\frac12$ es multiplicar por 2.', ['\\int u^{-1/2}du=\\frac{u^{1/2}}{1/2}=2u^{1/2}', `${minus ? '-' : ''}\\frac{1}{${m}}\\cdot 2u^{1/2}+C=${fl(coef)}\\,u^{1/2}+C`], undefined,
        { warn: 'Dividir entre 1/2 NO es dividir entre 2: es multiplicar por 2.' }),
      S('Volver a x', 'Regresamos $u$ y escribimos la potencia $\\frac12$ como raíz.', [`${fl(coef)}\\sqrt{${innerTex}}+C`]),
    ],
    answer: `${fl(coef)}\\sqrt{${innerTex}}+C`,
    verification: [
      `\\frac{d}{dx}\\left[${fl(coef)}\\left(${innerTex}\\right)^{1/2}\\right]=${fl(coef)}\\cdot\\frac{1}{2}\\left(${innerTex}\\right)^{-1/2}\\cdot\\left(${minus ? '-' : ''}${m}${xm}\\right)=\\frac{${xm}}{\\sqrt{${innerTex}}}`,
    ],
    hints: ['¿Qué hay dentro de la raíz?', 'Deriva eso. ¿Aparece (salvo constante) en el numerador?', '$\\frac{1}{\\sqrt{u}}=u^{-1/2}$ y ∫ $u^{-1/2}=2\\sqrt{u}$.'],
    py: { kind: 'subst', u: `${a}${minus ? '-' : '+'}x**${m}`, g: `1/sqrt(u)/(${minus ? -m : m})` },
    fExpr: `x^${m - 1}/sqrt(${a}${minus ? '-' : '+'}x^${m})`,
    FExpr: `${val(coef)}*sqrt(${a}${minus ? '-' : '+'}x^${m})`,
    testPts: minus ? [0.2, 0.5, 0.8].map((t) => t * Math.pow(a, 1 / m)) : POS_PTS,
    bounds: minus ? [0, 0.8 * Math.pow(a, 1 / m)] : [0, 1.5],
  }
}

function f2TrigPi(a: number): Draft {
  return {
    title: 'Raíz con seno y π',
    statement: `\\int \\frac{\\cos(\\pi x)}{\\sqrt{${a}+\\sin(\\pi x)}}\\,dx`,
    method: 'Sustitución (cambio de variable)',
    methodWhy: `Dentro de la raíz hay $${a}+\\sin(\\pi x)$ y su derivada contiene $\\cos(\\pi x)$, que está arriba. La regla de la cadena aporta un factor $\\pi$.`,
    steps: [
      S('Elegir u', 'Lo de adentro de la raíz.', [`u=${a}+\\sin(\\pi x)`], { u: `${a}+\\sin(\\pi x)` }),
      S('Calcular du', 'Regla de la cadena: la derivada de $\\sin(\\pi x)$ es $\\pi\\cos(\\pi x)$ (sale el $\\pi$ de adentro).', ['du=\\pi\\cos(\\pi x)\\,dx', '\\cos(\\pi x)\\,dx=\\frac{du}{\\pi}'], { du: '\\pi\\cos(\\pi x)dx' }),
      S('Sustituir', 'La raíz queda $u^{-1/2}$ y el numerador es $\\frac{du}{\\pi}$.', ['\\int u^{-1/2}\\cdot\\frac{du}{\\pi}', '=\\frac{1}{\\pi}\\int u^{-1/2}du']),
      S('Integrar', '$\\int u^{-1/2}du=2u^{1/2}$.', ['\\frac{1}{\\pi}\\cdot 2u^{1/2}+C=\\frac{2}{\\pi}\\sqrt{u}+C']),
      S('Volver a x', 'Reponemos $u$.', [`\\frac{2}{\\pi}\\sqrt{${a}+\\sin(\\pi x)}+C`]),
    ],
    answer: `\\frac{2}{\\pi}\\sqrt{${a}+\\sin(\\pi x)}+C`,
    verification: [`\\frac{d}{dx}\\left[\\frac{2}{\\pi}\\sqrt{${a}+\\sin(\\pi x)}\\right]=\\frac{2}{\\pi}\\cdot\\frac{\\pi\\cos(\\pi x)}{2\\sqrt{${a}+\\sin(\\pi x)}}=\\frac{\\cos(\\pi x)}{\\sqrt{${a}+\\sin(\\pi x)}}`],
    hints: ['Lo de adentro de la raíz es u.', 'Al derivar sin(πx) sale π por la regla de la cadena.', 'El π pasa dividiendo.'],
    py: { kind: 'subst', u: `${a}+sin(pi*x)`, g: '1/(pi*sqrt(u))' },
    fExpr: `cos(pi*x)/sqrt(${a}+sin(pi*x))`,
    FExpr: `2/pi*sqrt(${a}+sin(pi*x))`,
    testPts: [-0.8, -0.3, 0.2, 0.6, 1.4],
    bounds: [0, 1],
    usesTrig: true,
  }
}

function f2Cube(a: number): Draft {
  return {
    title: 'Raíz cúbica',
    statement: `\\int \\frac{x^{2}}{\\sqrt[3]{${a}-x^{3}}}\\,dx`,
    method: 'Sustitución (cambio de variable)',
    methodWhy: `Lo de adentro es $${a}-x^{3}$ (derivada $-3x^{2}$) y arriba hay $x^{2}$. La raíz cúbica es potencia $\\frac13$: en el denominador, $-\\frac13$.`,
    steps: [
      S('Elegir u', 'Lo de adentro de la raíz.', [`u=${a}-x^{3}`], { u: `${a}-x^{3}` }),
      S('Calcular du', 'Derivamos y despejamos $x^{2}dx$ (se divide entre $-3$).', ['du=-3x^{2}\\,dx', 'x^{2}\\,dx=-\\frac{du}{3}']),
      S('Raíz cúbica como potencia', '$\\sqrt[3]{u}=u^{1/3}$, así que en el denominador es $u^{-1/3}$.', ['\\frac{1}{\\sqrt[3]{u}}=u^{-1/3}']),
      S('Sustituir', 'Cambiamos todo a $u$.', ['\\int u^{-1/3}\\left(-\\frac{du}{3}\\right)', '=-\\frac{1}{3}\\int u^{-1/3}du']),
      S('Integrar', 'Exponente: $-\\frac13+1=\\frac23$. Dividir entre $\\frac23$ es multiplicar por $\\frac32$.', ['\\int u^{-1/3}du=\\frac{u^{2/3}}{2/3}=\\frac{3}{2}u^{2/3}', '-\\frac{1}{3}\\cdot\\frac{3}{2}u^{2/3}+C=-\\frac{1}{2}u^{2/3}+C']),
      S('Volver a x', 'Reponemos $u$.', [`-\\frac{1}{2}\\left(${a}-x^{3}\\right)^{2/3}+C`]),
    ],
    answer: `-\\frac{1}{2}\\left(${a}-x^{3}\\right)^{2/3}+C`,
    verification: [`\\frac{d}{dx}\\left[-\\frac12\\left(${a}-x^{3}\\right)^{2/3}\\right]=-\\frac12\\cdot\\frac23\\left(${a}-x^{3}\\right)^{-1/3}\\cdot\\left(-3x^{2}\\right)=\\frac{x^{2}}{\\sqrt[3]{${a}-x^{3}}}`],
    hints: ['$u$ = lo de adentro de la raíz.', '$\\sqrt[3]{u}=u^{1/3}$.', 'Dividir entre 2/3 = multiplicar por 3/2.'],
    py: { kind: 'subst', u: `${a}-x**3`, g: '-u**(-1/3)/3' },
    fExpr: `x^2*(${a}-x^3)^(-1/3)`,
    FExpr: `-0.5*(${a}-x^3)^(2/3)`,
    testPts: [-1.2, -0.4, 0.3, 0.7].map((t) => t * Math.min(1, Math.pow(a, 1 / 3) * 0.9)),
    bounds: [0, 0.8 * Math.pow(a, 1 / 3)],
  }
}

// ------------------------------------------------------------------ FAMILIA 3: sustitución con exponencial
function f3Pow(m: number, a: number): Draft {
  // ∫ x^{m-1} e^{a x^m} dx = e^{a x^m}/(a m)
  const xm = m === 1 ? '' : m === 2 ? 'x' : `x^{${m - 1}}`
  const ex = a === -1 ? `-x^{${m}}` : a === 1 ? `x^{${m}}` : `${a}x^{${m}}`
  const k = a * m
  const coef = fr(1, k)
  const dvk = k < 0 ? `-\\frac{du}{${-k}}` : `\\frac{du}{${k}}`
  return {
    title: `Exponencial: $u=${ex}$`,
    statement: `\\int ${xm}\\,e^{${ex}}\\,dx`,
    method: 'Sustitución (cambio de variable)',
    methodWhy: `El exponente $${ex}$ tiene derivada $${k}${xm}$ y en la integral hay un $${xm}$ multiplicando. La exponencial sola no se podría, pero con ese factor sí.`,
    steps: [
      S('Elegir u', 'Con exponenciales, $u$ es **el exponente**.', [`u=${ex}`], { u: ex }),
      S('Calcular du', 'Derivamos el exponente.', [`du=${k}${xm}\\,dx`, `${xm}\\,dx=${dvk}`], { du: `${k}${xm}dx` }),
      S('Sustituir', `El exponente se vuelve $u$ y $${xm}\\,dx$ se vuelve $${dvk}$.`, [`\\int e^{u}\\left(${dvk}\\right)`, `=${fl(coef)}\\int e^{u}du`]),
      S('Integrar', 'La exponencial es su propia integral: $\\int e^{u}du=e^{u}$. (**No** se aplica la regla de potencias.)', [`${fl(coef)}\\,e^{u}+C`], undefined, { warn: 'La regla de potencias NO sirve para $e^{u}$: la variable está en el exponente.' }),
      S('Volver a x', 'Reponemos $u$.', [`${fl(coef)}\\,e^{${ex}}+C`]),
    ],
    answer: `${fl(coef)}\\,e^{${ex}}+C`,
    verification: [`\\frac{d}{dx}\\left[${fl(coef)}e^{${ex}}\\right]=${fl(coef)}\\cdot e^{${ex}}\\cdot ${k}${xm}=${xm}\\,e^{${ex}}`],
    hints: ['En exponenciales, $u$ es el exponente.', 'Deriva el exponente: ¿aparece afuera?', '∫ e^u du = e^u.'],
    py: { kind: 'subst', u: `${a}*x**${m}`, g: `exp(u)/(${k})` },
    fExpr: `x^${m - 1}*exp(${a}*x^${m})`,
    FExpr: `exp(${a}*x^${m})/${k}`,
    testPts: ABS_PTS,
    bounds: [0, 1],
  }
}

function f3Frac(a: number): Draft {
  return {
    title: 'Cociente con exponencial',
    statement: `\\int \\frac{e^{x}}{${a}+e^{x}}\\,dx`,
    method: 'Sustitución (cambio de variable)',
    methodWhy: `Abajo hay $${a}+e^{x}$ y su derivada es $e^{x}$, que es exactamente lo que está arriba. Cuando el numerador es la derivada del denominador, la respuesta es un logaritmo.`,
    steps: [
      S('Elegir u', 'Escogemos el denominador.', [`u=${a}+e^{x}`], { u: `${a}+e^{x}` }),
      S('Calcular du', 'La derivada de una constante es 0 y la de $e^{x}$ es $e^{x}$.', ['du=e^{x}\\,dx']),
      S('Sustituir', 'Todo el numerador $e^{x}dx$ se vuelve $du$.', ['\\int\\frac{du}{u}']),
      S('Integrar', '$\\int\\frac{du}{u}=\\ln|u|$.', ['\\ln|u|+C']),
      S('Volver a x', `Como $${a}+e^{x}>0$ siempre, el valor absoluto sobra.`, [`\\ln\\left(${a}+e^{x}\\right)+C`]),
    ],
    answer: `\\ln\\left(${a}+e^{x}\\right)+C`,
    verification: [`\\frac{d}{dx}\\ln\\left(${a}+e^{x}\\right)=\\frac{e^{x}}{${a}+e^{x}}`],
    hints: ['¿Qué pasa si derivas el denominador?', 'Si arriba queda la derivada de abajo → ln.', '$\\int du/u=\\ln|u|$.'],
    py: { kind: 'subst', u: `${a}+exp(x)`, g: '1/u' },
    fExpr: `exp(x)/(${a}+exp(x))`,
    FExpr: `log(${a}+exp(x))`,
    testPts: ABS_PTS,
    bounds: [0, 1],
  }
}

function f3TrigPi(): Draft {
  return {
    title: 'Exponencial con coseno y π',
    statement: '\\int \\sin(\\pi x)\\,e^{\\cos(\\pi x)}\\,dx',
    method: 'Sustitución (cambio de variable)',
    methodWhy: 'El exponente es $\\cos(\\pi x)$; su derivada contiene $\\sin(\\pi x)$, que está afuera. Cuidado con el signo y con el $\\pi$.',
    steps: [
      S('Elegir u', 'El exponente.', ['u=\\cos(\\pi x)'], { u: '\\cos(\\pi x)' }),
      S('Calcular du', 'La derivada de coseno es −seno, y la regla de la cadena aporta $\\pi$.', ['du=-\\pi\\sin(\\pi x)\\,dx', '\\sin(\\pi x)\\,dx=-\\frac{du}{\\pi}'], { du: '-\\pi\\sin(\\pi x)dx' }),
      S('Sustituir', 'Cambiamos todo.', ['\\int e^{u}\\left(-\\frac{du}{\\pi}\\right)=-\\frac{1}{\\pi}\\int e^{u}du']),
      S('Integrar', '$\\int e^{u}du=e^{u}$.', ['-\\frac{1}{\\pi}e^{u}+C']),
      S('Volver a x', 'Reponemos $u$.', ['-\\frac{1}{\\pi}e^{\\cos(\\pi x)}+C']),
    ],
    answer: '-\\frac{1}{\\pi}e^{\\cos(\\pi x)}+C',
    verification: ['\\frac{d}{dx}\\left[-\\frac{1}{\\pi}e^{\\cos(\\pi x)}\\right]=-\\frac{1}{\\pi}e^{\\cos(\\pi x)}\\cdot\\left(-\\pi\\sin(\\pi x)\\right)=\\sin(\\pi x)\\,e^{\\cos(\\pi x)}'],
    hints: ['El exponente es $u$.', 'Derivar coseno da −seno, y sale un π.', 'El factor $-\\frac{1}{\\pi}$ sale de la integral.'],
    py: { kind: 'subst', u: 'cos(pi*x)', g: '-exp(u)/pi' },
    fExpr: 'sin(pi*x)*exp(cos(pi*x))',
    FExpr: '-exp(cos(pi*x))/pi',
    testPts: [-0.8, -0.3, 0.2, 0.6, 1.4],
    bounds: [0, 1],
    usesTrig: true,
  }
}

// ------------------------------------------------------------------ FAMILIA 4: por partes
function f4Ln(): Draft {
  return {
    title: 'Por partes: logaritmo solo',
    statement: '\\int \\ln x\\,dx',
    method: 'Integración por partes',
    methodWhy: 'No hay regla básica para $\\int\\ln x\\,dx$ y no hay "función con su derivada" para sustituir. Truco: verla como $\\ln x\\cdot 1$. Fórmula: $\\int u\\,dv=uv-\\int v\\,du$.',
    steps: [
      S('Elegir u y dv (LIATE)', 'En LIATE, la **L**ogarítmica va primero: $u=\\ln x$. Lo que queda ($1\\,dx$) es $dv$.', ['u=\\ln x', 'dv=dx'], { u: '\\ln x', dv: 'dx' }),
      S('Calcular du y v', 'Derivamos $u$ e integramos $dv$.', ['du=\\frac{1}{x}dx', 'v=x'], { du: '\\frac{1}{x}dx', v: 'x' }),
      S('Aplicar la fórmula', '$\\int u\\,dv=uv-\\int v\\,du$.', ['\\int\\ln x\\,dx=\\ln x\\cdot x-\\int x\\cdot\\frac{1}{x}\\,dx']),
      S('Simplificar', 'En la nueva integral, $x\\cdot\\frac{1}{x}=1$.', ['x\\ln x-\\int 1\\,dx', 'x\\ln x-x+C'], undefined, { warn: 'Es $uv\\;\\mathbf{-}\\;\\int v\\,du$: el signo menos de la fórmula se olvida.' }),
    ],
    answer: 'x\\ln x-x+C',
    verification: ['\\frac{d}{dx}\\left[x\\ln x-x\\right]=\\ln x+x\\cdot\\frac{1}{x}-1=\\ln x'],
    hints: ['Escribe $\\ln x$ como $\\ln x\\cdot 1$.', 'LIATE: ¿cuál va primero para ser $u$?', '$dv=dx$ → $v=x$.'],
    py: { kind: 'parts', us: ['log(x)'] },
    fExpr: 'log(x)',
    FExpr: 'x*log(x)-x',
    testPts: POS_PTS,
    bounds: [1, 3],
  }
}

function f4XnLn(n: number): Draft {
  const c = fr(1, n + 1)
  const c2 = fr(-1, (n + 1) * (n + 1))
  return {
    title: `Por partes: $x^{${n}}\\ln x$`,
    statement: `\\int x^{${n}}\\ln x\\,dx`,
    method: 'Integración por partes',
    methodWhy: 'Producto de una algebraica ($x^{n}$) y una logarítmica: LIATE dice que **L** va antes que **A**, así que $u=\\ln x$.',
    steps: [
      S('Elegir u y dv', 'La logarítmica es $u$.', ['u=\\ln x', `dv=x^{${n}}dx`], { u: '\\ln x', dv: `x^{${n}}dx` }),
      S('Calcular du y v', `Derivamos $u$; integramos $dv$ con la regla de la potencia ($${n}+1=${n + 1}$).`, ['du=\\frac{1}{x}dx', `v=\\frac{x^{${n + 1}}}{${n + 1}}`], { du: '\\frac{1}{x}dx', v: `\\frac{x^{${n + 1}}}{${n + 1}}` }),
      S('Aplicar la fórmula', '$uv-\\int v\\,du$.', [`\\int x^{${n}}\\ln x\\,dx=\\frac{x^{${n + 1}}}{${n + 1}}\\ln x-\\int\\frac{x^{${n + 1}}}{${n + 1}}\\cdot\\frac{1}{x}\\,dx`]),
      S('Simplificar la nueva integral', 'Al multiplicar por $\\frac1x$ se baja el exponente en 1.', [`\\frac{x^{${n + 1}}}{${n + 1}}\\cdot\\frac{1}{x}=\\frac{x^{${n}}}{${n + 1}}`, `\\int\\frac{x^{${n}}}{${n + 1}}dx=\\frac{1}{${n + 1}}\\cdot\\frac{x^{${n + 1}}}{${n + 1}}=\\frac{x^{${n + 1}}}{${(n + 1) * (n + 1)}}`]),
      S('Resultado', 'Restamos.', [`\\frac{x^{${n + 1}}}{${n + 1}}\\ln x-\\frac{x^{${n + 1}}}{${(n + 1) * (n + 1)}}+C`]),
    ],
    answer: `${term(c, `x^{${n + 1}}\\ln x`, true)}${term(c2, `x^{${n + 1}}`)}+C`,
    verification: [`\\frac{d}{dx}\\left[\\frac{x^{${n + 1}}}{${n + 1}}\\ln x-\\frac{x^{${n + 1}}}{${(n + 1) * (n + 1)}}\\right]=x^{${n}}\\ln x+\\frac{x^{${n}}}{${n + 1}}-\\frac{x^{${n}}}{${n + 1}}=x^{${n}}\\ln x`],
    hints: ['LIATE: ¿L o A primero?', '$u=\\ln x$, $dv=x^{n}dx$.', 'Al multiplicar $v\\cdot\\frac{1}{x}$ baja el exponente.'],
    py: { kind: 'parts', us: ['log(x)'] },
    fExpr: `x^${n}*log(x)`,
    FExpr: `x^${n + 1}*log(x)/${n + 1} - x^${n + 1}/${(n + 1) * (n + 1)}`,
    testPts: POS_PTS,
    bounds: [1, 2],
  }
}

function f4XExp(a: number): Draft {
  const ax = a === 1 ? 'x' : a === -1 ? '-x' : `${a}x`
  const v = fr(1, a)
  const c2 = fr(-1, a * a)
  return {
    title: `Por partes: $x\\,e^{${ax}}$`,
    statement: `\\int x\\,e^{${ax}}\\,dx`,
    method: 'Integración por partes',
    methodWhy: 'Producto de algebraica ($x$) y exponencial. LIATE: **A** antes que **E**, así que $u=x$ (porque al derivarlo se simplifica).',
    steps: [
      S('Elegir u y dv', '$u=x$ (se vuelve 1 al derivar); lo demás es $dv$.', ['u=x', `dv=e^{${ax}}dx`], { u: 'x', dv: `e^{${ax}}dx` }),
      S('Calcular du y v', `Para integrar $e^{${ax}}$ dividimos entre la derivada del exponente (${a}).`, ['du=dx', `v=${fl(v)}e^{${ax}}`], { du: 'dx', v: `${fl(v)}e^{${ax}}` }),
      S('Aplicar la fórmula', '$uv-\\int v\\,du$.', [`\\int x e^{${ax}}dx=x\\cdot${fl(v)}e^{${ax}}-\\int ${fl(v)}e^{${ax}}dx`]),
      S('Integrar lo que queda', 'Otra vez dividimos entre la derivada del exponente.', [`\\int ${fl(v)}e^{${ax}}dx=${fl(mul(v, v))}e^{${ax}}`]),
      S('Resultado', 'Restamos.', [`${term(v, `xe^{${ax}}`, true)}${term(c2, `e^{${ax}}`)}+C`]),
    ],
    answer: `${term(v, `xe^{${ax}}`, true)}${term(c2, `e^{${ax}}`)}+C`,
    verification: [`\\frac{d}{dx}\\left[${term(v, `xe^{${ax}}`, true)}${term(c2, `e^{${ax}}`)}\\right]=${term(v, `e^{${ax}}`, true)}+xe^{${ax}}${term(fr(-1, a), `e^{${ax}}`)}=xe^{${ax}}`],
    hints: ['LIATE: ¿A o E primero?', '$u=x$ porque al derivar queda 1.', '∫ e^{ax} dx = e^{ax}/a.'],
    py: { kind: 'parts', us: ['x'] },
    fExpr: `x*exp(${a}*x)`,
    FExpr: `x*exp(${a}*x)/${a} - exp(${a}*x)/${a * a}`,
    testPts: ABS_PTS,
    bounds: [0, 1],
  }
}

function f4SinPi(): Draft {
  return {
    title: 'Por partes con seno y π',
    statement: '\\int x\\sin(\\pi x)\\,dx',
    method: 'Integración por partes',
    methodWhy: 'Producto de algebraica ($x$) y trigonométrica. LIATE: **A** antes que **T**, así $u=x$.',
    steps: [
      S('Elegir u y dv', '$u=x$; $dv=\\sin(\\pi x)dx$.', ['u=x', 'dv=\\sin(\\pi x)dx'], { u: 'x', dv: '\\sin(\\pi x)dx' }),
      S('Calcular du y v', 'Integrar $\\sin(\\pi x)$: el coseno con signo menos, **dividido entre $\\pi$** (la derivada del interior).', ['du=dx', 'v=-\\frac{\\cos(\\pi x)}{\\pi}']),
      S('Aplicar la fórmula', '$uv-\\int v\\,du$. El menos de $v$ y el menos de la fórmula se combinan.', ['\\int x\\sin(\\pi x)dx=-\\frac{x\\cos(\\pi x)}{\\pi}-\\int\\left(-\\frac{\\cos(\\pi x)}{\\pi}\\right)dx', '=-\\frac{x\\cos(\\pi x)}{\\pi}+\\frac{1}{\\pi}\\int\\cos(\\pi x)dx'], undefined, { warn: 'Menos por menos da más: aquí cambia el signo.' }),
      S('Integrar el coseno', '$\\int\\cos(\\pi x)dx=\\frac{\\sin(\\pi x)}{\\pi}$.', ['\\frac{1}{\\pi}\\cdot\\frac{\\sin(\\pi x)}{\\pi}=\\frac{\\sin(\\pi x)}{\\pi^{2}}']),
      S('Resultado', 'Sumamos.', ['-\\frac{x\\cos(\\pi x)}{\\pi}+\\frac{\\sin(\\pi x)}{\\pi^{2}}+C']),
    ],
    answer: '-\\frac{x\\cos(\\pi x)}{\\pi}+\\frac{\\sin(\\pi x)}{\\pi^{2}}+C',
    verification: ['\\frac{d}{dx}\\left[-\\frac{x\\cos(\\pi x)}{\\pi}+\\frac{\\sin(\\pi x)}{\\pi^{2}}\\right]=-\\frac{\\cos(\\pi x)}{\\pi}+x\\sin(\\pi x)+\\frac{\\cos(\\pi x)}{\\pi}=x\\sin(\\pi x)'],
    hints: ['LIATE: A antes que T.', '∫ sen(πx) dx = −cos(πx)/π.', 'Cuidado con los dos signos menos.'],
    py: { kind: 'parts', us: ['x'] },
    fExpr: 'x*sin(pi*x)',
    FExpr: '-x*cos(pi*x)/pi + sin(pi*x)/pi^2',
    testPts: ABS_PTS,
    bounds: [0, 1],
    usesTrig: true,
  }
}

function f4X2Exp(a: number): Draft {
  const A = a === 1 ? '' : `${a}`
  const c1 = fr(1, a)
  const c2 = fr(-2, a * a)
  const c3 = fr(2, a * a * a)
  return {
    title: `Por partes dos veces: $x^{2}e^{${A}x}$`,
    statement: `\\int x^{2}e^{${A}x}\\,dx`,
    method: 'Integración por partes (dos veces)',
    methodWhy: 'La potencia $x^{2}$ no desaparece con una sola derivada: hay que repetir. Cada vez que derivamos $x^{n}$ baja una potencia.',
    steps: [
      S('Primera vez: elegir', '$u=x^{2}$, $dv=e^{' + A + 'x}dx$.', ['u=x^{2}', `dv=e^{${A}x}dx`], { u: 'x^{2}', dv: `e^{${A}x}dx` }),
      S('Primera vez: du y v', 'Derivamos $u$; integramos $dv$.', ['du=2x\\,dx', `v=${fl(c1)}e^{${A}x}`]),
      S('Primera vez: fórmula', '$uv-\\int v\\,du$.', [`\\int x^{2}e^{${A}x}dx=${term(c1, `x^{2}e^{${A}x}`, true)}-\\int ${fl(mul(c1, fr(2)))}\\,x\\,e^{${A}x}dx`]),
      S('Segunda vez: nueva integral', 'Ahora $\\int x\\,e^{' + A + 'x}dx$ se hace otra vez por partes con $u=x$.', ['u=x,\\quad dv=e^{' + A + 'x}dx', `du=dx,\\quad v=${fl(c1)}e^{${A}x}`, `\\int xe^{${A}x}dx=${term(c1, `xe^{${A}x}`, true)}${term(fr(-1, a * a), `e^{${A}x}`)}`]),
      S('Juntar y simplificar', `Multiplicamos por ${fl(mul(c1, fr(-2)))} el resultado anterior y ordenamos.`, [`${term(c1, `x^{2}e^{${A}x}`, true)}${term(c2, `xe^{${A}x}`)}${term(c3, `e^{${A}x}`)}+C`]),
    ],
    answer: `${term(c1, `x^{2}e^{${A}x}`, true)}${term(c2, `xe^{${A}x}`)}${term(c3, `e^{${A}x}`)}+C`,
    verification: ['Se deriva con la regla del producto; todos los términos con $e^{' + A + 'x}$ se cancelan salvo $x^{2}e^{' + A + 'x}$ (compruébalo con la Casio abajo).'],
    hints: ['$u=x^{2}$ (baja a $2x$).', 'Te quedará una integral con $x\\,e^{ax}$: otra vez por partes.', 'Los signos alternan: + − +.'],
    py: { kind: 'parts', us: ['x**2', 'x'] },
    fExpr: `x^2*exp(${a}*x)`,
    FExpr: `exp(${a}*x)*(x^2/${a} - 2*x/${a * a} + 2/${a * a * a})`,
    testPts: ABS_PTS,
    bounds: [0, 1],
  }
}

// ------------------------------------------------------------------ FAMILIA 5: sustitución trigonométrica
function f5Sqrt(a2: number): Draft {
  const a = Math.sqrt(a2)
  const aTex = Number.isInteger(a) ? `${a}` : `\\sqrt{${a2}}`
  const k = fr(a2, 2) // a²/2
  const K = fl(k) === '1' ? '' : fl(k)
  return {
    title: `Sustitución trigonométrica ($a=${aTex}$)`,
    statement: `\\int \\sqrt{${a2}-x^{2}}\\,dx`,
    method: 'Sustitución trigonométrica',
    methodWhy: `La raíz tiene la forma $\\sqrt{a^{2}-x^{2}}$ con $a^{2}=${a2}$, es decir $a=${aTex}$. Ninguna sustitución $u$ algebraica sirve (no hay $x\\,dx$ afuera). Con $x=a\\sin\\theta$ la raíz **desaparece**.`,
    steps: [
      S('Proponer la sustitución', 'Tabla: $\\sqrt{a^{2}-x^{2}}\\Rightarrow x=a\\sin\\theta$.', [`x=${aTex}\\sin\\theta`, `dx=${aTex}\\cos\\theta\\,d\\theta`], { x: `${aTex}\\sin\\theta`, dx: `${aTex}\\cos\\theta\\,d\\theta` }),
      S('Simplificar la raíz', 'Factorizamos y usamos $1-\\sin^{2}\\theta=\\cos^{2}\\theta$.', [`${a2}-x^{2}=${a2}-${a2}\\sin^{2}\\theta=${a2}\\left(1-\\sin^{2}\\theta\\right)=${a2}\\cos^{2}\\theta`, `\\sqrt{${a2}-x^{2}}=${aTex}\\cos\\theta`],
        undefined, { tip: 'Se quita el valor absoluto porque θ está entre −π/2 y π/2, donde cos θ ≥ 0.' }),
      S('Sustituir en la integral', 'Multiplicamos la raíz por el $dx$.', [`\\int\\left(${aTex}\\cos\\theta\\right)\\left(${aTex}\\cos\\theta\\,d\\theta\\right)=${a2}\\int\\cos^{2}\\theta\\,d\\theta`]),
      S('Bajar la potencia', 'No se integra $\\cos^{2}$ directo. Identidad: $\\cos^{2}\\theta=\\frac{1+\\cos 2\\theta}{2}$.', [`${a2}\\int\\frac{1+\\cos 2\\theta}{2}d\\theta=${K}\\int\\left(1+\\cos 2\\theta\\right)d\\theta`]),
      S('Integrar', '$\\int\\cos 2\\theta\\,d\\theta=\\frac{\\sin 2\\theta}{2}$ (se divide entre el 2 de adentro).', [`${K}\\left(\\theta+\\frac{\\sin 2\\theta}{2}\\right)+C`, `\\sin 2\\theta=2\\sin\\theta\\cos\\theta\\Rightarrow ${K}\\left(\\theta+\\sin\\theta\\cos\\theta\\right)+C`]),
      S('Volver a x con el triángulo', `De $x=${aTex}\\sin\\theta$: $\\sin\\theta=\\frac{x}{${aTex}}$ (opuesto/hipotenusa). Por Pitágoras el lado adyacente es $\\sqrt{${a2}-x^{2}}$.`,
        [`\\theta=\\arcsin\\frac{x}{${aTex}}`, `\\sin\\theta\\cos\\theta=\\frac{x}{${aTex}}\\cdot\\frac{\\sqrt{${a2}-x^{2}}}{${aTex}}=\\frac{x\\sqrt{${a2}-x^{2}}}{${a2}}`],
        undefined, { tip: 'Dibuja siempre el triángulo: hipotenusa = a, opuesto = x.' }),
      S('Resultado', 'Multiplicamos.', [`${K}\\arcsin\\frac{x}{${aTex}}+\\frac{x}{2}\\sqrt{${a2}-x^{2}}+C`]),
    ],
    answer: `${K}\\arcsin\\frac{x}{${aTex}}+\\frac{x}{2}\\sqrt{${a2}-x^{2}}+C`,
    verification: [`\\frac{d}{dx}\\left[\\frac{x}{2}\\sqrt{${a2}-x^{2}}\\right]=\\frac{1}{2}\\sqrt{${a2}-x^{2}}-\\frac{x^{2}}{2\\sqrt{${a2}-x^{2}}}`, `\\frac{d}{dx}\\left[${K}\\arcsin\\frac{x}{${aTex}}\\right]=\\frac{${K}}{\\sqrt{${a2}-x^{2}}}`, `\\text{Suma}=\\frac{(${a2}-x^{2})-x^{2}+${a2}}{2\\sqrt{${a2}-x^{2}}}=\\frac{${2 * a2}-2x^{2}}{2\\sqrt{${a2}-x^{2}}}=\\sqrt{${a2}-x^{2}}`],
    hints: ['¿Qué forma tiene la raíz? $a^{2}-x^{2}$ → seno.', '$x=a\\sin\\theta$, $dx=a\\cos\\theta\\,d\\theta$.', 'Al final dibuja el triángulo.'],
    py: { kind: 'trig', x: `sqrt(${a2})*sin(theta)`, integrand: `${a2}*cos(theta)**2`, back: `asin(x/sqrt(${a2}))` },
    fExpr: `sqrt(${a2}-x^2)`,
    FExpr: `${a2}/2*asin(x/sqrt(${a2})) + x*sqrt(${a2}-x^2)/2`,
    testPts: [-0.8, -0.3, 0.2, 0.7, 1.0].map((t) => t * Math.min(1, a * 0.85)),
    bounds: [0, Math.min(a * 0.9, a)],
  }
}

function f5B(a2: number, b: number): Draft {
  const a = Math.sqrt(a2)
  const aT = Number.isInteger(a) ? `${a}` : `\\sqrt{${a2}}`
  const bx = `${b}x`
  const fac = fr(a2, 2 * b)
  const FAC = fl(fac) === '1' ? '' : fl(fac)
  return {
    title: `Sustitución trigonométrica con coeficiente ($\\sqrt{${a2}-${b * b}x^{2}}$)`,
    statement: `\\int \\sqrt{${a2}-${b * b}x^{2}}\\,dx`,
    method: 'Sustitución trigonométrica',
    methodWhy: `Reescribimos $${b * b}x^{2}=(${bx})^{2}$: la raíz es $\\sqrt{a^{2}-w^{2}}$ con $w=${bx}$ y $a=${aT}$. Primero un cambio simple $w=${bx}$ y luego el seno.`,
    steps: [
      S('Cambio previo', `Como $${b * b}x^{2}=(${bx})^{2}$, hacemos $w=${bx}$ para tener la forma $\\sqrt{${a2}-w^{2}}$.`, [`w=${bx}`, `dw=${b}\\,dx`, `dx=\\frac{dw}{${b}}`, `\\int\\sqrt{${a2}-${b * b}x^{2}}dx=\\frac{1}{${b}}\\int\\sqrt{${a2}-w^{2}}\\,dw`], { w: bx }),
      S('Sustitución trigonométrica', 'Ahora sí: $w=a\\sin\\theta$.', [`w=${aT}\\sin\\theta`, `dw=${aT}\\cos\\theta\\,d\\theta`, `\\sqrt{${a2}-w^{2}}=${aT}\\cos\\theta`]),
      S('Sustituir e integrar', `Igual que en la integral clásica: $\\int\\sqrt{a^{2}-w^{2}}\\,dw=\\frac{a^{2}}{2}\\left(\\theta+\\sin\\theta\\cos\\theta\\right)$.`, [`\\frac{1}{${b}}\\int ${a2}\\cos^{2}\\theta\\,d\\theta=\\frac{1}{${b}}\\cdot\\frac{${a2}}{2}\\left(\\theta+\\sin\\theta\\cos\\theta\\right)+C`]),
      S('Volver a w y luego a x', `$\\theta=\\arcsin\\frac{w}{${aT}}$ y $\\sin\\theta\\cos\\theta=\\frac{w\\sqrt{${a2}-w^{2}}}{${a2}}$; luego $w=${bx}$.`, [`\\frac{${a2}}{${2 * b}}\\arcsin\\frac{${bx}}{${aT}}+\\frac{1}{${2 * b}}\\cdot ${bx}\\sqrt{${a2}-${b * b}x^{2}}+C`]),
      S('Simplificar', `$\\frac{1}{${2 * b}}\\cdot ${b}x=\\frac{x}{2}$.`, [`${FAC}\\arcsin\\frac{${bx}}{${aT}}+\\frac{x}{2}\\sqrt{${a2}-${b * b}x^{2}}+C`]),
    ],
    answer: `${FAC}\\arcsin\\frac{${bx}}{${aT}}+\\frac{x}{2}\\sqrt{${a2}-${b * b}x^{2}}+C`,
    verification: ['Derivamos cada término; los resultados suman $\\sqrt{' + a2 + '-' + b * b + 'x^{2}}$ (compruébalo con la Casio, abajo).'],
    hints: ['Escribe $9x^{2}$ como $(3x)^{2}$.', 'Primero $w=bx$, luego $w=a\\sin\\theta$.', 'Al final no olvides el factor $\\frac{1}{b}$.'],
    py: { kind: 'trig', x: `sqrt(${a2})/${b}*sin(theta)`, integrand: `${a2}/${b}*cos(theta)**2`, back: `asin(${b}*x/sqrt(${a2}))` },
    fExpr: `sqrt(${a2}-${b * b}*x^2)`,
    FExpr: `(${a2}/(${2 * b}))*asin(${b}*x/sqrt(${a2})) + x*sqrt(${a2}-${b * b}*x^2)/2`,
    testPts: [-0.8, -0.3, 0.2, 0.6, 0.85].map((t) => (t * a) / b * 0.95),
    bounds: [0, (0.9 * a) / b],
  }
}

function f5X2(a2: number): Draft {
  const a = Math.sqrt(a2)
  const aT = Number.isInteger(a) ? `${a}` : `\\sqrt{${a2}}`
  const k = fr(a2, 2)
  const K = fl(k) === '1' ? '' : fl(k)
  return {
    title: 'Sustitución trigonométrica con $x^{2}$ arriba',
    statement: `\\int \\frac{x^{2}}{\\sqrt{${a2}-x^{2}}}\\,dx`,
    method: 'Sustitución trigonométrica',
    methodWhy: `Abajo hay $\\sqrt{${a2}-x^{2}}$ (forma $a^{2}-x^{2}$): usamos $x=a\\sin\\theta$. Ojo: aquí la raíz está en el denominador y se cancela con el $dx$.`,
    steps: [
      S('Proponer la sustitución', '$x=a\\sin\\theta$.', [`x=${aT}\\sin\\theta`, `dx=${aT}\\cos\\theta\\,d\\theta`, `\\sqrt{${a2}-x^{2}}=${aT}\\cos\\theta`], { x: `${aT}\\sin\\theta` }),
      S('Sustituir', 'El $\\cos\\theta$ del denominador se cancela con el del $dx$.', [`\\int\\frac{${a2}\\sin^{2}\\theta\\cdot ${aT}\\cos\\theta\\,d\\theta}{${aT}\\cos\\theta}=${a2}\\int\\sin^{2}\\theta\\,d\\theta`]),
      S('Bajar la potencia', 'Identidad: $\\sin^{2}\\theta=\\frac{1-\\cos 2\\theta}{2}$.', [`${K}\\int\\left(1-\\cos 2\\theta\\right)d\\theta=${K}\\left(\\theta-\\frac{\\sin 2\\theta}{2}\\right)+C`]),
      S('Ángulo doble', '$\\sin 2\\theta=2\\sin\\theta\\cos\\theta$.', [`${K}\\left(\\theta-\\sin\\theta\\cos\\theta\\right)+C`]),
      S('Volver a x con el triángulo', `$\\sin\\theta=\\frac{x}{${aT}}$, $\\cos\\theta=\\frac{\\sqrt{${a2}-x^{2}}}{${aT}}$.`, [`${K}\\arcsin\\frac{x}{${aT}}-${K}\\cdot\\frac{x\\sqrt{${a2}-x^{2}}}{${a2}}+C`]),
      S('Resultado', `$${K}\\cdot\\frac{1}{${a2}}=\\frac{1}{2}$.`, [`${K}\\arcsin\\frac{x}{${aT}}-\\frac{x}{2}\\sqrt{${a2}-x^{2}}+C`]),
    ],
    answer: `${K}\\arcsin\\frac{x}{${aT}}-\\frac{x}{2}\\sqrt{${a2}-x^{2}}+C`,
    verification: [`\\frac{d}{dx}\\left[${K}\\arcsin\\frac{x}{${aT}}-\\frac{x}{2}\\sqrt{${a2}-x^{2}}\\right]=\\frac{${K}}{\\sqrt{${a2}-x^{2}}}-\\frac{1}{2}\\sqrt{${a2}-x^{2}}+\\frac{x^{2}}{2\\sqrt{${a2}-x^{2}}}=\\frac{x^{2}}{\\sqrt{${a2}-x^{2}}}`],
    hints: ['Forma $a^{2}-x^{2}$ → $x=a\\sin\\theta$.', 'El coseno del denominador se cancela.', '$\\sin^{2}\\theta=\\frac{1-\\cos2\\theta}{2}$.'],
    py: { kind: 'trig', x: `sqrt(${a2})*sin(theta)`, integrand: `${a2}*sin(theta)**2`, back: `asin(x/sqrt(${a2}))` },
    fExpr: `x^2/sqrt(${a2}-x^2)`,
    FExpr: `${a2}/2*asin(x/sqrt(${a2})) - x*sqrt(${a2}-x^2)/2`,
    testPts: [-0.8, -0.3, 0.2, 0.7, 0.9].map((t) => t * a * 0.9),
    bounds: [0, 0.9 * a],
  }
}

// ------------------------------------------------------------------ FAMILIA 6: fracciones parciales
interface PF {
  ℓ: number
  roots: number[]
  num: number[] // coeficientes de mayor a menor grado
  extra?: Frac // parte polinómica (impropia): coeficiente de x ... se calcula
}

const polyTex = (cs: number[]): string => {
  const deg = cs.length - 1
  let out = ''
  cs.forEach((c, i) => {
    if (c === 0) return
    const p = deg - i
    const a = Math.abs(c)
    const body = p === 0 ? `${a}` : `${a === 1 ? '' : a}x${p > 1 ? `^{${p}}` : ''}`
    out += out === '' ? (c < 0 ? '-' : '') + body : (c < 0 ? ' - ' : ' + ') + body
  })
  return out || '0'
}
const polyMul = (a: number[], b: number[]): number[] => {
  const r = new Array(a.length + b.length - 1).fill(0)
  a.forEach((x, i) => b.forEach((y, j) => (r[i + j] += x * y)))
  return r
}
const evalPoly = (cs: number[], x: number) => cs.reduce((s, c) => s * x + c, 0)
const rootFactor = (r: number): string => (r === 0 ? 'x' : r > 0 ? `\\left(x-${r}\\right)` : `\\left(x+${-r}\\right)`)
const rootLn = (r: number): string => (r === 0 ? '|x|' : r > 0 ? `\\left|x-${r}\\right|` : `\\left|x+${-r}\\right|`)

function pfProblem(cfg: PF, title: string, taller = false): Draft {
  const { ℓ, roots, num } = cfg
  let den = [ℓ]
  roots.forEach((r) => (den = polyMul(den, [1, -r])))
  const improper = num.length >= den.length
  let q = 0
  let rem = num.slice()
  if (improper) {
    q = num[0] / den[0]
    rem = num.map((c, i) => c - den[i] * q).slice(1)
  }
  const coefs: Frac[] = roots.map((r, i) => {
    let d = ℓ
    roots.forEach((s, j) => {
      if (j !== i) d *= r - s
    })
    return fr(evalPoly(rem, r), d)
  })
  const symmetric = ℓ === -1 && roots.length === 2 && roots[0] === -roots[1]
  const NUM = polyTex(num)
  const DEN = taller ? '1-x^{2}' : symmetric ? `${roots[0] * roots[0]}-x^{2}` : polyTex(den)
  const factors = roots.map(rootFactor).join('')
  const factored = ℓ === 1 ? factors : `-${factors}`
  const letters = ['A', 'B', 'C']
  const lin = (r: number) => (r === 0 ? 'x' : r > 0 ? `x-${r}` : `x+${-r}`)
  const decomp = roots.map((r, i) => `\\frac{${letters[i]}}{${lin(r)}}`).join('+')
  const remTex = polyTex(rem)
  const identity = roots.map((_r, i) => `${letters[i]}${roots.filter((_, j) => j !== i).map(rootFactor).join('')}`).join('+')
  const lhsId = ℓ === 1 ? remTex : `-\\left(${remTex}\\right)`
  const solveLines = roots.map((r, i) => {
    const others = roots.filter((_, j) => j !== i)
    const prod = others.map((s) => `(${r - s})`).join('')
    const lhs = ℓ === 1 ? evalPoly(rem, r) : -evalPoly(rem, r)
    return `x=${r}:\\quad ${lhs}=${letters[i]}\\cdot${prod}\\ \\Rightarrow\\ ${letters[i]}=${fl(coefs[i])}`
  })
  const lnPart = (c: Frac, r: number, first: boolean) => term(c, `\\ln${rootLn(r)}`, first)
  const ans = `${improper ? `${q === 1 ? '' : q}x` : ''}${coefs.map((c, i) => lnPart(c, roots[i], !improper && i === 0)).join('')}+C`
  const sign = (r: number) => (r === 0 ? '' : r > 0 ? `-${r}` : `+${-r}`)
  const exprF = `${improper ? `${q}*x+` : ''}${coefs.map((c, i) => `(${val(c)})*log(abs(x${sign(roots[i])}))`).join('+')}`
  const exprf = `(${num.map((c, i) => `${c}*x^${num.length - 1 - i}`).join('+')})/(${den.map((c, i) => `${c}*x^${den.length - 1 - i}`).join('+')})`

  if (taller) {
    return {
      title,
      statement: '\\int \\frac{x-4}{1-x^{2}}\\,dx',
      method: 'Fracciones parciales',
      methodWhy: 'Es un cociente de polinomios cuyo denominador se factoriza. La sustitución $u=1-x^{2}$ no sirve: $du=-2x\\,dx$ y el numerador es $x-4$ (no es múltiplo de $x$).',
      steps: [
        S('Revisar que sea fracción propia', 'Grado del numerador $=1$ < grado del denominador $=2$. Es **propia**: no hace falta dividir.', ['\\deg(x-4)=1<\\deg(1-x^{2})=2']),
        S('Factorizar el denominador', 'Diferencia de cuadrados: $a^{2}-b^{2}=(a-b)(a+b)$, con $a=1$ y $b=x$.', ['1-x^{2}=(1-x)(1+x)'], undefined, { tip: 'Compruébalo multiplicando: (1−x)(1+x)=1+x−x−x²=1−x².' }),
        S('Plantear la descomposición', 'Cada factor lineal distinto aporta una fracción con un número desconocido arriba.', ['\\frac{x-4}{(1-x)(1+x)}=\\frac{A}{1-x}+\\frac{B}{1+x}']),
        S('Quitar denominadores', 'Multiplicamos por $(1-x)(1+x)$; en cada fracción se cancela su propio denominador.', ['x-4=A(1+x)+B(1-x)'], undefined, { tip: 'Es una identidad válida para todo x: podemos elegir valores convenientes.' }),
        S('Hallar A y B (valores convenientes)', 'Con $x=1$ desaparece $B$; con $x=-1$ desaparece $A$.', ['x=1:\\ 1-4=A(2)+B(0)\\Rightarrow -3=2A\\Rightarrow A=-\\frac{3}{2}', 'x=-1:\\ -1-4=A(0)+B(2)\\Rightarrow -5=2B\\Rightarrow B=-\\frac{5}{2}'], { A: '-\\frac{3}{2}', B: '-\\frac{5}{2}' }),
        S('Comprobar con un sistema', 'Expandimos y comparamos coeficientes: $x-4=(A-B)x+(A+B)$.', ['A-B=1', 'A+B=-4', '2A=-3\\Rightarrow A=-\\frac{3}{2},\\quad B=-\\frac{5}{2}']),
        S('Reescribir e integrar', 'Para $\\int\\frac{dx}{1-x}$ con $w=1-x$, $dw=-dx$ sale **−ln|1−x|**. Ese signo es la trampa del ejercicio.', ['\\int\\frac{dx}{1-x}=-\\ln|1-x|,\\qquad\\int\\frac{dx}{1+x}=\\ln|1+x|', '-\\frac{3}{2}\\left(-\\ln|1-x|\\right)-\\frac{5}{2}\\ln|1+x|+C'], undefined, { warn: 'La derivada de (1−x) es −1: por eso aparece el signo menos al integrar.' }),
      ],
      answer: '\\frac{3}{2}\\ln|1-x|-\\frac{5}{2}\\ln|1+x|+C',
      verification: ['\\frac{d}{dx}\\left[\\frac{3}{2}\\ln|1-x|-\\frac{5}{2}\\ln|1+x|\\right]=\\frac{3}{2}\\cdot\\frac{-1}{1-x}-\\frac{5}{2}\\cdot\\frac{1}{1+x}=\\frac{-3(1+x)-5(1-x)}{2(1-x)(1+x)}=\\frac{2x-8}{2(1-x^{2})}=\\frac{x-4}{1-x^{2}}'],
      hints: ['¿Se factoriza el denominador? $1-x^{2}=(1-x)(1+x)$.', 'Plantea $\\frac{A}{1-x}+\\frac{B}{1+x}$.', 'Usa $x=1$ y $x=-1$ para hallar A y B.'],
      py: { kind: 'pf', roots: [1, -1], coefs: [-1.5, -2.5], q: 0, dens: ['1-x', '1+x'] },
      fExpr: '(x-4)/(1-x^2)',
      FExpr: '1.5*log(abs(1-x)) - 2.5*log(abs(1+x))',
      testPts: [-3, -1.6, -0.5, 0.3, 0.6, 1.8, 3],
      bounds: [0, 0.5],
    }
  }

  const steps: Step[] = []
  if (improper) {
    steps.push(S('Fracción impropia: dividir primero', 'El grado del numerador es **igual** al del denominador: todavía no se puede descomponer. Dividimos para sacar la parte entera.',
      [`\\frac{${NUM}}{${DEN}}=${q}+\\frac{${remTex}}{${DEN}}`], { cociente: `${q}` }, { tip: 'Si grado(numerador) ≥ grado(denominador): ¡primero división!' }))
  } else {
    steps.push(S('Revisar que sea fracción propia', `Grado del numerador $=${num.length - 1}$ < grado del denominador $=${den.length - 1}$. Es **propia**: no hace falta dividir.`, [`\\deg(\\text{num})=${num.length - 1}<\\deg(\\text{den})=${den.length - 1}`]))
  }
  steps.push(
    S('Factorizar el denominador', symmetric ? 'Diferencia de cuadrados: $a^{2}-b^{2}=(a-b)(a+b)$.' : 'Buscamos los valores de $x$ que anulan el denominador y lo escribimos como producto de factores lineales.',
      [`${DEN}=${factored}`], undefined, { tip: 'Compruébalo multiplicando los factores.' }),
    S('Plantear la descomposición', 'Cada factor lineal distinto aporta una fracción con un número desconocido arriba.', [`\\frac{${remTex}}{${DEN}}=${decomp}`]),
    S('Quitar denominadores', ℓ === 1 ? 'Multiplicamos ambos lados por el denominador; cada fracción conserva solo los otros factores.' : 'Multiplicamos ambos lados por $(x-r)(x-s)$ (el denominador sin el signo menos, que pasa dividiendo al lado izquierdo).', [`${lhsId}=${identity}`]),
    S('Hallar los números (valores convenientes de x)', 'Cada raíz anula todos los términos menos uno; así despejamos de a una letra.', solveLines, Object.fromEntries(coefs.map((c, i) => [letters[i], fl(c)]))),
    S('Reescribir la integral', 'Cada fracción simple sale con su número como constante.',
      [`\\int\\left[${improper ? `${q}` : ''}${coefs.map((c, i) => term(c, `\\frac{1}{${lin(roots[i])}}`, !improper && i === 0)).join('')}\\right]dx`]),
    S('Integrar con logaritmos', '$\\int\\frac{dx}{x-r}=\\ln|x-r|$. Siempre con valor absoluto.', [ans], undefined, { warn: 'Sin valor absoluto dentro del ln la respuesta es incompleta.' }),
  )
  return {
    title,
    statement: `\\int \\frac{${NUM}}{${DEN}}\\,dx`,
    method: 'Fracciones parciales',
    methodWhy: `Cociente de polinomios con denominador factorizable.${improper ? ' Como es impropia, primero se divide.' : ''}`,
    steps,
    answer: ans,
    verification: ['Se deriva cada logaritmo: $\\frac{d}{dx}\\ln|x-r|=\\frac{1}{x-r}$. Al sumar con denominador común se recupera el integrando (compruébalo con la Casio, abajo).'],
    hints: ['¿Es propia? Si no, divide.', 'Factoriza el denominador.', 'Cada raíz anula todos los términos menos uno.'],
    py: { kind: 'pf', roots, coefs: coefs.map(val), q: improper ? q : 0 },
    fExpr: exprf,
    FExpr: exprF,
    testPts: pfTestPts(roots),
    bounds: pfBounds(roots),
  }
}

function pfTestPts(roots: number[]): number[] {
  const lo = Math.min(...roots) - 2.5
  const hi = Math.max(...roots) + 2.5
  const pts: number[] = []
  for (let x = lo; x <= hi; x += 0.37) if (roots.every((r) => Math.abs(x - r) > 0.15)) pts.push(Number(x.toFixed(3)))
  return pts
}
function pfBounds(roots: number[]): [number, number] {
  const hi = Math.max(...roots)
  return [hi + 0.5, hi + 3]
}

// ------------------------------------------------------------------ catálogo de familias
type Gen = (r: Rng) => Draft

export const INTEGRAL_FAMILIES: Record<number, Record<Level, Gen>> = {
  1: {
    T: () => f1Poly(1, 5),
    G1: (r) => f1Poly(r.pick([2, 3, 4]), r.pick([3, 4, 5])),
    G2: (r) => f1Poly(r.pick([-1, -2, -3]), r.pick([3, 4])),
    H1: (r) => f1SinPi(r.pick([1, 2, 3])),
    H2: () => f1SinCos(),
  },
  2: {
    T: () => f2Root(3, 1, true),
    G1: (r) => f2Root(r.pick([2, 4, 5]), r.pick([1, 2, 3, 5]), true),
    G2: (r) => f2Root(r.pick([2, 3, 4]), r.pick([1, 2, 3, 4]), false),
    H1: (r) => f2TrigPi(r.pick([2, 3])),
    H2: (r) => f2Cube(r.pick([1, 2, 3])),
  },
  3: {
    T: () => f3Pow(2, -1),
    G1: (r) => f3Pow(r.pick([3, 4]), -1),
    G2: (r) => f3Pow(2, r.pick([2, 3, -3, -2])),
    H1: (r) => f3Frac(r.pick([1, 2, 3])),
    H2: () => f3TrigPi(),
  },
  4: {
    T: () => f4Ln(),
    G1: (r) => f4XnLn(r.pick([1, 2, 3])),
    G2: (r) => f4XExp(r.pick([2, 3, -1, -2])),
    H1: () => f4SinPi(),
    H2: (r) => f4X2Exp(r.pick([1, 2])),
  },
  5: {
    T: () => f5Sqrt(2),
    G1: (r) => f5Sqrt(r.pick([3, 5, 6, 7])),
    G2: (r) => f5Sqrt(r.pick([4, 9, 16])),
    H1: (r) => (r.next() < 0.5 ? f5B(4, 3) : f5B(r.pick([4, 9]), 2)),
    H2: (r) => f5X2(r.pick([2, 3, 4, 9])),
  },
  6: {
    T: () => pfProblem({ ℓ: -1, roots: [1, -1], num: [1, -4] }, 'Fracciones parciales (taller)', true),
    G1: (r) => {
      for (;;) {
        const a = r.int(-4, 4)
        const b = r.int(-4, 4)
        const p = r.pick([1, 2, 3])
        const q = r.int(-6, 6)
        if (a === b || a === 0 || b === 0) continue
        const A = p * a + q
        const B = p * b + q
        if (A === 0 || B === 0) continue
        return pfProblem({ ℓ: 1, roots: [a, b], num: [p, q] }, 'Fracciones parciales: dos factores lineales')
      }
    },
    G2: (r) => {
      for (;;) {
        const m = r.pick([2, 3, 4])
        const p = r.pick([1, 2, 3])
        const q = r.int(-6, 6)
        if (p * m + q === 0 || -p * m + q === 0) continue
        return pfProblem({ ℓ: -1, roots: [m, -m], num: [p, q] }, 'Fracciones parciales: $c-x^{2}$')
      }
    },
    H1: (r) => {
      for (;;) {
        const a = r.int(-3, 3)
        const b = r.int(-3, 3)
        const p = r.int(-3, 3)
        const q = r.int(-4, 4)
        if (a === b || a === 0 || b === 0) continue
        const rem1 = p + a + b
        const rem0 = q - a * b
        if (evalPoly([rem1, rem0], a) === 0 || evalPoly([rem1, rem0], b) === 0) continue
        return pfProblem({ ℓ: 1, roots: [a, b], num: [1, p, q] }, 'Fracciones parciales: fracción impropia')
      }
    },
    H2: (r) => {
      for (;;) {
        const a = r.pick([1, 2, 3, -1, -2])
        const b = r.pick([-3, -2, -1, 1, 2, 3])
        if (a === b) continue
        const p = r.int(1, 3)
        const q = r.int(-3, 3)
        const t = r.int(-4, 4)
        const num = [p, q, t]
        if (t === 0 || evalPoly(num, a) === 0 || evalPoly(num, b) === 0) continue
        return pfProblem({ ℓ: 1, roots: [0, a, b], num }, 'Fracciones parciales: tres factores lineales')
      }
    },
  },
}

