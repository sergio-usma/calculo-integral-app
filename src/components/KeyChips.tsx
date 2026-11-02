const MODS = new Set(['SHIFT', 'ALPHA'])

export function KeyChips({ keys }: { keys: string[] }) {
  return (
    <div className="keys">
      {keys.map((k, i) => {
        const cls = MODS.has(k)
          ? 'key key-shift'
          : /^(MODE|CALC|=|AC|SETUP)/.test(k)
            ? 'key key-fn'
            : k.length > 9
              ? 'key key-expr'
              : 'key'
        return (
          <span key={i} className={cls}>
            {k}
          </span>
        )
      })}
    </div>
  )
}
