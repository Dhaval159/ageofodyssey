import Phaser from "phaser";
import { GAME_CONFIG } from "../../../constants/GameConstants";

export class BossHealthUI extends Phaser.GameObjects.Container {
  private bossName: string;
  private maxHealth: number;
  private currentHealth: number;
  private targetHealth: number;

  private barWidth: number = 700;
  private barHeight: number = 22;

  // Visual components
  private backgroundBar: Phaser.GameObjects.Graphics;
  private fillBar: Phaser.GameObjects.Graphics;
  private nameText: Phaser.GameObjects.Text;
  private phaseText: Phaser.GameObjects.Text;

  private isTransitioning: boolean = false;

  constructor(scene: Phaser.Scene, name: string, maxHp: number) {
    super(scene, GAME_CONFIG.WIDTH / 2, GAME_CONFIG.HEIGHT + 100);

    this.bossName = name;
    this.maxHealth = maxHp;
    this.currentHealth = maxHp;
    this.targetHealth = maxHp;

    // Background panel for UI box (optional glassmorphism look)
    const panel = scene.add.graphics();
    panel.fillStyle(0x000000, 0.65);
    panel.fillRoundedRect(-this.barWidth / 2 - 20, -50, this.barWidth + 40, 90, 8);
    panel.lineStyle(2, 0x5a2a2a, 0.8);
    panel.strokeRoundedRect(-this.barWidth / 2 - 20, -50, this.barWidth + 40, 90, 8);
    this.add(panel);

    // Background Bar (empty health track)
    this.backgroundBar = scene.add.graphics();
    this.backgroundBar.fillStyle(0x1a0a0a, 1);
    this.backgroundBar.fillRect(-this.barWidth / 2, 10, this.barWidth, this.barHeight);
    this.backgroundBar.lineStyle(1.5, 0x3d1d1d, 1);
    this.backgroundBar.strokeRect(-this.barWidth / 2, 10, this.barWidth, this.barHeight);
    this.add(this.backgroundBar);

    // Fill Bar
    this.fillBar = scene.add.graphics();
    this.add(this.fillBar);

    // Boss Name
    this.nameText = scene.add.text(-this.barWidth / 2, -38, this.bossName.toUpperCase(), {
      fontSize: "20px",
      fontFamily: "Georgia, serif",
      color: "#ffd700",
      fontStyle: "bold",
      shadow: { offsetX: 2, offsetY: 2, color: "#000000", blur: 2, stroke: true, fill: true }
    });
    this.add(this.nameText);

    // Phase Indicator
    this.phaseText = scene.add.text(this.barWidth / 2, -35, "PHASE 1", {
      fontSize: "14px",
      fontFamily: "sans-serif",
      color: "#ff8888",
      fontStyle: "bold",
      shadow: { offsetX: 1, offsetY: 1, color: "#000000", blur: 1, stroke: true, fill: true }
    });
    this.phaseText.setOrigin(1, 0);
    this.add(this.phaseText);

    scene.add.existing(this);
    this.setScrollFactor(0);
    this.setDepth(900);

    this.drawFillBar();
  }

  public animateEntrance(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.scene.tweens.add({
      targets: this,
      y: GAME_CONFIG.HEIGHT - 75,
      alpha: { start: 0, to: 1 },
      duration: 1000,
      ease: "Cubic.easeOut",
      onComplete: () => {
        this.isTransitioning = false;
      }
    });
  }

  public animateExit(): void {
    if (this.isTransitioning) return;
    this.isTransitioning = true;
    this.scene.tweens.add({
      targets: this,
      y: GAME_CONFIG.HEIGHT + 100,
      alpha: 0,
      duration: 800,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.isTransitioning = false;
        this.destroy();
      }
    });
  }

  public updateHealth(hp: number): void {
    this.targetHealth = Phaser.Math.Clamp(hp, 0, this.maxHealth);
  }

  public setPhaseText(phaseName: string): void {
    this.phaseText.setText(phaseName.toUpperCase());
  }

  public update(_time: number, delta: number): void {
    // Smooth lerp
    if (this.currentHealth !== this.targetHealth) {
      const diff = this.targetHealth - this.currentHealth;
      const lerpSpeed = 0.08 * (delta / 16.666); // scale with frame rate
      
      if (Math.abs(diff) < 0.2) {
        this.currentHealth = this.targetHealth;
      } else {
        this.currentHealth += diff * lerpSpeed;
      }
      this.drawFillBar();
    }
  }

  private drawFillBar(): void {
    this.fillBar.clear();
    const ratio = Phaser.Math.Clamp(this.currentHealth / this.maxHealth, 0, 1);
    const fillW = this.barWidth * ratio;

    if (fillW > 0) {
      // Crimson/Gold metallic gradient look simulated with multiple filled layers
      this.fillBar.fillStyle(0xcc2222, 1); // Dark Crimson base
      this.fillBar.fillRect(-this.barWidth / 2, 10, fillW, this.barHeight);

      this.fillBar.fillStyle(0xff4444, 0.4); // Highlight top layer
      this.fillBar.fillRect(-this.barWidth / 2, 10, fillW, this.barHeight / 2);

      // Yellow/Gold accent at the end of the progress bar
      if (ratio > 0.02) {
        this.fillBar.fillStyle(0xffd700, 0.85);
        this.fillBar.fillRect(-this.barWidth / 2 + fillW - 4, 10, 4, this.barHeight);
      }
    }
  }

  public destroy(fromScene?: boolean): void {
    super.destroy(fromScene);
  }
}
