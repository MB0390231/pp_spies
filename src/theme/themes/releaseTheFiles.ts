// "Release the Files": a political-intrigue reskin. Manila folders, typed
// pages, records-stamp blue for the honest side, stamp red for the cover-up,
// and a deadpan legislative-procedure voice — gavels, roll calls, ayes and
// nays. Everyone is a politician; a few are quietly on the payroll.

import type { Theme } from '../types'

export const releaseTheFiles: Theme = {
  id: 'release-the-files',
  name: 'Release the Files',
  blurb: 'Manila folders, roll-call votes, shredders humming.',

  tokens: {
    colors: {
      // The folder itself: true manila tan, with typed-page surfaces on top.
      bg: '235 219 183',
      surface: '249 245 233',
      raised: '240 231 207',
      line: '208 191 152',
      lineStrong: '163 142 98',
      // Warm ribbon-black ink, faded through carbon-copy grays.
      ink: '38 32 24',
      muted: '107 93 71',
      faint: '134 117 88',
      // Records-stamp blue: the release, the aye, the honest side.
      accent: '31 87 156',
      accentInk: '243 248 255',
      // Stamp-pad red: the shredder, the nay, the cover-up.
      danger: '178 45 38',
      dangerInk: '253 242 238',
      focus: '24 106 199',
    },
    fonts: {
      // Verdicts and names arrive typed, like a memo pulled from the folder.
      display: "'American Typewriter', 'Courier New', Courier, Georgia, serif",
      // Body copy is the printed briefing: bookish government serif.
      body: "Palatino, 'Palatino Linotype', 'Iowan Old Style', 'Book Antiqua', Georgia, serif",
      // Labels and counters: straight typewriter utility.
      mono: "'Courier New', Courier, 'American Typewriter', 'Nimbus Mono PS', monospace",
    },
    type: {
      trackingLabel: '0.24em',
    },
    radii: {
      // Paper barely rounds: folder-corner cards, stamp-edge controls.
      card: '0.5rem',
      control: '0.3125rem',
      field: '0.25rem',
      chip: '0.125rem',
    },
    shadows: {
      // Light theme: warm drop shadows, sheets resting on the folder.
      card: '0 1px 0 rgb(120 96 55 / 0.10), 0 10px 24px rgb(96 74 40 / 0.16)',
      pop: '0 2px 0 rgb(120 96 55 / 0.10), 0 22px 44px rgb(96 74 40 / 0.30)',
      glowAccent: '0 0 0 2px rgb(31 87 156 / 0.16), 0 8px 20px rgb(31 87 156 / 0.22)',
      glowDanger: '0 0 0 2px rgb(178 45 38 / 0.16), 0 8px 20px rgb(178 45 38 / 0.22)',
    },
    motion: {
      // Brisk and papery, with a small rubber-stamp thunk on the spring.
      fast: '90ms',
      base: '170ms',
      slow: '340ms',
      ease: 'cubic-bezier(0.3, 0.7, 0.2, 1)',
      easeSpring: 'cubic-bezier(0.34, 1.3, 0.4, 1.02)',
    },
    decor: {
      // A sheet under glass: soft desk-lamp light from above, faint typing
      // ruling, and a red margin rule down the left edge of the page.
      backdrop:
        'radial-gradient(130% 80% at 50% -25%, rgb(255 251 238 / 0.75), transparent 62%), linear-gradient(90deg, transparent 0 6.5%, rgb(178 45 38 / 0.07) 6.5% 7%, transparent 7% 100%), repeating-linear-gradient(180deg, rgb(38 32 24 / 0.022) 0 2px, transparent 2px 26px)',
    },
    meta: {
      themeColor: '#EBDBB7',
    },
  },

  lexicon: {
    app: {
      name: 'Release the Files',
      icon: '🗂️',
      subtitle: 'Pass & Play',
      tagline: 'The truth is in triplicate. Someone keeps shredding it.',
    },
    factions: {
      good: { name: 'The Reformers', member: 'Reformer' },
      bad: { name: 'The Machine', member: 'Fixer' },
    },
    scoreTrack: {
      round: 'File {round} / {total}',
      rejects: 'Blocked {count} / {max}',
    },
    topBar: {
      rules: 'Procedure',
      pause: 'Recess',
    },
    handoff: {
      prompt: 'Hand the folder to',
      confirm: 'I’m {name} — unseal it',
      privacy: 'Everyone else, eyes on the ceiling. This page is for {name} alone.',
    },
    setup: {
      summary: '{players} politicians · {spies} of them are bought',
      playerPlaceholder: 'Politician {n}',
      addPlayer: 'Seat another politician',
      removePlayer: 'Remove the last seat',
      playerCount: '{count} seated',
      start: 'Swear them in',
      needNames: 'Every seat needs a name',
      needUnique: 'No two names alike — this is still a democracy',
      howToPlay: 'How to play',
      settings: 'Settings',
    },
    settings: {
      title: 'Settings',
      done: 'Done',
      themeLabel: 'Theme',
      hardModeLabel: 'Hard mode',
      hardModeBody: 'Files 1 and 2 each seat one extra committee member.',
      hardModeNote: 'Takes effect when a new session convenes.',
    },
    roleReveal: {
      eyebrow: 'Sealed — your eyes only',
      goodTitle: 'Reformer',
      badTitle: 'A Fixer',
      goodBody:
        'You’re clean. Get every file into daylight — and watch your colleagues. Someone at this table is on the payroll.',
      badBody:
        'You’re bought. Keep the files buried without leaving fingerprints. You are not the only one on the payroll.',
      next: 'Understood — pass it on',
      last: 'Everyone’s sworn in — begin',
    },
    proposal: {
      eyebrow: 'Committee Chair',
      instruction: 'Appoint {count} to handle this file',
      counter: '{selected} of {count} appointed',
      leaderBadge: 'Chair',
      cta: 'Move to appoint',
    },
    vote: {
      progress: '{done} of {total} ballots in',
      teamLabel: 'The proposed committee',
      question: 'Trust them with the file?',
      approve: 'Aye',
      reject: 'Nay',
    },
    voteReveal: {
      title: 'Roll call',
      revealNext: 'Read the next ballot',
      approved: 'Motion carries',
      rejected: 'Motion fails',
      tally: '{approve} aye · {reject} nay',
      begin: 'Open the file',
      nextLeader: 'Pass the gavel',
    },
    mission: {
      progress: '{done} of {total} copies handled',
      prompt: 'You hold a copy of the file',
      succeed: 'Release it',
      fail: 'Shred it — bury the story',
      lockedHint: 'Reformers can only release. Send it to the presses.',
    },
    missionReveal: {
      title: 'File {round}',
      success: 'Released',
      failure: 'Buried',
      failsOne: '1 copy shredded',
      failsMany: '{count} copies shredded',
      neededNote: 'this file takes {needed} shreds to bury',
      continue: 'Next order of business',
    },
    gameOver: {
      eyebrow: 'Session adjourned',
      goodWins: 'The files are out',
      badWins: 'The cover-up holds',
      tally: '{successes} released · {fails} buried',
      rolesLabel: 'For the record',
      playAgain: 'Reconvene',
    },
    pause: {
      title: 'In recess',
      body: 'The record is preserved — proceedings resume exactly where the gavel fell.',
      resume: 'Back to order',
      viewRules: 'Read the procedure',
      quit: 'Adjourn to menu',
      quitConfirm: 'Adjourn — abandon this session',
      cancel: 'Stay in session',
    },
    rules: {
      title: 'Procedure',
      close: 'Close',
      playersCol: 'Seats',
      roundCol: 'F{n}',
      spiesCol: 'Fixers',
      chips: { approve: 'Aye', reject: 'Nay', succeed: 'Release', fail: 'Shred' },
      goal: {
        title: 'The goal',
        body:
          'The Reformers win by getting **3 files released**. The Machine wins once **3 files are buried** — or when **5 committees in a row are voted down**. A few politicians are secretly Fixers on the Machine’s payroll; everyone else is a Reformer.',
      },
      track: {
        title: 'The docket (top of the screen)',
        body:
          'The five bars across the top are the files. Each fills **blue** when its file is released and **red** when it’s buried; the outlined one is the file on the table now. The **Blocked** counter beside it tracks committees voted down in a row — it turns red at 3, and at 5 the Machine wins outright.',
      },
      teams: {
        title: 'Committees',
        body:
          'For each file, the Chair appoints a committee to handle it. The number of seats grows with later files and depends on how many are at the table. The gavel passes to the next politician after every file — and every time a committee is voted down — so everyone chairs eventually.',
      },
      voting: {
        title: 'The floor vote',
        body:
          'Every politician votes Aye or Nay on the proposed committee. Ballots aren’t secret — once everyone has voted they’re read out one by one, so you see exactly who backed it and who blocked it. A strict majority carries the motion; a tie counts as a Nay and the gavel moves on.',
      },
      missions: {
        title: 'Handling the file',
        body:
          'Each appointee secretly decides what happens to their copy. The copies are shuffled before they’re shown, so nobody knows who did what. Reformers can only **Release**; only Fixers may **Shred**. One shredded copy buries the whole file — except **file 4 with 7 or more players**, which takes two.',
      },
      hardModeNote: 'Hard mode: files 1 & 2 each seat one extra committee member.',
    },
    tutorial: {
      you: 'You',
      botNames: ['Vera', 'Otis', 'Faye', 'Hugo'],
      back: 'Back',
      prev: 'Previous section',
      next: 'Next section',
      coach: {
        intro: {
          title: 'How to play',
          body:
            'Release the Files is a hidden-role game for 5–13 politicians sharing one phone. You’ll walk one file through the chamber as a Reformer — and get it released.',
          cta: 'Start',
        },
        role: {
          title: 'Roles are sealed',
          body:
            'Each politician privately checks their role behind a “hand the folder” screen, so nobody sees anyone else’s. You are a Reformer — but 2 of the 5 at this table are Fixers on the payroll.',
          cta: 'Got it',
        },
        proposal: {
          title: 'You hold the gavel',
          body:
            'As Chair, you appoint the committee. This file needs 2 politicians — every file calls for a set number that grows later on. Tap any 2 to appoint; the Chair may serve too. Afterwards the gavel passes to the next politician for each file — and every time a committee is voted down — so everyone gets a turn.',
          cta: 'Move to appoint',
        },
        vote: {
          title: 'The floor votes',
          body:
            'Every politician votes Aye or Nay on this committee. Ballots aren’t secret — once everyone has voted they’re all read out, so you’ll see exactly who backed it. Tap Aye to seat this committee.',
        },
        voteReveal: {
          title: 'Majority carries',
          body:
            'More Ayes than Nays, so the committee is seated. Careful: if 5 committees in a row are voted down, the Machine wins — so don’t stall forever.',
          cta: 'Open the file',
        },
        mission: {
          title: 'Handle your copy',
          body:
            'Each appointee secretly decides what happens to their copy of the file. Reformers can only Release — only Fixers can choose to Shred. Tap Release.',
        },
        missionReveal: {
          title: 'Copies are anonymous',
          body:
            'The copies are shuffled before they’re shown, so nobody knows who did what — that’s how Fixers stay hidden. No shredded copies here, so the file is out!',
          cta: 'Proceed',
        },
        outro: {
          title: 'That’s the loop',
          body:
            'The Reformers win by releasing 3 files. The Machine wins once 3 files are buried — or 5 committees in a row are voted down. (One twist: file 4 takes 2 shredded copies to bury when 7+ are playing.) You’re ready.',
          cta: 'Start a real session',
        },
      },
      voteNudge: 'In a real game you could vote Nay — but tap Aye to seat this committee and keep learning.',
      notOnTeam: 'You appointed {a} and {b} — you’re not on this committee, so they handle their copies in private.',
      seeResult: 'See the outcome',
      outroProgress: '1 of 3 files released',
      replay: 'Replay tutorial',
    },
  },
}
