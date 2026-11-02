import { useState } from 'react'
import { useAgent } from '../agent/AgentContext'
import { streamChat } from '../agent/client'
import { DEFAULT_SETTINGS, PROVIDERS } from '../agent/settings'
import type { ProviderId } from '../agent/settings'

export function Config() {
  const { settings, setSettings, configured } = useAgent()
  const [show, setShow] = useState(false)
  const [status, setStatus] = useState<{ ok: boolean; text: string } | null>(null)
  const [testing, setTesting] = useState(false)
  const set = (p: Partial<typeof settings>) => setSettings({ ...settings, ...p })

  const test = async () => {
    setTesting(true)
    setStatus(null)
    let out = ''
    try {
      await streamChat({ settings, messages: [{ role: 'user', content: 'Responde únicamente con la palabra: LISTO' }], onDelta: (d) => (out += d) })
      setStatus(out ? { ok: true, text: `Conexión correcta. Respuesta del modelo: “${out.trim().slice(0, 80)}”` } : { ok: false, text: 'Conectó pero el modelo no devolvió texto. Revisa el ID del modelo.' })
    } catch (e) {
      setStatus({ ok: false, text: (e as Error).message })
    }
    setTesting(false)
  }

  return (
    <div className="page">
      <h1>Configuración del agente de IA</h1>
      <p className="lead">
        Pega tu propia API key. El agente es <b>opcional</b>: toda la app funciona sin él. Con él puedes pedir explicaciones más profundas de cada línea del procedimiento y del código Python.
      </p>
      <div className="panel">
        <label className="field">
          Proveedor
          <select
            value={settings.provider}
            onChange={(e) => {
              const pv = e.target.value as ProviderId
              set({ provider: pv, baseUrl: PROVIDERS[pv].baseUrl || settings.baseUrl })
            }}
          >
            {Object.entries(PROVIDERS).map(([k, v]) => (
              <option key={k} value={k}>
                {v.label}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          URL base (editable)
          <input value={settings.baseUrl} onChange={(e) => set({ baseUrl: e.target.value })} placeholder="https://…/v1" spellCheck={false} />
          <small className="muted">Se llama a <code>{'{URL base}'}/chat/completions</code> (formato compatible con OpenAI, con streaming).</small>
        </label>
        <label className="field">
          API key
          <span className="inline">
            <input type={show ? 'text' : 'password'} value={settings.apiKey} onChange={(e) => set({ apiKey: e.target.value })} placeholder="sk-…" autoComplete="off" spellCheck={false} />
            <button className="btn-tiny" onClick={() => setShow(!show)}>{show ? 'Ocultar' : 'Mostrar'}</button>
          </span>
        </label>
        <label className="field">
          ID del modelo (texto libre)
          <input value={settings.model} onChange={(e) => set({ model: e.target.value })} placeholder={PROVIDERS[settings.provider].modelHint} spellCheck={false} />
          <small className="muted">Escribe exactamente el ID que quieras usar; no hay lista cerrada.</small>
        </label>
        <div className="row">
          <button className="btn btn-primary" onClick={test} disabled={!configured || testing}>
            {testing ? 'Probando…' : 'Probar conexión'}
          </button>
          <button className="btn" onClick={() => { setSettings(DEFAULT_SETTINGS); setStatus(null) }}>Borrar clave y ajustes</button>
        </div>
        {status && <div className={`note ${status.ok ? 'tip' : 'warn'}`}>{status.text}</div>}
      </div>
      <div className="panel note warn">
        <b>Privacidad y seguridad</b>
        <ul>
          <li>Tu clave se guarda <b>solo en este navegador</b> (localStorage). No se sube a GitHub ni está dentro del código publicado.</li>
          <li>Las preguntas se envían <b>directamente desde tu navegador</b> al proveedor que elijas, junto con el ejercicio abierto. No hay servidor intermedio.</li>
          <li>No uses este equipo si es compartido, o pulsa “Borrar clave” al terminar. Usa una clave con límite de gasto.</li>
          <li>Si el proveedor bloquea llamadas desde el navegador (CORS), verás un mensaje de conexión: en ese caso usa otra URL base compatible.</li>
          <li>La URL de opencode Go (<code>https://opencode.ai/zen/go/v1</code>) viene de fuentes de terceros y no la verifiqué en la documentación oficial: si falla, corrígela con la de tu plan.</li>
        </ul>
      </div>
    </div>
  )
}
