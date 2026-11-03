import { describe, expect, it } from 'vitest'
import { normalizeMath } from './mathfix'

describe('normalizeMath', () => {
  it('convierte \\( \\) y \\[ \\]', () => {
    expect(normalizeMath('Sea \\(u=x^2\\) ok')).toBe('Sea $u=x^2$ ok')
    expect(normalizeMath('\\[x^2\\]')).toContain('$$\nx^2\n$$')
  })
  it('añade la apertura que falta en $$ final', () => {
    const r = normalizeMath('=\\frac{1}{2}\\cos 2\\theta\\cdot 2 =\\cos 2\\theta$$')
    expect(r.startsWith('$$')).toBe(true)
    expect((r.match(/\$\$/g) ?? []).length % 2).toBe(0)
  })
  it('cierra un bloque $$ abierto (streaming)', () => {
    const r = normalizeMath('Mira:\n$$\n\\int x\\,dx')
    expect((r.match(/\$\$/g) ?? []).length).toBe(2)
  })
  it('escapa un $ suelto', () => {
    expect(normalizeMath('cuesta 5$ hoy')).toBe('cuesta 5\\$ hoy')
  })
  it('envuelve LaTeX desnudo sin tocar la prosa', () => {
    const r = normalizeMath('Integrar el término \\frac{1}{2}\\cos 2\\theta es fácil.')
    expect(r).toContain('$\\frac{1}{2}\\cos 2\\theta$')
    expect(r.startsWith('Integrar el término')).toBe(true)
    expect(r.endsWith('es fácil.')).toBe(true)
  })
  it('respeta el código', () => {
    const t = 'usa `\\frac{1}{2}` y\n```\n$$ sin cerrar \\int\n```'
    expect(normalizeMath(t)).toBe(t)
  })
  it('es idempotente', () => {
    for (const t of [
      '=\\frac{1}{2}\\cos 2\\theta\\cdot 2 =\\cos 2\\theta$$',
      'Sea \\(u=x^2\\) y \\[\\int u\\,du\\]',
      'texto \\int u^5\\,du = \\frac{u^6}{6} fin',
      '$$\n\\int x',
      'cuesta 5$ hoy',
    ]) {
      const a = normalizeMath(t)
      expect(normalizeMath(a)).toBe(a)
    }
  })
  it('no toca matemáticas ya correctas', () => {
    const t = 'Resultado: $\\theta+\\frac{\\sin 2\\theta}{2}+C$\n\n$$\n\\int 1\\,d\\theta=\\theta\n$$'
    expect(normalizeMath(t)).toBe(t)
  })
})
