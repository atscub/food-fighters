# Food Fighters - Decision Journal

## 2026-03-21 - Project bootstrap

Initialized the Food Fighters project. Chose Phaser 3.90 + Vite 8 + TypeScript as the stack per requirements. Created the GitHub repo at atscub/food-fighters and set up CI/CD with GitHub Actions deploying to Pages via peaceiris/actions-gh-pages. Using pnpm as package manager, Vitest for unit tests. Tone.js installed for procedural chiptune sound effects.

## 2026-03-21 — Mobile touch controls requirement

Human added a new requirement: the game must be playable on mobile phones, not just keyboard. Decision: implement virtual touch controls — a D-pad/joystick on the left for movement, action buttons on the right for punch/kick/block/jump. On mobile, two-player on one device is impractical on a phone screen, so the touch controls will drive P1 by default. Two-player remains keyboard-only. Will use Phaser's built-in pointer/touch input for the virtual controls overlay.
