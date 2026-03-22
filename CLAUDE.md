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

## Asset Generation Rules
- Use the asset-generator subagent for Gemini sprite generation — it uses playwright-chrome MCP
- Always use **Gemini Pro** mode (not Fast) — Pro reverts on each new conversation, must re-select
- Use green screen (#00FF00) background for chroma keying, not magenta
- Do NOT accept sprites with text/labels, wrong grid layout, or inconsistent characters — iterate on the prompt
- All sprite states for a character must be generated in a single prompt for consistency
- Post-process with `scripts/process_spritesheet.py` which handles chroma key, auto-trim, and grid splitting
- When the human says proceed, go all the way without asking for confirmation at each step
