// The game itself: screens, economy, waves, placement, upgrades and the
// win/lose rules. Rendering and input live in their own modules; this one
// owns the state and the simulation step.
import {
  CELL, GRID_COLS, GRID_ROWS, PLAYFIELD_TOP, PLAYFIELD_BOTTOM,
  START_GOLD, START_LIVES, TOTAL_WAVES, TOWERS, TOWER_ORDER,
  pathCellSet, pathWaypoints, waveClearBonus,
  KILL_SCORE_MULTIPLIER, VICTORY_LIFE_BONUS, FLAWLESS_BONUS,
  ABILITY_DAMAGE, ABILITY_COOLDOWN, ABILITY_SLOW, ABILITY_SLOW_DURATION,
} from './config.js';
import { makeRng } from './rng.js';
import { Tower } from './towers.js';
import { Enemy } from './enemies.js';
import { Projectile } from './projectiles.js';
import { WaveRunner } from './waves.js';
import { ParticleSystem } from './particles.js';
import { SoundBank } from './audio.js';

export class Game {
  constructor(seed = 20261116) {
    this.waypoints = pathWaypoints();
    this.pathCells = pathCellSet();
    this.fx = new ParticleSystem();
    this.sounds = new SoundBank();
    this.mouse = { x: -1, y: -1, col: -1, row: -1, inside: false };
    this.reset(seed);
  }

  reset(seed = 20261116) {
    this.rng = makeRng(seed);
    this.screen = 'menu';
    this.paused = false;
    this.shotFreeze = false;
    this.speed = 1;
    this.gold = START_GOLD;
    this.lives = START_LIVES;
    this.score = 0;
    this.wave = 0;
    this.towers = [];
    this.enemies = [];
    this.projectiles = [];
    this.waveRunner = null;
    this.waveActive = false;
    this.selected = null;
    this.placing = null;
    this.now = 0;
    this.kills = 0;
    this.leaked = 0;
    this.goldEarned = 0;
    this.beaconFlash = 0;
    this.abilityFlash = 0;
    this.abilityCooldown = 0;
    this.waveLeaks = 0;
    this.flawlessWaves = 0;
    this.shake = 0;
    this.fx.clear();
  }

  startGame() {
    this.reset();
    this.screen = 'playing';
    this.sounds.resume();
    this.sounds.waveStart();
  }

  get waveState() {
    if (this.waveActive) return 'wave';
    if (this.wave >= TOTAL_WAVES) return 'done';
    return 'build';
  }

  get enemiesRemaining() {
    const queued = this.waveRunner ? this.waveRunner.remaining : 0;
    const alive = this.enemies.filter((e) => !e.dead && !e.escaped).length;
    return queued + alive;
  }

  // Fraction of the current wave dealt with (0..1), for the HUD progress
  // bar. Splitter children can push the remainder past the spawned total,
  // so the value is clamped.
  get waveProgress() {
    if (!this.waveRunner || this.waveRunner.total === 0) return 0;
    return Math.max(0, Math.min(1, 1 - this.enemiesRemaining / this.waveRunner.total));
  }

  // The colossus furthest along the road, for the boss bar (null if none).
  get boss() {
    let best = null;
    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.escaped || enemy.type !== 'colossus') continue;
      if (!best || enemy.distance > best.distance) best = enemy;
    }
    return best;
  }

  get abilityReady() {
    return this.abilityCooldown <= 0;
  }

  // Beacon Surge: a wave of light from the beacon damages every enemy on
  // the field and slows them briefly. Kills pay exactly like tower kills.
  // Returns false when the ability is cooling down or no enemy is alive.
  useAbility() {
    if (this.screen !== 'playing' || this.paused || !this.abilityReady) return false;
    const targets = this.enemies.filter((e) => !e.dead && !e.escaped);
    if (targets.length === 0) return false;
    this.abilityCooldown = ABILITY_COOLDOWN;
    this.abilityFlash = 0.6;
    const beacon = this.waypoints[this.waypoints.length - 1];
    this.fx.ring(beacon.x, beacon.y, '#fef08a', 260);
    this.fx.ring(beacon.x, beacon.y, '#fbbf24', 160);
    this.fx.burst(beacon.x, beacon.y, '#fef08a', 24, 220);
    this.sounds.ability();
    for (const enemy of targets) {
      enemy.applySlow(ABILITY_SLOW, ABILITY_SLOW_DURATION, this.now);
      this.fx.flash(enemy.x, enemy.y, '#fef08a');
      const gold = enemy.takeDamage(ABILITY_DAMAGE, this.now);
      if (gold > 0) this.onKill(enemy, gold);
    }
    return true;
  }

  cellFromPixel(x, y) {
    if (y < PLAYFIELD_TOP || y >= PLAYFIELD_BOTTOM) return null;
    const col = Math.floor(x / CELL);
    const row = Math.floor((y - PLAYFIELD_TOP) / CELL);
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return null;
    return { col, row };
  }

  towerAt(col, row) {
    return this.towers.find((t) => t.col === col && t.row === row) || null;
  }

  canPlace(col, row) {
    if (col < 0 || col >= GRID_COLS || row < 0 || row >= GRID_ROWS) return false;
    if (this.pathCells.has(`${col},${row}`)) return false;
    if (this.towerAt(col, row)) return false;
    return true;
  }

  placeTower(type, col, row) {
    const def = TOWERS[type];
    if (!def) return { ok: false, reason: 'Unknown tower.' };
    if (!this.canPlace(col, row)) return { ok: false, reason: 'Blocked cell.' };
    if (this.gold < def.cost) return { ok: false, reason: 'Not enough gold.' };
    this.gold -= def.cost;
    const tower = new Tower(type, col, row);
    this.towers.push(tower);
    this.fx.ring(tower.x, tower.y, def.color, 30);
    this.sounds.place();
    return { ok: true, tower };
  }

  upgradeSelected() {
    const tower = this.selected;
    if (!tower || tower.maxed) return false;
    const cost = tower.upgradeCost;
    if (this.gold < cost) {
      this.sounds.denied();
      return false;
    }
    this.gold -= cost;
    tower.upgrade();
    this.fx.ring(tower.x, tower.y, tower.def.color, 44);
    this.fx.burst(tower.x, tower.y, tower.def.color, 12, 110);
    this.sounds.coin();
    return true;
  }

  sellSelected() {
    const tower = this.selected;
    if (!tower) return false;
    this.gold += tower.sellValue;
    this.fx.floater(tower.x, tower.y - 20, `+${tower.sellValue}g`, '#ffd166');
    this.towers = this.towers.filter((t) => t !== tower);
    this.selected = null;
    this.sounds.coin();
    return true;
  }

  startWave() {
    if (this.screen !== 'playing' || this.waveActive) return false;
    if (this.wave >= TOTAL_WAVES) return false;
    this.wave += 1;
    this.waveLeaks = 0;
    this.waveRunner = new WaveRunner(this.wave, this.rng);
    this.waveActive = true;
    this.sounds.waveStart();
    return true;
  }

  onKill(enemy, gold) {
    this.gold += gold;
    this.goldEarned += gold;
    this.score += gold * KILL_SCORE_MULTIPLIER;
    this.kills += 1;
    this.fx.burst(enemy.x, enemy.y, enemy.color, enemy.type === 'colossus' ? 30 : 12, 140);
    this.fx.floater(enemy.x, enemy.y - enemy.radius - 6, `+${gold}g`, '#ffd166');
    this.sounds.coin();
    if (enemy.splitsInto) {
      // A splitter bursts into swarmlets that keep marching from where it
      // died, at the current wave's strength. They are ordinary enemies:
      // they pay their own reward and must be killed before the wave ends.
      for (let i = 0; i < enemy.splitsInto.count; i += 1) {
        const child = new Enemy(enemy.splitsInto.type, this.wave, {
          spawnAt: {
            x: enemy.x + (i === 0 ? -8 : 8),
            y: enemy.y + (i === 0 ? -6 : 6),
            waypointIndex: enemy.waypointIndex,
            distance: enemy.distance,
          },
        });
        this.enemies.push(child);
      }
      this.fx.ring(enemy.x, enemy.y, enemy.color, 30);
    }
  }

  onEscape(enemy) {
    this.lives -= enemy.lives;
    this.leaked += 1;
    this.waveLeaks += 1;
    const beacon = this.waypoints[this.waypoints.length - 1];
    this.fx.burst(beacon.x, beacon.y, '#ef4444', 16, 160);
    this.beaconFlash = 0.5;
    this.shake = 0.35;
    this.sounds.leak();
    if (this.lives <= 0) {
      this.lives = 0;
      this.screen = 'defeat';
      this.sounds.defeat();
    }
  }

  clearWave() {
    const flawless = this.waveLeaks === 0;
    const bonus = waveClearBonus(this.wave) + (flawless ? FLAWLESS_BONUS : 0);
    if (flawless) this.flawlessWaves += 1;
    this.gold += bonus;
    this.goldEarned += bonus;
    this.score += bonus * KILL_SCORE_MULTIPLIER;
    this.waveActive = false;
    this.waveRunner = null;
    const beacon = this.waypoints[this.waypoints.length - 1];
    this.fx.floater(
      beacon.x - 60,
      beacon.y - 50,
      flawless ? `Flawless! Wave bonus +${bonus}g` : `Wave bonus +${bonus}g`,
      flawless ? '#fbbf24' : '#7dd3fc',
    );
    if (this.wave >= TOTAL_WAVES) {
      this.score += this.lives * VICTORY_LIFE_BONUS;
      this.screen = 'victory';
      this.sounds.victory();
    }
  }

  update(rawDt) {
    if (this.screen !== 'playing' || this.paused || this.shotFreeze) return;
    const dt = rawDt * this.speed;
    this.now += dt;
    if (this.beaconFlash > 0) this.beaconFlash -= rawDt;
    if (this.abilityFlash > 0) this.abilityFlash -= rawDt;
    if (this.abilityCooldown > 0) this.abilityCooldown -= rawDt;
    if (this.shake > 0) this.shake -= rawDt;

    if (this.waveRunner) {
      this.waveRunner.update(dt, (enemy) => this.enemies.push(enemy));
    }

    for (const tower of this.towers) {
      tower.update(dt, this.enemies, (from, target) => {
        this.projectiles.push(new Projectile(from, target));
        this.fx.flash(from.x, from.y, from.def.color);
        this.sounds.shoot(from.type);
      });
    }

    for (const projectile of this.projectiles) {
      projectile.update(dt, this.enemies, this.fx, this.now, (enemy, gold) => {
        this.onKill(enemy, gold);
      });
    }
    this.projectiles = this.projectiles.filter((p) => !p.spent);

    for (const enemy of this.enemies) {
      if (enemy.dead || enemy.escaped) continue;
      enemy.update(dt, this.now, this.waypoints);
      if (enemy.escaped) this.onEscape(enemy);
    }
    this.enemies = this.enemies.filter((e) => !e.dead && !e.escaped);

    // Menders restore nearby allies (never themselves, never past full).
    for (const mender of this.enemies) {
      if (!mender.isMender || mender.dead || mender.escaped) continue;
      for (const ally of this.enemies) {
        if (ally === mender || ally.dead || ally.escaped) continue;
        const dx = ally.x - mender.x;
        const dy = ally.y - mender.y;
        if (dx * dx + dy * dy > mender.healRadius * mender.healRadius) continue;
        ally.heal(mender.healRate * dt);
      }
    }

    if (this.waveActive && this.waveRunner && this.waveRunner.doneSpawning && this.enemies.length === 0) {
      this.clearWave();
    }

    this.fx.update(dt);
  }

  towerMenu() {
    return TOWER_ORDER.map((key) => TOWERS[key]);
  }
}
