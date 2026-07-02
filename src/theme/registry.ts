// The theme registry. To ship a new theme: create it under ./themes/, import
// it here, add it to THEME_LIST, and (optionally) point DEFAULT_THEME_ID at it.
// The picker in Settings renders THEME_LIST in order.

import { midnightDossier } from './themes/midnightDossier'
import { releaseTheFiles } from './themes/releaseTheFiles'
import type { Theme } from './types'

export const THEME_LIST: readonly Theme[] = [releaseTheFiles, midnightDossier]

export const DEFAULT_THEME_ID = releaseTheFiles.id

/** Resolve a theme id, falling back to the default so the app always renders. */
export function getTheme(id: string | null | undefined): Theme {
  return THEME_LIST.find((t) => t.id === id) ?? THEME_LIST.find((t) => t.id === DEFAULT_THEME_ID) ?? THEME_LIST[0]!
}
