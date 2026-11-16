// Projectiles fly at the target they were fired at. If the target dies
// mid-flight the shot fizzles at its last position (a mortar shell still
// bursts where it lands). Hits apply damage, frost slows, and splash.
export class Projectile {
  constructor(tower, target) {
    this.x = tower.x;
    this.y = tower.y;
    this.target = target;
    this.speed = tower.projectileSpeed;
    this.damage = tower.damage;
    this.splashRadius = tower.splashRadius;
    this.slowFactor = tower.slowFactor;
    this.slowDuration = tower.slowDuration;
    this.color = tower.def.color;
    this.tower = tower;
    this.trail = [];
    this.spent = false;
  }

  update(dt, enemies, fx, now, onKill) {
    if (this.spent) return;
    const target = this.target;
    const alive = target && !target.dead && !target.escaped;
    const tx = alive ? target.x : this.x;
    const ty = alive ? target.y : this.y;
    if (!alive && this.splashRadius === 0) {
      this.spent = true;
      return;
    }
    const dx = tx - this.x;
    const dy = ty - this.y;
    const dist = Math.hypot(dx, dy);
    const step = this.speed * dt;
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > 8) this.trail.shift();
    if (dist <= Math.max(step, 10)) {
      this.x = tx;
      this.y = ty;
      this.impact(enemies, fx, now, onKill);
      this.spent = true;
      return;
    }
    this.x += (dx / dist) * step;
    this.y += (dy / dist) * step;
  }

  impact(enemies, fx, now, onKill) {
    if (this.splashRadius > 0) {
      fx.ring(this.x, this.y, this.color, this.splashRadius);
      fx.burst(this.x, this.y, this.color, 10, 120);
      for (const enemy of enemies) {
        if (enemy.dead || enemy.escaped) continue;
        const dx = enemy.x - this.x;
        const dy = enemy.y - this.y;
        if (dx * dx + dy * dy > this.splashRadius * this.splashRadius) continue;
        fx.damage(enemy.x, enemy.y - enemy.radius - 4, this.damage, this.color);
        const gold = enemy.takeDamage(this.damage, now);
        if (gold > 0) onKill(enemy, gold);
      }
      return;
    }
    const target = this.target;
    if (!target || target.dead || target.escaped) return;
    if (this.slowFactor > 0) {
      fx.shards(this.x, this.y, '#bae6fd', 5, 90);
      target.applySlow(this.slowFactor, this.slowDuration, now);
    } else {
      fx.burst(this.x, this.y, this.color, 4, 70);
    }
    fx.damage(target.x, target.y - target.radius - 4, this.damage, this.color);
    const gold = target.takeDamage(this.damage, now);
    if (gold > 0) onKill(target, gold);
  }
}
