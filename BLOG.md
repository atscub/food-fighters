# Building a Fighting Game in One Day with Claude: A Self-Bootstrapping Experiment

*By Abraham and Claude (Opus 4.6) -- March 2026*

![Food Fighters title screen](<!-- PLACEHOLDER: screenshot of the start screen with animated food characters -->)

What happens when you give an AI agent a single markdown file and tell it to build a complete browser game from scratch -- setting up its own tools, agents, and workflows along the way? We tried it, and in under 24 hours we had **Food Fighters**: a fully playable 2D fighting game with four cartoonish food characters, pixel art sprites, chiptune sound effects, and deployment to GitHub Pages.

This is the story of how we built it, told in four phases.

---

## Phase 1: The Bootstrap

The experiment started with a single file: `BOOTSTRAP.md`. Abraham wrote a 115-line document that contained everything Claude needed to know -- not just *what* to build, but *how to operate*. It was part product spec, part operating manual.

The key idea was radical autonomy. The document didn't just say "build a fighting game." It said:

> *You have to set up yourself for this project (agents, skills, MCP, etc), in such a way that allows you to effectively complete the goal.*

The bootstrap file laid out:

- **Product requirements**: A 2D fighting game with four food characters (Sausage, Burger, Bacon, Cheese), each with unique speed/power stats, best-of-3 rounds, two players on one keyboard
- **Technical stack**: Phaser.js 3, TypeScript, Vite, Vitest, Tone.js, pnpm
- **Operational rules**: Communicate via Telegram only, minimize human interaction, use subagents for parallelism, maintain an append-only decision journal
- **Quality gates**: Milestones with mandatory human feedback checkpoints before proceeding
- **Error policy**: Retry once, then log and escalate -- never silently skip failures

### The Brainstorm

Before diving into execution, we had a collaborative brainstorming session. Abraham had the core vision -- food characters fighting in a retro pixel art style -- but many details were still open. Together, we filled in the gaps:

- **Character stat profiles**: We mapped each character onto a speed/power axis. Sausage became the fast, slippery one (0.8x damage). Burger became the slow tank (1.3x damage). Bacon and Cheese filled the middle ground.
- **Game mechanics**: We settled on simple, clean fundamentals -- punch (8 HP), kick (12 HP), blocking (80% damage reduction), aerial attacks (+4 bonus). No complex combo systems for v1.
- **Control mapping**: Two players sharing one keyboard, with WASD+FG for Player 1 and Arrow keys+KL for Player 2.
- **Art pipeline**: We decided to use Google Gemini for pixel art sprite generation, with a green-screen chroma key approach and automated post-processing.
- **Audio approach**: Procedural chiptune SFX via Tone.js at runtime (no audio files needed for effects), plus composed background tracks.

The brainstorm transformed a rough sketch into a complete, buildable specification. By the end, `BOOTSTRAP.md` had grown to include character stat tables, control mappings, spritesheet dimensions (128x128 per frame, 4x7 grid), milestone definitions, and deployment instructions.

![Character select screen showing all four fighters](<!-- PLACEHOLDER: screenshot of character select screen -->)

---

## Phase 2: Execution -- Claude Scaffolds the Entire Project

With the bootstrap document finalized, Claude went to work. The first thing it did was **set up its own infrastructure**:

### Self-Created Agent System

Claude created five specialized subagents, each with a focused role and its own system prompt:

| Agent | Role | Model |
|-------|------|-------|
| **programmer** | Core game developer -- writes TypeScript/Phaser.js code, implements scenes and mechanics | Sonnet |
| **code-reviewer** | Adversarial reviewer -- finds bugs, type issues, performance problems, edge cases | Sonnet |
| **visual-validator** | Visual QA -- uses Playwright to screenshot and verify the game renders correctly | Sonnet |
| **test-runner** | Runs type checks, unit tests, and build verification | Haiku |
| **asset-generator** | Generates pixel art via Gemini in the user's Chrome browser using Playwright MCP | Sonnet |

It also created two skills:
- **telegram**: For sending milestone notifications and polling for Abraham's replies
- **deploy-check**: For verifying GitHub Pages deployment status

And it set up coordination infrastructure: an `AGENTS.lock` file for concurrent agent coordination and `JOURNAL.md` as an append-only decision log.

### The Build

The scaffolding happened fast. In the first evening session (March 21, 2026), Claude hit three milestones in rapid succession:

**20:41** -- Initial scaffold committed. Phaser 3 + Vite + TypeScript project with CI/CD pipeline deploying to GitHub Pages. The repo was created, the workflow was configured, and the first deployment was live.

**21:07** -- Milestone 2: a fully playable fight screen with combat mechanics, HP bars, a timer, round system, and even mobile touch controls (a requirement Abraham added mid-session). Two players could fight with placeholder art.

**22:05** -- Milestone 3: Pixel art sprites, arena background, and chiptune sound effects all integrated. The game had real art and audio.

In roughly 90 minutes, the project went from zero to a playable game with real assets. The `programmer` agent wrote the game code while the `test-runner` validated builds and the `code-reviewer` caught issues.

### Steering: The Gemini Challenge

Not everything went smoothly. The biggest friction point was **asset generation with Google Gemini**.

The original plan was straightforward: use Playwright MCP to control the user's Chrome browser, navigate to Gemini, generate pixel art spritesheets, download them, and post-process them into game-ready strips. In practice, this required significant iteration:

- **Mode selection**: Gemini defaults to "Fast" mode on every new conversation. The agent had to learn to switch to "Pro" mode each time, which produces dramatically better structured output.
- **Quality control**: Early Gemini outputs came back with text labels embedded in the sprites, wrong grid layouts, or inconsistent character designs across frames. Claude had to learn to *reject bad output and iterate on the prompt* rather than trying to fix fundamental issues in post-processing.
- **Consistency**: Generating each animation state separately produced characters that looked different across their idle, walk, and attack poses. The solution was to generate all 7 animation states (idle, walk, punch, kick, jump, block, KO) in a single 4x7 grid prompt, ensuring visual consistency.
- **The green screen pipeline**: Claude wrote a Python post-processing script (`scripts/process_spritesheet.py`) that handled chroma keying against the #00FF00 green background, green fringe removal on edge pixels, auto-trimming of transparent borders, and splitting the master sheet into per-state horizontal strips.

These lessons were hard-won. After each discovery, Claude updated its own agent instructions (`asset-generator.md`) with the proven prompt templates and workflow steps, so that future runs wouldn't repeat the same mistakes. The commit "Update agent instructions with lessons learned from sprite generation" captures this self-improvement moment.

![Fight scene with two characters battling](<!-- PLACEHOLDER: screenshot of the fight arena with characters mid-combat -->)

---

## Phase 3: The Auto-Improvement Loop

After the core game was functional, Claude entered an autonomous improvement cycle. This is where the multi-agent architecture really paid off. On the afternoon of March 22, a burst of 18 commits landed in just over two hours (14:43 to 15:34), each adding a polished feature:

- **Combat feel**: Screen shake, hit flash effects, red tint on damage, floating damage numbers, hit knockback, and timer urgency effects
- **Visual polish**: Fighter shadows, dust particles on landing, hit spark effects, a favicon
- **Game systems**: Combo counter, round winner announcements, unique passive abilities per character, smooth HP bar animations with low-HP warning indicators
- **UX improvements**: Winner screen with character stats, pause menu (P key), controls help overlay (H key), rematch option (R key), animated character previews on the start and select screens
- **Audio**: Landing thud and whiff whoosh sound effects layered on top of the existing chiptune SFX

The loop worked like this: the `programmer` agent would implement a feature, the `code-reviewer` would audit the code for bugs and edge cases, the `test-runner` would verify the build, and the `visual-validator` would screenshot the game to confirm the visual result. When the reviewer found issues -- like HP bar tween spam, winner animation bugs, or combo timeout problems -- they'd be fixed immediately.

This cycle produced a game that felt surprisingly complete. It wasn't just functional; it had *juice* -- the small details like screen shake and particle effects that make a game feel responsive and satisfying.

---

## Phase 4: The Human Touch

Despite Claude's autonomy, some things needed a human hand. Abraham stepped in for the final round of polish:

### Sprite Cleanup in GIMP

The Gemini-generated sprites, while functional, had artifacts that automated post-processing couldn't fully resolve. Abraham opened each spritesheet in GIMP and manually cleaned them up:

- Removing residual green fringe that the chroma key script missed
- Fixing inconsistent pixel details between animation frames
- Adjusting character proportions and alignment within frames
- Ensuring animations read clearly at the game's display size

This is an honest limitation of the current AI art pipeline: generative models can produce *approximately right* spritesheets, but game-ready pixel art with frame-by-frame consistency still benefits enormously from a human artist's eye. The gap between "generated" and "production-ready" was bridged with GIMP, patience, and attention to detail.

### Spacing and Layout Adjustments

Abraham also manually tuned several spatial aspects of the game:

- Character select screen layout -- box sizes, text positioning, P1/P2 indicator placement
- Fighter hitbox ranges and body overlap thresholds for combat
- Shadow opacity and positioning
- Overall visual balance between UI elements

These are the kinds of aesthetic judgments that are hard to express in a prompt but immediately obvious when playing the game. The last several commits in the repo reflect this back-and-forth tuning: "Fix character select sizing", "Fix P1/P2 indicator overlap", "Require body overlap for attacks to hit."

![Final polished game with all visual effects](<!-- PLACEHOLDER: screenshot of a polished fight with particles, damage numbers, and combo counter -->)

---

## By the Numbers

| Metric | Value |
|--------|-------|
| Time from BOOTSTRAP.md to playable game | ~90 minutes |
| Time from start to feature-complete | ~19 hours (across two sessions) |
| Total commits | 32 |
| Subagents created | 5 |
| Skills created | 2 |
| Characters | 4 (Sausage, Burger, Bacon, Cheese) |
| Animation states per character | 7 (idle, walk, punch, kick, jump, block, KO) |
| Scenes | 3 (Start, Character Select, Fight Arena) |
| Communication channel | Telegram (bot polling) |

---

## What We Learned

### The bootstrap document is everything

The quality of `BOOTSTRAP.md` directly determined the quality of the output. It wasn't enough to describe *what* to build -- we had to describe *how to work*: coordination patterns, error policies, quality gates, and escalation procedures. The brainstorm session that refined this document was arguably the highest-leverage hour of the entire project.

### Multi-agent architecture works, but needs guardrails

The five-agent system (programmer, reviewer, validator, test-runner, asset-generator) provided genuine value. The adversarial code reviewer caught real bugs. The test runner prevented broken builds from being committed. But coordination had overhead -- the `AGENTS.lock` file and clear role boundaries were essential to prevent agents from stepping on each other's work.

### AI-generated game art is close, but not there yet

Gemini Pro can generate recognizable pixel art spritesheets with the right prompting. The green-screen + post-processing pipeline made this viable. But the output still needed significant human cleanup for production quality. The frame-to-frame consistency that hand-drawn pixel art achieves naturally remains a challenge for generative models. This was the single area where human intervention was most critical.

### The auto-improvement loop is powerful

Once the foundation was solid, Claude's ability to autonomously identify and implement polish features was remarkable. The burst of 18 commits adding combat effects, particles, UI improvements, and audio -- all in two hours -- would have taken a human developer significantly longer. The key was having a stable base to build on and clear quality standards to work toward.

### Steering beats micromanaging

Abraham's role shifted throughout the project. During bootstrapping, he was a co-designer. During execution, he was a course-corrector -- stepping in when the Gemini workflow needed adjustment or when visual quality didn't meet the bar. During the improvement loop, he was mostly hands-off. And in the final phase, he was a craftsman, applying the finishing touches that only a human could. The best results came from knowing *when* to intervene and *when* to let Claude run.

---

## Try It Yourself

Food Fighters is live at **[atscub.github.io/food-fighters](https://atscub.github.io/food-fighters/)**. Grab a friend, share a keyboard, and pick your fighter. The source code is on [GitHub](https://github.com/atscub/food-fighters).

![All four food fighters lined up](<!-- PLACEHOLDER: group shot of all four characters or the character select screen -->)

*This game was built as an experiment in AI-assisted game development. The entire project -- from bootstrap to deployment -- was a collaboration between a human (Abraham) and an AI agent (Claude, Opus 4.6). Neither could have built it alone quite like this.*
