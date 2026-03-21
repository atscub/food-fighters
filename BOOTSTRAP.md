# About
This is an experimental project. The goal is for Claude to bootstrap itself, create any needed subagents, skills, etc. Then use that created infra to develop a 2D game that will run in the browser end to end.

# Rules
- You have to set up yourself for this project (agents, skills, mcp, etc), in such a way that allows you to effectively comlete the goal (create the game).
- You setup a journal of major decisions and deliverations for the human to review later. The journal is append only, however don't clutter it with too many details.
- You always communicate with the human via telegram (use telegram skill).
- You have to minimize the amount of communication with human, when you have clarity, you make a choice, if you don't have clarity or you are obviously missing some information or you can no longer move forward, then ask the human.
- You work until all requirements are completed. But you work smart, you use subagents to breakdown the work into multiple levels of abstraction.
- You are the puppet master, your context must remain as clean as possible, so that you can stay focussed. If you can use tools to improve your memory, do so.
- Whenever you believe you have reached a good enough result. Send to the human for feedback.
- You can't stop until the product meets all the requirements and the human confirms it.
- You can also stop if the human asks you to.
- You can use the user's chrome browser to find/generate assets using services like google gemini, etc, but never pay for anything. Only resources to which the user already has access or are free.
- THere might be many instances of the same agent running at any time.
- Use unit tests, types and other mechanisms as closed loop feedback sources.
- Use an adversarial code review agent, to code review the work of the main programer.
- Use playwright mcp or chrome dev tools to do visual validation of the game.

# Product requirements
- We want to create a fighting game with 4 cartoonish characters: A sausage, a burger, bacon and cheese.
- It is a 2D game that runs in the browser, rendered via Phaser.js 3 (WebGL/Canvas).
- Should have the typical 2D animations: Idle, walking, blocking, punching, kick and jump with possible combinations.
- Two players play in the same computer, same keyboard.
- The game screens are: Start, choose character, and fight arena.
- The game should have interesting backgrounds with themes related to game's spirit (fun, foodie jokes).
- The game should also have a retro console style sound track.

## Game mechanics
- Each player has 100 HP.
- Match is best-of-3 rounds; each round lasts up to 90 seconds.
- A round ends when a player reaches 0 HP, or when the timer runs out (lowest HP wins).
- A draw round (equal HP at timeout) counts as a loss for both.
- Punch deals 8 HP, kick deals 12 HP. Blocking reduces incoming damage by 80%.
- Jump can combine with punch or kick for aerial attacks (+4 HP bonus damage).
- No special moves or combos beyond the above — keep it simple for v1.

## Characters
Each character has a unique stat profile on a speed/power axis — identical controls, different feel:

| Character | Speed | Power | Flavour |
|-----------|-------|-------|---------|
| Sausage   | Fast  | Low   | Slippery and evasive |
| Burger    | Slow  | High  | Heavy hitter, tanky  |
| Bacon     | Fast  | Med   | Crispy and unpredictable |
| Cheese    | Med   | Med   | Balanced, beginner-friendly |

Speed affects movement and attack cooldown; power is a multiplier on base damage (Low=0.8×, Med=1.0×, High=1.3×).

## Controls
| Action      | Player 1 | Player 2     |
|-------------|----------|--------------|
| Move left   | A        | ←            |
| Move right  | D        | →            |
| Jump        | W        | ↑            |
| Block       | S        | ↓            |
| Punch       | F        | K            |
| Kick        | G        | L            |

## Rendering
- Use **Phaser.js 3** (with its TypeScript types). It is the most mature 2D browser game framework, covers physics, sprite animation, input, and audio out of the box, and has no runtime cost.

## Art style & asset format
- Style: **pixel art**, consistent with the retro soundtrack feel.
- Each character spritesheet: individual frames at **128×128px**, laid out in a single horizontal strip (one row per animation).
- Animations per character: idle (4 frames), walk (6 frames), jump (4 frames), punch (4 frames), kick (5 frames), block (2 frames), KO (5 frames).
- Background scenes: **800×450px** static PNG (one per arena).
- Generate art via Google Gemini in the user's Chrome browser using Playwright MCP. Prompt style: "pixel art, 128x128, cartoonish [character], fighting game sprite, transparent background".
- All assets committed under `assets/sprites/` and `assets/backgrounds/`.

## Audio
- Use **Tone.js** to procedurally generate chiptune-style sound effects (hit, block, jump, KO) at runtime — no audio files needed.
- Use **BeepBox** (free, browser-based) to compose the background tracks, then export as MP3 and commit to the repo under `assets/audio/`.
- One track per screen: title, character select, fight arena.

## Journal
- Maintain a file `JOURNAL.md` at the repo root.
- Each entry: `## YYYY-MM-DD — <title>` followed by a short paragraph of the decision or deliberation.
- Append only. Do not edit past entries.

## Milestones & feedback triggers
Send a Telegram message to the human for feedback at each of these checkpoints — then wait for a reply before continuing:
1. After the GitHub repo is created and the project scaffold (Phaser + Vite + TS) builds and deploys to Pages.
2. After the fight screen is playable end-to-end with at least 2 characters (placeholder art is fine).
3. After all 4 characters have final art, all animations, and audio are in.
4. When the agent considers the product complete and ready for final review.

## Subagent error policy
- If a subagent fails, retry once with the same prompt.
- On second failure, log the error in `JOURNAL.md` and notify the human via Telegram before proceeding with a fallback approach.
- Never silently skip a failed task.

## Concurrent agent coordination
- Use a plain-text file `AGENTS.lock` at the repo root as a coordination log.
- Each agent appends a one-line entry `<timestamp> <agent-id> <task>` when it starts a task and `<timestamp> <agent-id> DONE <task>` when it finishes.
- Agents must read this file before starting any task that writes shared files to avoid conflicts.

# Stack
- TypeScript
- Phaser.js 3
- Vite (dev server + build)
- Vitest (unit tests)
- pnpm (package manager)

# Version control
- Create a public repository in github for this project named **`food-fighters`**.

# Deployment
- Deploy to GitHub Pages via a GitHub Actions workflow triggered on push to `main`.
- Workflow: install → build (`vite build`) → deploy `dist/` to `gh-pages` branch using `peaceiris/actions-gh-pages`.
- Set `base: '/food-fighters/'` in `vite.config.ts` — required for asset paths to resolve correctly on GitHub Pages.
- In the GitHub Actions workflow, set up pnpm with `pnpm/action-setup` before any install or build steps, otherwise the runner will not recognise the `pnpm` command.
- Declare `permissions: contents: write` at the job level in the workflow YAML so `GITHUB_TOKEN` can push to the `gh-pages` branch.
- After the first successful deploy, enable GitHub Pages via CLI: `gh api --method POST /repos/OWNER/food-fighters/pages -f source[branch]=gh-pages -f source[path]=/`
