import { describe, expect, it } from 'vitest'
import { ALL_ENTRIES } from './content/cheatsheet'
import { LESSONS } from './engine/algebra'
import { derivativeIs, sameExpr } from './engine/quiz'
import { fn, rng } from './engine/util'

const PTS = [0.3, 0.5, 0.7]

describe('cheatsheet: cada fórmula verificable se cumple numéricamente', () => {
  const chk = ALL_ENTRIES.filter((e) => e.chk)
  it('hay suficientes fórmulas verificadas', () => expect(chk.length).toBeGreaterThanOrEqual(25))
  for (const e of chk)
    it(e.name, () => {
      const c = e.chk!
      if (c.kind === 'id') expect(sameExpr(c.l, c.r, 'x', PTS), `${c.l} vs ${c.r}`).toBe(true)
      else if (c.kind === 'der') expect(derivativeIs(c.f, fn(c.d), PTS), `${c.f}' vs ${c.d}`).toBe(true)
      else expect(derivativeIs(c.F, fn(c.f), PTS), `${c.F}' vs ${c.f}`).toBe(true)
    })
  it('todas las entradas tienen porqué, ejemplo y mnemotecnia', () => {
    for (const e of ALL_ENTRIES) {
      expect(e.why.length).toBeGreaterThan(10)
      expect(e.example.length).toBeGreaterThan(0)
      expect(e.mnemonic.length).toBeGreaterThan(8)
    }
    expect(new Set(ALL_ENTRIES.map((e) => e.id)).size).toBe(ALL_ENTRIES.length)
  })
})

describe('álgebra: el ejercicio acepta su respuesta y rechaza una mala', () => {
  for (const l of LESSONS)
    it(l.title, () => {
      for (let s = 1; s <= 60; s++) {
        const ex = l.gen(rng(s))
        expect(ex.check(ex.expected), `${l.id} seed ${s}: ${ex.prompt} → ${ex.expected}`).toBe(true)
        expect(ex.check('987654.321'), `${l.id} seed ${s} acepta basura`).toBe(false)
        expect(ex.prompt).not.toMatch(/undefined|NaN/)
      }
    })
})
