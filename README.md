# Nebula Survivors

Nebula Survivors is a polished, original browser arena-survival game built with **HTML, CSS, and vanilla JavaScript**. It is dependency-free at runtime and does not require React, Vite, or an external game library.

## Play

Serve the repository from a static web server, or deploy the repository root to a static host such as Netlify. The game is designed for desktop and mobile browsers.

## Gameplay

- Real-time Canvas 2D arena with camera follow
- Auto-targeting weapon with multi-shot, fire-rate, projectile, and critical-hit upgrades
- Escalating enemy waves with regular enemies, elites, and Warden boss encounters
- XP shards, level-ups, three-choice upgrade cards, and persistent best-run records
- HP regeneration, armor, pickup magnet, particles, glows, hit feedback, and lightweight Web Audio feedback
- Pause, resume, restart, quit-to-menu, and game-over states
- Responsive HUD and virtual joystick for touch devices
- No network dependency during gameplay and no account/login requirement

## Controls

### Desktop

- **WASD / Arrow Keys:** Move
- **P:** Pause / resume
- **Mouse:** UI controls

### Mobile

- Drag the virtual joystick to move.
- Tap upgrade, pause, resume, restart, and menu buttons normally.

## Game flow

1. Start a run.
2. Move through the arena while enemies spawn outside the visible play area.
3. Your weapon automatically aims at the nearest living enemy.
4. Collect cyan XP shards to level up.
5. Choose one of three upgrades whenever you level up.
6. Enemy density and strength increase with time, with elite enemies appearing more often.
7. Warden bosses appear on the two-minute cycle and award a large XP payout when defeated.
8. Push for a better time and level on every run.

## Reliability and debugging

The runtime initializes after the DOM is ready, validates required elements, validates the Canvas 2D context, and keeps a visible error panel for uncaught runtime errors. The animation loop is protected so a frame exception stops gameplay without leaving a silent black screen.

Canvas backing resolution is scaled by device pixel ratio (capped at 2x), while the simulation delta is clamped to prevent huge updates after tab switches or stalled frames. Local save parsing is guarded so malformed storage data cannot prevent startup.

## Project structure

```text
.
├── index.html
├── css/
│   └── main.css
├── js/
│   ├── main.js
│   └── game-test.js
├── .github/
│   └── workflows/
│       └── ci.yml
├── eslint.config.js
├── package.json
├── netlify.toml
├── LICENSE
└── README.md
```

## Quality checks

```bash
npm install
npm run lint
npm test
node --check js/main.js
```

GitHub Actions runs these checks automatically on pushes and pull requests targeting `main` or `game-v2`.

## Deployment

The repository is static. Netlify should use the repository root as the publish directory with no build command. The active game implementation is on the `game-v2` branch.

## Original-content note

Nebula Survivors is an original project inspired by the broad arena-survival genre. It does not copy another game's branding, proprietary code, artwork, audio, characters, or exact level content.

## License

The source code is released under the MIT License. See `LICENSE` for the full text.
