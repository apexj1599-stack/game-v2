# Nebula Survivors

A polished, original browser arena-survival game built with **HTML, CSS, and vanilla JavaScript**. No React, Vite, framework, or external game library is required.

## Play

Open `index.html` in a modern browser, or serve the repository with any static web server. It is designed for desktop and mobile browsers.

## What is included

- Canvas-based real-time game loop
- WASD and arrow-key movement
- Mobile virtual joystick using Pointer Events
- Automatic target selection and weapon firing
- 8 original weapons with level scaling and evolution milestones
- 6 upgrade types for damage, speed, pickup range, armor, health, and cooldown
- Multiple enemies: Grunt, Runner, Brute, Ranged, Elite
- Boss encounters with boss health bars
- XP shards, level-ups, upgrade selection, kills, waves, and run statistics
- Procedural arena with camera follow and visual effects
- Particles, damage numbers, screen shake, glow effects, and simple Web Audio feedback
- Pause/resume, restart, quit-to-menu, and game-over states
- Responsive HUD and touch-friendly controls
- Local persistent records using `localStorage`
- Zero network gameplay dependency and no account required

## Controls

### Desktop

- **WASD / Arrow Keys:** Move
- **P:** Pause / resume
- **Mouse:** UI buttons

### Mobile

- Drag the on-screen joystick to move.
- Tap upgrade cards, pause, resume, and restart buttons.

## Game flow

1. Start a run.
2. Stay alive while enemies close in from around the arena.
3. Auto-attacks target nearby enemies.
4. Collect blue XP shards.
5. Level up and choose one of three upgrades.
6. Add and improve weapons until your build becomes powerful enough for elite enemies and bosses.
7. Survive as long as possible and improve your best run.

## Project structure

```text
.
├── index.html
├── css/
│   └── main.css
├── js/
│   └── main.js
├── netlify.toml
└── README.md
```

## Architecture

`index.html` contains the semantic UI, overlays, HUD, canvas, and mobile controls. `css/main.css` handles the visual system and responsive layout. `js/main.js` contains the complete game state, entities, input, spawning, combat, upgrades, rendering, persistence, and audio feedback.

The game uses `requestAnimationFrame()` for the real-time loop and Canvas 2D for highly dynamic rendering. Collision is based on lightweight circular hitboxes so large enemy counts remain manageable in a browser.

## Performance notes

The canvas is scaled for device pixel ratio with a cap of 2x. The frame delta is clamped to avoid very large simulation jumps after tab switching or slow frames. The game also uses simple arrays and bounded particle lifetimes to keep transient effects under control.

## Save data

Run records are stored locally under the key `nebula-survivors-v2`. Clearing browser site data resets the local records.

## Original-content note

Nebula Survivors is an original project. It is inspired by the broad arena-survival genre, but it does not copy another game's branding, proprietary code, artwork, sound effects, characters, or exact level content.

## Deployment

This repo is static and works with GitHub Pages, Netlify, Cloudflare Pages, or any static host. Netlify can publish the repository root because `index.html` is at the project root.

## License

The source code in this repository is released under the MIT License. See `LICENSE` for the full text.
