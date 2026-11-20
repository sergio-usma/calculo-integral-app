import { describe, expect, it } from 'vitest'
import { ALL_FAMILIES, LEVELS, VOLUME_FAMILIES_IDS, generate } from './engine'
import { pythonFor } from './engine/python'
import { buildQuiz } from './engine/quiz'
import { fn, simpson } from './engine/util'

const SEEDS = Array.from({ length: 120 }, (_, i) => i + 1)

describe('volúmenes: valor = π ∫ (R² − r²) numérico', () => {
  for (const fam of VOLUME_FAMILIES_IDS)
    for (const lv of LEVELS)
      it(`familia ${fam} ${lv}`, () => {
        for (const seed of SEEDS) {
          const p = generate(fam, lv, seed)
          expect(p.kind).toBe('volume')
          const a = p.area!
          expect(a.regions.length).toBe(1)
          const r = a.regions[0]
          const R = fn(r.top)
          const q = fn(r.bottom)
          const v = Math.PI * simpson((x) => R(x) ** 2 - q(x) ** 2, r.a, r.b, 4000)
          expect(Math.abs(v - a.value), `${p.id} ${v} vs ${a.value}`).toBeLessThan(1e-5 * Math.max(1, a.value))
          const m = (r.a + r.b) / 2
          expect(R(m) - q(m), `${p.id} radio exterior > interior`).toBeGreaterThan(0)
          expect(q(m), `${p.id} radio interior ≥ 0`).toBeGreaterThanOrEqual(0)
        }
      })
})

describe('volúmenes: el taller original', () => {
  it('I: esfera de radio r (r=3 → 36π)', () => {
    const p = generate(10, 'T')
    expect(p.answer).toContain('\\frac{4}{3}\\pi r^{3}')
    expect(Math.abs(p.area!.value - 36 * Math.PI)).toBeLessThan(1e-9)
  })
  it('II: f=-4x, g=x²+3 → 304π/15', () => {
    const p = generate(11, 'T')
    expect(p.statement).toContain('-4x')
    expect(p.statement).toContain('x^{2}+3')
    expect(p.answer).toContain('\\frac{304\\pi}{15}')
    expect(Math.abs(p.area!.value - (304 * Math.PI) / 15)).toBeLessThan(1e-9)
    const r = p.area!.regions[0]
    expect([r.a, r.b]).toEqual([-3, -1])
  })
})

describe('volúmenes: contenido', () => {
  it('pasos, Casio, Python y quiz coherentes', () => {
    for (const fam of VOLUME_FAMILIES_IDS)
      for (const lv of LEVELS)
        for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
          const p = generate(fam, lv, seed)
          expect(p.steps.length).toBeGreaterThan(3)
          expect(p.casio.length).toBeGreaterThan(1)
          expect(p.task && p.task.length).toBeGreaterThan(20)
          for (const s of p.steps) for (const l of s.lines) expect(l, `${p.id}`).not.toMatch(/undefined|NaN|\+-|--|\\left\(\\right\)/)
          expect(p.answer).not.toMatch(/undefined|NaN/)
          const py = pythonFor(p)
          expect(py.blocks.length).toBeGreaterThanOrEqual(4)
          for (const q of buildQuiz(p)) {
            if (q.kind === 'expr' && q.expected !== '(derivada de u)') expect(q.check(q.expected), `${p.id} ${q.id}: ${q.expected}`).toBe(true)
            if (q.kind === 'num') expect(q.check(q.expected), `${p.id} ${q.id}`).toBe(true)
            if (q.kind === 'nums') expect(q.check(q.expected), `${p.id} ${q.id}`).toBe(true)
          }
        }
  })
  it('hay 11 familias en total', () => expect(ALL_FAMILIES.length).toBe(11))
})
