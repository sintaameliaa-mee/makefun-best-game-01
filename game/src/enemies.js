// Enemies march the road from the west gate to the beacon. Each one tracks
// its distance along the path, so towers can always aim at the furthest
// along (the classic "first" targeting) and the game can measure progress.
// Elites are tougher, richer variants; splitters burst into swarmlets on
// death, and menders heal nearby allies.
import {
  ENEMIES, enemyHpFor, pathWaypoints,
  ELITE_HP_MULTIPLIER, ELITE_REWARD_MULTIPLIER,
} from './config.js';

let nextId = 1;

export class Enemy {
  // options: { elite, spawnAt: { x, y, waypointIndex, distance } } — the
  // spawnAt form places a split child mid-road instead of at the west gate.
  constructor(type, wave, options = {}) {
    const def = ENEMIES[type];
    const waypoints = pathWaypoints();
    this.id = nextId;
    nextId += 1;
    this.type = type;
    this.name = def.name;
    this.elite = Boolean(options.elite);
    const at = options.spawnAt;
    this.x = at ? at.x : waypoints[0].x;
    this.y = at ? at.y : waypoints[0].y;
    this.waypointIndex = at ? at.waypointIndex : 1;
    this.distance = at ? at.distance : 0;
    this.maxHp = enemyHpFor(type, wave);
    if (this.elite) this.maxHp = Math.round(this.maxHp * ELITE_HP_MULTIPLIER);
    this.hp = this.maxHp;
    this.maxShield = def.shield || 0;
    this.shield = this.maxShield;
    this.speed = def.speed * (this.elite ? 0.95 : 1);
    this.reward = def.reward * (this.elite ? ELITE_REWARD_MULTIPLIER : 1);
    this.lives = def.lives;
    this.radius = def.radius + (this.elite ? 2 : 0);
    this.color = def.color;
    this.dark = def.dark;
    this.splitsInto = def.splitsInto || null;
    this.healRadius = def.healRadius || 0;
    this.healRate = def.healRate || 0;
    this.slowFactor = 0;
    this.slowUntil = 0;
    this.flash = 0;
    this.wobbleSeed = Math.random() * Math.PI * 2;
    this.dead = false;
    this.escaped = false;
  }

  get slowed() {
    return this.slowFactor > 0;
  }

  get isMender() {
    return this.healRate > 0;
  }

  // Mend an ally: never above full health, never the dead. Returns the
  // amount actually restored (0 when the target is already full).
  heal(amount) {
    if (this.dead || this.escaped || this.hp >= this.maxHp) return 0;
    const restored = Math.min(amount, this.maxHp - this.hp);
    this.hp += restored;
    return restored;
  }

  applySlow(factor, duration, now) {
    if (factor > this.slowFactor) this.slowFactor = factor;
    this.slowUntil = now + duration;
  }

  // Damage eats the shield first, then health. Returns the gold earned
  // when this hit kills the enemy, else 0.
  takeDamage(amount, now) {
    let remaining = amount;
    if (this.shield > 0) {
      const absorbed = Math.min(this.shield, remaining);
      this.shield -= absorbed;
      remaining -= absorbed;
    }
    this.hp -= remaining;
    this.flash = 0.12;
    if (this.hp <= 0 && !this.dead) {
      this.dead = true;
      return this.reward;
    }
    return 0;
  }

  update(dt, now, waypoints) {
    if (this.flash > 0) this.flash -= dt;
    if (now > this.slowUntil) this.slowFactor = 0;
    const speed = this.speed * (1 - this.slowFactor);
    let travel = speed * dt;
    while (travel > 0 && this.waypointIndex < waypoints.length) {
      const target = waypoints[this.waypointIndex];
      const dx = target.x - this.x;
      const dy = target.y - this.y;
      const dist = Math.hypot(dx, dy);
      if (dist <= travel) {
        this.x = target.x;
        this.y = target.y;
        this.distance += dist;
        travel -= dist;
        this.waypointIndex += 1;
      } else {
        this.x += (dx / dist) * travel;
        this.y += (dy / dist) * travel;
        this.distance += travel;
        travel = 0;
      }
    }
    if (this.waypointIndex >= waypoints.length) {
      this.escaped = true;
    }
  }

  get totalHealth() {
    return this.hp + this.shield;
  }

  get maxTotalHealth() {
    return this.maxHp + this.maxShield;
  }
}
