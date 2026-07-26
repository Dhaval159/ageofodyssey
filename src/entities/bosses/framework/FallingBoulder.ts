import Phaser from "phaser";
import { EffectsManager } from "../../../systems/effects/EffectsManager";
import { AudioManager } from "../../../systems/audio/AudioManager";

export interface BoulderConfig {
  spawnX: number;
  spawnY: number;
  targetX: number;
  targetY: number;
  delay: number;
  damage: number;
  radius: number;
}

export class FallingBoulder {
  private scene: Phaser.Scene;
  private config: BoulderConfig;
  private graphics: Phaser.GameObjects.Graphics;
  private warningGraphics: Phaser.GameObjects.Graphics;

  private state: "waiting" | "falling" | "impacted" | "done" = "waiting";
  private elapsed: number = 0;
  private fallDuration: number = 800;
  private currentX: number;
  private currentY: number;
  private impactTime: number = 0;
  private impactDuration: number = 1500;

  constructor(scene: Phaser.Scene, config: BoulderConfig) {
    this.scene = scene;
    this.config = config;
    this.currentX = config.spawnX;
    this.currentY = config.spawnY;

    this.graphics = scene.add.graphics();
    this.graphics.setDepth(7);

    this.warningGraphics = scene.add.graphics();
    this.warningGraphics.setDepth(2);

    this.elapsed = -config.delay;
  }

  public update(_time: number, delta: number): void {
    this.elapsed += delta;

    if (this.elapsed < 0) {
      this.drawWarning();
      return;
    }

    if (this.state === "waiting") {
      this.state = "falling";
    }

    if (this.state === "falling") {
      const progress = Math.min(this.elapsed / this.fallDuration, 1);

      this.currentX = Phaser.Math.Linear(this.config.spawnX, this.config.targetX, progress);
      this.currentY = Phaser.Math.Linear(this.config.spawnY, this.config.targetY, progress);

      this.drawBoulder(progress);
      this.drawWarning();

      if (progress >= 1) {
        this.impact();
      }
    } else if (this.state === "impacted") {
      this.impactTime += delta;
      if (this.impactTime >= this.impactDuration) {
        this.state = "done";
      }
    }
  }

  private drawBoulder(progress: number): void {
    this.graphics.clear();

    const scale = 0.5 + progress * 0.5;
    const size = this.config.radius * scale;

    const depthOffset = Math.sin(progress * Math.PI) * -60;

    this.graphics.fillStyle(0x6a6a5a, 1);
    this.graphics.fillCircle(this.currentX, this.currentY + depthOffset, size);
    this.graphics.fillStyle(0x7a7a6a, 0.6);
    this.graphics.fillCircle(this.currentX - size * 0.3, this.currentY + depthOffset - size * 0.3, size * 0.4);
    this.graphics.lineStyle(2, 0x4a4a3a, 0.8);
    this.graphics.strokeCircle(this.currentX, this.currentY + depthOffset, size);
  }

  private drawWarning(): void {
    if (this.elapsed < 0) {
      const warnProgress = Math.min(1, (this.elapsed + this.config.delay) / this.config.delay);
      const alpha = 0.3 + warnProgress * 0.5;

      this.warningGraphics.clear();
      this.warningGraphics.lineStyle(2, 0xff3333, alpha);
      this.warningGraphics.strokeCircle(this.config.targetX, this.config.targetY, this.config.radius + 10);
      this.warningGraphics.fillStyle(0xff3333, 0.15 * warnProgress);
      this.warningGraphics.fillCircle(this.config.targetX, this.config.targetY, (this.config.radius + 10) * warnProgress);
    } else {
      this.warningGraphics.clear();
    }
  }

  private impact(): void {
    this.state = "impacted";
    this.graphics.clear();
    this.warningGraphics.clear();

    EffectsManager.getInstance().emitRockDebris(this.config.targetX, this.config.targetY, 15);

    this.scene.cameras.main.shake(200, 0.006);

    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized() && this.scene.cache.audio.has("rumble")) {
        audioManager.getSFXPlayer().play("rumble", { volume: 0.4, rate: 0.8 });
      }
    } catch {}

    const player = (this.scene as any).player;
    if (player && player.takeDamage) {
      const dist = Phaser.Math.Distance.Between(
        this.config.targetX, this.config.targetY,
        player.x, player.y
      );
      if (dist <= this.config.radius + 20) {
        player.takeDamage(this.config.damage, { x: this.config.targetX, y: this.config.targetY });
      }
    }

    const impactCircle = this.scene.add.graphics();
    impactCircle.setDepth(3);
    impactCircle.fillStyle(0x4a4a3a, 0.7);
    impactCircle.fillCircle(this.config.targetX, this.config.targetY, this.config.radius + 15);

    this.scene.tweens.add({
      targets: impactCircle,
      alpha: 0.2,
      duration: 2000,
      ease: "Power2",
      onComplete: () => {
        impactCircle.destroy();
      }
    });
  }

  public isDone(): boolean {
    return this.state === "done";
  }

  public destroy(): void {
    this.graphics.destroy();
    this.warningGraphics.destroy();
  }
}
