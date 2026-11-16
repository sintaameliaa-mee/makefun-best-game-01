// Deterministic screenshot setups: ?shot=menu|play|shop|end stages the game
// into a fixed, reproducible frame. The play and shop shots build a real
// mid-game defense, start a real wave and advance the simulation a fixed
// number of ticks with a fixed seed, so the capture is the same every time.
import { TOWERS } from './config.js';

const DEMO_DEFENSE = [
  ['spark', 5, 1, 2],
  ['spark', 5, 3, 1],
  ['spark', 11, 3, 3],
  ['frost', 7, 6, 2],
  ['frost', 13, 9, 1],
  ['cannon', 13, 5, 4],
  ['cannon', 19, 9, 2],
  ['nova', 19, 7, 2],
  ['nova', 25, 7, 1],
];

function buildDemoDefense(game) {
  game.gold = 100000;
  for (const [type, col, row, level] of DEMO_DEFENSE) {
    const result = game.placeTower(type, col, row);
    if (result.ok) {
      while (result.tower.level < level) result.tower.upgrade();
    }
  }
}

function stageMidGame(game, waveNumber, advanceSeconds) {
  game.screen = 'playing';
  buildDemoDefense(game);
  game.gold = 340;
  game.lives = 18;
  game.score = 1250;
  game.wave = waveNumber - 1;
  game.startWave();
  return advanceSeconds;
}

export function setupShot(game, name) {
  // Returns the seconds of simulation to run before freezing the frame.
  if (name === 'play') {
    // Wave 12: three Dread Colossi march with wraiths, elite bulwarks,
    // menders and splitters — the boss bar, the full defense and a busy
    // sky of bolts.
    return stageMidGame(game, 12, 30);
  }
  if (name === 'shop') {
    const seconds = stageMidGame(game, 6, 9);
    const cannon = game.towers.find((t) => t.type === 'cannon' && t.level >= 4);
    if (cannon) game.selected = cannon;
    return seconds;
  }
  if (name === 'end') {
    game.screen = 'playing';
    buildDemoDefense(game);
    game.gold = 520;
    game.score = 8450;
    game.kills = 187;
    game.goldEarned = 1240;
    game.flawlessWaves = 8;
    game.lives = 14;
    game.wave = 12;
    game.waveActive = false;
    game.waveRunner = null;
    game.screen = 'victory';
    return 0;
  }
  // 'menu' and anything unknown: the title screen, no simulation.
  game.screen = 'menu';
  return 0;
}

export const SHOT_NAMES = ['menu', 'play', 'shop', 'end'];
export { TOWERS };
