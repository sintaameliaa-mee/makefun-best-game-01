// A wave is a timed queue of spawns built from the wave table. Groups
// spawn in order; each group's spawns are spaced by its gap, with a small
// seeded jitter so the march never looks robotic.
import { WAVES } from './config.js';
import { Enemy } from './enemies.js';

export class WaveRunner {
  constructor(waveNumber, rng) {
    this.waveNumber = waveNumber;
    this.queue = [];
    this.timer = 0;
    let at = 0.6;
    for (const group of WAVES[waveNumber - 1]) {
      for (let i = 0; i < group.count; i += 1) {
        this.queue.push({ type: group.type, at: at + i * group.gap });
        at += rng.range(0, 0.12);
      }
      at += 0.9;
    }
    this.total = this.queue.length;
    this.spawned = 0;
  }

  get remaining() {
    return this.total - this.spawned;
  }

  get doneSpawning() {
    return this.spawned >= this.total;
  }

  update(dt, spawnEnemy) {
    this.timer += dt;
    while (this.spawned < this.total && this.queue[this.spawned].at <= this.timer) {
      const next = this.queue[this.spawned];
      spawnEnemy(new Enemy(next.type, this.waveNumber));
      this.spawned += 1;
    }
  }
}
