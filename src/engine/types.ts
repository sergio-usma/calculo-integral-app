export type Level = 'T' | 'G1' | 'G2' | 'H1' | 'H2'

export const LEVEL_LABEL: Record<Level, string> = {
  T: 'Taller',
  G1: 'Gemela A',
  G2: 'Gemela B',
  H1: 'Reto A',
  H2: 'Reto B',
}

export interface Step {
  title: string
  /** Explicación en lenguaje simple (admite markdown y $LaTeX$). */
  why: string
  /** Líneas de LaTeX; cada una es una "línea de código" del depurador. */
  lines: string[]
  /** Variables que quedan definidas al terminar este paso. */
  vars?: Record<string, string>
  tip?: string
  warn?: string
}

export interface CasioKeys {
  title: string
  /** Secuencia de teclas, por ejemplo ["SHIFT","∫","X²","=",...]. */
  keys: string[]
  expect?: string
  note?: string
}

export interface Curve {
  label: string
  tex: string
  expr: string
  color: string
}

export interface Region {
  a: number
  b: number
  top: string
  bottom: string
  color: string
}

export interface AreaInfo {
  curves: Curve[]
  regions: Region[]
  points: { x: number; y: number; label: string }[]
  view: [number, number, number, number]
  value: number
  vline?: number
}

/** Metadatos simbólicos para generar el código Python (SymPy). Las cadenas se leen con sympify. */
export type PyMeta =
  | { kind: 'subst'; u: string; g: string }
  | { kind: 'parts'; us: string[] }
  | { kind: 'trig'; x: string; integrand: string; back: string }
  | { kind: 'pf'; roots: number[]; coefs: number[]; q: number; dens?: string[] }
  | { kind: 'area'; regions: [string, string][]; domain?: [string, string] }

export interface Problem {
  id: string
  family: number
  level: Level
  kind: 'integral' | 'area'
  title: string
  statement: string
  method: string
  methodWhy: string
  steps: Step[]
  answer: string
  verification: string[]
  hints: string[]
  casio: CasioKeys[]
  /** Integrando y antiderivada como expresiones mathjs (x variable). */
  fExpr?: string
  FExpr?: string
  /** Puntos de prueba donde la antiderivada es válida. */
  testPts?: number[]
  /** Ventana por defecto de la integral definida a visualizar. */
  bounds?: [number, number]
  area?: AreaInfo
  usesTrig?: boolean
  py?: PyMeta
}

export const FAMILY_TITLE: Record<number, string> = {
  1: 'Sustitución con potencia',
  2: 'Sustitución con raíz',
  3: 'Sustitución con exponencial',
  4: 'Integración por partes',
  5: 'Sustitución trigonométrica',
  6: 'Fracciones parciales',
  7: 'Área entre rectas y parábolas',
  8: 'Área entre curvas (polinomios y exponenciales)',
  9: 'Área entre curvas trigonométricas',
}
