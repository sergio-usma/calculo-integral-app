import { describe, expect, it } from 'vitest'
import { FAMILIES, LEVELS, generate } from './engine'
import { fn, simpson } from './engine/util'

const SEEDS = Array.from({ length: 120 }, (_, i) => i + 1)

describe('integrales: F\' = f', () => {
  for (const fam of [1, 2, 3, 4, 5, 6])
    for (const lv of LEVELS)
      it(`familia ${fam} ${lv}`, () => {
        for (const seed of SEEDS) {
          const p = generate(fam, lv, seed)
          const f = fn(p.fExpr!)
          const F = fn(p.FExpr!)
          for (const x of p.testPts!) {
            const h = 1e-5
            const d = (F(x + h) - F(x - h)) / (2 * h)
            const tol = 1e-4 * Math.max(1, Math.abs(f(x)))
            expect(Math.abs(d - f(x)), `${p.id} x=${x} f=${f(x)} F'=${d}\n${p.fExpr}\n${p.FExpr}`).toBeLessThan(tol)
          }
        }
      })
})

describe('áreas: valor = integral numérica', () => {
  for (const fam of [7, 8, 9])
    for (const lv of LEVELS)
      it(`familia ${fam} ${lv}`, () => {
        for (const seed of SEEDS) {
          const p = generate(fam, lv, seed)
          const a = p.area!
          let sum = 0
          for (const r of a.regions) {
            const top = fn(r.top)
            const bottom = fn(r.bottom)
            sum += simpson((x) => top(x) - bottom(x), r.a, r.b)
            // el techo realmente está arriba en el medio
            const m = (r.a + r.b) / 2
            expect(top(m) - bottom(m), `${p.id} orden`).toBeGreaterThan(0)
          }
          expect(Math.abs(sum - a.value), `${p.id} área ${sum} vs ${a.value}`).toBeLessThan(1e-5)
        }
      })
})

describe('contenido', () => {
  it('todos los problemas tienen pasos y respuesta', () => {
    for (const fam of FAMILIES)
      for (const lv of LEVELS) {
        const p = generate(fam, lv, 3)
        expect(p.steps.length).toBeGreaterThan(2)
        expect(p.answer.length).toBeGreaterThan(0)
        expect(p.casio.length).toBeGreaterThan(1)
        for (const s of p.steps) for (const l of s.lines) expect(l).not.toMatch(/undefined|NaN|\+-|--/)
      }
  })
})
