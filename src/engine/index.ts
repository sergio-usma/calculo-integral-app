import { AREA_FAMILIES } from './areas'
import { casioForArea, casioForIntegral, casioForVolume } from './casio'
import { INTEGRAL_FAMILIES } from './integrals'
import { VOLUME_FAMILIES } from './volumes'
import type { Draft } from './integrals'
import { FAMILY_TITLE } from './types'
import type { Level, Problem } from './types'
import { rng } from './util'

export const LEVELS: Level[] = ['T', 'G1', 'G2', 'H1', 'H2']
export const FAMILIES = [1, 2, 3, 4, 5, 6, 7, 8, 9]
/** Taller de volúmenes de sólidos de revolución (10 = discos, 11 = arandelas). */
export const VOLUME_FAMILIES_IDS = [10, 11]
export const ALL_FAMILIES = [...FAMILIES, ...VOLUME_FAMILIES_IDS]
export { FAMILY_TITLE }

/** Nombres del taller: 1-6 integrales; 7a/7b/7c áreas. */
export const TALLER_LABEL: Record<number, string> = { 1: '1', 2: '2', 3: '3', 4: '4', 5: '5', 6: '6', 7: '7a', 8: '7b', 9: '7c', 10: 'V-I', 11: 'V-II' }

export function generate(family: number, level: Level, seed = 1): Problem {
  const r = rng(seed * 7919 + family * 131 + LEVELS.indexOf(level) * 17)
  const kind = family >= 10 ? ('volume' as const) : family >= 7 ? ('area' as const) : ('integral' as const)
  const table = kind === 'volume' ? VOLUME_FAMILIES : kind === 'area' ? AREA_FAMILIES : INTEGRAL_FAMILIES
  const draft: Draft = table[family][level](r)
  const base = { ...draft, id: `${family}-${level}-${seed}`, family, level, kind }
  const casio = kind === 'volume' ? casioForVolume(base) : kind === 'area' ? casioForArea(base) : casioForIntegral(base)
  return { ...base, casio }
}
