// Particles and floating texts: hit sparks, death bursts, muzzle flashes
// and the gold popups that show the economy working. Purely visual, capped
// so a busy wave can never grow the lists without bound.
const MAX_PARTICLES = 400;
const MAX_FLOATERS = 40;
const MAX_HITS = 48;

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floaters = [];
    // Small floating damage numbers, kept separate from gold popups so a
    // busy fight never pushes the economy readouts off the screen.
    this.hits = [];
  }

  burst(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      if (this.particles.length >= MAX_PARTICLES) return;
      const angle = Math.random() * Math.PI * 2;
      const power = speed * (0.35 + Math.random() * 0.85);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power - 24,
        life: 0.35 + Math.random() * 0.45,
        age: 0,
        size: 2 + Math.random() * 3.5,
        color,
      });
    }
  }

  // Sharp, fast shards for frost hits: drawn as small diamonds.
  shards(x, y, color, count, speed) {
    for (let i = 0; i < count; i += 1) {
      if (this.particles.length >= MAX_PARTICLES) return;
      const angle = Math.random() * Math.PI * 2;
      const power = speed * (0.5 + Math.random() * 0.8);
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * power,
        vy: Math.sin(angle) * power - 40,
        life: 0.3 + Math.random() * 0.3,
        age: 0,
        size: 2 + Math.random() * 2.5,
        color,
        shard: true,
        spin: Math.random() * Math.PI,
      });
    }
  }

  // A short bright star at a muzzle or an impact point.
  flash(x, y, color) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      x, y, vx: 0, vy: 0, life: 0.14, age: 0, size: 9, color, flash: true,
    });
  }

  ring(x, y, color, radius) {
    if (this.particles.length >= MAX_PARTICLES) return;
    this.particles.push({
      x, y, vx: 0, vy: 0, life: 0.4, age: 0, size: radius, color, ring: true,
    });
  }

  floater(x, y, text, color) {
    if (this.floaters.length >= MAX_FLOATERS) this.floaters.shift();
    this.floaters.push({ x, y, text, color, age: 0, life: 1.1 });
  }

  damage(x, y, amount, color) {
    if (this.hits.length >= MAX_HITS) this.hits.shift();
    this.hits.push({ x, y, text: `${amount}`, color, age: 0, life: 0.7 });
  }

  update(dt) {
    for (let i = this.particles.length - 1; i >= 0; i -= 1) {
      const p = this.particles[i];
      p.age += dt;
      if (p.age >= p.life) {
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 130 * dt;
      p.vx *= 1 - 1.6 * dt;
      if (p.shard) p.spin += dt * 12;
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.age += dt;
      f.y -= 34 * dt;
      if (f.age >= f.life) this.floaters.splice(i, 1);
    }
    for (let i = this.hits.length - 1; i >= 0; i -= 1) {
      const h = this.hits[i];
      h.age += dt;
      h.y -= 46 * dt;
      if (h.age >= h.life) this.hits.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.particles) {
      const t = 1 - p.age / p.life;
      ctx.globalAlpha = Math.max(0, t);
      ctx.fillStyle = p.color;
      if (p.ring) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * (0.4 + 0.6 * (1 - t)), 0, Math.PI * 2);
        ctx.lineWidth = 3;
        ctx.strokeStyle = p.color;
        ctx.stroke();
      } else if (p.flash) {
        const r = p.size * (0.6 + 0.4 * t);
        ctx.beginPath();
        ctx.moveTo(p.x - r, p.y);
        ctx.lineTo(p.x + r, p.y);
        ctx.moveTo(p.x, p.y - r);
        ctx.lineTo(p.x, p.y + r);
        ctx.lineWidth = 2;
        ctx.strokeStyle = p.color;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(p.x, p.y, r * 0.35, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.shard) {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.spin);
        const s = p.size * t + 0.5;
        ctx.beginPath();
        ctx.moveTo(0, -s);
        ctx.lineTo(s * 0.6, 0);
        ctx.lineTo(0, s);
        ctx.lineTo(-s * 0.6, 0);
        ctx.closePath();
        ctx.fill();
        ctx.restore();
      } else {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size * t + 0.5, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'center';
    for (const f of this.floaters) {
      const t = 1 - f.age / f.life;
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = f.color;
      ctx.fillText(f.text, f.x, f.y);
    }
    for (const h of this.hits) {
      const t = 1 - h.age / h.life;
      ctx.globalAlpha = Math.min(1, t * 2);
      ctx.font = 'bold 12px "Segoe UI", system-ui, sans-serif';
      ctx.fillStyle = h.color;
      ctx.fillText(h.text, h.x, h.y);
    }
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles.length = 0;
    this.floaters.length = 0;
    this.hits.length = 0;
  }
}
