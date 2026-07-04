// "Release the Files": a political-intrigue reskin. Manila folders, typed
// pages, records-stamp blue for the Honest side, stamp red for the cover-up,
// and a deadpan legislative-procedure voice — gavels, shows of hands, ayes
// and nays. Everyone is a politician; a few are quietly on the payroll.

import type { Theme } from '../types'

export const releaseTheFiles: Theme = {
  id: 'release-the-files',
  name: 'Release the Files',
  blurb: 'Manila folders, shows of hands, redaction stamps thudding.',

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
      // Stamp-pad red: the CLASSIFIED stamp, the nay, the cover-up.
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
      tagline: 'The truth is in triplicate. Someone keeps it classified.',
    },
    factions: {
      good: { name: 'The Honest Politicians', member: 'Honest' },
      bad: { name: 'The Corrupt Politicians', member: 'Corrupt' },
    },
    menu: {
      passPlay: {
        title: 'Pass & Play',
        body: 'One phone around the chamber — the folder changes hands.',
      },
      party: {
        title: 'Party Mode',
        body: 'A big board chairs the session. Every politician votes from their own phone.',
      },
      hostJoin: {
        title: 'Host & Join',
        body: 'No big board. Every politician runs the whole session from their phone.',
      },
      back: 'Menu',
    },
    party: {
      chooser: {
        title: 'Party Mode',
        subtitle: 'One shared board. Every politician on their own phone.',
        hostCta: 'Chair on this screen',
        hostBody: 'Use this device as the chamber’s big board — a laptop or TV works best.',
        joinCta: 'Join with a code',
        joinBody: 'Take your seat from this phone using the session code on the board.',
        notConfigured:
          'Party Mode needs its network backend. Set the Supabase keys (see .env.example) to open the chamber.',
      },
      host: {
        roomCode: 'Session code',
        joinHint: 'On your phone: open {url}, pick Party Mode → Join, and enter the code.',
        players: '{count} seated',
        needPlayers: 'Waiting for at least {min} politicians…',
        start: 'Swear them in',
        roleTitle: 'Check your phones',
        roleBody: 'Your sealed brief just arrived on your phone. Read it privately, then confirm.',
        roleReady: '{ready} of {total} sworn in',
        begin: 'Open the docket',
        proposalWaiting: '{name} is appointing the committee',
        proposalHint: '{name} appoints {count} members on their phone.',
        voteTitle: 'Roll-call vote',
        voteProgress: '{done} of {total} ballots cast',
        voteLocked: 'All ballots are cast — sealed until read.',
        revealVotes: 'Read the roll call',
        votePassed: 'Motion carries',
        voteFailed: 'Motion fails',
        continue: 'Next order of business',
        missionProgress: '{done} of {total} copies handled',
        missionHint: 'The committee handles its copies in private.',
        waitingOn: 'Yet to be recorded',
        playAgain: 'Back to the lobby',
        closeRoom: 'Adjourn the session',
      },
      player: {
        joinTitle: 'Take your seat',
        codeLabel: 'Session code',
        codePlaceholder: 'CODE',
        nameLabel: 'Name for the record',
        namePlaceholder: 'Your name',
        joinCta: 'Be seated',
        joining: 'Taking your seat…',
        notFound: 'No session answers to that code.',
        wrongMode: 'That code is for a different mode. Pick the other one from the menu.',
        full: 'The chamber is full.',
        inProgress: 'That session is already underway.',
        lobby: 'You’re seated, {name}. Eyes on the big board.',
        viewRole: 'Unseal my brief',
        hideRole: 'Reseal it',
        ready: 'Understood',
        waitingRoles: 'Waiting for the chamber to read in…',
        fellowSpies: 'Also on the payroll',
        soloSpy: 'You’re the only one bought.',
        waitingForLeader: '{name} is appointing the committee.',
        voteQuestion: 'Seat this committee?',
        approve: 'Aye',
        reject: 'Nay',
        voteLocked: 'Ballot sealed. Watch the big board.',
        waitingOn: 'Yet to be recorded',
        watch: 'Watch the big board.',
        cardPlayed: 'Your copy is handled.',
        notOnMission: 'You’re not on this committee. Hold for the reading.',
        leave: 'Leave the session',
        sessionEnded: 'The chair adjourned the session.',
        backToMenu: 'Back to menu',
      },
      hostJoin: {
        title: 'Host & Join',
        subtitle: 'No big board. Every politician runs the session from their own phone.',
        hostCta: 'Chair from this phone',
        hostBody: 'Open the session and take a seat too — you chair it and hold a brief.',
        joinCta: 'Join with a code',
        joinBody: 'Take your seat from this phone using the code the chair reads out.',
        hostTitle: 'Chair the session',
        hostSetupBody: 'Enter your name for the record — you take a seat and chair the room.',
        createCta: 'Convene the session',
        lobbyShare: 'Read this code to the chamber so they can take their seats.',
        hostTag: 'Chair',
      },
    },
    scoreTrack: {
      round: 'File {round} / {total}',
      rejects: 'Blocked {count} / {max}',
      practiceTag: 'Mock',
    },
    practice: {
      start: 'Mock session',
      startReal: 'Convene the real session',
      roleEyebrow: 'Mock brief — your real one is sealed for later',
      doesntCount: 'This is a dress rehearsal. Nothing is entered into the record.',
      banner: 'Mock session — rehearsing procedure. Nothing is on the record yet.',
      lobbyHint: 'Rehearse the whole procedure on mock briefs. Convene for real when the chamber’s ready.',
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
      goodTitle: 'Honest',
      badTitle: 'Corrupt',
      goodBody:
        'You’re clean. Get every file into daylight — and watch your colleagues. Someone at this table is on the payroll.',
      badBody:
        'You’re bought. Keep the files classified without leaving fingerprints. You are not the only one on the payroll.',
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
    proposalVote: {
      title: 'The floor votes',
      teamLabel: 'The proposed committee',
      instruction: 'Ayes and nays by show of hands — then someone record the result.',
      passed: 'Motion carries',
      failed: 'Motion fails',
    },
    mission: {
      progress: '{done} of {total} copies handled',
      prompt: 'You hold a copy of the file',
      succeed: 'Release it',
      fail: 'Classify it — keep it confidential',
      lockedHint: 'The Honest can only release. Send it to the presses.',
    },
    missionReveal: {
      title: 'File {round}',
      allIn: 'All copies are in. The record is sealed until read.',
      showResults: 'Read the findings',
      success: 'Released',
      failure: 'Classified',
      failsOne: '1 copy classified',
      failsMany: '{count} copies classified',
      neededNote: 'this file needs {needed} classified copies to stay confidential',
      continue: 'Next order of business',
    },
    gameOver: {
      eyebrow: 'Session adjourned',
      goodWins: 'The files are out',
      badWins: 'The cover-up holds',
      tally: '{successes} released · {fails} classified',
      rolesLabel: 'For the record',
      guessHint: 'Guess who was on the payroll, then unseal each name.',
      reveal: 'Unseal',
      revealAll: 'Unseal all',
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
      spiesCol: 'Corrupt',
      chips: { approve: 'Carries', reject: 'Fails', succeed: 'Release', fail: 'Classify' },
      goal: {
        title: 'The goal',
        body:
          'The Honest Politicians win by getting **3 files released**. The Corrupt Politicians win once **3 files are classified** — or when **5 committees in a row are voted down**. A few politicians are secretly Corrupt and on the payroll; everyone else is Honest.',
      },
      track: {
        title: 'The docket (top of the screen)',
        body:
          'The five bars across the top are the files. Each fills **blue** when its file is released and **red** when it’s classified; the outlined one is the file on the table now. The **Blocked** counter beside it tracks committees voted down in a row — it turns red at 3, and at 5 the Corrupt Politicians win outright.',
      },
      teams: {
        title: 'Committees',
        body:
          'For each file, the Chair appoints a committee to handle it. The number of seats grows with later files and depends on how many are at the table. The gavel passes to the next politician after every file — and every time a committee is voted down — so everyone chairs eventually.',
      },
      voting: {
        title: 'The floor vote',
        body:
          'The whole floor votes on the proposed committee out loud — ayes and nays by show of hands, no passing the folder. One politician then records the result: **Motion carries** seats the committee; **Motion fails** blocks it and the gavel moves on. Five blocked committees in a row and the Corrupt Politicians win.',
      },
      missions: {
        title: 'Handling the file',
        body:
          'Each appointee secretly decides what happens to their copy. The copies are shuffled before they’re shown, so nobody knows who did what. The Honest can only **Release**; only the Corrupt may **Classify**. One classified copy keeps the whole file confidential — except **file 4 with 7 or more players**, which takes two.',
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
            'Release the Files is a hidden-role game for 5–13 politicians sharing one phone. You’ll walk one file through the chamber as an Honest politician — and get it released.',
          cta: 'Start',
        },
        role: {
          title: 'Roles are sealed',
          body:
            'Each politician privately checks their role behind a “hand the folder” screen, so nobody sees anyone else’s. You are Honest — but 2 of the 5 at this table are Corrupt and on the payroll.',
          cta: 'Got it',
        },
        proposal: {
          title: 'You hold the gavel',
          body:
            'As Chair, you appoint the committee. This file needs 2 politicians — every file calls for a set number that grows later on. Tap any 2 to appoint; the Chair may serve too. Afterwards the gavel passes to the next politician for each file — and every time a committee is voted down — so everyone gets a turn.',
          cta: 'Move to appoint',
        },
        proposalVote: {
          title: 'The floor votes',
          body:
            'Nobody passes the folder to vote. The whole chamber votes on this committee out loud — ayes and nays by show of hands — and any one politician records the result. Careful: if 5 committees in a row are voted down, the Corrupt Politicians win. Tap Motion carries to seat this committee.',
        },
        mission: {
          title: 'Handle your copy',
          body:
            'Each appointee secretly decides what happens to their copy of the file. The Honest can only Release — only the Corrupt can choose to Classify. Tap Release.',
        },
        missionReveal: {
          title: 'Copies are anonymous',
          body:
            'The copies are shuffled before they’re shown, so nobody knows who did what — that’s how the Corrupt stay hidden. No classified copies here, so the file is out!',
          cta: 'Proceed',
        },
        outro: {
          title: 'That’s the loop',
          body:
            'The Honest Politicians win by releasing 3 files. The Corrupt Politicians win once 3 files are classified — or 5 committees in a row are voted down. (One twist: file 4 takes 2 classified copies to stay confidential when 7+ are playing.) You’re ready.',
          cta: 'Start a real session',
        },
      },
      voteNudge: 'In a real session a failed motion passes the gavel to the next politician — but tap Motion carries to seat this committee and keep learning.',
      notOnTeam: 'You appointed {a} and {b} — you’re not on this committee, so they handle their copies in private.',
      seeResult: 'See the outcome',
      outroProgress: '1 of 3 files released',
      replay: 'Replay tutorial',
    },
  },
}
