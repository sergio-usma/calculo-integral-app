export type ProviderId = 'openai' | 'opencode' | 'custom'

export interface Settings {
  provider: ProviderId
  baseUrl: string
  apiKey: string
  model: string
}

export const PROVIDERS: Record<ProviderId, { label: string; baseUrl: string; modelHint: string }> = {
  openai: { label: 'OpenAI', baseUrl: 'https://api.openai.com/v1', modelHint: 'p. ej. el ID exacto del modelo que quieras usar' },
  opencode: { label: 'opencode Go', baseUrl: 'https://opencode.ai/zen/go/v1', modelHint: 'ID del modelo disponible en tu plan de opencode Go' },
  custom: { label: 'Otro (compatible con OpenAI)', baseUrl: '', modelHint: 'ID del modelo en tu proveedor' },
}

const KEY = 'ci.settings.v1'

export const DEFAULT_SETTINGS: Settings = { provider: 'openai', baseUrl: PROVIDERS.openai.baseUrl, apiKey: '', model: '' }

export function loadSettings(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(s: Settings) {
  localStorage.setItem(KEY, JSON.stringify(s))
}

export const isConfigured = (s: Settings) => s.apiKey.trim().length > 0 && s.model.trim().length > 0 && s.baseUrl.trim().length > 0
