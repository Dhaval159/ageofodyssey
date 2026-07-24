import Phaser from "phaser";

interface TrailSegment {
  points: { x: number; y: number }[];
  age: number;
  maxAge: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  lifetime: number;
  maxLifetime: number;
  size: number;
  color: number;
  alpha: number;
  type: 'spark' | 'dust';
}

export class EffectsManager {
  private static instance: EffectsManager;
  private graphics: Phaser.GameObjects.Graphics | null = null;

  private trails: TrailSegment[] = [];
  private particles: Particle[] = [];

  private dustTimer: number = 0;
  private readonly DUST_INTERVAL: number = 0.12;

  private trailHistory: { x: number; y: number }[] = [];
  private trailActive: boolean = false;

  private constructor() {}

  public static getInstance(): EffectsManager {
    if (!EffectsManager.instance) {
      EffectsManager.instance = new EffectsManager();
    }
    return EffectsManager.instance;
  }

  public initialize(scene: Phaser.Scene): void {
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(9995);
  }

  public startSwordTrail(): void {
    this.trailHistory = [];
    this.trailActive = true;
  }

  public updateSwordTrail(x: number, y: number): void {
    if (!this.trailActive) return;
    this.trailHistory.push({ x, y });
    if (this.trailHistory.length > 12) {
      this.trailHistory.shift();
    }
  }

  public endSwordTrail(): void {
    if (this.trailHistory.length > 0) {
      this.trails.push({
        points: [...this.trailHistory],
        age: 0,
        maxAge: 0.15,
      });
    }
    this.trailHistory = [];
    this.trailActive = false;
  }

  public emitHitSpark(x: number, y: number, count: number = 8): void {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 140;
      this.particles.push({
        x, y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        lifetime: 0.2 + Math.random() * 0.3,
        maxLifetime: 0.5,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? 0xffaa44 : 0xffffff,
        alpha: 1,
        type: 'spark',
      });
    }
  }

  public emitFootstepDust(x: number, y: number): void {
    for (let i = 0; i < 2; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 6,
        y: y + (Math.random() - 0.5) * 4,
        vx: (Math.random() - 0.5) * 20,
        vy: -10 - Math.random() * 15,
        lifetime: 0.3 + Math.random() * 0.2,
        maxLifetime: 0.5,
        size: 2 + Math.random() * 3,
        color: 0x888877,
        alpha: 0.6,
        type: 'dust',
      });
    }
  }

  public emitRunningDust(x: number, y: number, dir: { x: number; y: number }): void {
    for (let i = 0; i < 3; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 8,
        y: y + (Math.random() - 0.5) * 6,
        vx: -dir.x * 15 + (Math.random() - 0.5) * 15,
        vy: -dir.y * 15 + (Math.random() - 0.5) * 15 - 5,
        lifetime: 0.3 + Math.random() * 0.25,
        maxLifetime: 0.55,
        size: 3 + Math.random() * 4,
        color: 0x999988,
        alpha: 0.5,
        type: 'dust',
      });
    }
  }

  public checkDustEmission(x: number, y: number, speed: number, dir: { x: number; y: number }, dt: number): void {
    if (speed < 40) return;
    this.dustTimer += dt;
    const interval = speed > 200 ? this.DUST_INTERVAL * 0.6 : this.DUST_INTERVAL;
    if (this.dustTimer >= interval) {
      this.dustTimer = 0;
      if (speed > 200) {
        this.emitRunningDust(x, y, dir);
      } else {
        this.emitFootstepDust(x, y);
      }
    }
  }

  public update(dt: number): void {
    if (!this.graphics) return;
    this.graphics.clear();

    for (let i = this.trails.length - 1; i >= 0; i--) {
      const trail = this.trails[i];
      trail.age += dt;
      if (trail.age >= trail.maxAge) {
        this.trails.splice(i, 1);
        continue;
      }
      const alpha = 1 - trail.age / trail.maxAge;
      this.graphics.lineStyle(3, 0xc0c0c0, alpha * 0.6);
      if (trail.points.length >= 2) {
        this.graphics.beginPath();
        this.graphics.moveTo(trail.points[0].x, trail.points[0].y);
        for (let j = 1; j < trail.points.length; j++) {
          this.graphics.lineTo(trail.points[j].x, trail.points[j].y);
        }
        this.graphics.strokePath();
      }
    }

    if (this.trailActive && this.trailHistory.length >= 2) {
      this.graphics.lineStyle(4, 0xffffff, 0.5);
      this.graphics.beginPath();
      this.graphics.moveTo(this.trailHistory[0].x, this.trailHistory[0].y);
      for (let j = 1; j < this.trailHistory.length; j++) {
        this.graphics.lineTo(this.trailHistory[j].x, this.trailHistory[j].y);
      }
      this.graphics.strokePath();
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 200 * dt;
      p.lifetime -= dt;
      p.alpha = Math.max(0, p.lifetime / p.maxLifetime);

      if (p.lifetime <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      this.graphics.fillStyle(p.color, p.alpha);
      if (p.type === 'spark') {
        this.graphics.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
      } else {
        this.graphics.fillCircle(p.x, p.y, p.size * p.alpha);
      }
    }
  }

  public destroy(): void {
    if (this.graphics) {
      this.graphics.destroy();
      this.graphics = null;
    }
    this.trails = [];
    this.particles = [];
    this.trailHistory = [];
    this.trailActive = false;
  }
}
