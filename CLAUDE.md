# Food Fighters

A 2D browser fighting game with cartoonish food characters.

## Stack
- TypeScript, Phaser.js 3, Vite, Vitest, pnpm, Tone.js
- GitHub Pages deployment via GitHub Actions

## Repo
- GitHub: https://github.com/atscub/food-fighters
- Pages: https://atscub.github.io/food-fighters/

## Architecture
- `src/main.ts` — Phaser game config and entry point
- `src/scenes/` — One file per scene (StartScene, CharacterSelectScene, FightScene)
- `src/config/` — Game constants, character stats, controls mapping
- `src/objects/` — Game objects (Fighter, HealthBar, etc.)
- `src/__tests__/` — Vitest unit tests
- `assets/sprites/` — Character spritesheets
- `assets/backgrounds/` — Arena backgrounds
- `assets/audio/` — Music tracks (MP3)

## Coordination
- AGENTS.lock at repo root tracks concurrent agent activity
- JOURNAL.md is append-only decision log
- Communicate with human via Telegram skill only

## Key Rules
- pnpm only (no npm/yarn)
- Strict TypeScript — no `any` types
- Phaser 3 API only (no Phaser 2/CE)
- All game constants in src/config/
- Test non-rendering logic with Vitest
