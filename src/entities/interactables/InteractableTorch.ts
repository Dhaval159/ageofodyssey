import Phaser from "phaser";
import { BaseInteractable, BaseInteractableConfig } from "../../systems/interaction/BaseInteractable";
import { PuzzleEventType } from "../../systems/interaction/PuzzleEvent";

export interface InteractableTorchConfig extends BaseInteractableConfig {
  initialState?: boolean;
  torchColor?: number;
}

export class InteractableTorch extends BaseInteractable {
  private isLit: boolean;
  private poleGfx: Phaser.GameObjects.Graphics;
  private flameGfx: Phaser.GameObjects.Graphics;
  private flickerTimer: number = 0;

  constructor(scene: Phaser.Scene, config: InteractableTorchConfig) {
    super(scene, {
      ...config,
      color: 0x000000,
      alpha: 0,
      promptText: "[E] Light torch",
    });

    this.isLit = config.initialState ?? false;

    this.poleGfx = scene.add.graphics();
    this.add(this.poleGfx);
    this.drawPole();

    this.flameGfx = scene.add.graphics();
    this.add(this.flameGfx);

    if (this.isLit) {
      this.drawLitFlame();
    } else {
      this.drawUnlitFlame();
    }
  }

  private drawPole(): void {
    this.poleGfx.clear();
    this.poleGfx.fillStyle(0x5a3a1a, 1);
    this.poleGfx.fillRect(-2, -this.bodyHeight / 2, 4, this.bodyHeight);
    this.poleGfx.fillStyle(0x6a4a2a, 1);
    this.poleGfx.fillRect(-5, -this.bodyHeight / 2, 10, 5);
  }

  private drawUnlitFlame(): void {
    this.flameGfx.clear();
    this.flameGfx.fillStyle(0x3a3a3a, 0.5);
    this.flameGfx.fillCircle(0, -this.bodyHeight / 2 - 2, 3);
    this.flameGfx.fillStyle(0x2a2a2a, 0.3);
    this.flameGfx.fillCircle(0, -this.bodyHeight / 2 - 2, 2);
  }

  private drawLitFlame(): void {
    this.flameGfx.clear();
    const top = -this.bodyHeight / 2 - 2;

    this.flameGfx.fillStyle(0xff6600, 0.8);
    this.flameGfx.fillCircle(0, top - 1, 5);
    this.flameGfx.fillStyle(0xff8800, 0.6);
    this.flameGfx.fillTriangle(-4, top + 1, 4, top + 1, 0, top - 6);

    this.flameGfx.fillStyle(0xffaa00, 0.9);
    this.flameGfx.fillCircle(0, top - 1, 3);
    this.flameGfx.fillStyle(0xffdd44, 0.8);
    this.flameGfx.fillCircle(0, top - 2, 1.5);

    this.flameGfx.fillStyle(0xff8800, 0.15);
    this.flameGfx.fillCircle(0, top, 10);
  }

  public interact(): void {
    if (this.isLit) {
      this.extinguish();
    } else {
      this.light();
    }
  }

  public light(): void {
    if (this.isLit) return;
    this.isLit = true;
    this.drawLitFlame();

    const flash = this.scene.add.circle(this.x, this.y - this.bodyHeight / 2 - 2, 8, 0xffaa00, 0.4);
    flash.setDepth(8);
    this.scene.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 300,
      onComplete: () => flash.destroy(),
    });

    this.emitPuzzleEvent(PuzzleEventType.LIT);
  }

  public extinguish(): void {
    if (!this.isLit) return;
    this.isLit = false;
    this.drawUnlitFlame();
    this.emitPuzzleEvent(PuzzleEventType.EXTINGUISHED);
  }

  public isTorchLit(): boolean {
    return this.isLit;
  }

  public getInteractionPrompt(): string {
    return this.isLit ? "[E] Extinguish torch" : "[E] Light torch";
  }

  public update(_time: number, delta: number): void {
    if (!this.isLit) return;

    this.flickerTimer += delta;
    if (this.flickerTimer > 80) {
      this.flickerTimer = 0;
      this.flameGfx.setPosition(
        Phaser.Math.Between(-1, 1),
        Phaser.Math.Between(-1, 1)
      );
      this.flameGfx.setAlpha(0.7 + Math.random() * 0.3);
    }
  }
}
