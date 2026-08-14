# Centipede

A browser remake of Atari Centipede with a 3D playfield, classic rules, and a few modern extras (combos, power-ups, bloom, screen shake).

**Play now:** [https://kkcentipede.netlify.app/](https://kkcentipede.netlify.app/)

Keyboard and mouse required. Works in a current Chrome, Firefox, Edge, or Safari.

## Controls

| Action | Keys |
| --- | --- |
| Move | WASD or arrow keys |
| Aim | Mouse |
| Fire | Click or Space (hold) |
| Pause | Esc |

You are locked to the bottom of the garden. Shoot toward the top of the field.

## How to play

The centipede crawls across the mushrooms, drops a row, and reverses when it hits an obstacle or the edge of the board.

- A **body** hit splits the worm and leaves a mushroom.
- A **head** hit is worth more points.
- Mushrooms take **4** shots. A scorpion poisons them; poisoned mushrooms make the worm dive at you.
- The **spider** hunts in your zone. The **flea** drops extra mushrooms when the bottom of the field is sparse.
- Chain hits for a **combo**. Extra life every **12,000** points.

Power-ups can drop from destroyed mushrooms and enemies:

- **Rapid** — faster fire
- **Spread** — three-way shot
- **Shield** — blocks one hit
- **Slow** — enemies move in slow motion

High score is stored in this browser only (`localStorage`). There is no account or online leaderboard.

## Run locally

Needs [Node.js](https://nodejs.org/) 18+.

```bash
npm install
npm run dev
```

Opens at [http://localhost:5173/](http://localhost:5173/).

```bash
npm run build      # production files in dist/
npm run preview    # serve the production build locally
```

## Deploy

This is a static Vite app. Host the contents of `dist/` (not the whole repo).

The live site is on [Netlify](https://kkcentipede.netlify.app/). To publish an update:

1. `npm run build`
2. In the Netlify site, open **Deploys** and drag the new `dist` folder onto **Deploy manually**

Do not commit `dist/` or `node_modules/`. They are already in `.gitignore`.

## Stack

- [Three.js](https://threejs.org/) — 3D scene, lights, shadows, bloom
- [Vite](https://vite.dev/) — dev server and production build
- Web Audio API — procedural sound (no audio files)

## Project layout

```
src/
  main.js                 entry
  game/Game.js            loop, waves, collisions
  game/constants.js       grid size, scores, cooldowns
  world/Arena.js          camera, lights, board
  entities/               player, centipede, mushrooms, enemies
  fx/                     particles, screen shake
  ui/HUD.js               menus and HUD
```
