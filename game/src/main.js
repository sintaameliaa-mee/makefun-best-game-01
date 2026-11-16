// Bootstrap for Aurora Keep: creates the game, wires input, runs the
// fixed-timestep simulation (60 steps a second, decoupled from the frame
// rate) and paints every animation frame. Screenshot mode (?shot=...) stages
// a scripted frame, advances it a fixed number of steps and freezes it, then
// signals window.__auroraShot so an automated capture knows it is ready.
import { VIEW_WIDTH, VIEW_HEIGHT } from './config.js';
import { Game } from './game.js';
import { drawGame } from './render.js';
import { attachInput } from './input.js';
import { setupShot } from './shots.js';

const STEP = 1 / 60;
const FROZEN_RENDER_TIME = 12.5;

const canvas = document.getElementById('game');
canvas.width = VIEW_WIDTH;
canvas.height = VIEW_HEIGHT;
const ctx = canvas.getContext('2d');

const game = new Game(20261116);
attachInput(canvas, game);

const params = new URLSearchParams(window.location.search);
const shotName = params.get('shot');
let frozen = false;
let renderTime = 0;

if (shotName) {
  const advanceSeconds = setupShot(game, shotName);
  const steps = Math.round(advanceSeconds / STEP);
  for (let i = 0; i < steps; i += 1) {
    game.update(STEP);
  }
  game.paused = false;
  game.shotFreeze = true;
  frozen = true;
  renderTime = FROZEN_RENDER_TIME;
  window.__auroraShot = 'ready';
}

// Test and automation hooks: the game object, a way to step the simulation
// without waiting for animation frames, and a snapshot of the economy.
window.__aurora = {
  game,
  step(seconds) {
    const steps = Math.round(seconds / STEP);
    for (let i = 0; i < steps; i += 1) {
      game.paused = false;
      game.update(STEP);
    }
    return {
      gold: game.gold,
      lives: game.lives,
      score: game.score,
      wave: game.wave,
      kills: game.kills,
      screen: game.screen,
      enemies: game.enemies.length,
      towers: game.towers.length,
    };
  },
  snapshot() {
    return {
      gold: game.gold,
      lives: game.lives,
      score: game.score,
      wave: game.wave,
      kills: game.kills,
      screen: game.screen,
      enemies: game.enemies.length,
      towers: game.towers.length,
      waveActive: game.waveActive,
    };
  },
};

let last = performance.now();
let accumulator = 0;

function frame(now) {
  const elapsed = Math.min(0.25, (now - last) / 1000);
  last = now;
  if (!frozen) {
    renderTime += elapsed;
    accumulator += elapsed;
    let guard = 0;
    while (accumulator >= STEP && guard < 12) {
      game.update(STEP);
      accumulator -= STEP;
      guard += 1;
    }
    if (guard >= 12) accumulator = 0;
  }
  drawGame(ctx, game, renderTime);
  requestAnimationFrame(frame);
}

requestAnimationFrame(frame);
