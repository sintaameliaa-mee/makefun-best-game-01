// Everything the player sees: the night sky, the aurora, the road, the
// beacon, towers, enemies, projectiles, the HUD, the shop, the selected
// tower panel and the menu / victory / defeat screens. Rendering is pure:
// it reads the game state and never mutates it.
import {
  VIEW_WIDTH, VIEW_HEIGHT, HUD_HEIGHT, SHOP_HEIGHT, CELL,
  GRID_COLS, GRID_ROWS, PLAYFIELD_TOP, PLAYFIELD_BOTTOM,
  TOTAL_WAVES, TOWERS, TOWER_ORDER, cellCenter,
} from './config.js';
import { mulberry32 } from './rng.js';

const FONT = '"Segoe UI", system-ui, sans-serif';

// Fixed starfield: seeded once, so every run paints the same sky.
const STARS = (() => {
  const next = mulberry32(1337);
  const stars = [];
  for (let i = 0; i < 130; i += 1) {
    stars.push({
      x: next() * VIEW_WIDTH,
      y: next() * (VIEW_HEIGHT - SHOP_HEIGHT),
      r: 0.6 + next() * 1.6,
      phase: next() * Math.PI * 2,
    });
  }
  return stars;
})();

function roundedRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function drawSky(ctx, time) {
  const sky = ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
  sky.addColorStop(0, '#070b1e');
  sky.addColorStop(0.55, '#101736');
  sky.addColorStop(1, '#0b1026');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);

  for (const star of STARS) {
    const twinkle = 0.55 + 0.45 * Math.sin(time * 1.4 + star.phase);
    ctx.globalAlpha = twinkle;
    ctx.fillStyle = '#e2e8f0';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  // Aurora ribbons: three translucent sine bands drifting across the sky.
  const ribbons = [
    { y: 90, amp: 26, color: 'rgba(52, 211, 153, 0.20)', speed: 0.11, thick: 46 },
    { y: 150, amp: 34, color: 'rgba(129, 140, 248, 0.16)', speed: 0.07, thick: 60 },
    { y: 210, amp: 20, color: 'rgba(34, 211, 238, 0.13)', speed: 0.15, thick: 36 },
  ];
  for (const ribbon of ribbons) {
    ctx.beginPath();
    ctx.moveTo(0, ribbon.y);
    for (let x = 0; x <= VIEW_WIDTH; x += 16) {
      const y = ribbon.y
        + Math.sin(x * 0.004 + time * ribbon.speed) * ribbon.amp
        + Math.sin(x * 0.011 - time * ribbon.speed * 1.7) * ribbon.amp * 0.4;
      ctx.lineTo(x, y);
    }
    for (let x = VIEW_WIDTH; x >= 0; x -= 16) {
      const y = ribbon.y + ribbon.thick
        + Math.sin(x * 0.004 + time * ribbon.speed) * ribbon.amp
        + Math.sin(x * 0.011 - time * ribbon.speed * 1.7) * ribbon.amp * 0.4;
      ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.fillStyle = ribbon.color;
    ctx.fill();
  }

  // Moon glow, top right.
  const moon = ctx.createRadialGradient(1150, 90, 8, 1150, 90, 90);
  moon.addColorStop(0, 'rgba(226, 232, 240, 0.9)');
  moon.addColorStop(0.25, 'rgba(226, 232, 240, 0.28)');
  moon.addColorStop(1, 'rgba(226, 232, 240, 0)');
  ctx.fillStyle = moon;
  ctx.beginPath();
  ctx.arc(1150, 90, 90, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#f1f5f9';
  ctx.beginPath();
  ctx.arc(1150, 90, 22, 0, Math.PI * 2);
  ctx.fill();
}

function drawGround(ctx) {
  ctx.fillStyle = '#111827';
  ctx.fillRect(0, PLAYFIELD_TOP, VIEW_WIDTH, PLAYFIELD_BOTTOM - PLAYFIELD_TOP);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.10)';
  for (let c = 0; c < GRID_COLS; c += 1) {
    for (let r = 0; r < GRID_ROWS; r += 1) {
      const at = cellCenter(c, r);
      ctx.fillRect(at.x - 1, at.y - 1, 2, 2);
    }
  }
}

function drawPath(ctx, game, time) {
  const points = game.waypoints;
  ctx.lineJoin = 'round';
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (const p of points.slice(1)) ctx.lineTo(p.x, p.y);
  ctx.strokeStyle = '#3b2f1a';
  ctx.lineWidth = CELL - 6;
  ctx.stroke();
  ctx.strokeStyle = '#8a6d2f';
  ctx.lineWidth = CELL - 14;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(253, 224, 71, 0.35)';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 18]);
  ctx.lineDashOffset = -time * 30;
  ctx.stroke();
  ctx.setLineDash([]);
  // Direction chevrons along the road.
  ctx.fillStyle = 'rgba(254, 240, 138, 0.5)';
  for (let i = 0; i < points.length - 1; i += 1) {
    const a = points[i];
    const b = points[i + 1];
    const len = Math.hypot(b.x - a.x, b.y - a.y);
    const steps = Math.floor(len / 90);
    for (let s = 1; s <= steps; s += 1) {
      const t = s / (steps + 1);
      const x = a.x + (b.x - a.x) * t;
      const y = a.y + (b.y - a.y) * t;
      const angle = Math.atan2(b.y - a.y, b.x - a.x);
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.beginPath();
      ctx.moveTo(7, 0);
      ctx.lineTo(-4, -6);
      ctx.lineTo(-4, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
  }
}

function drawBeacon(ctx, game, time) {
  const at = game.waypoints[game.waypoints.length - 1];
  const pulse = 1 + 0.08 * Math.sin(time * 2.2);
  const glow = ctx.createRadialGradient(at.x, at.y, 6, at.x, at.y, 70 * pulse);
  glow.addColorStop(0, 'rgba(251, 191, 36, 0.55)');
  glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(at.x, at.y, 70 * pulse, 0, Math.PI * 2);
  ctx.fill();
  ctx.save();
  ctx.translate(at.x, at.y);
  ctx.scale(pulse, pulse);
  ctx.fillStyle = '#fbbf24';
  ctx.beginPath();
  ctx.moveTo(0, -24);
  ctx.lineTo(13, 0);
  ctx.lineTo(0, 24);
  ctx.lineTo(-13, 0);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = '#fef3c7';
  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(7, 0);
  ctx.lineTo(0, 14);
  ctx.lineTo(-7, 0);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  if (game.beaconFlash > 0) {
    ctx.globalAlpha = Math.min(1, game.beaconFlash * 2);
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(at.x, at.y, 34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.fillStyle = '#fde68a';
  ctx.font = `bold 11px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText('THE BEACON', at.x - 44, at.y + 42);
}

function drawTowerShape(ctx, tower, time) {
  const { x, y } = tower;
  const def = tower.def;
  ctx.save();
  ctx.translate(x, y);
  // Base ring.
  ctx.fillStyle = '#1f2937';
  ctx.beginPath();
  ctx.arc(0, 0, 17, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = def.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  if (tower.type === 'spark') {
    ctx.rotate(Math.sin(time * 0.8 + tower.id) * 0.12);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.moveTo(0, -13);
    ctx.lineTo(10, 8);
    ctx.lineTo(-10, 8);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = def.core;
    ctx.beginPath();
    ctx.arc(0, 2, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.type === 'frost') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    for (let i = 0; i < 6; i += 1) {
      const a = (Math.PI / 3) * i + Math.PI / 6;
      const px = Math.cos(a) * 12;
      const py = Math.sin(a) * 12;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = def.core;
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 3; i += 1) {
      const a = (Math.PI / 3) * i;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * -8, Math.sin(a) * -8);
      ctx.lineTo(Math.cos(a) * 8, Math.sin(a) * 8);
      ctx.stroke();
    }
  } else if (tower.type === 'cannon') {
    const recoil = tower.recoil > 0 ? tower.recoil * 3 : 0;
    ctx.rotate(tower.angle);
    ctx.fillStyle = '#78350f';
    ctx.fillRect(-2 - recoil, -4, 20, 8);
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 0, 10, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = def.core;
    ctx.beginPath();
    ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
    ctx.fill();
  } else if (tower.type === 'nova') {
    ctx.fillStyle = def.color;
    ctx.beginPath();
    ctx.arc(0, 2, 11, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.save();
    ctx.rotate(tower.angle + Math.PI / 2);
    ctx.fillStyle = '#4c1d95';
    ctx.fillRect(-3, -16, 6, 12);
    ctx.restore();
    ctx.fillStyle = def.core;
    ctx.beginPath();
    ctx.arc(0, 2, 4, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
  // Level pips.
  for (let i = 0; i < 3; i += 1) {
    ctx.fillStyle = i < tower.level ? def.color : '#374151';
    ctx.beginPath();
    ctx.arc(x - 10 + i * 10, y + 22, 3, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawRange(ctx, x, y, range, color) {
  ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.globalAlpha = 0.65;
  ctx.setLineDash([6, 6]);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(x, y, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.setLineDash([]);
  ctx.globalAlpha = 1;
}

function drawEnemy(ctx, enemy, time) {
  const wobble = Math.sin(time * 6 + enemy.wobbleSeed) * 1.5;
  const x = enemy.x;
  const y = enemy.y + wobble;
  const r = enemy.radius;
  const body = ctx.createRadialGradient(x - r * 0.3, y - r * 0.3, r * 0.2, x, y, r);
  body.addColorStop(0, enemy.color);
  body.addColorStop(1, enemy.dark);
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  if (enemy.type === 'bulwark') {
    ctx.strokeStyle = '#fecaca';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x, y, r - 3, 0, Math.PI * 2);
    ctx.stroke();
  } else if (enemy.type === 'swift') {
    ctx.fillStyle = enemy.dark;
    ctx.beginPath();
    ctx.moveTo(x - r - 4, y);
    ctx.lineTo(x - r + 4, y - 6);
    ctx.lineTo(x - r + 4, y + 6);
    ctx.closePath();
    ctx.fill();
  } else if (enemy.type === 'swarmlet') {
    ctx.strokeStyle = enemy.dark;
    ctx.lineWidth = 2;
    for (let i = 0; i < 5; i += 1) {
      const a = (Math.PI * 2 * i) / 5 + time;
      ctx.beginPath();
      ctx.moveTo(x + Math.cos(a) * (r - 2), y + Math.sin(a) * (r - 2));
      ctx.lineTo(x + Math.cos(a) * (r + 4), y + Math.sin(a) * (r + 4));
      ctx.stroke();
    }
  } else if (enemy.type === 'colossus') {
    ctx.fillStyle = '#fca5a5';
    for (let i = -1; i <= 1; i += 1) {
      ctx.beginPath();
      ctx.moveTo(x + i * 9 - 5, y - r + 4);
      ctx.lineTo(x + i * 9, y - r - 9);
      ctx.lineTo(x + i * 9 + 5, y - r + 4);
      ctx.closePath();
      ctx.fill();
    }
  }
  // Eyes look along the road.
  ctx.fillStyle = '#0f172a';
  ctx.beginPath();
  ctx.arc(x + 3, y - 3, 2.4, 0, Math.PI * 2);
  ctx.arc(x + 8, y - 3, 2.4, 0, Math.PI * 2);
  ctx.fill();
  if (enemy.slowed) {
    ctx.strokeStyle = 'rgba(125, 211, 252, 0.9)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(x, y, r + 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  if (enemy.shield > 0) {
    ctx.strokeStyle = 'rgba(192, 132, 252, 0.95)';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.arc(x, y, r + 5, -0.6, Math.PI * 1.4);
    ctx.stroke();
  }
  if (enemy.flash > 0) {
    ctx.globalAlpha = Math.min(1, enemy.flash * 8);
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // Health bar (and shield bar above it).
  const barW = Math.max(26, r * 2);
  const barY = y - r - 12;
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillRect(x - barW / 2, barY, barW, 5);
  const hpFrac = Math.max(0, enemy.hp / enemy.maxHp);
  ctx.fillStyle = hpFrac > 0.5 ? '#4ade80' : hpFrac > 0.25 ? '#facc15' : '#ef4444';
  ctx.fillRect(x - barW / 2, barY, barW * hpFrac, 5);
  if (enemy.maxShield > 0) {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.fillRect(x - barW / 2, barY - 6, barW, 4);
    ctx.fillStyle = '#c084fc';
    ctx.fillRect(x - barW / 2, barY - 6, barW * Math.max(0, enemy.shield / enemy.maxShield), 4);
  }
}

function drawProjectiles(ctx, game) {
  for (const p of game.projectiles) {
    for (let i = 0; i < p.trail.length; i += 1) {
      const t = p.trail[i];
      ctx.globalAlpha = (i + 1) / p.trail.length * 0.4;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.splashRadius > 0 ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(p.x, p.y, 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawButton(ctx, rect, label, enabled, accent) {
  ctx.fillStyle = enabled ? accent : '#374151';
  roundedRect(ctx, rect.x, rect.y, rect.w, rect.h, 8);
  ctx.fill();
  ctx.fillStyle = enabled ? '#0f172a' : '#9ca3af';
  ctx.font = `bold ${rect.h >= 40 ? 17 : 14}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, rect.x + rect.w / 2, rect.y + rect.h / 2 + 1);
  ctx.textBaseline = 'alphabetic';
}

export function layoutFor(game) {
  const shopCards = TOWER_ORDER.map((key, i) => ({
    key,
    rect: { x: 16 + i * 308, y: VIEW_HEIGHT - SHOP_HEIGHT + 8, w: 296, h: SHOP_HEIGHT - 16 },
  }));
  const startLabel = game.waveActive
    ? `WAVE ${game.wave}`
    : (game.wave >= TOTAL_WAVES ? 'COMPLETE' : (game.wave === 0 ? 'START WAVE 1' : `START WAVE ${game.wave + 1}`));
  const layout = {
    startWave: { x: 880, y: 12, w: 180, h: 40, label: startLabel, enabled: !game.waveActive && game.wave < TOTAL_WAVES },
    speed: { x: 1072, y: 12, w: 56, h: 40, label: `${game.speed}x` },
    pause: { x: 1140, y: 12, w: 56, h: 40, label: game.paused ? 'GO' : 'II' },
    mute: { x: 1208, y: 12, w: 56, h: 40, label: game.sounds.muted ? 'MUTE' : 'SND' },
    shopCards,
    upgrade: null,
    sell: null,
    play: { x: 540, y: 392, w: 200, h: 52, label: 'PLAY' },
    again: { x: 540, y: 470, w: 200, h: 52, label: 'PLAY AGAIN' },
  };
  if (game.selected) {
    layout.upgrade = { x: 1024, y: 238, w: 224, h: 38, label: 'UPGRADE' };
    layout.sell = { x: 1024, y: 282, w: 224, h: 38, label: 'SELL' };
  }
  return layout;
}

function drawHud(ctx, game, layout) {
  ctx.fillStyle = 'rgba(2, 6, 23, 0.92)';
  ctx.fillRect(0, 0, VIEW_WIDTH, HUD_HEIGHT);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.fillRect(0, HUD_HEIGHT - 1, VIEW_WIDTH, 1);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  const stats = [
    { label: 'GOLD', value: `${game.gold}`, color: '#ffd166', x: 20 },
    { label: 'LIVES', value: `${game.lives}`, color: '#f87171', x: 170 },
    { label: 'WAVE', value: `${game.waveActive ? game.wave : Math.min(game.wave + 1, TOTAL_WAVES)} / ${TOTAL_WAVES}`, color: '#7dd3fc', x: 300 },
    { label: 'SCORE', value: `${game.score}`, color: '#e2e8f0', x: 440 },
    { label: 'FOES', value: `${game.enemiesRemaining}`, color: '#c084fc', x: 600 },
  ];
  for (const s of stats) {
    ctx.font = `bold 11px ${FONT}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(s.label, s.x, 22);
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillStyle = s.color;
    ctx.fillText(s.value, s.x, 46);
  }
  ctx.textBaseline = 'alphabetic';
  drawButton(ctx, layout.startWave, layout.startWave.label, layout.startWave.enabled, '#fbbf24');
  drawButton(ctx, layout.speed, layout.speed.label, true, '#38bdf8');
  drawButton(ctx, layout.pause, layout.pause.label, true, '#a78bfa');
  drawButton(ctx, layout.mute, layout.mute.label, true, '#34d399');
  if (game.wave === 0 && !game.waveActive) {
    ctx.font = `14px ${FONT}`;
    ctx.fillStyle = '#fde68a';
    ctx.textAlign = 'center';
    ctx.fillText('Build your defense, then press START WAVE (or Space)', VIEW_WIDTH / 2, HUD_HEIGHT + 22);
    ctx.textAlign = 'left';
  }
}

function drawShop(ctx, game, layout) {
  ctx.fillStyle = 'rgba(2, 6, 23, 0.94)';
  ctx.fillRect(0, VIEW_HEIGHT - SHOP_HEIGHT, VIEW_WIDTH, SHOP_HEIGHT);
  ctx.fillStyle = 'rgba(148, 163, 184, 0.25)';
  ctx.fillRect(0, VIEW_HEIGHT - SHOP_HEIGHT, VIEW_WIDTH, 1);
  layout.shopCards.forEach((card, index) => {
    const def = TOWERS[card.key];
    const affordable = game.gold >= def.cost;
    const active = game.placing === card.key;
    ctx.fillStyle = active ? 'rgba(251, 191, 36, 0.22)' : 'rgba(30, 41, 59, 0.9)';
    roundedRect(ctx, card.rect.x, card.rect.y, card.rect.w, card.rect.h, 10);
    ctx.fill();
    ctx.strokeStyle = active ? '#fbbf24' : 'rgba(148, 163, 184, 0.35)';
    ctx.lineWidth = active ? 2.5 : 1.5;
    ctx.stroke();
    // Mini tower icon.
    const icon = { x: card.rect.x + 34, y: card.rect.y + 40, type: card.key, def, angle: -Math.PI / 2, recoil: 0, level: 1, id: index };
    drawTowerShape(ctx, icon, 0);
    ctx.textAlign = 'left';
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillStyle = affordable ? '#f1f5f9' : '#64748b';
    ctx.fillText(def.name, card.rect.x + 62, card.rect.y + 26);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(def.short, card.rect.x + 62, card.rect.y + 46);
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = affordable ? '#ffd166' : '#ef4444';
    ctx.fillText(`${def.cost} gold`, card.rect.x + 62, card.rect.y + 70);
    ctx.font = `bold 12px ${FONT}`;
    ctx.fillStyle = '#64748b';
    ctx.fillText(`[${index + 1}]  DMG ${def.damage[0]}  RNG ${def.range[0]}`, card.rect.x + 168, card.rect.y + 70);
  });
}

function drawSelectedPanel(ctx, game, layout) {
  const tower = game.selected;
  if (!tower) return;
  const x = 1008;
  const y = 76;
  const w = 256;
  const h = 258;
  ctx.fillStyle = 'rgba(2, 6, 23, 0.93)';
  roundedRect(ctx, x, y, w, h, 12);
  ctx.fill();
  ctx.strokeStyle = tower.def.color;
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.textAlign = 'left';
  ctx.font = `bold 18px ${FONT}`;
  ctx.fillStyle = '#f1f5f9';
  ctx.fillText(tower.name, x + 16, y + 30);
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Level ${tower.level} of 3   •   ${tower.kills} kills`, x + 16, y + 52);
  const rows = [
    ['Damage', `${tower.damage}`],
    ['Range', `${tower.range}`],
    ['Shots / sec', `${tower.fireRate.toFixed(1)}`],
  ];
  if (tower.splashRadius > 0) rows.push(['Splash', `${tower.splashRadius}`]);
  if (tower.slowFactor > 0) rows.push(['Slow', `${Math.round(tower.slowFactor * 100)}%`]);
  ctx.font = `14px ${FONT}`;
  rows.forEach((row, i) => {
    const ry = y + 82 + i * 24;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(row[0], x + 16, ry);
    ctx.fillStyle = '#f1f5f9';
    ctx.textAlign = 'right';
    ctx.fillText(row[1], x + w - 16, ry);
    ctx.textAlign = 'left';
  });
  if (tower.maxed) {
    ctx.font = `bold 13px ${FONT}`;
    ctx.fillStyle = '#fbbf24';
    ctx.fillText('MAX LEVEL', x + 16, y + 258 - 58);
  } else {
    const afford = game.gold >= tower.upgradeCost;
    drawButton(ctx, layout.upgrade, `UPGRADE — ${tower.upgradeCost}g`, afford, '#38bdf8');
  }
  drawButton(ctx, layout.sell, `SELL — ${tower.sellValue}g`, true, '#94a3b8');
  ctx.font = `12px ${FONT}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('Click the field to close • Esc deselects', x + 16, y + h - 8);
}

function drawGhost(ctx, game) {
  if (!game.placing || !game.mouse.inside) return;
  const { col, row } = game.mouse;
  if (col < 0 || row < 0) return;
  const def = TOWERS[game.placing];
  const at = cellCenter(col, row);
  const ok = game.canPlace(col, row) && game.gold >= def.cost;
  drawRange(ctx, at.x, at.y, def.range[0], ok ? def.color : '#ef4444');
  ctx.globalAlpha = 0.75;
  const ghost = { x: at.x, y: at.y, type: game.placing, def, angle: -Math.PI / 2, recoil: 0, level: 1, id: 0 };
  drawTowerShape(ctx, ghost, 0);
  ctx.globalAlpha = 1;
  if (!ok) {
    ctx.strokeStyle = '#ef4444';
    ctx.lineWidth = 2;
    ctx.strokeRect(at.x - CELL / 2 + 2, at.y - CELL / 2 + 2, CELL - 4, CELL - 4);
  }
}

function drawMenu(ctx, game, layout, time) {
  ctx.fillStyle = 'rgba(2, 6, 23, 0.45)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  ctx.textAlign = 'center';
  const glow = ctx.createRadialGradient(640, 190, 10, 640, 190, 340);
  glow.addColorStop(0, 'rgba(251, 191, 36, 0.30)');
  glow.addColorStop(1, 'rgba(251, 191, 36, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, VIEW_WIDTH, 420);
  ctx.font = `bold 84px ${FONT}`;
  ctx.fillStyle = '#fef3c7';
  ctx.fillText('AURORA KEEP', 640, 210);
  ctx.font = `22px ${FONT}`;
  ctx.fillStyle = '#7dd3fc';
  ctx.fillText('Tower defense of the last light  •  12 waves stand between the horde and the beacon', 640, 252);
  ctx.font = `16px ${FONT}`;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText('Build towers on the field, spend gold wisely, and hold the line.', 640, 300);
  ctx.fillText('Keys 1–4 pick a tower  •  Space starts a wave  •  P pauses  •  F speeds up  •  M mutes', 640, 330);
  drawButton(ctx, layout.play, 'PLAY', true, '#fbbf24');
  // Tower legend.
  TOWER_ORDER.forEach((key, i) => {
    const def = TOWERS[key];
    const x = 350 + i * 190;
    const icon = { x, y: 520, type: key, def, angle: -Math.PI / 2, recoil: 0, level: 1, id: i };
    drawTowerShape(ctx, icon, time);
    ctx.font = `bold 14px ${FONT}`;
    ctx.fillStyle = '#e2e8f0';
    ctx.fillText(def.name, x, 560);
    ctx.font = `12px ${FONT}`;
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(`${def.cost} gold`, x, 580);
  });
  ctx.font = `13px ${FONT}`;
  ctx.fillStyle = '#64748b';
  ctx.fillText('An original game — every sprite is drawn in code, no assets are loaded.', 640, 640);
}

function drawEndScreen(ctx, game, layout, won) {
  ctx.fillStyle = 'rgba(2, 6, 23, 0.72)';
  ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  const x = 390;
  const y = 150;
  const w = 500;
  const h = 400;
  ctx.fillStyle = 'rgba(15, 23, 42, 0.97)';
  roundedRect(ctx, x, y, w, h, 16);
  ctx.fill();
  ctx.strokeStyle = won ? '#fbbf24' : '#ef4444';
  ctx.lineWidth = 3;
  ctx.stroke();
  ctx.textAlign = 'center';
  ctx.font = `bold 40px ${FONT}`;
  ctx.fillStyle = won ? '#fde68a' : '#fca5a5';
  ctx.fillText(won ? 'THE LIGHT ENDURES' : 'THE LIGHT FADES', 640, y + 70);
  ctx.font = `17px ${FONT}`;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillText(won ? 'The beacon still burns. The keep stands.' : `The horde broke through on wave ${game.wave}.`, 640, y + 104);
  const stats = [
    ['Final score', `${game.score}`],
    ['Waves cleared', `${won ? TOTAL_WAVES : game.wave - (game.waveActive ? 1 : 0)} / ${TOTAL_WAVES}`],
    ['Enemies slain', `${game.kills}`],
    ['Gold earned', `${game.goldEarned}`],
    ['Lives left', `${game.lives}`],
  ];
  ctx.font = `16px ${FONT}`;
  stats.forEach((row, i) => {
    const ry = y + 150 + i * 32;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#94a3b8';
    ctx.fillText(row[0], x + 60, ry);
    ctx.textAlign = 'right';
    ctx.fillStyle = '#f1f5f9';
    ctx.fillText(row[1], x + w - 60, ry);
  });
  ctx.textAlign = 'center';
  drawButton(ctx, layout.again, 'PLAY AGAIN', true, won ? '#fbbf24' : '#38bdf8');
}

export function drawGame(ctx, game, time) {
  ctx.save();
  if (game.shake > 0) {
    const power = game.shake * 14;
    ctx.translate((Math.random() - 0.5) * power, (Math.random() - 0.5) * power);
  }
  drawSky(ctx, time);
  drawGround(ctx);
  drawPath(ctx, game, time);
  drawBeacon(ctx, game, time);
  if (game.selected) {
    drawRange(ctx, game.selected.x, game.selected.y, game.selected.range, game.selected.def.color);
  }
  for (const tower of game.towers) drawTowerShape(ctx, tower, time);
  for (const enemy of game.enemies) drawEnemy(ctx, enemy, time);
  drawProjectiles(ctx, game);
  game.fx.draw(ctx);
  ctx.restore();

  const layout = layoutFor(game);
  if (game.screen === 'playing') {
    drawHud(ctx, game, layout);
    drawShop(ctx, game, layout);
    drawSelectedPanel(ctx, game, layout);
    drawGhost(ctx, game);
    if (game.paused) {
      ctx.fillStyle = 'rgba(2, 6, 23, 0.6)';
      ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
      ctx.textAlign = 'center';
      ctx.font = `bold 48px ${FONT}`;
      ctx.fillStyle = '#f1f5f9';
      ctx.fillText('PAUSED', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 - 10);
      ctx.font = `17px ${FONT}`;
      ctx.fillStyle = '#94a3b8';
      ctx.fillText('Press P to resume', VIEW_WIDTH / 2, VIEW_HEIGHT / 2 + 28);
    }
  } else if (game.screen === 'menu') {
    drawMenu(ctx, game, layout, time);
  } else if (game.screen === 'victory') {
    drawHud(ctx, game, layout);
    drawShop(ctx, game, layout);
    drawEndScreen(ctx, game, layout, true);
  } else if (game.screen === 'defeat') {
    drawHud(ctx, game, layout);
    drawShop(ctx, game, layout);
    drawEndScreen(ctx, game, layout, false);
  }
  return layout;
}
