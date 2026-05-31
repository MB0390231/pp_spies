# Spies — Pass & Play

A single-device, pass-and-play version of **Spies**, a hidden-role social deduction game inspired by *The Resistance*. One phone is shared around the group: players take turns holding it to see their secret role, cast hidden votes, and play mission cards. The game runs entirely in the browser — no accounts, no server, no internet required after the page loads.

Because everyone shares one device, the game needs no backend at all. The rules are a body of deterministic, pure functions (`(state, action) → nextState`) made trustworthy by tests rather than a database, and secrecy is handled by **pass-the-phone handoff screens** rather than the network.

---

## Game Overview

**Type**: Social deduction, hidden-role, round-based
**Players**: 5–10 (optimal 6–8)
**Duration**: ~15–30 minutes

### Roles

- **Resistance (good)** — must make missions succeed.
- **Spies (evil)** — may secretly sabotage missions by playing fail cards.

### Win Conditions

- **Resistance wins** after **3 successful missions**.
- **Spies win** after **3 failed missions** *or* **5 consecutive rejected team proposals**.

### Spy Distribution

| Players | 5 | 6 | 7 | 8 | 9 | 10 |
|---------|---|---|---|---|---|----|
| Spies   | 2 | 2 | 3 | 3 | 3 | 4  |

### Team Sizes by Round

| Players | R1 | R2 | R3 | R4\* | R5 |
|---------|----|----|----|------|----|
| 5       | 2  | 3  | 2  | 3    | 3  |
| 6       | 2  | 3  | 4  | 3    | 4  |
| 7       | 2  | 3  | 3  | 4\*  | 4  |
| 8       | 3  | 4  | 4  | 5\*  | 5  |
| 9       | 3  | 4  | 4  | 5\*  | 5  |
| 10      | 3  | 4  | 4  | 5\*  | 5  |

\* **Round 4 special rule**: with **7+ players**, the mission requires **2 fail cards** (instead of 1) to fail.

---

## The Pass-and-Play Model

On a single shared device, secrecy can't come from the network — it comes from **handoff screens** that ensure only the right person sees private information. The central UX pattern is the interstitial:

```
┌─────────────────────────────┐
│                             │
│   Pass the phone to ALICE   │
│                             │
│      [ I'm Alice — Tap ]    │
│                             │
└─────────────────────────────┘
```

This "pass to [player]" gate appears before every private moment:

- **Role reveal** — at game start, each player privately views their role, then passes on.
- **Voting** — each player privately votes Approve/Reject behind a handoff, so no one sees another's vote until the reveal.
- **Mission cards** — each team member privately plays Succeed/Fail (Resistance can only Succeed) behind a handoff.

Public moments — the leader proposing a team, the dramatic vote reveal, mission outcomes, and the win screen — are shown openly for the whole group to watch together.

---

## Technology Stack

Deliberately minimal — a client-only single-page app:

- **React + TypeScript** — UI and component state
- **Vite** — dev server and build tooling
- **Tailwind CSS** — mobile-first styling
- **React Router** *(optional)* — screen/phase routing
- **localStorage** — persist the in-progress game so a refresh or phone lock resumes where it left off

**No backend. No database. No network calls.** The app is a static bundle that can be hosted anywhere (Vercel, Netlify, GitHub Pages, any static host).

---

## Project Structure

```
spies_pass_and_play/
├── src/
│   ├── engine/        # Pure game logic — the state machine & rules
│   │   ├── rules.ts       # spy counts, team sizes, win conditions, Round 4 rule
│   │   ├── reducer.ts     # (state, action) → nextState
│   │   └── types.ts       # Game, Player, Round, Phase types
│   ├── state/         # Game context/provider + localStorage persistence
│   ├── screens/       # One component per phase + handoff interstitials
│   │   ├── Setup.tsx          # choose player count, enter names
│   │   ├── RoleReveal.tsx     # private role view (behind handoff)
│   │   ├── TeamProposal.tsx   # leader picks the team (public)
│   │   ├── Vote.tsx           # private approve/reject (behind handoff)
│   │   ├── VoteReveal.tsx     # dramatic one-by-one reveal (public)
│   │   ├── Mission.tsx        # private succeed/fail (behind handoff)
│   │   ├── MissionReveal.tsx  # shuffled outcome (public)
│   │   └── GameOver.tsx       # winner screen
│   ├── components/    # Shared UI (PassPhoneGate, ScoreTrack, buttons…)
│   ├── App.tsx
│   └── main.tsx
├── public/
├── docs/              # Design docs (game flow, engine API, etc.)
├── index.html
└── README.md
```

The **`engine/`** directory is the heart of the app and is intentionally framework-agnostic: pure functions with no React imports, so the rules can be unit-tested in isolation and trusted regardless of the UI.

---

## Game Flow

### 1. Setup (public)
- Choose player count (5–10).
- Enter each player's name.
- The engine assigns roles (correct spy count for the player count) and picks a random first leader.

### 2. Role Reveal (private, per player)
- For each player: *"Pass to [name]"* → tap → see your secret role → *"Pass to next player."*

### 3. Round Loop (×5 rounds, until someone wins)
Each round runs three phases:

1. **Team Proposal** *(public)* — the leader selects exactly the required number of players for the mission.
2. **Voting** *(private per player → public reveal)* — every player approves or rejects behind a handoff, then votes are revealed one-by-one for dramatic effect.
   - Majority approve → mission proceeds.
   - Rejected → leader rotates to the next player; **5 consecutive rejections = Spies win**.
3. **Mission** *(private per team member → public reveal)* — each team member plays Succeed or Fail (Resistance is locked to Succeed). Cards are shuffled and revealed anonymously.
   - 1 fail = mission fails (2 fails required on Round 4 with 7+ players).

### 4. Resolution
- Update the success/fail score, check win conditions.
- Resistance reaches 3 successes, or Spies reach 3 failures → **Game Over**.

The full state machine mirrors the original game exactly:

```
SETUP → ROLE REVEAL → [ TEAM PROPOSAL → VOTE → (approved?) ]
                                          │
                          ┌───────────────┴───────────────┐
                          ▼ approved                       ▼ rejected
                       MISSION                     rotate leader
                          │                         5 rejects → Spies win
                          ▼
                   check win conditions → next round or GAME OVER
```

---

## Key Design Decisions

1. **Pure game engine** — all rules live in `src/engine/` as deterministic functions with no UI dependencies, unit-tested independently.
2. **Client-only** — no server means no sync bugs, no race conditions, no auth, and free static hosting.
3. **Secrecy via handoff screens** — a reusable `PassPhoneGate` component guards every private view; nothing private renders until the named player confirms they're holding the phone.
4. **Anonymous reveals** — votes and mission cards are shuffled before display so card order never leaks who played what.
5. **Crash-safe sessions** — the full game state is persisted to localStorage after every action, so an accidental refresh or screen lock never loses a game in progress.
6. **Mobile-first** — every screen is designed for a phone held in one hand and passed around.

---

## Quick Start

```bash
# Install dependencies
npm install

# Start the dev server
npm run dev
# → http://localhost:5173

# Build for production (static output in dist/)
npm run build

# Preview the production build
npm run preview
```

---

## Development

```bash
npm run lint         # ESLint
npm run type-check   # TypeScript
npm test             # Engine unit tests (rules + reducer)
```

Because the rules engine is pure, the most valuable tests live there — covering role assignment, team sizes, leader rotation, the Round 4 two-fail rule, the 5-rejection auto-loss, and all win conditions.

---

## Deployment

Any static host works since there's no backend:

```bash
npm run build        # outputs dist/
# Deploy dist/ to Vercel, Netlify, GitHub Pages, etc.
```

---

## Roadmap

### Phase 1 — MVP (current)
- [ ] Pure rules engine (`src/engine/`) with full test coverage
- [ ] Setup, role reveal, and pass-the-phone handoff flow
- [ ] Team proposal → vote → mission round loop
- [ ] Win-condition handling and game-over screen
- [ ] localStorage persistence / resume

### Phase 2 — Polish
- [ ] Animations and sound for vote/mission reveals
- [ ] In-app rules reference / first-time tutorial
- [ ] Accessibility pass (contrast, larger tap targets, screen-reader labels)
- [ ] PWA support (installable + offline)

### Phase 3 — Extras
- [ ] On-device game history & stats
- [ ] Configurable house rules (custom spy counts, team sizes)
- [ ] Theming

---

## Acknowledgments

- Inspired by **The Resistance** board game.
- Built with [React](https://react.dev), [Vite](https://vitejs.dev), and [Tailwind CSS](https://tailwindcss.com).

---

Gather your group, pass the phone, and find the spies. 🕵️
