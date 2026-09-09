# Nebula Survivors

Nebula Survivors is an original, polished browser arena-survival game built with HTML, CSS, Canvas 2D, and vanilla JavaScript. Runtime gameplay has no external dependency or account requirement.

## Game-v2 feature set

- Endless escalating waves with grunts, runners, tanks, elites, and Void Warden bosses
- Automatic nearest-target combat
- Three weapon families: Pulse Blaster, Orbit Shards, and Nova Ring
- Weapon levels, passive skills, build synergy, and original weapon evolutions
- Random three-card level-up choices
- XP shards, score, kills, waves, health, armor, magnet range, haste, multi-shot, and movement upgrades
- Polished procedural neon arena graphics, particles, hit flashes, enemy health bars, projectiles, arena rings, and boss presentation
- Low / Medium / High / Ultra graphics choices
- Particle, glow, grid, damage-number, screen-shake, high-contrast/color-friendly, and reduced-motion settings
- Master volume with lightweight original Web Audio feedback that starts from user interaction
- Keyboard controls and mobile virtual joystick
- Pause, resume, quit, restart, and game-over flow
- Local high-score leaderboard (top 10)
- Guarded localStorage saves for settings and records
- Client-only PNG/JPEG player skins with 2 MB / 1024px limits
- Runtime error screen and clamped animation delta for resilience
- HiDPI canvas rendering

## Controls

Desktop: **WASD / Arrow Keys** move, **P** pauses. Mobile: drag the virtual joystick. Mouse/touch is used for menus and upgrade cards.

## Run locally

Serve the repository root with any static server, or deploy the root to a static host such as Netlify. There is no build step required.

## Privacy

Gameplay, settings, scores, and custom skins are kept locally in the browser. There is no login, analytics, or gameplay network requirement in this implementation.

## Branch policy

This feature build is on **`game-v2`**. **`main` is intentionally untouched.** The separate `game-v3` branch is not the target for this work.

## Original-content note

The game follows the broad arena-survival genre pattern but uses original names, mechanics, procedural visuals, UI, and audio. It does not copy another game's proprietary code, branding, artwork, audio, characters, or exact content.
