// The default theme: a night-operation intelligence dossier. Blue-charcoal
// paper, cipher-teal for the loyal side, redline for the spies, and a
// monospaced "case file" label voice.

import type { Theme } from '../types'

export const midnightDossier: Theme = {
  id: 'midnight-dossier',
  name: 'Midnight Dossier',
  blurb: 'Classified case files, teal ciphers, red stamps.',

  tokens: {
    colors: {
      bg: '12 18 25',
      surface: '20 30 41',
      raised: '29 43 58',
      line: '43 60 78',
      lineStrong: '65 89 114',
      ink: '234 241 247',
      muted: '148 168 187',
      faint: '96 115 135',
      accent: '55 214 192',
      accentInk: '4 32 29',
      danger: '240 86 79',
      dangerInk: '43 6 5',
      focus: '127 232 220',
    },
    fonts: {
      display:
        "'Avenir Next Condensed', 'Bahnschrift', 'Arial Narrow', 'Roboto Condensed', system-ui, sans-serif",
      body: "system-ui, -apple-system, 'Segoe UI', Roboto, 'Helvetica Neue', sans-serif",
      mono: "ui-monospace, 'SF Mono', 'Cascadia Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
    },
    type: {
      trackingLabel: '0.22em',
    },
    radii: {
      card: '1.25rem',
      control: '0.875rem',
      field: '0.75rem',
      chip: '0.5rem',
    },
    shadows: {
      card: '0 12px 32px rgb(0 0 0 / 0.35)',
      pop: '0 20px 48px rgb(0 0 0 / 0.5)',
      glowAccent: '0 0 24px rgb(55 214 192 / 0.25)',
      glowDanger: '0 0 24px rgb(240 86 79 / 0.25)',
    },
    motion: {
      fast: '120ms',
      base: '220ms',
      slow: '420ms',
      ease: 'cubic-bezier(0.22, 0.8, 0.3, 1)',
      easeSpring: 'cubic-bezier(0.2, 1.1, 0.3, 1.15)',
    },
    decor: {
      backdrop:
        'radial-gradient(120% 60% at 50% -10%, rgb(55 214 192 / 0.07), transparent 60%), radial-gradient(100% 40% at 50% 110%, rgb(240 86 79 / 0.05), transparent 60%)',
    },
    meta: {
      themeColor: '#0C1219',
    },
  },

  lexicon: {
    app: {
      name: 'Spies',
      icon: '🕵️',
      subtitle: 'Pass & Play',
      tagline: 'One phone. Five missions. Trust no one.',
    },
    factions: {
      good: { name: 'The Resistance', member: 'Resistance' },
      bad: { name: 'The Spies', member: 'Spy' },
    },
    scoreTrack: {
      round: 'Mission {round} / {total}',
      rejects: 'Rejects {count} / {max}',
    },
    topBar: {
      rules: 'Rules',
      pause: 'Pause',
    },
    handoff: {
      prompt: 'Pass the phone to',
      confirm: 'I’m {name} — show me',
      privacy: 'Shield the screen. What follows is for {name} only.',
    },
    setup: {
      summary: '{players} players · {spies} spies among them',
      playerPlaceholder: 'Player {n}',
      addPlayer: 'Add a player',
      removePlayer: 'Remove the last player',
      playerCount: '{count} players',
      start: 'Assign roles',
      needNames: 'Enter every name',
      needUnique: 'Names must be unique',
      howToPlay: 'How to play',
      settings: 'Settings',
    },
    settings: {
      title: 'Settings',
      done: 'Done',
      themeLabel: 'Theme',
      hardModeLabel: 'Hard mode',
      hardModeBody: 'Missions 1 and 2 each send one extra player.',
      hardModeNote: 'Applies when you start a new game.',
    },
    roleReveal: {
      eyebrow: 'Your eyes only',
      goodTitle: 'Resistance',
      badTitle: 'A Spy',
      goodBody: 'Keep every mission clean — and watch closely. Someone at this table is lying.',
      badBody: 'Sabotage missions without drawing suspicion. Your fellow spies are out there.',
      next: 'Got it — pass on',
      last: 'Everyone’s briefed — start',
    },
    proposal: {
      eyebrow: 'Leader',
      instruction: 'Choose {count} for this mission',
      counter: '{selected} of {count} chosen',
      leaderBadge: 'Lead',
      cta: 'Propose this team',
    },
    vote: {
      progress: '{done} of {total} votes in',
      teamLabel: 'The proposed team',
      question: 'Send them on the mission?',
      approve: 'Approve',
      reject: 'Reject',
    },
    voteReveal: {
      title: 'The vote',
      revealNext: 'Reveal next',
      approved: 'Approved',
      rejected: 'Rejected',
      tally: '{approve} approve · {reject} reject',
      begin: 'Begin the mission',
      nextLeader: 'Pass the lead',
    },
    mission: {
      progress: '{done} of {total} cards played',
      prompt: 'Play your mission card',
      succeed: 'Succeed',
      fail: 'Fail — sabotage',
      lockedHint: 'Resistance cards only succeed. Make it count.',
    },
    missionReveal: {
      title: 'Mission {round}',
      success: 'Success',
      failure: 'Failed',
      failsOne: '1 fail card played',
      failsMany: '{count} fail cards played',
      neededNote: 'this mission needed {needed} to fail',
      continue: 'Continue',
    },
    gameOver: {
      eyebrow: 'Case closed',
      goodWins: 'Resistance wins',
      badWins: 'Spies win',
      tally: '{successes} succeeded · {fails} failed',
      rolesLabel: 'The roles were',
      playAgain: 'Play again',
    },
    pause: {
      title: 'Paused',
      body: 'Your game is saved — pick up right where you left off.',
      resume: 'Resume',
      viewRules: 'View rules',
      quit: 'Quit to menu',
      quitConfirm: 'Quit — abandon this game',
      cancel: 'Keep playing',
    },
    rules: {
      title: 'Rules',
      close: 'Close',
      playersCol: 'Players',
      roundCol: 'M{n}',
      spiesCol: 'Spies',
      chips: { approve: 'Approve', reject: 'Reject', succeed: 'Succeed', fail: 'Fail' },
      goal: {
        title: 'The goal',
        body:
          'The Resistance wins by completing **3 successful missions**. The Spies win with **3 failed missions** — or by getting **5 teams rejected in a row**. Some players are secretly Spies; everyone else is Resistance.',
      },
      track: {
        title: 'The track (top of the screen)',
        body:
          'The five bars across the top are the missions. They fill **teal** for a success, **red** for a failure, and the outlined one is the mission you’re on. The **Rejects** counter beside it tracks teams voted down in a row — it turns red at 3, and hitting 5 hands the win to the Spies.',
      },
      teams: {
        title: 'Teams & missions',
        body:
          'Each mission the leader picks who goes. The number needed grows in later missions and depends on how many are playing. The lead passes to the next player after every mission — and every time a team is voted down — so everyone gets a turn.',
      },
      voting: {
        title: 'Voting',
        body:
          'Every player votes to approve or reject the proposed team. Votes aren’t secret — once everyone has voted they’re revealed one by one, so you see exactly who approved and who rejected. A strict majority sends the team; a tie counts as a rejection and the next player takes the lead.',
      },
      missions: {
        title: 'Missions',
        body:
          'Each team member secretly plays a card. Cards are shuffled before they’re shown, so nobody knows who played what. Resistance can only **Succeed**; only Spies may **Fail**. A single fail card sinks the mission — except the **4th mission with 7 or more players**, which needs two.',
      },
      hardModeNote: 'Hard mode: missions 1 & 2 each send one extra player.',
    },
    tutorial: {
      you: 'You',
      botNames: ['Ava', 'Ben', 'Cay', 'Dee'],
      back: 'Back',
      prev: 'Previous section',
      next: 'Next section',
      coach: {
        intro: {
          title: 'How to play',
          body: 'Spies is a hidden-role game for 5–13 players sharing one phone. You’ll play one guided mission as a member of the Resistance — and win it.',
          cta: 'Start',
        },
        role: {
          title: 'Roles are secret',
          body: 'Each player privately checks their role behind a “pass the phone” screen, so nobody sees anyone else’s. You are Resistance — but 2 of the 5 are secretly Spies.',
          cta: 'Got it',
        },
        proposal: {
          title: 'You are the leader',
          body: 'As leader you choose the team. This mission needs 2 players — every mission calls for a set number that grows later on. Tap any 2 to send; the leader may go too. Afterwards the lead passes to the next player each mission — and every time a team is voted down — so everyone gets a turn.',
          cta: 'Propose this team',
        },
        vote: {
          title: 'Everyone votes',
          body: 'Every player votes to approve or reject this team. Votes aren’t secret — once everyone has voted they’re all revealed, so you’ll see exactly who approved and who rejected. Tap Approve to send this team.',
        },
        voteReveal: {
          title: 'Majority rules',
          body: 'More approvals than rejections, so the team is sent. Careful: if proposals are rejected 5 times in a row, the Spies win — so don’t stall forever.',
          cta: 'Begin the mission',
        },
        mission: {
          title: 'Play your card',
          body: 'Team members secretly play a card. Resistance can only Succeed — only Spies can choose to Fail a mission. Tap Succeed.',
        },
        missionReveal: {
          title: 'Cards are anonymous',
          body: 'Cards are shuffled before they’re shown, so nobody knows who played what — that’s how Spies stay hidden. No fail cards here, so the mission succeeds!',
          cta: 'Continue',
        },
        outro: {
          title: 'That’s the loop',
          body: 'The Resistance wins by completing 3 missions. The Spies win with 3 failed missions — or 5 rejected proposals in a row. (One twist: the 4th mission needs 2 fail cards to fail when 7+ are playing.) You’re ready.',
          cta: 'Start a real game',
        },
      },
      voteNudge: 'In a real game you could reject — but tap Approve to send this team and keep learning.',
      notOnTeam: 'You sent {a} and {b} — you’re not on this mission, so they play their cards in secret.',
      seeResult: 'See the result',
      outroProgress: '1 of 3 missions complete',
      replay: 'Replay tutorial',
    },
  },
}
