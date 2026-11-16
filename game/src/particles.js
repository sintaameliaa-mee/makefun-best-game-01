// Particles and floating texts: hit sparks, death bursts, muzzle flashes
// and the gold popups that show the economy working. Purely visual, capped
// so a busy wave can never grow the lists without bound.
const MAX_PARTICLES = 400;
const MAX_FLOATERS = 40;

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.floaters = [];
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
    }
    for (let i = this.floaters.length - 1; i >= 0; i -= 1) {
      const f = this.floaters[i];
      f.age += dt;
      f.y -= 34 * dt;
      if (f.age >= f.life) this.floaters.splice(i, 1);
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
    ctx.globalAlpha = 1;
  }

  clear() {
    this.particles.length = 0;
    this.floaters.length = 0;
  }
}
