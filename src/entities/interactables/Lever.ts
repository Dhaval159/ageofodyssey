import Phaser from "phaser";
import { BaseInteractable, BaseInteractableConfig } from "../../systems/interaction/BaseInteractable";
import { PuzzleEventType } from "../../systems/interaction/PuzzleEvent";

export interface LeverConfig extends BaseInteractableConfig {
  initialState?: boolean;
}

export class Lever extends BaseInteractable {
  private activated: boolean;
  private leverGraphics: Phaser.GameObjects.Graphics;
  private animating: boolean = false;

  constructor(scene: Phaser.Scene, config: LeverConfig) {
    super(scene, {
      ...config,
      color: config.color ?? 0x5a3a1a,
      strokeColor: config.strokeColor ?? 0x3a2210,
      alpha: 0,
    });

    this.activated = config.initialState ?? false;

    this.leverGraphics = scene.add.graphics();
    this.add(this.leverGraphics);
    this.drawLever();
  }

  private drawLever(): void {
    this.leverGraphics.clear();

    const angle = this.activated ? -30 : 30;
    const rad = Phaser.Math.DegToRad(angle);

    const len = 12;
    const pivotY = 4;
    const tipX = Math.sin(rad) * len;
    const tipY = pivotY - Math.cos(rad) * len;

    this.leverGraphics.fillStyle(0x7a5a3a, 1);
    this.leverGraphics.fillRect(-3, pivotY, 6, 8);

    this.leverGraphics.lineStyle(3, 0xaa8833, 1);
    this.leverGraphics.beginPath();
    this.leverGraphics.moveTo(0, pivotY);
    this.leverGraphics.lineTo(tipX, tipY);
    this.leverGraphics.strokePath();

    this.leverGraphics.fillStyle(0xccaa44, 1);
    this.leverGraphics.fillCircle(tipX, tipY, 4);
    this.leverGraphics.lineStyle(1, 0xaa8833, 0.8);
    this.leverGraphics.strokeCircle(tipX, tipY, 4);

    this.leverGraphics.fillStyle(0x886633, 1);
    this.leverGraphics.fillCircle(0, pivotY, 3);

    this.leverGraphics.lineStyle(1, 0x5a3a1a, 0.4);
    this.leverGraphics.strokeCircle(0, pivotY, 3);
  }

  public interact(): void {
    if (this.animating) return;
    this.animating = true;

    const targetAngle = this.activated ? 30 : -30;
    const startAngle = this.activated ? -30 : 30;
    const duration = 200;

    let elapsed = 0;

    const timer = this.scene.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        elapsed += 16;
        const t = Math.min(elapsed / duration, 1);
        const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;
        const currentAngle = startAngle + (targetAngle - startAngle) * ease;
        const rad = Phaser.Math.DegToRad(currentAngle);
        const len = 12;
        const pivotY = 4;
        const tipX = Math.sin(rad) * len;
        const tipY = pivotY - Math.cos(rad) * len;

        this.leverGraphics.clear();
        this.leverGraphics.fillStyle(0x7a5a3a, 1);
        this.leverGraphics.fillRect(-3, pivotY, 6, 8);
        this.leverGraphics.lineStyle(3, 0xaa8833, 1);
        this.leverGraphics.beginPath();
        this.leverGraphics.moveTo(0, pivotY);
        this.leverGraphics.lineTo(tipX, tipY);
        this.leverGraphics.strokePath();
        this.leverGraphics.fillStyle(0xccaa44, 1);
        this.leverGraphics.fillCircle(tipX, tipY, 4);
        this.leverGraphics.lineStyle(1, 0xaa8833, 0.8);
        this.leverGraphics.strokeCircle(tipX, tipY, 4);
        this.leverGraphics.fillStyle(0x886633, 1);
        this.leverGraphics.fillCircle(0, pivotY, 3);
        this.leverGraphics.lineStyle(1, 0x5a3a1a, 0.4);
        this.leverGraphics.strokeCircle(0, pivotY, 3);

        if (t >= 1) {
          timer.remove();
          this.animating = false;
          this.activated = !this.activated;
          this.emitPuzzleEvent(
            this.activated ? PuzzleEventType.ACTIVATED : PuzzleEventType.DEACTIVATED
          );
          this.emitPuzzleEvent(PuzzleEventType.TOGGLED, { activated: this.activated });
        }
      },
    });
  }

  public isActivated(): boolean {
    return this.activated;
  }

  public getInteractionPrompt(): string {
    return this.activated ? "[E] Reset lever" : "[E] Pull lever";
  }
}
