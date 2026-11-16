# Aurora Keep — Tower Defense of the Last Light

A complete tower-defense game for the make.fun **best-game-01** bounty:
defend the beacon against 12 waves of the horde across a winding road
under the aurora.

## Play

Open `game/index.html` in desktop Chrome (serve the `game/` folder over
HTTP, e.g. `python3 -m http.server` from `game/`), or open the page the
bounty links to once entries close.

- **Goal:** stop every wave before it reaches the beacon. Survive all 12
  waves to win; lose all 20 lives and the light fades.
- **Build:** click a tower card (or press 1–4), then click a free field
  cell. Four towers — Spark Spire (rapid), Frost Obelisk (slow), Cannon
  Bastion (heavy), Nova Mortar (splash) — each with 3 upgrade levels.
- **Economy:** kills pay gold, clearing a wave pays a bonus, towers sell
  back at 70%.
- **Controls:** mouse to place / select / upgrade / sell; Space starts a
  wave; P pauses; F toggles 1x/2x speed; M mutes; Esc cancels.

## Layout

- `main.ts` — entrypoint: copies `game/` and `screenshots/` to the output
  directory and writes `dossier.json` with the kit's `buildDossier`.
- `game/` — the game itself, plain static files, no network requests:
  `index.html`, `style.css`, and `src/` (one module per job: config,
  game state, towers, enemies, projectiles, waves, rendering, input,
  particles, audio, screenshot setups).
- `screenshots/` — four real renders of the game's own code.
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged.

## Screenshots

Deterministic frames via URL parameters: `?shot=menu`, `?shot=play`,
`?shot=shop`, `?shot=end`. Each stages a fixed setup with a fixed seed and
freezes the frame for capture.
