import Phaser from "phaser";
import { BaseInteractable, BaseInteractableConfig } from "../../systems/interaction/BaseInteractable";
import { PuzzleEventType } from "../../systems/interaction/PuzzleEvent";

export interface MoveableCrateConfig extends BaseInteractableConfig {
  pushRange?: number;
  pushDistance?: number;
  crateColor?: number;
}

export class MoveableCrate extends BaseInteractable {
  private pushDistance: number;
  private lastPushTime: number = 0;
  private pushCooldown: number = 300;
  private isMoving: boolean = false;
  private crateGfx: Phaser.GameObjects.Graphics;
  private crossGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: MoveableCrateConfig) {
    super(scene, {
      ...config,
      color: config.crateColor ?? 0x8a6a3a,
      strokeColor: 0x6a4a1a,
      strokeWidth: 2,
      isStatic: false,
      promptText: "[E] Push crate",
    });

    this.pushDistance = config.pushDistance ?? 28;

    this.crateGfx = scene.add.graphics();
    this.add(this.crateGfx);

    this.crossGfx = scene.add.graphics();
    this.add(this.crossGfx);

    this.drawCrate();
    this.setDepth(2);
  }

  private drawCrate(): void {
    const hw = this.bodyWidth / 2;
    const hh = this.bodyHeight / 2;

    this.crateGfx.clear();
    this.crateGfx.fillStyle(this.bodyColor, this.bodyAlpha);
    this.crateGfx.fillRect(-hw, -hh, this.bodyWidth, this.bodyHeight);
    this.crateGfx.lineStyle(this.strokeWidth, this.strokeColor, 0.8);
    this.crateGfx.strokeRect(-hw, -hh, this.bodyWidth, this.bodyHeight);

    this.crossGfx.clear();
    this.crossGfx.lineStyle(1, 0x6a4a1a, 0.4);
    this.crossGfx.lineBetween(-hw, -hh, hw, hh);
    this.crossGfx.lineBetween(hw, -hh, -hw, hh);
  }

  public interact(): void {
    this.push();
  }

  public push(): void {
    this.lastPushTime = Date.now();
  }

  public pushInDirection(
    dx: number,
    dy: number,
    checkCollision: (x: number, y: number) => boolean
  ): boolean {
    if (this.isMoving) return false;

    const newX = this.x + dx * this.pushDistance;
    const newY = this.y + dy * this.pushDistance;

    if (checkCollision(newX, newY)) {
      return false;
    }

    this.isMoving = true;

    this.scene.tweens.add({
      targets: this,
      x: newX,
      y: newY,
      duration: 200,
      ease: "Power2",
      onComplete: () => {
        this.isMoving = false;
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.updateFromGameObject();
        }
        this.emitPuzzleEvent(PuzzleEventType.MOVED, { x: this.x, y: this.y });
      },
    });

    return true;
  }

  public isInteractionEnabled(): boolean {
    const now = Date.now();
    return now - this.lastPushTime > this.pushCooldown && !this.isMoving;
  }

  public isCurrentlyMoving(): boolean {
    return this.isMoving;
  }

  public getCrateBounds(): { x: number; y: number; width: number; height: number } {
    return this.getBodyBounds();
  }
}
