# Authoring a theme

A **theme** reskins the entire game twice over: the **visual tokens** (colors,
fonts, radii, shadows, motion, backdrop) and the **lexicon** (every
player-facing string — the game's name, the factions, all button labels, the
rules sheet, the tutorial narration). Screens never hardcode either: they
author semantic Tailwind classes (`bg-surface text-ink`) and read copy from
`useLexicon()`. Swap the theme and the whole app — all eight phase screens,
the overlays, the tutorial, the storybook — re-dresses and re-narrates itself.

The single source of truth for the contract is
[`src/theme/types.ts`](src/theme/types.ts). A theme is one plain-data object:

```ts
export interface Theme {
  id: string        // stable, persisted to localStorage — never rename a shipped id
  name: string      // display name in the Settings theme picker
  blurb: string     // one line under the name in the picker
  tokens: ThemeTokens
  lexicon: Lexicon
}
```

The complete reference implementation is
[`src/theme/themes/midnightDossier.ts`](src/theme/themes/midnightDossier.ts) —
copy it and rewrite every value.

---

## How the plumbing works (you rarely need to touch it)

1. **`ThemeProvider`** ([`src/theme/ThemeContext.tsx`](src/theme/ThemeContext.tsx))
   resolves the active theme and writes every token to CSS custom properties on
   `<html>` (`--c-bg`, `--f-display`, `--r-card`, …). It also sets
   `document.title` and the `theme-color` meta from the theme, and persists
   `{ themeId, hardMode }` to localStorage key **`spies:settings`** (separate
   from the engine's `spies:game` blob). Mounted in `src/main.tsx` and, with
   `persist={false}`, in `src/storybook/main.tsx`.
2. **Tailwind** ([`tailwind.config.js`](tailwind.config.js)) maps semantic
   utilities onto those variables — colors via
   `rgb(var(--c-x) / <alpha-value>)` so alpha modifiers like `bg-accent/15`
   work. [`src/index.css`](src/index.css) applies the app background + backdrop
   decor + base font + focus outline from the same variables, defines the
   `.bg-backdrop` utility used by full-screen overlays, and carries `:root`
   fallback values (= Midnight Dossier) for the first paint.
3. **Components** call `useLexicon()` for copy and `fmt(template, vars)`
   ([`src/theme/fmt.ts`](src/theme/fmt.ts)) to fill `{placeholders}`.

## Token → CSS variable → Tailwind class

| Token (in `ThemeTokens`)   | CSS variable        | Tailwind usage                                    |
| -------------------------- | ------------------- | ------------------------------------------------- |
| `colors.bg`                | `--c-bg`            | `bg-bg` (body/backdrop background)                |
| `colors.surface`           | `--c-surface`       | `bg-surface` — cards, list rows                   |
| `colors.raised`            | `--c-raised`        | `bg-raised` — controls/chips on a surface         |
| `colors.line`              | `--c-line`          | `border-line` — hairline borders                  |
| `colors.lineStrong`        | `--c-line-strong`   | `border-line-strong`, `ring-line-strong`          |
| `colors.ink`               | `--c-ink`           | `text-ink` — primary text                         |
| `colors.muted`             | `--c-muted`         | `text-muted` — secondary text                     |
| `colors.faint`             | `--c-faint`         | `text-faint` — labels, counters, hints            |
| `colors.accent`            | `--c-accent`        | `bg-accent`, `text-accent` — good faction/approve |
| `colors.accentInk`         | `--c-accent-ink`    | `text-accent-ink` — text on accent fills          |
| `colors.danger`            | `--c-danger`        | `bg-danger`, `text-danger` — bad faction/reject   |
| `colors.dangerInk`         | `--c-danger-ink`    | `text-danger-ink` — text on danger fills          |
| `colors.focus`             | `--c-focus`         | `:focus-visible` outline (index.css)              |
| `fonts.display`            | `--f-display`       | `font-display` — big names and verdicts           |
| `fonts.body`               | `--f-body`          | `font-body` (also the base body font)             |
| `fonts.mono`               | `--f-mono`          | `font-mono` — eyebrows, counters, labels          |
| `type.trackingLabel`       | `--tr-label`        | `tracking-label` (pair with `uppercase font-mono`)|
| `radii.card`               | `--r-card`          | `rounded-card` — sheets, section cards            |
| `radii.control`            | `--r-control`       | `rounded-control` — buttons                       |
| `radii.field`              | `--r-field`         | `rounded-field` — inputs, rows, player tiles      |
| `radii.chip`               | `--r-chip`          | `rounded-chip` — tags and chips                   |
| `shadows.card` / `pop`     | `--sh-card`/`--sh-pop` | `shadow-card`, `shadow-pop`                    |
| `shadows.glowAccent`       | `--sh-glow-accent`  | `shadow-glow-accent`                              |
| `shadows.glowDanger`       | `--sh-glow-danger`  | `shadow-glow-danger`                              |
| `motion.fast`/`base`/`slow`| `--m-fast`/`--m-base`/`--m-slow` | `duration-fast` / `duration-base` / `duration-slow`; also drive the `animate-rise/fade/pop/sheet-up` keyframes |
| `motion.ease`/`easeSpring` | `--ease`/`--ease-spring` | `ease-theme`, `ease-spring`                  |
| `decor.backdrop`           | `--decor-backdrop`  | layered over `bg` on the body and `.bg-backdrop`  |
| `meta.themeColor`          | (meta tag)          | browser chrome `<meta name="theme-color">`        |

**Color format matters:** every color is a space-separated RGB triple, e.g.
`'12 18 25'` — *not* `#0c1219`, *not* `rgb(...)`. This is what lets Tailwind
compose alpha (`bg-accent/20` → `rgb(var(--c-accent) / 0.2)`). The only hex
value in a theme is `meta.themeColor`. Shadows/glows and `decor.backdrop` are
raw CSS values and may use any color syntax internally.

## The lexicon

`Lexicon` (in `types.ts`) covers **every** player-facing string; each group
maps to a surface:

- **`app`** — name, emoji icon, subtitle, tagline (title screen + window title).
- **`factions`** — the good/bad side's `name` and `member` noun. Used on
  Game Over and anywhere a role is named.
- **`scoreTrack`** — the `Mission {round} / {total}` and
  `Rejects {count} / {max}` counters in the in-game header.
- **`topBar`** — the Rules / Pause buttons.
- **`handoff`** — the pass-the-phone gate: eyebrow `prompt`, `confirm`
  button (`{name}`), and the `privacy` reminder (`{name}`). This is the
  secrecy primitive; keep the copy unambiguous about who may look.
- **`setup`** — title screen: player summary (`{players} {spies}`), input
  placeholder (`{n}`), add/remove labels, `playerCount` (`{count}`), the start
  CTA and its two validation states, `howToPlay`, `settings`.
- **`settings`** — the Settings sheet: title, done, theme label, hard-mode
  label/body/note.
- **`roleReveal`** — eyebrow, good/bad titles and bodies, next/last CTAs.
- **`proposal`** — leader eyebrow, `instruction` (`{count}`), `counter`
  (`{selected} {count}`), the tiny `leaderBadge` tag, CTA.
- **`vote`** — `progress` (`{done} {total}`), team label, question,
  approve/reject buttons (also used as the revealed row labels).
- **`voteReveal`** — title, reveal-next, APPROVED/REJECTED verdicts, `tally`
  (`{approve} {reject}`), begin/next-leader CTAs.
- **`mission`** — `progress` (`{done} {total}`), prompt, succeed/fail cards,
  `lockedHint` shown to good-faction players instead of the fail button.
- **`missionReveal`** — `title` (`{round}`), success/failure verdicts,
  `failsOne`, `failsMany` (`{count}`, also used for zero), `neededNote`
  (`{needed}`), continue.
- **`gameOver`** — eyebrow, both win headlines, `tally`
  (`{successes} {fails}`), roles label, play-again.
- **`pause`** — title, body, resume, view rules, quit, quit-confirm, cancel.
- **`rules`** — the quick-reference sheet: title, close, table column headers
  (`roundCol` takes `{n}`), the four chips, five `RuleSection`s
  (goal/track/teams/voting/missions — bodies support `**bold**` spans), and
  the hard-mode footnote.
- **`tutorial`** — `you` + `botNames` (the scripted five-player cast),
  back/prev/next controls, eight `CoachCopy` scenes (title, body, optional
  cta), `voteNudge`, `notOnTeam` (`{a} {b}`), `seeResult`, `outroProgress`,
  `replay`.

Templates use `{placeholder}` and are resolved with `fmt()`; the placeholders
each key receives are documented inline in `types.ts`. Unknown placeholders are
left visible, so typos show up on screen — check yours in the app.

## Worked example: adding a new theme

Say you're building **"Release the Files"**.

1. **Create the theme file** `src/theme/themes/releaseTheFiles.ts`:

   ```ts
   import type { Theme } from '../types'

   export const releaseTheFiles: Theme = {
     id: 'release-the-files',
     name: 'Release the Files',
     blurb: 'Redacted memos, leaked binders, sharpie stamps.',
     tokens: {
       colors: {
         bg: '247 244 237', // manila paper — triples, not hex!
         // ... every key in ThemeColors
       },
       fonts: { display: '...', body: '...', mono: '...' },
       type: { trackingLabel: '0.18em' },
       radii: { card: '0.5rem', control: '0.375rem', field: '0.375rem', chip: '0.25rem' },
       shadows: { card: '...', pop: '...', glowAccent: '...', glowDanger: '...' },
       motion: { fast: '100ms', base: '200ms', slow: '380ms', ease: '...', easeSpring: '...' },
       decor: { backdrop: 'repeating-linear-gradient(...)' },
       meta: { themeColor: '#F7F4ED' },
     },
     lexicon: {
       app: { name: 'The Files', icon: '🗂️', subtitle: 'Pass & Play', tagline: '...' },
       factions: {
         good: { name: 'The Investigators', member: 'Investigator' },
         bad: { name: 'The Fixers', member: 'Fixer' },
       },
       // ... every remaining group. Start from midnightDossier.ts and rewrite
       // every string in the new voice; keep the {placeholders} intact.
     },
   }
   ```

   TypeScript enforces completeness — if it compiles, no key is missing.

2. **Register it** in [`src/theme/registry.ts`](src/theme/registry.ts):

   ```ts
   import { midnightDossier } from './themes/midnightDossier'
   import { releaseTheFiles } from './themes/releaseTheFiles'

   export const THEME_LIST: readonly Theme[] = [midnightDossier, releaseTheFiles]
   ```

   That's it — the Settings sheet picker (gear on the Setup screen) renders
   `THEME_LIST` in order, painting each card's preview from the theme's own
   tokens.

3. **(Optional) make it the default** for fresh installs:

   ```ts
   export const DEFAULT_THEME_ID = releaseTheFiles.id
   ```

   Users who already picked a theme keep their choice (`spies:settings`);
   unknown/stale ids fall back to the default via `getTheme()`.

4. **Verify.** `npm run dev` → gear → select the theme, play a round. Then
   `npm run dev` and open `/storybook.html` to eyeball every screen, overlay,
   and the Settings sheet against fixtures (the storybook provider doesn't
   persist, so previewing there never touches real settings). Finish with
   `npm run type-check && npm test && npm run build`.

### Design notes for new themes

- **Contrast pairs:** `accentInk` sits on `accent` fills, `dangerInk` on
  `danger` fills, `ink/muted/faint` on `bg/surface/raised`. Check the
  disabled-button state (40% opacity) and the vote/mission verdict text on
  `bg` for legibility.
- **Light themes work** — nothing assumes darkness, but revisit
  `shadows.*` (dark themes glow, light themes drop-shadow) and keep
  `decor.backdrop` subtle: it sits behind every screen including overlays.
- **The lexicon is one voice.** `factions`, the role-reveal bodies, the rules
  sheet, and the tutorial coach all tell the same story — rewrite them
  together, not piecemeal. Keep mechanics accurate (majority vote, 5 rejects,
  the round-4 two-fails rule) even in a new fiction.
