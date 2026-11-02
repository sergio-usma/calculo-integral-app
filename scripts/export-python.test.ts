import { it } from 'vitest'
import { writeFileSync } from 'node:fs'
import { FAMILIES, LEVELS, generate } from '../src/engine'
import { pythonFor } from '../src/engine/python'

// Genera los scripts para que scripts/verify-python.py los ejecute con Python real.
// Solo corre si defines PY_OUT (ver scripts/verify-python.py)
it.skipIf(!process.env.PY_OUT)('exporta scripts', () => {
  const out: { id: string; code: string }[] = []
  for (const f of FAMILIES) for (const l of LEVELS) for (const s of [1, 2, 3]) {
    const p = generate(f, l, s)
    out.push({ id: p.id, code: pythonFor(p).full })
  }
  writeFileSync(process.env.PY_OUT ?? 'py-scripts.json', JSON.stringify(out))
})
