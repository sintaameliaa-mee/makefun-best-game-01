// Balance, map and content definitions for Aurora Keep. Every number the
// game plays by lives here, so tuning never touches the simulation code.

export const VIEW_WIDTH = 1280;
export const VIEW_HEIGHT = 720;
export const HUD_HEIGHT = 64;
export const SHOP_HEIGHT = 104;
export const CELL = 40;
export const GRID_COLS = 32;
export const GRID_ROWS = 14;
export const PLAYFIELD_TOP = HUD_HEIGHT;
export const PLAYFIELD_BOTTOM = VIEW_HEIGHT - SHOP_HEIGHT;

export const START_GOLD = 200;
export const START_LIVES = 20;
export const TOTAL_WAVES = 12;
export const SELL_REFUND = 0.7;
export const KILL_SCORE_MULTIPLIER = 10;
export const VICTORY_LIFE_BONUS = 100;

// The road the horde marches along, as grid cells (column, row) from the
// west gate to the beacon at the east edge. Row 0 is the first row under
// the HUD; the pixel centre of a cell is (c * CELL + CELL / 2,
// PLAYFIELD_TOP + r * CELL + CELL / 2).
export const PATH_CELLS = [
  [0, 2], [6, 2], [6, 8], [12, 8], [12, 4], [18, 4],
  [18, 10], [24, 10], [24, 6], [31, 6],
];

export function cellCenter(col, row) {
  return {
    x: col * CELL + CELL / 2,
    y: PLAYFIELD_TOP + row * CELL + CELL / 2,
  };
}

export function pathWaypoints() {
  return PATH_CELLS.map(([col, row]) => cellCenter(col, row));
}

export function pathCellSet() {
  const cells = new Set();
  for (let i = 0; i < PATH_CELLS.length - 1; i += 1) {
    const [c0, r0] = PATH_CELLS[i];
    const [c1, r1] = PATH_CELLS[i + 1];
    const stepC = Math.sign(c1 - c0);
    const stepR = Math.sign(r1 - r0);
    let c = c0;
    let r = r0;
    cells.add(`${c},${r}`);
    while (c !== c1 || r !== r1) {
      c += stepC;
      r += stepR;
      cells.add(`${c},${r}`);
    }
  }
  return cells;
}

// Towers: four roles, three levels each. Damage, range and fire rate are
// per level; upgradeCost is what level 2 / level 3 cost on top of the base.
export const TOWERS = {
  spark: {
    key: 'spark',
    name: 'Spark Spire',
    short: 'Rapid bolts, cheap and cheerful.',
    cost: 50,
    color: '#ffd166',
    core: '#fff3b0',
    damage: [6, 10, 16],
    range: [112, 124, 138],
    fireRate: [3.0, 3.6, 4.4],
    projectileSpeed: 520,
    upgradeCost: [40, 60],
  },
  frost: {
    key: 'frost',
    name: 'Frost Obelisk',
    short: 'Chills the horde to a crawl.',
    cost: 90,
    color: '#7dd3fc',
    core: '#e0f2fe',
    damage: [3, 5, 8],
    range: [104, 116, 130],
    fireRate: [1.2, 1.4, 1.7],
    projectileSpeed: 380,
    slowFactor: [0.35, 0.45, 0.55],
    slowDuration: 1.6,
    upgradeCost: [70, 110],
  },
  cannon: {
    key: 'cannon',
    name: 'Cannon Bastion',
    short: 'Slow, heavy, devastating.',
    cost: 120,
    color: '#fb923c',
    core: '#ffedd5',
    damage: [26, 42, 65],
    range: [142, 154, 168],
    fireRate: [0.55, 0.62, 0.72],
    projectileSpeed: 460,
    upgradeCost: [95, 145],
  },
  nova: {
    key: 'nova',
    name: 'Nova Mortar',
    short: 'Lobbed shells burst in an area.',
    cost: 150,
    color: '#c084fc',
    core: '#f3e8ff',
    damage: [12, 19, 30],
    range: [162, 176, 192],
    fireRate: [0.5, 0.55, 0.62],
    projectileSpeed: 340,
    splashRadius: [56, 66, 80],
    upgradeCost: [120, 180],
  },
};

export const TOWER_ORDER = ['spark', 'frost', 'cannon', 'nova'];

// Enemies: hit points scale with the wave, speed and reward do not.
export const ENEMIES = {
  drifter: {
    key: 'drifter',
    name: 'Drifter',
    hp: 30,
    speed: 56,
    reward: 8,
    lives: 1,
    radius: 13,
    color: '#4ade80',
    dark: '#166534',
  },
  swift: {
    key: 'swift',
    name: 'Swift',
    hp: 20,
    speed: 108,
    reward: 10,
    lives: 1,
    radius: 11,
    color: '#facc15',
    dark: '#854d0e',
  },
  swarmlet: {
    key: 'swarmlet',
    name: 'Swarmlet',
    hp: 10,
    speed: 76,
    reward: 4,
    lives: 1,
    radius: 9,
    color: '#a3e635',
    dark: '#3f6212',
  },
  bulwark: {
    key: 'bulwark',
    name: 'Bulwark',
    hp: 150,
    speed: 38,
    reward: 22,
    lives: 2,
    radius: 17,
    color: '#f87171',
    dark: '#7f1d1d',
  },
  wraith: {
    key: 'wraith',
    name: 'Wraith',
    hp: 55,
    shield: 30,
    speed: 66,
    reward: 18,
    lives: 1,
    radius: 13,
    color: '#c084fc',
    dark: '#581c87',
  },
  colossus: {
    key: 'colossus',
    name: 'Dread Colossus',
    hp: 900,
    speed: 30,
    reward: 150,
    lives: 5,
    radius: 26,
    color: '#ef4444',
    dark: '#450a0a',
  },
};

export function enemyHpFor(type, wave) {
  const base = ENEMIES[type].hp;
  return Math.round(base * (1 + 0.2 * (wave - 1)));
}

export function waveClearBonus(wave) {
  return 20 + 5 * wave;
}

// Waves: groups of { type, count, gap } spawn in order; gap is the seconds
// between two spawns of the same group. A wave ends when its queue is empty
// and every spawned enemy is dead or through.
export const WAVES = [
  [{ type: 'drifter', count: 8, gap: 0.9 }],
  [
    { type: 'drifter', count: 12, gap: 0.7 },
    { type: 'swift', count: 4, gap: 0.6 },
  ],
  [
    { type: 'swift', count: 10, gap: 0.55 },
    { type: 'swarmlet', count: 8, gap: 0.35 },
  ],
  [
    { type: 'bulwark', count: 6, gap: 1.4 },
    { type: 'drifter', count: 10, gap: 0.6 },
  ],
  [
    { type: 'colossus', count: 1, gap: 1 },
    { type: 'swarmlet', count: 8, gap: 0.4 },
  ],
  [
    { type: 'wraith', count: 12, gap: 0.7 },
    { type: 'swift', count: 8, gap: 0.5 },
  ],
  [
    { type: 'bulwark', count: 10, gap: 1.1 },
    { type: 'swarmlet', count: 12, gap: 0.3 },
  ],
  [
    { type: 'swift', count: 16, gap: 0.45 },
    { type: 'wraith', count: 6, gap: 0.8 },
    { type: 'bulwark', count: 4, gap: 1.2 },
  ],
  [
    { type: 'swarmlet', count: 20, gap: 0.28 },
    { type: 'drifter', count: 10, gap: 0.5 },
    { type: 'wraith', count: 6, gap: 0.7 },
  ],
  [
    { type: 'colossus', count: 2, gap: 6 },
    { type: 'swift', count: 10, gap: 0.5 },
  ],
  [
    { type: 'bulwark', count: 8, gap: 1.0 },
    { type: 'wraith', count: 12, gap: 0.6 },
    { type: 'swift', count: 10, gap: 0.45 },
  ],
  [
    { type: 'colossus', count: 3, gap: 5 },
    { type: 'wraith', count: 8, gap: 0.7 },
    { type: 'bulwark', count: 6, gap: 1.0 },
  ],
];
