/* Ejecuta Python (SymPy) en el navegador con Pyodide, cargado bajo demanda desde un CDN. */
const VERSION = '0.27.7'
const BASE = `https://cdn.jsdelivr.net/pyodide/v${VERSION}/full/`

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Pyodide = any
let ready: Promise<Pyodide> | null = null

function loadScript(src: string): Promise<void> {
  return new Promise((res, rej) => {
    const s = document.createElement('script')
    s.src = src
    s.onload = () => res()
    s.onerror = () => rej(new Error('No se pudo descargar Pyodide (¿sin internet?)'))
    document.head.appendChild(s)
  })
}

export function loadPython(onStatus: (s: string) => void): Promise<Pyodide> {
  if (!ready) {
    ready = (async () => {
      onStatus('Descargando el intérprete de Python (~10 MB, solo la primera vez)…')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      if (!(window as any).loadPyodide) await loadScript(`${BASE}pyodide.js`)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const py = await (window as any).loadPyodide({ indexURL: BASE })
      onStatus('Cargando SymPy…')
      await py.loadPackage('sympy')
      return py
    })().catch((e) => {
      ready = null
      throw e
    })
  }
  return ready
}

export async function runPython(code: string, onStatus: (s: string) => void): Promise<{ out: string; err: string | null }> {
  const py = await loadPython(onStatus)
  const out: string[] = []
  py.setStdout({ batched: (s: string) => out.push(s) })
  py.setStderr({ batched: (s: string) => out.push(s) })
  onStatus('Ejecutando…')
  try {
    await py.runPythonAsync(code)
    return { out: out.join('\n'), err: null }
  } catch (e) {
    return { out: out.join('\n'), err: String((e as Error).message ?? e).split('\n').slice(-6).join('\n') }
  }
}
