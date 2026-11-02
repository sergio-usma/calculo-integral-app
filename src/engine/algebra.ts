import { numberOf, sameExpr } from './quiz'
import { rng } from './util'
import type { Rng } from './util'

export interface AlgEx {
  prompt: string
  expected: string
  hint: string
  explain: string
  /** 'expr' usa la variable x; 'num' admite fracciones como 7/6 */
  kind: 'num' | 'expr'
  check: (a: string) => boolean
}

export interface Lesson {
  id: string
  title: string
  icon: string
  why: string
  rules: { tex: string; say: string }[]
  example: { title: string; steps: { tex: string; say: string }[] }
  memory: string
  gen: (r: Rng) => AlgEx
}

const num = (expected: number, tol = 1e-6) => (a: string) => {
  const v = numberOf(a)
  return v !== null && Math.abs(v - expected) < tol
}
const fracTex = (n: number, d: number) => `\\frac{${n}}{${d}}`
const lin = (a: number, b: number) => `${a === 1 ? '' : a === -1 ? '-' : a}x${b < 0 ? '-' : '+'}${Math.abs(b)}`
const gcd = (a: number, b: number): number => (b ? gcd(b, a % b) : Math.abs(a))

export const LESSONS: Lesson[] = [
  {
    id: 'signos',
    title: 'Signos y paréntesis',
    icon: '➕',
    why: 'Un menos mal puesto arruina toda la integral. Aquí se cometen la mayoría de los errores al restar funciones (áreas) y al derivar.',
    rules: [
      { tex: '-(a+b)=-a-b', say: 'El signo menos delante de un paréntesis **cambia el signo de todo** lo de adentro.' },
      { tex: '-(a-b)=-a+b', say: 'Si había un menos adentro, ahora queda un más.' },
      { tex: '(-)(-)=+\\qquad(-)(+)=-', say: 'Menos por menos da más. Menos por más da menos.' },
    ],
    example: {
      title: 'Restar dos funciones: $(-x+4)-x$',
      steps: [
        { tex: '(-x+4)-x', say: 'El primer paréntesis solo se quita (no hay menos delante).' },
        { tex: '=-x+4-x', say: 'Quitamos el paréntesis sin cambiar nada.' },
        { tex: '=-2x+4', say: 'Juntamos los términos con x: $-x-x=-2x$.' },
      ],
    },
    memory: 'Un menos delante del paréntesis es una “fotocopiadora al revés”: copia todo lo de adentro con el signo contrario.',
    gen: (r) => {
      const a = r.int(2, 6), b = r.int(1, 7), c = r.int(1, 5)
      const mode = r.int(0, 1)
      if (mode === 0)
        return { prompt: `Simplifica: $-(${a}x-${b})$ . Escribe el resultado como expresión en x (usa \`*\`).`, expected: `-${a}*x+${b}`, kind: 'expr', hint: 'El menos cambia el signo de cada término de adentro.', explain: `$-(${a}x-${b})=-${a}x+${b}$`, check: (s) => sameExpr(s, `-${a}*x+${b}`, 'x') }
      return { prompt: `Simplifica: $(${a}x+${b})-(${c}x-${b})$ . Escribe la expresión en x.`, expected: `${a - c}*x+${2 * b}`, kind: 'expr', hint: 'Cambia TODOS los signos del segundo paréntesis y junta.', explain: `$${a}x+${b}-${c}x+${b}=${a - c}x+${2 * b}$`, check: (s) => sameExpr(s, `${a - c}*x+${2 * b}`, 'x') }
    },
  },
  {
    id: 'fracciones',
    title: 'Fracciones',
    icon: '➗',
    why: 'Las integrales dan resultados como $\\frac{1}{14}$ o $-\\frac{3}{2}$. Y dividir entre $\\frac12$ aparece en cada integral con raíces.',
    rules: [
      { tex: '\\frac{a}{b}+\\frac{c}{d}=\\frac{ad+bc}{bd}', say: 'Para sumar: denominador común (multiplica en cruz).' },
      { tex: '\\frac{a}{b}\\cdot\\frac{c}{d}=\\frac{ac}{bd}', say: 'Para multiplicar: arriba con arriba, abajo con abajo.' },
      { tex: '\\frac{a}{b/c}=a\\cdot\\frac{c}{b}\\qquad\\frac{u}{1/2}=2u', say: 'Dividir entre una fracción = **multiplicar por su inverso**.' },
    ],
    example: {
      title: 'Sumar $\\frac{1}{14}-\\frac{1}{12}$',
      steps: [
        { tex: '\\text{mcm}(14,12)=84', say: 'Buscamos un múltiplo común: $14=2\\cdot7$ y $12=2^{2}\\cdot3$, así que 84.' },
        { tex: '\\frac{1}{14}=\\frac{6}{84},\\quad\\frac{1}{12}=\\frac{7}{84}', say: 'Multiplicamos arriba y abajo por lo que falta (6 y 7).' },
        { tex: '\\frac{6}{84}-\\frac{7}{84}=-\\frac{1}{84}', say: 'Ya con el mismo denominador, restamos los numeradores.' },
      ],
    },
    memory: 'Dividir entre una fracción: “la de abajo se voltea y sube multiplicando”.',
    gen: (r) => {
      const mode = r.int(0, 2)
      if (mode === 0) {
        const [b, d] = [r.pick([2, 3, 4, 5, 6]), r.pick([3, 4, 5, 7])]
        const a = r.int(1, b - 1 || 1), c = r.int(1, d - 1 || 1)
        const n = a * d + c * b, m = b * d
        return { prompt: `Calcula $\\frac{${a}}{${b}}+\\frac{${c}}{${d}}$ . Escribe una fracción como \`7/6\` o un decimal.`, expected: `${n}/${m}`, kind: 'num', hint: 'Multiplica en cruz: $ad+bc$ sobre $bd$.', explain: `$${fracTex(n, m)}${gcd(n, m) > 1 ? `=${fracTex(n / gcd(n, m), m / gcd(n, m))}` : ''}$`, check: num(n / m) }
      }
      if (mode === 1) {
        const k = r.pick([2, 3, 4])
        return { prompt: `Calcula $\\dfrac{1}{1/${k}}$ .`, expected: `${k}`, kind: 'num', hint: 'Dividir entre una fracción es multiplicar por su inverso.', explain: `$\\frac{1}{1/${k}}=1\\cdot${k}=${k}$`, check: num(k) }
      }
      const n = r.pick([2, 3, 5]), m = r.pick([3, 4, 7])
      return { prompt: `Calcula $-\\dfrac{1}{${n}}\\cdot\\dfrac{${m}}{3}$ .`, expected: `${-m}/${3 * n}`, kind: 'num', hint: 'Multiplica numeradores y denominadores; el signo menos se queda.', explain: `$-\\frac{${m}}{${3 * n}}$`, check: num(-m / (3 * n)) }
    },
  },
  {
    id: 'potencias',
    title: 'Potencias y raíces',
    icon: '⚡',
    why: 'Para integrar una raíz hay que verla como potencia. Y al distribuir $(u-1)u^{5}$ hay que saber sumar exponentes.',
    rules: [
      { tex: 'x^{a}x^{b}=x^{a+b}\\qquad\\frac{x^{a}}{x^{b}}=x^{a-b}', say: 'Multiplicar suma exponentes; dividir los resta.' },
      { tex: '\\sqrt{x}=x^{1/2}\\qquad\\sqrt[3]{x}=x^{1/3}', say: 'La raíz es una potencia fraccionaria.' },
      { tex: '\\frac{1}{x^{n}}=x^{-n}\\qquad\\frac{1}{\\sqrt{x}}=x^{-1/2}', say: 'Pasar al denominador cambia el signo del exponente.' },
    ],
    example: {
      title: 'Escribir $\\frac{1}{\\sqrt{1-x^{3}}}$ como potencia',
      steps: [
        { tex: '\\sqrt{u}=u^{1/2}', say: 'La raíz cuadrada es la potencia 1/2.' },
        { tex: '\\frac{1}{u^{1/2}}=u^{-1/2}', say: 'Lo que está en el denominador pasa arriba con el exponente cambiado de signo.' },
        { tex: '\\int u^{-1/2}du=\\frac{u^{1/2}}{1/2}=2u^{1/2}', say: 'Sube 1: $-\\frac12+1=\\frac12$; dividir entre $\\frac12$ es multiplicar por 2.' },
      ],
    },
    memory: 'Raíz = potencia con el índice ABAJO. Denominador = exponente NEGATIVO.',
    gen: (r) => {
      const mode = r.int(0, 2)
      if (mode === 0) {
        const a = r.int(2, 7), b = r.int(2, 6)
        return { prompt: `En $x^{${a}}\\cdot x^{${b}}=x^{k}$, ¿cuánto vale $k$?`, expected: `${a + b}`, kind: 'num', hint: 'Misma base al multiplicar: se suman los exponentes.', explain: `$k=${a}+${b}=${a + b}$`, check: num(a + b) }
      }
      if (mode === 1) {
        const m = r.pick([3, 5, 7]), n = 2
        return { prompt: `Escribe $\\sqrt{x^{${m}}}=x^{k}$. ¿Cuánto vale $k$? (como \`${m}/2\` o decimal)`, expected: `${m}/${n}`, kind: 'num', hint: 'La raíz cuadrada es elevar a 1/2: $(x^{m})^{1/2}$.', explain: `$k=${m}\\cdot\\frac12=\\frac{${m}}{2}$`, check: num(m / n) }
      }
      const k = r.pick([2, 3, 4])
      return { prompt: `$\\dfrac{1}{x^{${k}}}=x^{k}$. ¿Cuánto vale $k$ (con signo)?`, expected: `${-k}`, kind: 'num', hint: 'Pasar de denominador a numerador cambia el signo del exponente.', explain: `$k=-${k}$`, check: num(-k) }
    },
  },
  {
    id: 'factorizar',
    title: 'Factorizar',
    icon: '🧩',
    why: 'En fracciones parciales y al hallar cortes de curvas hay que factorizar. Es también la forma más rápida de resolver $x^{2}-4=0$.',
    rules: [
      { tex: 'a^{2}-b^{2}=(a-b)(a+b)', say: 'Diferencia de cuadrados.' },
      { tex: 'x^{2}+(p+q)x+pq=(x+p)(x+q)', say: 'Busca dos números que **sumen** el del medio y **multipliquen** el último.' },
      { tex: 'ax+ay=a(x+y)', say: 'Factor común: saca lo que se repite (p. ej. $x^{3}-x=x(x^{2}-1)$).' },
    ],
    example: {
      title: 'Cortes de $x^{3}+1=x+1$',
      steps: [
        { tex: 'x^{3}-x=0', say: 'Pasamos todo a un lado (el +1 se cancela).' },
        { tex: 'x(x^{2}-1)=0', say: 'Factor común $x$.' },
        { tex: 'x(x-1)(x+1)=0', say: 'Diferencia de cuadrados. Cada factor en 0 da un corte: $x=-1,0,1$.' },
      ],
    },
    memory: 'Trinomio: “suman al del medio, multiplican al último”. Caja: cada factor igual a cero es una raíz.',
    gen: (r) => {
      const mode = r.int(0, 1)
      if (mode === 0) {
        const p = r.int(1, 6), q = r.int(1, 6) * r.pick([1, -1])
        return { prompt: `Resuelve $x^{2}${p + q >= 0 ? '+' : '-'}${Math.abs(p + q)}x${p * q >= 0 ? '+' : '-'}${Math.abs(p * q)}=0$ . Da la raíz **menor**.`, expected: `${Math.min(-p, -q)}`, kind: 'num', hint: `Busca dos números que sumen ${p + q} y multipliquen ${p * q}.`, explain: `$(x+${p})(x${q >= 0 ? '+' : ''}${q})=0\\Rightarrow x=${-p},\\ ${-q}$`, check: num(Math.min(-p, -q)) }
      }
      const k = r.int(2, 9)
      return { prompt: `$x^{2}-${k * k}=(x-k)(x+k)$. ¿Cuánto vale $k$?`, expected: `${k}`, kind: 'num', hint: 'Es una diferencia de cuadrados: ¿qué número al cuadrado da ese valor?', explain: `$${k * k}=${k}^{2}$`, check: num(k) }
    },
  },
  {
    id: 'despejar',
    title: 'Despejar una incógnita',
    icon: '🔓',
    why: 'Se usa en los valores convenientes de fracciones parciales, al hallar cortes y al despejar $x\\,dx$ en las sustituciones.',
    rules: [
      { tex: 'ax+b=c\\Rightarrow x=\\frac{c-b}{a}', say: 'Pasa lo que suma o resta al otro lado (cambia su signo) y luego divide entre el coeficiente.' },
      { tex: 'x^{2}=k\\Rightarrow x=\\pm\\sqrt{k}', say: 'Al despejar un cuadrado salen **dos** soluciones.' },
    ],
    example: {
      title: 'Hallar A en $-3=2A$',
      steps: [
        { tex: '-3=2A', say: 'El 2 multiplica a A.' },
        { tex: 'A=\\frac{-3}{2}', say: 'Pasa a dividir al otro lado.' },
        { tex: 'A=-\\frac{3}{2}', say: 'El signo menos se queda.' },
      ],
    },
    memory: 'Lo que suma pasa restando; lo que multiplica pasa dividiendo. “Cambia de lado, cambia de operación”.',
    gen: (r) => {
      const a = r.pick([2, 3, 4, 5]), x = r.int(-5, 6), b = r.int(-6, 8)
      const c = a * x + b
      return { prompt: `Despeja $x$: $${a}x${b >= 0 ? '+' : '-'}${Math.abs(b)}=${c}$ .`, expected: `${x}`, kind: 'num', hint: `Primero pasa el ${b} al otro lado, luego divide entre ${a}.`, explain: `$${a}x=${c - b}\\Rightarrow x=${x}$`, check: num(x) }
    },
  },
  {
    id: 'trig',
    title: 'Trigonometría básica (círculo unitario)',
    icon: '🧭',
    why: 'Al evaluar $F(b)-F(a)$ con senos y cosenos necesitas valores como $\\sin\\frac{\\pi}{6}$ sin calculadora (o para comprobar la tuya).',
    rules: [
      { tex: '\\sin\\theta:\\ 0,\\ \\tfrac12,\\ \\tfrac{\\sqrt2}{2},\\ \\tfrac{\\sqrt3}{2},\\ 1\\quad(0,\\tfrac{\\pi}{6},\\tfrac{\\pi}{4},\\tfrac{\\pi}{3},\\tfrac{\\pi}{2})', say: 'El seno SUBE: 0, 1/2, √2/2, √3/2, 1.' },
      { tex: '\\cos\\theta:\\ 1,\\ \\tfrac{\\sqrt3}{2},\\ \\tfrac{\\sqrt2}{2},\\ \\tfrac12,\\ 0', say: 'El coseno BAJA: es el seno al revés.' },
      { tex: '\\sin\\pi=0,\\ \\cos\\pi=-1,\\ \\sin2\\pi=0,\\ \\cos2\\pi=1', say: 'Valores de media vuelta y vuelta completa.' },
    ],
    example: {
      title: 'Evaluar $\\left[-2\\cos x\\right]_{0}^{\\pi}$',
      steps: [
        { tex: '-2\\cos\\pi-(-2\\cos0)', say: 'F(b) − F(a), con paréntesis.' },
        { tex: '=-2(-1)+2(1)', say: '$\\cos\\pi=-1$ y $\\cos0=1$.' },
        { tex: '=2+2=4', say: 'Menos por menos da más.' },
      ],
    },
    memory: 'Mano izquierda: dedo meñique = 0°, anular = 30°, medio = 45°, índice = 60°, pulgar = 90°. Seno = √(dedos hacia abajo)/2; coseno = √(dedos hacia arriba)/2.',
    gen: (r) => {
      const t = r.pick([
        { a: '\\frac{\\pi}{6}', f: 'sin', v: 0.5 }, { a: '\\frac{\\pi}{3}', f: 'cos', v: 0.5 }, { a: '\\frac{\\pi}{2}', f: 'sin', v: 1 },
        { a: '\\pi', f: 'cos', v: -1 }, { a: '\\pi', f: 'sin', v: 0 }, { a: '0', f: 'cos', v: 1 }, { a: '2\\pi', f: 'cos', v: 1 },
        { a: '\\frac{\\pi}{4}', f: 'sin', v: Math.SQRT1_2 }, { a: '\\frac{\\pi}{3}', f: 'sin', v: Math.sqrt(3) / 2 },
      ])
      return { prompt: `Calcula $\\${t.f}\\left(${t.a}\\right)$ . Puedes escribir \`sqrt(2)/2\`, \`1/2\`, un decimal…`, expected: `${Number(t.v.toFixed(4))}`, kind: 'num', hint: 'Usa el círculo unitario: cos es la coordenada x, sen la y.', explain: `$\\${t.f}\\left(${t.a}\\right)\\approx ${Number(t.v.toFixed(4))}$`, check: num(t.v, 1e-4) }
    },
  },
  {
    id: 'logs',
    title: 'Logaritmos y e',
    icon: '🌱',
    why: 'Las fracciones parciales y $\\int\\frac{1}{u}$ terminan en $\\ln$, y las exponenciales en $e$.',
    rules: [
      { tex: '\\ln e^{x}=x\\qquad e^{\\ln x}=x', say: 'Son inversos: se cancelan.' },
      { tex: '\\ln1=0\\qquad\\ln e=1\\qquad e^{0}=1', say: 'Tres valores que debes saber de memoria.' },
      { tex: '\\ln(ab)=\\ln a+\\ln b\\qquad\\ln a^{n}=n\\ln a', say: 'Producto → suma; el exponente baja.' },
    ],
    example: {
      title: 'Evaluar $\\left[\\ln x\\right]_{1}^{e}$',
      steps: [
        { tex: '\\ln e-\\ln 1', say: 'F(b) − F(a).' },
        { tex: '=1-0=1', say: '$\\ln e=1$ y $\\ln1=0$.' },
      ],
    },
    memory: 'ln y e son inversos: como poner y quitarse el abrigo.',
    gen: (r) => {
      const k = r.int(2, 6)
      const mode = r.int(0, 2)
      if (mode === 0) return { prompt: `Calcula $\\ln\\left(e^{${k}}\\right)$ .`, expected: `${k}`, kind: 'num', hint: 'ln y e se cancelan.', explain: `$\\ln e^{${k}}=${k}$`, check: num(k) }
      if (mode === 1) return { prompt: `Calcula $e^{\\ln ${k}}$ .`, expected: `${k}`, kind: 'num', hint: 'e y ln se cancelan.', explain: `$e^{\\ln${k}}=${k}$`, check: num(k) }
      return { prompt: `Calcula $\\ln 1+e^{0}$ .`, expected: '1', kind: 'num', hint: '$\\ln1=0$ y $e^{0}=1$.', explain: '$0+1=1$', check: num(1) }
    },
  },
]

export function diagnostic(seed: number): { lesson: Lesson; ex: AlgEx }[] {
  const r = rng(seed)
  return LESSONS.flatMap((l) => [{ lesson: l, ex: l.gen(r) }])
}

export { lin }
