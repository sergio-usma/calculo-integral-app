/**
 * Normaliza el LaTeX que escriben los modelos para que remark-math (solo `$…$` y `$$…$$`) lo renderice:
 *  - `\(…\)` → `$…$` y `\[…\]` → `$$…$$`
 *  - `$$` sin pareja (incluido el streaming a medias) se completa
 *  - `$` suelto se escapa
 *  - LaTeX "desnudo" (`\frac{1}{2}\cos 2\theta` sin `$`) se envuelve en `$…$`
 * El código (``` y `inline`) no se toca. Es idempotente.
 */

const TEX_CMD = /\\[A-Za-z]{2,}/
const MATHY = /[=+\-*/^_<>|]|\d/

function protect(text: string): { out: string; restore: (s: string) => string } {
  const store: string[] = []
  const hold = (m: string) => `\u0000${store.push(m) - 1}\u0000`
  const out = text.replace(/```[\s\S]*?(```|$)/g, hold).replace(/`[^`\n]*`/g, hold)
  return { out, restore: (s) => s.replace(/\u0000(\d+)\u0000/g, (_, i) => store[Number(i)]) }
}

const count = (s: string, re: RegExp) => (s.match(re) ?? []).length

/** Envuelve en `$…$` los tramos de una línea que parecen LaTeX y no tienen delimitadores. */
function wrapBare(line: string): string {
  if (!TEX_CMD.test(line)) return line
  const parts = line.split(/(\s+)/)
  const res: string[] = []
  let depth = 0
  let i = 0
  const isTex = (t: string) => TEX_CMD.test(t)
  const isMathy = (t: string) => /^[A-Za-z]$/.test(t) || (!/\p{L}{2,}/u.test(t) && t.length > 0) || (MATHY.test(t) && !/^\p{L}{3,}[.,;:]?$/u.test(t))
  const depthAfter = (t: string, d: number) => d + count(t, /\{/g) - count(t, /\}/g)
  while (i < parts.length) {
    const t = parts[i]
    if (/^\s*$/.test(t) || !(isTex(t) || depth > 0)) {
      res.push(t)
      i++
      continue
    }
    // inicio de un tramo matemático
    let j = i
    let d = depth
    let end = i
    while (j < parts.length) {
      const p = parts[j]
      if (/^\s+$/.test(p)) {
        j++
        continue
      }
      if (d > 0 || isTex(p) || isMathy(p)) {
        d = Math.max(0, depthAfter(p, d))
        end = j
        j++
      } else break
    }
    let span = parts.slice(i, end + 1).join('')
    const trail = span.match(/[.,;:]+$/)?.[0] ?? ''
    if (trail) span = span.slice(0, -trail.length)
    res.push(`$${span.trim()}$${trail}`)
    i = end + 1
    depth = 0
  }
  return res.join('')
}

export function normalizeMath(input: string): string {
  const { out, restore } = protect(input)
  let s = out.replace(/\\\[([\s\S]*?)\\\]/g, (_, m) => `\n$$\n${m.trim()}\n$$\n`).replace(/\\\(([\s\S]*?)\\\)/g, (_, m) => `$${m.trim()}$`)

  const lines = s.split('\n')
  let open = false
  const res: string[] = []
  for (let line of lines) {
    const n = count(line.replace(/\\\$/g, ''), /\$\$/g)
    if (open) {
      if (n % 2 === 1) open = false
      res.push(line)
      continue
    }
    if (n % 2 === 1) {
      const t = line.trim()
      if (t.startsWith('$$') && !t.endsWith('$$')) open = true
      else if (t === '$$') open = true
      else if (t.endsWith('$$')) line = '$$' + line // falta la apertura: la ponemos al inicio
      else open = true
      res.push(line)
      continue
    }
    if (n === 0) {
      const singles = count(line.replace(/\\\$/g, ''), /\$/g)
      if (singles % 2 === 1) {
        const k = line.lastIndexOf('$')
        line = line.slice(0, k) + '\\$' + line.slice(k + 1)
      } else if (singles === 0) line = wrapBare(line)
    }
    res.push(line)
  }
  s = res.join('\n')
  if (open) s += '\n$$'
  return restore(s)
}
