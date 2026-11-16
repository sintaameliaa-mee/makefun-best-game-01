// Enemies march the road from the west gate to the beacon. Each one tracks
// its distance along the path, so towers can always aim at the furthest
// along (the classic "first" targeting) and the game can measure progress.
import { ENEMIES, enemyHpFor, pathWaypoints } from './config.js';

let nextId = 1;

export class Enemy {
  constructor(type, wave) {
    const def = ENEMIES[type];
    const waypoints = pathWaypoints();
    this.id = nextId;
    nextId += 1;
    this.type = type;
    this.name = def.name;
    this.x = waypoints[0].x;
    this.y = waypoints[0].y;
    this.waypointIndex = 1;
    this.maxHp = enemyHpFor(type, wave);
    this.hp = this.maxHp;
    this.maxShield = def.shield || 0;
    this.shield = this.maxShield;
    this.speed = def.speed;
    this.reward = def.reward;
    this.lives = def.lives;
    this.radius = def.radius;
    this.color = def.color;
    this.dark = def.dark;
    this.distance = 0;
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
