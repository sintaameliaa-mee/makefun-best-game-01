// Towers stand on grid cells and shoot the enemy furthest along the road
// within range. Each tower tracks what the player invested in it, so the
// sell refund is always exactly 70% of the gold spent on it.
import { TOWERS, cellCenter } from './config.js';

let nextId = 1;

export class Tower {
  constructor(type, col, row) {
    const def = TOWERS[type];
    const at = cellCenter(col, row);
    this.id = nextId;
    nextId += 1;
    this.type = type;
    this.name = def.name;
    this.col = col;
    this.row = row;
    this.x = at.x;
    this.y = at.y;
    this.level = 1;
    this.invested = def.cost;
    this.cooldown = 0;
    this.angle = -Math.PI / 2;
    this.recoil = 0;
    this.kills = 0;
  }

  get def() {
    return TOWERS[this.type];
  }

  get damage() {
    return this.def.damage[this.level - 1];
  }

  get range() {
    return this.def.range[this.level - 1];
  }

  get fireRate() {
    return this.def.fireRate[this.level - 1];
  }

  get projectileSpeed() {
    return this.def.projectileSpeed;
  }

  get splashRadius() {
    return this.def.splashRadius ? this.def.splashRadius[this.level - 1] : 0;
  }

  get slowFactor() {
    return this.def.slowFactor ? this.def.slowFactor[this.level - 1] : 0;
  }

  get slowDuration() {
    return this.def.slowDuration || 0;
  }

  get maxed() {
    return this.level >= 3;
  }

  get upgradeCost() {
    if (this.maxed) return null;
    return this.def.upgradeCost[this.level - 1];
  }

  get sellValue() {
    // Integer math: 70% of the gold invested, rounded down. (Plain
    // invested * 0.7 loses a gold to floating point, e.g. 90 * 0.7 = 62.99.)
    return Math.floor((this.invested * 7) / 10);
  }

  upgrade() {
    if (this.maxed) return false;
    this.invested += this.upgradeCost;
    this.level += 1;
    return true;
  }

  // Classic "first" targeting: the living enemy in range that has travelled
  // furthest along the road.
  acquireTarget(enemies) {
    let best = null;
    let bestDistance = -1;
    for (const enemy of enemies) {
      if (enemy.dead || enemy.escaped) continue;
      const dx = enemy.x - this.x;
      const dy = enemy.y - this.y;
      if (dx * dx + dy * dy > this.range * this.range) continue;
      if (enemy.distance > bestDistance) {
        bestDistance = enemy.distance;
        best = enemy;
      }
    }
    return best;
  }

  update(dt, enemies, spawnProjectile) {
    this.cooldown -= dt;
    if (this.recoil > 0) this.recoil -= dt * 6;
    const target = this.acquireTarget(enemies);
    if (!target) return;
    this.angle = Math.atan2(target.y - this.y, target.x - this.x);
    if (this.cooldown > 0) return;
    this.cooldown = 1 / this.fireRate;
    this.recoil = 1;
    spawnProjectile(this, target);
  }
}
