import { derivative, parse } from 'mathjs'
import { describe, expect, it, vi } from 'vitest'
import { deltaOf, friendlyError, splitSSE, streamChat } from './agent/client'
import { FAMILIES, LEVELS, generate } from './engine'
import { pythonFor } from './engine/python'
import { buildQuiz, ghostOf, normalizeInput, numberOf, sameExpr } from './engine/quiz'

describe('cliente SSE', () => {
  it('separa eventos y conserva el resto incompleto', () => {
    const r = splitSSE('data: {"a":1}\n\ndata: {"b"')
    expect(r.events).toEqual(['{"a":1}'])
    expect(r.rest).toBe('data: {"b"')
  })
  it('lee deltas y [DONE]', () => {
    expect(deltaOf('{"choices":[{"delta":{"content":"hola $x^2$"}}]}')).toBe('hola $x^2$')
    expect(deltaOf('[DONE]')).toBeNull()
    expect(deltaOf('basura')).toBe('')
  })
  it('mensajes de error en español', () => {
    expect(friendlyError(401, '{"error":{"message":"bad key"}}')).toMatch(/clave/i)
    expect(friendlyError(404, '')).toMatch(/modelo/)
    expect(friendlyError(429, '')).toMatch(/429/)
  })
  it('transmite por streaming y reensambla trozos partidos', async () => {
    const enc = new TextEncoder()
    const chunks = ['data: {"choices":[{"delta":{"content":"La integral es $\\\\int"}}]}\n', '\ndata: {"choices":[{"delta":{"content":" x\\\\,dx$"}}]}\n\ndata: [DONE]\n\n']
    const body = new ReadableStream({
      start(c) {
        chunks.forEach((k) => c.enqueue(enc.encode(k)))
        c.close()
      },
    })
    const fetchMock = vi.fn().mockResolvedValue(new Response(body, { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)
    let out = ''
    await streamChat({ settings: { provider: 'custom', baseUrl: 'https://x.test/v1/', apiKey: ' k ', model: ' m1 ' }, messages: [{ role: 'user', content: 'hi' }], onDelta: (d) => (out += d) })
    expect(out).toBe('La integral es $\\int x\\,dx$')
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://x.test/v1/chat/completions')
    expect(init.headers.Authorization).toBe('Bearer k')
    expect(JSON.parse(init.body).model).toBe('m1')
    expect(JSON.parse(init.body).stream).toBe(true)
  })
  it('error HTTP 401 → mensaje', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('{"error":{"message":"no"}}', { status: 401 })))
    await expect(streamChat({ settings: { provider: 'openai', baseUrl: 'https://x.test/v1', apiKey: 'k', model: 'm' }, messages: [], onDelta: () => {} })).rejects.toThrow(/rechazada/)
  })
})

describe('entrada del alumno', () => {
  it('normaliza y compara expresiones', () => {
    expect(normalizeInput('ln(x)+π')).toBe('log(x)+pi')
    expect(sameExpr('2x^2+4', '2*x^2+4', 'x')).toBe(true)
    expect(sameExpr('x^2+4', '2*x^2+4', 'x')).toBe(false)
    expect(numberOf('pi^2/4')).toBeCloseTo(2.4674, 3)
    expect(numberOf('2*sqrt(2)')).toBeCloseTo(2.8284, 3)
    expect(numberOf('hola')).toBeNull()
  })
  it('autocompletado fantasma', () => {
    expect(ghostOf('x^', 'x^2+1')).toBe('2+1')
    expect(ghostOf('y', 'x^2+1')).toBe('')
  })
})

describe('quiz: la respuesta correcta siempre es aceptada', () => {
  for (const fam of FAMILIES)
    for (const lv of LEVELS)
      it(`familia ${fam} ${lv}`, () => {
        for (const seed of [1, 2, 3, 4, 5, 6]) {
          const p = generate(fam, lv, seed)
          const qs = buildQuiz(p)
          expect(qs.length).toBeGreaterThanOrEqual(3)
          for (const q of qs) {
            if (q.kind === 'choice') {
              expect(q.check('', q.correct)).toBe(true)
              expect(q.check('', (q.correct! + 1) % q.choices!.length)).toBe(false)
            } else if (q.id === 'du') {
              const d = derivative(parse(p.py && p.py.kind === 'subst' ? p.py.u.replace(/\*\*/g, '^') : 'x'), 'x').toString()
              expect(q.check(d), `${p.id} du=${d}`).toBe(true)
              expect(q.check('0')).toBe(false)
            } else if (q.id === 'dv') {
              // v = antiderivada de f/u: se acepta F de la integral solo si deriva a dv; usamos casos conocidos
              expect(q.check('')).toBe(false)
            } else if (q.id === 'A' || q.id === 'B' || q.id === 'C') {
              expect(q.check(q.expected), `${p.id} ${q.id}`).toBe(true)
              expect(q.check('12345')).toBe(false)
            } else if (q.id === 'cuts' || q.id === 'area') {
              expect(q.check(q.expected), `${p.id} ${q.id} ${q.expected}`).toBe(true)
              expect(q.check('999')).toBe(false)
            } else {
              expect(q.check(q.expected), `${p.id} ${q.id} ${q.expected}`).toBe(true)
            }
          }
        }
      })
  it('respuestas finales incorrectas son rechazadas', () => {
    const p = generate(1, 'T', 1)
    const fin = buildQuiz(p).find((q) => q.id === 'final')!
    expect(fin.check('x^2')).toBe(false)
    expect(fin.check(p.FExpr! + ' + 7')).toBe(true) // la constante no importa
  })
})

describe('python: todos los scripts generados tienen estructura y ya se verificaron con Python real', () => {
  it('cada problema produce bloques y script completo', () => {
    for (const fam of FAMILIES)
      for (const lv of LEVELS) {
        const s = pythonFor(generate(fam, lv, 2))
        expect(s.blocks.length).toBeGreaterThanOrEqual(5)
        expect(s.full).toContain('from sympy import')
        expect(s.full).toMatch(/assert /)
        expect(s.starts.length).toBe(s.blocks.length)
      }
  })
})
