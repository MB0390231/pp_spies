// The theme/settings provider. Resolves the active theme, writes its tokens as
// CSS custom properties on <html> (so Tailwind's semantic classes restyle the
// whole app, overlays included), and persists { themeId, hardMode } to
// localStorage under its own key — the engine's `spies:game` blob is untouched.

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react'
import { DEFAULT_THEME_ID, getTheme, THEME_LIST } from './registry'
import type { Theme } from './types'

const STORAGE_KEY = 'spies:settings'

interface StoredSettings {
  themeId?: string
  hardMode?: boolean
}

function loadSettings(): StoredSettings {
  if (typeof localStorage === 'undefined') return {}
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    return raw ? (JSON.parse(raw) as StoredSettings) : {}
  } catch {
    return {}
  }
}

/** Write every token to CSS variables + document metadata. */
function applyTheme(theme: Theme) {
  const root = document.documentElement
  const set = (name: string, value: string) => root.style.setProperty(name, value)
  const { colors: c, fonts, type, radii, shadows, motion, decor } = theme.tokens

  set('--c-bg', c.bg)
  set('--c-surface', c.surface)
  set('--c-raised', c.raised)
  set('--c-line', c.line)
  set('--c-line-strong', c.lineStrong)
  set('--c-ink', c.ink)
  set('--c-muted', c.muted)
  set('--c-faint', c.faint)
  set('--c-accent', c.accent)
  set('--c-accent-ink', c.accentInk)
  set('--c-danger', c.danger)
  set('--c-danger-ink', c.dangerInk)
  set('--c-focus', c.focus)

  set('--f-display', fonts.display)
  set('--f-body', fonts.body)
  set('--f-mono', fonts.mono)
  set('--tr-label', type.trackingLabel)

  set('--r-card', radii.card)
  set('--r-control', radii.control)
  set('--r-field', radii.field)
  set('--r-chip', radii.chip)

  set('--sh-card', shadows.card)
  set('--sh-pop', shadows.pop)
  set('--sh-glow-accent', shadows.glowAccent)
  set('--sh-glow-danger', shadows.glowDanger)

  set('--m-fast', motion.fast)
  set('--m-base', motion.base)
  set('--m-slow', motion.slow)
  set('--ease', motion.ease)
  set('--ease-spring', motion.easeSpring)

  set('--decor-backdrop', decor.backdrop)

  document.title = `${theme.lexicon.app.name} — ${theme.lexicon.app.subtitle}`
  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute('content', theme.tokens.meta.themeColor)
}

interface ThemeContextValue {
  theme: Theme
  themeId: string
  setThemeId: (id: string) => void
  hardMode: boolean
  setHardMode: (on: boolean) => void
  /** All registered themes, in picker order. */
  themes: readonly Theme[]
}

const ThemeContext = createContext<ThemeContextValue | null>(null)

export function ThemeProvider({
  children,
  persist = true,
}: {
  children: ReactNode
  /** When false, never touch localStorage (e.g. previews). */
  persist?: boolean
}) {
  const [themeId, setThemeId] = useState<string>(
    () => loadSettings().themeId ?? DEFAULT_THEME_ID,
  )
  const [hardMode, setHardMode] = useState<boolean>(() => loadSettings().hardMode ?? false)
  const theme = getTheme(themeId)

  useEffect(() => {
    if (!persist) return
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ themeId, hardMode }))
    } catch {
      // Storage unavailable — settings still work in-session.
    }
  }, [themeId, hardMode, persist])

  useEffect(() => {
    applyTheme(theme)
  }, [theme])

  return (
    <ThemeContext.Provider
      value={{ theme, themeId, setThemeId, hardMode, setHardMode, themes: THEME_LIST }}
    >
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext)
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider')
  return ctx
}

/** Shortcut for the active theme's copy dictionary. */
export function useLexicon() {
  return useTheme().theme.lexicon
}
