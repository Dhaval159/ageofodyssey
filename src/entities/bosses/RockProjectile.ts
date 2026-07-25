import Phaser from "phaser";
import { EffectsManager } from "../../systems/effects/EffectsManager";
import { Logger } from "../../core/Logger";
import { AudioManager } from "../../systems/audio/AudioManager";

export class RockProjectile extends Phaser.GameObjects.Container {
  private startX: number;
  private startY: number;
  private targetX: number;
  private targetY: number;
  private damage: number;
  private duration: number = 900; // ms
  private elapsed: number = 0;

  private rockGraphics: Phaser.GameObjects.Graphics;
  private warningGraphics: Phaser.GameObjects.Graphics;
  private onCompleteCallback: () => void;

  constructor(
    scene: Phaser.Scene,
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    damage: number,
    onComplete: () => void
  ) {
    super(scene, startX, startY);
    this.startX = startX;
    this.startY = startY;
    this.targetX = targetX;
    this.targetY = targetY;
    this.damage = damage;
    this.onCompleteCallback = onComplete;

    // Red expanding landing warning drawn at target position
    this.warningGraphics = scene.add.graphics();
    this.warningGraphics.setDepth(2);
    
    // Rock graphics
    this.rockGraphics = scene.add.graphics();
    this.rockGraphics.setDepth(6);
    this.add(this.rockGraphics);

    scene.add.existing(this);
    
    // Draw initial state
    this.drawRock();
    this.drawWarning(0);

    Logger.getInstance().log(`[RockProjectile] Thrown from (${startX}, ${startY}) to (${targetX}, ${targetY})`);
  }

  private drawRock(): void {
    const g = this.rockGraphics;
    g.clear();
    // Shaded boulder
    g.fillStyle(0x7a7a6a, 1);
    g.fillCircle(0, 0, 14);
    g.fillStyle(0x8a8a7a, 0.6);
    g.fillCircle(-4, -4, 6);
    g.lineStyle(1.5, 0x4a4a3a, 0.9);
    g.strokeCircle(0, 0, 14);
  }

  private drawWarning(progress: number): void {
    const g = this.warningGraphics;
    g.clear();
    
    // Expand warning circle
    const maxRadius = 45;
    const currentRadius = progress * maxRadius;
    
    // Outward danger circle
    g.lineStyle(2, 0xff3333, 0.8);
    g.strokeCircle(this.targetX, this.targetY, maxRadius);
    
    // Expanding inner fill
    g.fillStyle(0xff3333, 0.25 * progress);
    g.fillCircle(this.targetX, this.targetY, currentRadius);
  }

  public update(_time: number, delta: number): void {
    this.elapsed += delta;
    const progress = Math.min(this.elapsed / this.duration, 1);

    // Lerp position
    const curX = Phaser.Math.Linear(this.startX, this.targetX, progress);
    const curY = Phaser.Math.Linear(this.startY, this.targetY, progress);
    this.setPosition(curX, curY);

    // Height arc (offset visual sprite Y)
    const arcHeight = Math.sin(progress * Math.PI) * -90;
    this.rockGraphics.setPosition(0, arcHeight);

    // Update expand warning
    this.drawWarning(progress);

    if (progress >= 1) {
      this.explode();
    }
  }

  private explode(): void {
    // Play smash SFX
    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized() && this.scene.cache.audio.has("rumble")) {
        audioManager.getSFXPlayer().play("rumble", { volume: 0.4, detune: 500 });
      }
    } catch {}

    // Camera shake impact
    this.scene.cameras.main.shake(150, 0.007);

    // Check hit on player
    const player = (this.scene as any).player;
    if (player && player.takeDamage) {
      const dist = Phaser.Math.Distance.Between(this.targetX, this.targetY, player.x, player.y);
      if (dist <= 45) {
        player.takeDamage(this.damage, { x: this.targetX, y: this.targetY });
      }
    }

    // Emit debris particles
    EffectsManager.getInstance().emitRockDebris(this.targetX, this.targetY, 15);
    for (let i = 0; i < 4; i++) {
      EffectsManager.getInstance().emitFootstepDust(this.targetX + Phaser.Math.Between(-15, 15), this.targetY + Phaser.Math.Between(-15, 15));
    }

    // Clean up
    this.warningGraphics.destroy();
    this.rockGraphics.destroy();
    this.destroy();

    this.onCompleteCallback();
  }
}
