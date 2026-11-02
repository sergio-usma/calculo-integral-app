import { AREA_FAMILIES } from './areas'
import { casioForArea, casioForIntegral } from './casio'
import { INTEGRAL_FAMILIES } from './integrals'
import type { Draft } from './integrals'
import { FAMILY_TITLE } from './types'
import type { Level, Problem } from './types'
import { rng } from './util'

export const LEVELS: Level[] = ['T', 'G1', 'G2', 'H1', 'H2']
export const FAMILIES = [1, 2, 3, 4, 5, 6, 7, 8, 9]
export { FAMILY_TITLE }

/** Nombres del taller: 1-6 integrales; 7a/7b/7c áreas. */
export const TALLER_LABEL: Record<number, string> = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7a', 8: '7b', 9: '7c' }

export function generate(family: number, level: Level, seed = 1): Problem {
  const r = rng(seed * 7919 + family * 131 + LEVELS.indexOf(level) * 17)
  const isArea = family >= 7
  const draft: Draft = (isArea ? AREA_FAMILIES[family][level] : INTEGRAL_FAMILIES[family][level])(r)
  const base = { ...draft, id: `${family}-${level}-${seed}`, family, level, kind: isArea ? ('area' as const) : ('integral' as const) }
  const casio = isArea ? casioForArea(base) : casioForIntegral(base)
  return { ...base, casio }
}
