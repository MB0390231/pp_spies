// The theme contract. A theme reskins BOTH the visual design tokens and the
// entire narrative (names, copy, icons). See THEMES.md at the repo root for
// the authoring guide. No React here — plain data shapes only.

/**
 * All colors are space-separated RGB triples, e.g. '12 18 25', so Tailwind's
 * alpha modifiers (`bg-accent/20`) keep working through the CSS variables.
 */
export interface ThemeColors {
  /** App background. */
  bg: string
  /** Cards and list rows. */
  surface: string
  /** Controls and chips that sit on a surface. */
  raised: string
  /** Default hairline borders. */
  line: string
  /** Emphasized borders (focused fields, current pip). */
  lineStrong: string
  /** Primary text. */
  ink: string
  /** Secondary text. */
  muted: string
  /** Tertiary text: labels, counters, hints. */
  faint: string
  /** The "good" faction color: approve, succeed, resistance. */
  accent: string
  /** Text placed on top of `accent`. */
  accentInk: string
  /** The "bad" faction color: reject, fail, spies. */
  danger: string
  /** Text placed on top of `danger`. */
  dangerInk: string
  /** Keyboard focus outline. */
  focus: string
}

export interface ThemeTokens {
  colors: ThemeColors
  fonts: {
    /** Big names and verdicts. A characterful stack. */
    display: string
    /** Paragraphs and buttons. */
    body: string
    /** Eyebrows, counters, labels — the utility voice. */
    mono: string
  }
  type: {
    /** Letter-spacing for uppercase labels, e.g. '0.22em'. */
    trackingLabel: string
  }
  radii: {
    /** Large containers: sheets, section cards. */
    card: string
    /** Buttons. */
    control: string
    /** Inputs, list rows, player tiles. */
    field: string
    /** Small tags and chips. */
    chip: string
  }
  shadows: {
    card: string
    pop: string
    glowAccent: string
    glowDanger: string
  }
  motion: {
    /** e.g. '120ms' — hovers and presses. */
    fast: string
    /** e.g. '220ms' — small reveals. */
    base: string
    /** e.g. '420ms' — screen entrances. */
    slow: string
    ease: string
    easeSpring: string
  }
  decor: {
    /** CSS background-image layered over the bg color on every screen. */
    backdrop: string
  }
  meta: {
    /** Hex color for the browser chrome (<meta name="theme-color">). */
    themeColor: string
  }
}

/** A section of the rules sheet. `body` supports **bold** spans. */
export interface RuleSection {
  title: string
  body: string
}

/** Coach callout copy for one tutorial scene. */
export interface CoachCopy {
  title: string
  body: string
  /** When empty/omitted, the scene advances via its own action. */
  cta?: string
}

/**
 * Every player-facing string in the app. Templates use `{placeholders}`
 * resolved by `fmt()`; the placeholders each key receives are noted inline.
 */
export interface Lexicon {
  app: {
    /** The game's name, e.g. 'Spies'. */
    name: string
    /** A single emoji used as the app mark. */
    icon: string
    /** Shown under the name on the title screen and in the window title. */
    subtitle: string
    /** One evocative line on the title screen. */
    tagline: string
  }
  factions: {
    /** e.g. { name: 'The Resistance', member: 'Resistance' } */
    good: { name: string; member: string }
    /** e.g. { name: 'The Spies', member: 'Spy' } */
    bad: { name: string; member: string }
  }
  scoreTrack: {
    /** {round} {total} */
    round: string
    /** {count} {max} */
    rejects: string
  }
  topBar: { rules: string; pause: string }
  handoff: {
    /** Eyebrow above the recipient's name. */
    prompt: string
    /** Confirm button. {name} */
    confirm: string
    /** Privacy reminder under the button. {name} */
    privacy: string
  }
  setup: {
    /** {players} {spies} */
    summary: string
    /** Input placeholder. {n} */
    playerPlaceholder: string
    addPlayer: string
    removePlayer: string
    /** {count} */
    playerCount: string
    start: string
    needNames: string
    needUnique: string
    howToPlay: string
    settings: string
  }
  settings: {
    title: string
    done: string
    themeLabel: string
    hardModeLabel: string
    hardModeBody: string
    /** Fine print clarifying when the toggle takes effect. */
    hardModeNote: string
  }
  roleReveal: {
    eyebrow: string
    goodTitle: string
    badTitle: string
    goodBody: string
    badBody: string
    next: string
    last: string
  }
  proposal: {
    eyebrow: string
    /** {count} */
    instruction: string
    /** {selected} {count} */
    counter: string
    /** Tiny tag on the leader's tile. */
    leaderBadge: string
    cta: string
  }
  proposalVote: {
    /** Heading of the public proposal-outcome screen. */
    title: string
    /** Label above the proposed team's names. */
    teamLabel: string
    /** Tells the table to vote out loud, then record the result in one tap. */
    instruction: string
    /** Button recording that the proposal passed (→ mission). */
    passed: string
    /** Button recording that the proposal failed (→ leader rotates). */
    failed: string
  }
  mission: {
    /** {done} {total} */
    progress: string
    prompt: string
    succeed: string
    fail: string
    /** Shown to good-faction players instead of the fail button. */
    lockedHint: string
  }
  missionReveal: {
    /** {round} */
    title: string
    success: string
    failure: string
    failsOne: string
    /** {count} — also used for zero. */
    failsMany: string
    /** {needed} */
    neededNote: string
    continue: string
  }
  gameOver: {
    eyebrow: string
    goodWins: string
    badWins: string
    /** {successes} {fails} */
    tally: string
    rolesLabel: string
    playAgain: string
  }
  pause: {
    title: string
    body: string
    resume: string
    viewRules: string
    quit: string
    quitConfirm: string
    cancel: string
  }
  rules: {
    title: string
    close: string
    playersCol: string
    /** {n} */
    roundCol: string
    spiesCol: string
    chips: { approve: string; reject: string; succeed: string; fail: string }
    goal: RuleSection
    track: RuleSection
    teams: RuleSection
    voting: RuleSection
    missions: RuleSection
    hardModeNote: string
  }
  tutorial: {
    /** The learner's seat label in the scripted cast, e.g. 'You'. */
    you: string
    /** Display names for the four scripted bot players, in seat order. */
    botNames: readonly [string, string, string, string]
    back: string
    prev: string
    next: string
    coach: {
      intro: CoachCopy
      role: CoachCopy
      proposal: CoachCopy
      proposalVote: CoachCopy
      mission: CoachCopy
      missionReveal: CoachCopy
      outro: CoachCopy
    }
    /** Shown if the learner records the scripted proposal as failed. */
    voteNudge: string
    /** Shown when the learner isn't on the scripted team. {a} {b} */
    notOnTeam: string
    seeResult: string
    outroProgress: string
    replay: string
  }
}

export interface Theme {
  /** Stable id, persisted to localStorage. Never rename a shipped id. */
  id: string
  /** Display name in the theme picker. */
  name: string
  /** One line under the name in the theme picker. */
  blurb: string
  tokens: ThemeTokens
  lexicon: Lexicon
}
