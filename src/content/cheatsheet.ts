export type Chk =
  | { kind: 'id'; l: string; r: string } // identidad: l = r
  | { kind: 'der'; f: string; d: string } // d/dx f = d
  | { kind: 'int'; f: string; F: string } // F' = f

export interface Entry {
  id: string
  name: string
  tex: string
  /** Por qué es así / cuándo se usa (markdown con $LaTeX$). */
  why: string
  /** Ejemplo corto: líneas de LaTeX. */
  example: string[]
  /** Técnica de memoria. */
  mnemonic: string
  chk?: Chk
}

export interface Section {
  id: string
  title: string
  icon: string
  intro: string
  entries: Entry[]
}

export const CHEATSHEET: Section[] = [
  {
    id: 'alg',
    title: 'Potencias, raíces y álgebra',
    icon: '🧱',
    intro: 'Aquí está el 80 % de los errores de examen. Dominar esto vale más que cualquier fórmula de integrales.',
    entries: [
      { id: 'pow-mul', name: 'Multiplicar potencias', tex: 'x^{a}\\cdot x^{b}=x^{a+b}', why: 'Misma base: **se suman** los exponentes. Es lo que haces cuando "distribuyes" $u\\cdot u^{5}=u^{6}$.', example: ['x^{3}\\cdot x^{4}=x^{7}', 'u\\cdot u^{5}=u^{1+5}=u^{6}'], mnemonic: 'Multiplicar → SUMAR arriba. (M de multiplicar, S de sumar: “Mi Suma”.)', chk: { kind: 'id', l: 'x^1.3*x^0.7', r: 'x^2' } },
      { id: 'pow-div', name: 'Dividir potencias', tex: '\\frac{x^{a}}{x^{b}}=x^{a-b}', why: 'Misma base: **se restan** los exponentes. Si queda negativo, es una fracción: $x^{-n}=\\frac{1}{x^{n}}$.', example: ['\\frac{x^{5}}{x^{2}}=x^{3}', 'x^{-2}=\\frac{1}{x^{2}}'], mnemonic: 'Dividir → RESTAR arriba menos abajo.', chk: { kind: 'id', l: 'x^3/x^1.5', r: 'x^1.5' } },
      { id: 'pow-pow', name: 'Potencia de potencia', tex: '\\left(x^{a}\\right)^{b}=x^{ab}', why: 'Una potencia elevada a otra: **se multiplican** los exponentes.', example: ['\\left(x^{2}\\right)^{3}=x^{6}'], mnemonic: 'Potencia sobre potencia → MULTIPLICAR (el edificio crece al cuadrado).', chk: { kind: 'id', l: '(x^2)^3', r: 'x^6' } },
      { id: 'root-pow', name: 'Raíz = potencia fraccionaria', tex: '\\sqrt[n]{x^{m}}=x^{m/n}\\qquad\\frac{1}{\\sqrt{u}}=u^{-1/2}', why: 'Convertir raíces en potencias permite usar la regla $\\int u^{k}du=\\frac{u^{k+1}}{k+1}$.', example: ['\\sqrt{u}=u^{1/2}', '\\frac{1}{\\sqrt[3]{u}}=u^{-1/3}'], mnemonic: 'La raíz es una potencia con "piso": el índice va ABAJO de la fracción.', chk: { kind: 'id', l: '1/sqrt(x)', r: 'x^(-0.5)' } },
      { id: 'dsq', name: 'Diferencia de cuadrados', tex: 'a^{2}-b^{2}=(a-b)(a+b)', why: 'Clave en fracciones parciales: $1-x^{2}=(1-x)(1+x)$.', example: ['1-x^{2}=(1-x)(1+x)', 'x^{2}-9=(x-3)(x+3)'], mnemonic: '"Menos" de cuadrados = un menos y un más (el producto cruzado se cancela).', chk: { kind: 'id', l: 'x^2-4', r: '(x-2)*(x+2)' } },
      { id: 'divfrac', name: 'Dividir entre una fracción', tex: '\\frac{a}{b/c}=a\\cdot\\frac{c}{b}', why: 'Dividir entre $\\frac12$ es multiplicar por 2. Aparece al integrar $u^{-1/2}$.', example: ['\\frac{u^{1/2}}{1/2}=2u^{1/2}'], mnemonic: 'La fracción de abajo "se voltea" y sube multiplicando. (¡Nunca se divide entre 2!)', chk: { kind: 'id', l: 'x/(1/2)', r: '2*x' } },
    ],
  },
  {
    id: 'log',
    title: 'Logaritmos y exponenciales',
    icon: '📈',
    intro: 'El logaritmo natural $\\ln$ y el número $e$ son inversos: se "deshacen" mutuamente.',
    entries: [
      { id: 'ln-e', name: 'Inversos', tex: '\\ln e^{x}=x\\qquad e^{\\ln x}=x', why: 'Se anulan. También: $\\ln 1=0$, $\\ln e=1$, $e^{0}=1$.', example: ['\\ln e^{3}=3', 'e^{\\ln 5}=5'], mnemonic: 'ln y e son como poner y quitar el abrigo: uno deshace al otro.', chk: { kind: 'id', l: 'log(exp(x))', r: 'x' } },
      { id: 'ln-prod', name: 'Logaritmo de producto y cociente', tex: '\\ln(ab)=\\ln a+\\ln b\\qquad\\ln\\frac{a}{b}=\\ln a-\\ln b', why: 'Convierten multiplicación en suma. Útil para juntar los $\\ln$ del resultado de fracciones parciales.', example: ['\\frac32\\ln|1-x|-\\frac52\\ln|1+x|=\\ln\\frac{|1-x|^{3/2}}{|1+x|^{5/2}}'], mnemonic: 'Producto → suma, cociente → resta: el log "baja de piso".', chk: { kind: 'id', l: 'log(x*2)', r: 'log(x)+log(2)' } },
      { id: 'ln-pow', name: 'Logaritmo de una potencia', tex: '\\ln\\left(x^{n}\\right)=n\\ln x', why: 'El exponente "baja" como factor.', example: ['\\ln\\sqrt{x}=\\frac12\\ln x'], mnemonic: 'El exponente se BAJA a saludar delante del ln.', chk: { kind: 'id', l: 'log(x^3)', r: '3*log(x)' } },
    ],
  },
  {
    id: 'trig',
    title: 'Trigonometría',
    icon: '📐',
    intro: 'Con la Casio en RADIANES. Estas identidades son las herramientas de las integrales con seno y coseno.',
    entries: [
      { id: 'pyth', name: 'Identidad pitagórica', tex: '\\sin^{2}x+\\cos^{2}x=1', why: 'Es el teorema de Pitágoras en el círculo de radio 1. De aquí salen $1-\\sin^{2}=\\cos^{2}$ y $1+\\tan^{2}=\\sec^{2}$.', example: ['1-\\sin^{2}\\theta=\\cos^{2}\\theta'], mnemonic: 'El círculo unitario: seno y coseno son los catetos, el radio es 1.', chk: { kind: 'id', l: 'sin(x)^2+cos(x)^2', r: '1' } },
      { id: 'pyth2', name: 'Pitagórica con tangente', tex: '1+\\tan^{2}x=\\sec^{2}x', why: 'Divide la pitagórica entre $\\cos^{2}x$.', example: ['\\sqrt{a^{2}+x^{2}}\\ \\text{con}\\ x=a\\tan\\theta\\Rightarrow a\\sec\\theta'], mnemonic: 'Uno más tangente cuadrada es secante cuadrada: "1 + T = S".', chk: { kind: 'id', l: '1+tan(x)^2', r: '1/cos(x)^2' } },
      { id: 'dbl-sin', name: 'Seno del ángulo doble', tex: '\\sin 2x=2\\sin x\\cos x', why: 'Sirve para volver de $\\theta$ a $x$ en sustitución trigonométrica.', example: ['\\theta+\\tfrac12\\sin2\\theta=\\theta+\\sin\\theta\\cos\\theta'], mnemonic: 'Dos seno-coseno: "doble de seno = 2 · sen · cos" (el 2 sale adelante).', chk: { kind: 'id', l: 'sin(2*x)', r: '2*sin(x)*cos(x)' } },
      { id: 'red-cos', name: 'Bajar la potencia: coseno', tex: '\\cos^{2}x=\\frac{1+\\cos 2x}{2}', why: 'No se puede integrar $\\cos^{2}$ directo; con esta identidad queda $\\cos 2x$, que sí.', example: ['\\int\\cos^{2}x\\,dx=\\frac{x}{2}+\\frac{\\sin2x}{4}'], mnemonic: 'El coseno SUMA (con "+": coseno, suma); el seno RESTA.', chk: { kind: 'id', l: 'cos(x)^2', r: '(1+cos(2*x))/2' } },
      { id: 'red-sin', name: 'Bajar la potencia: seno', tex: '\\sin^{2}x=\\frac{1-\\cos 2x}{2}', why: 'Igual que el anterior, con resta.', example: ['\\int\\sin^{2}x\\,dx=\\frac{x}{2}-\\frac{\\sin2x}{4}'], mnemonic: 'Seno resta: "sen-resta".', chk: { kind: 'id', l: 'sin(x)^2', r: '(1-cos(2*x))/2' } },
      { id: 'sin-diff', name: 'Seno de una resta', tex: '\\sin(a-b)=\\sin a\\cos b-\\cos a\\sin b', why: 'Para simplificar $\\sin(x-\\pi)=-\\sin x$ en áreas con funciones desfasadas.', example: ['\\sin(x-\\pi)=\\sin x(-1)-\\cos x(0)=-\\sin x'], mnemonic: '"Seno: seno-coseno, coseno-seno" y el signo es el mismo de la resta.', chk: { kind: 'id', l: 'sin(x-0.8)', r: 'sin(x)*cos(0.8)-cos(x)*sin(0.8)' } },
    ],
  },
  {
    id: 'der',
    title: 'Derivadas (para verificar)',
    icon: '🔍',
    intro: 'Derivar tu respuesta es la mejor forma de comprobar una integral. Solo debes recordar pocas derivadas.',
    entries: [
      { id: 'd-pow', name: 'Potencia', tex: '\\frac{d}{dx}x^{n}=nx^{n-1}', why: '"Baja el exponente y réstale 1". Es la regla inversa de integrar potencias.', example: ['\\frac{d}{dx}x^{5}=5x^{4}'], mnemonic: 'El exponente BAJA como multiplicador y el nuevo exponente es uno menos.', chk: { kind: 'der', f: 'x^5', d: '5*x^4' } },
      { id: 'd-sin', name: 'Seno y coseno', tex: '(\\sin x)^{\\prime}=\\cos x\\qquad(\\cos x)^{\\prime}=-\\sin x', why: 'Las funciones que empiezan con **co-** (coseno, cotangente, cosecante) tienen derivada **negativa**.', example: ['\\frac{d}{dx}\\cos(\\pi x)=-\\pi\\sin(\\pi x)'], mnemonic: 'CO-seno, CO-tangente, CO-secante → derivadas con signo MENOS ("co" = “contra”).', chk: { kind: 'der', f: 'cos(x)', d: '-sin(x)' } },
      { id: 'd-tan', name: 'Tangente y secante', tex: '(\\tan x)^{\\prime}=\\sec^{2}x\\qquad(\\sec x)^{\\prime}=\\sec x\\tan x', why: 'Se usan en integrales de $\\sec^{2}$ y $\\sec\\tan$.', example: ['\\frac{d}{dx}\\tan x=\\sec^{2}x'], mnemonic: 'La tangente deriva en "secante al cuadrado"; la secante deriva en "sec tan".', chk: { kind: 'der', f: 'tan(x)', d: '1/cos(x)^2' } },
      { id: 'd-exp', name: 'Exponencial y logaritmo', tex: '(e^{x})^{\\prime}=e^{x}\\qquad(\\ln x)^{\\prime}=\\frac{1}{x}', why: '$e^{x}$ es la única función que no cambia al derivar.', example: ['\\frac{d}{dx}e^{-x^{2}}=-2x\\,e^{-x^{2}}'], mnemonic: 'e^x es "inmortal": derivarla no la cambia.', chk: { kind: 'der', f: 'log(x)', d: '1/x' } },
      { id: 'd-asin', name: 'Arcoseno y arcotangente', tex: '(\\arcsin x)^{\\prime}=\\frac{1}{\\sqrt{1-x^{2}}}\\qquad(\\arctan x)^{\\prime}=\\frac{1}{1+x^{2}}', why: 'Aparecen en el resultado de la sustitución trigonométrica.', example: ['\\frac{d}{dx}\\arcsin\\frac{x}{a}=\\frac{1}{\\sqrt{a^{2}-x^{2}}}'], mnemonic: 'ARCOSENO → raíz abajo con "1 menos"; ARCOTANGENTE → sin raíz, con "1 más".', chk: { kind: 'der', f: 'asin(x)', d: '1/sqrt(1-x^2)' } },
      { id: 'd-chain', name: 'Regla de la cadena', tex: '\\frac{d}{dx}f(g(x))=f^{\\prime}(g(x))\\cdot g^{\\prime}(x)', why: 'Deriva "lo de afuera" dejando "lo de adentro" igual, y multiplica por la derivada de lo de adentro. La sustitución es esta regla al revés.', example: ['\\frac{d}{dx}\\sin(3x^{2})=\\cos(3x^{2})\\cdot 6x'], mnemonic: 'Cebolla: derivas la capa de afuera y luego multiplicas por la de adentro.', chk: { kind: 'der', f: 'sin(3*x^2)', d: 'cos(3*x^2)*6*x' } },
    ],
  },
  {
    id: 'int',
    title: 'Integrales básicas',
    icon: '∫',
    intro: 'Cada integral básica es una derivada leída al revés. Si recuerdas la derivada, recuerdas la integral.',
    entries: [
      { id: 'i-pow', name: 'Regla de la potencia', tex: '\\int u^{n}du=\\frac{u^{n+1}}{n+1}+C\\quad(n\\neq-1)', why: 'Sube el exponente en 1 y divide entre el nuevo exponente. Con raíces: pasa a potencia fraccionaria primero.', example: ['\\int u^{-1/2}du=\\frac{u^{1/2}}{1/2}=2\\sqrt{u}'], mnemonic: '"Sube uno y divide": al derivar bajabas; al integrar subes.', chk: { kind: 'int', f: 'x^3', F: 'x^4/4' } },
      { id: 'i-inv', name: 'El caso especial 1/u', tex: '\\int\\frac{du}{u}=\\ln|u|+C', why: 'Es el único exponente ($n=-1$) donde la regla de la potencia falla (dividiría entre 0). Siempre con valor absoluto.', example: ['\\int\\frac{dx}{x-3}=\\ln|x-3|'], mnemonic: 'x⁻¹ es la excepción: "el uno se esconde en el ln".', chk: { kind: 'int', f: '1/x', F: 'log(x)' } },
      { id: 'i-exp', name: 'Exponencial', tex: '\\int e^{u}du=e^{u}+C\\qquad\\int e^{ax}dx=\\frac{e^{ax}}{a}+C', why: 'Con coeficiente $a$ en el exponente, se divide entre $a$ (la derivada interna).', example: ['\\int e^{-2x}dx=-\\frac{1}{2}e^{-2x}'], mnemonic: 'e^u no cambia; si hay un número en el exponente, ese número queda dividiendo.', chk: { kind: 'int', f: 'exp(2*x)', F: 'exp(2*x)/2' } },
      { id: 'i-sin', name: 'Seno y coseno', tex: '\\int\\sin u\\,du=-\\cos u+C\\qquad\\int\\cos u\\,du=\\sin u+C', why: 'Solo el seno lleva signo menos (porque el coseno deriva en −seno).', example: ['\\int\\sin(\\pi x)dx=-\\frac{\\cos(\\pi x)}{\\pi}'], mnemonic: 'Integral del SENO = MENOS coseno. El coseno integra "limpio" a seno.', chk: { kind: 'int', f: 'sin(x)', F: '-cos(x)' } },
      { id: 'i-sec', name: 'Secante cuadrada', tex: '\\int\\sec^{2}u\\,du=\\tan u+C\\qquad\\int\\csc^{2}u\\,du=-\\cot u+C', why: 'Lectura inversa de las derivadas de tangente y cotangente.', example: ['\\int\\sec^{2}(3x)dx=\\frac{\\tan3x}{3}'], mnemonic: 'sec² ↔ tan; csc² ↔ −cot (los "co" llevan el menos).', chk: { kind: 'int', f: '1/cos(x)^2', F: 'tan(x)' } },
      { id: 'i-atan', name: 'Forma arcoseno y arcotangente', tex: '\\int\\frac{du}{\\sqrt{a^{2}-u^{2}}}=\\arcsin\\frac{u}{a}\\qquad\\int\\frac{du}{a^{2}+u^{2}}=\\frac{1}{a}\\arctan\\frac{u}{a}', why: 'Si ves una raíz de "a² − u²" abajo → arcoseno; "a² + u²" sin raíz → arcotangente.', example: ['\\int\\frac{dx}{4+x^{2}}=\\frac12\\arctan\\frac{x}{2}'], mnemonic: 'Con RAÍZ y resta → arco-SENO. SIN raíz y suma → arco-TANGENTE (con el 1/a delante).', chk: { kind: 'int', f: '1/(4+x^2)', F: 'atan(x/2)/2' } },
      { id: 'i-ln', name: 'Integral del logaritmo', tex: '\\int\\ln u\\,du=u\\ln u-u+C', why: 'Se obtiene por partes con $u=\\ln x$, $dv=dx$. Conviene memorizarla.', example: ['\\int\\ln x\\,dx=x\\ln x-x'], mnemonic: '"x ln x menos x": la x aparece dos veces.', chk: { kind: 'int', f: 'log(x)', F: 'x*log(x)-x' } },
    ],
  },
  {
    id: 'tec',
    title: 'Técnicas de integración',
    icon: '🧰',
    intro: 'Antes de resolver, identifica el método. Esta tabla es tu brújula.',
    entries: [
      { id: 't-sub', name: 'Sustitución', tex: 'u=g(x),\\quad du=g^{\\prime}(x)\\,dx\\Rightarrow\\int f(g(x))g^{\\prime}(x)dx=\\int f(u)du', why: 'Úsala cuando una función está "dentro" de otra y su derivada aparece multiplicando (salvo constantes).', example: ['\\int x e^{-x^{2}}dx:\\ u=-x^{2},\\ du=-2x\\,dx'], mnemonic: 'U = lo de ADENTRO (paréntesis, raíz, exponente, ángulo). “U de Unidad interna”.' },
      { id: 't-parts', name: 'Por partes', tex: '\\int u\\,dv=uv-\\int v\\,du', why: 'Para productos de tipos distintos ($x e^{x}$, $x\\ln x$, $x\\sin x$) o logaritmos/arcos solos.', example: ['\\int xe^{x}dx=xe^{x}-e^{x}'], mnemonic: '“Un Día Vi Una Vaca Vestida De Uniforme”: u dv = u v − ∫ v du.' },
      { id: 't-liate', name: 'LIATE (cuál es u)', tex: '\\text{L}>\\text{I}>\\text{A}>\\text{T}>\\text{E}', why: 'Logarítmica, Inversa trigonométrica, Algebraica, Trigonométrica, Exponencial: lo que aparezca primero es $u$.', example: ['x\\ln x:\\ u=\\ln x\\quad(\\text{L antes que A})'], mnemonic: '“La Inteligencia Antecede Toda Experiencia”: LIATE.' },
      { id: 't-trig', name: 'Sustitución trigonométrica', tex: '\\sqrt{a^{2}-x^{2}}\\to x=a\\sin\\theta\\quad\\sqrt{a^{2}+x^{2}}\\to x=a\\tan\\theta\\quad\\sqrt{x^{2}-a^{2}}\\to x=a\\sec\\theta', why: 'Hace desaparecer la raíz con una identidad pitagórica. Al final se regresa a $x$ con un triángulo.', example: ['\\sqrt{2-x^{2}}:\\ x=\\sqrt2\\sin\\theta'], mnemonic: 'La señal del signo: “a MENOS x → SENO”; “a MÁS x → TANGENTE”; “x MENOS a → SECANTE” (el que está sin pareja).' },
      { id: 't-pf', name: 'Fracciones parciales', tex: '\\frac{P(x)}{(x-r)(x-s)}=\\frac{A}{x-r}+\\frac{B}{x-s}', why: 'Cociente de polinomios con denominador factorizable. Si grado(num) ≥ grado(den), primero divide.', example: ['A=\\left.\\frac{P(x)}{x-s}\\right|_{x=r}'], mnemonic: 'Método del TAPADO: tapa un factor, evalúa en su raíz, ¡sale la letra!' },
    ],
  },
  {
    id: 'area',
    title: 'Áreas',
    icon: '🗺',
    intro: 'La regla de oro: arriba menos abajo, y parte donde las curvas se cruzan.',
    entries: [
      { id: 'a-between', name: 'Área entre curvas', tex: 'A=\\int_{a}^{b}\\left[f(x)-g(x)\\right]dx\\quad(f\\geq g)', why: 'Cada rectángulo mide $h\\,dx$ con $h$ = arriba − abajo. Los límites son los cortes.', example: ['\\int_{0}^{2}\\left[(-x+4)-x\\right]dx=4'], mnemonic: 'ARRIBA − ABAJO. Y ponle paréntesis a la resta.' },
      { id: 'a-split', name: 'Si las curvas se cruzan', tex: 'A=\\int_{a}^{c}(f-g)\\,dx+\\int_{c}^{b}(g-f)\\,dx', why: 'Integrar de golpe a través de un cruce hace que las áreas se resten entre sí (puede dar 0).', example: ['\\int_{-1}^{1}(x^{3}-x)dx=0\\ \\text{pero el área es}\\ \\tfrac12'], mnemonic: 'Cruce = CORTE: cada región con su propia integral.' },
      { id: 'a-ftc', name: 'Teorema Fundamental', tex: '\\int_{a}^{b}f(x)\\,dx=F(b)-F(a)', why: 'Evalúa la antiderivada en el límite superior y resta el inferior. Usa paréntesis con los negativos.', example: ['\\left[-2\\cos x\\right]_{0}^{\\pi}=2-(-2)=4'], mnemonic: '"Arriba menos abajo", otra vez: F de b MENOS F de a.' },
    ],
  },
]

export const ALL_ENTRIES = CHEATSHEET.flatMap((s) => s.entries.map((e) => ({ ...e, section: s.title })))
