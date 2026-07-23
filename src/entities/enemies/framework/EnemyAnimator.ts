import { AnimationController } from "../../../systems/animation/AnimationController";
import { AnimationId } from "../../../systems/animation/AnimationConfig";

export class EnemyAnimator {
  private controller: AnimationController;

  constructor(controller: AnimationController) {
    this.controller = controller;
  }

  public play(id: AnimationId): void {
    this.controller.requestState(id);
  }

  public update(delta: number): void {
    this.controller.update(delta);
  }

  public setPosition(x: number, y: number): void {
    this.controller.setPosition(x, y);
  }

  public setFlipX(flip: boolean): void {
    this.controller.setFlipX(flip);
  }

  public setVisible(visible: boolean): void {
    this.controller.setVisible(visible);
  }

  public setDepth(depth: number): void {
    this.controller.setDepth(depth);
  }

  public setTint(color: number): void {
    this.controller.setTint(color);
  }

  public clearTint(): void {
    this.controller.clearTint();
  }

  public getSprite(): Phaser.GameObjects.Sprite {
    return this.controller.getSprite();
  }

  public getController(): AnimationController {
    return this.controller;
  }
}
