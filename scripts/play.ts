// Play a whole game in the terminal and print a readable transcript — a way to
// eyeball the engine's behaviour without driving the UI by hand.
//
//   npm run play                  # 7 players, random play, fresh seed
//   npm run play -- 5             # 5 players
//   npm run play -- 7 42          # 7 players, seed 42 (reproducible)
//   npm run play -- 7 42 saboteur # force a strategy: cooperative|saboteur|obstruction|random
//
// Run via the vite-node binary bundled with Vitest — no extra dependencies.

import {
  cooperativeStrategy,
  obstructionStrategy,
  randomStrategy,
  saboteurStrategy,
  simulateGame,
  type Strategy,
} from '../src/engine'

const NAMES = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve', 'Frank', 'Grace', 'Heidi', 'Ivan', 'Judy']

const args = process.argv.slice(2).filter((a) => !a.endsWith('play.ts'))
const count = clampCount(Number(args[0] ?? 7))
const seed = Number.isFinite(Number(args[1])) && args[1] !== undefined ? Number(args[1]) : Date.now()
const strategyName = (args[2] ?? 'random').toLowerCase()

function clampCount(n: number): number {
  if (!Number.isInteger(n) || n < 5 || n > 10) return 7
  return n
}

function pickStrategy(name: string): Strategy {
  switch (name) {
    case 'cooperative':
      return cooperativeStrategy
    case 'saboteur':
      return saboteurStrategy
    case 'obstruction':
      return obstructionStrategy
    default:
      return randomStrategy(seed)
  }
}

const names = NAMES.slice(0, count)
const { finalState, transcript } = simulateGame(names, seed, pickStrategy(strategyName))

console.log(`\nSpies — ${count} players · ${finalState.spyCount} spies · seed ${seed} · ${strategyName} strategy\n`)
for (const line of transcript) {
  console.log(line.text)
}

console.log('\nRoles:')
for (const p of finalState.players) {
  console.log(`  ${p.name.padEnd(8)} ${p.role}`)
}
console.log()
