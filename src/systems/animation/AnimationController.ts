import Phaser from "phaser";
import {
  AnimationId,
  AnimationDef,
  EntityAnimationConfig,
} from "./AnimationConfig";
import { AnimationStateMachine } from "./AnimationStateMachine";

export class AnimationController {
  private sprite: Phaser.GameObjects.Sprite;
  private stateMachine: AnimationStateMachine;
  private config: EntityAnimationConfig;
  private currentDef: AnimationDef;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: EntityAnimationConfig
  ) {
    this.config = config;
    this.currentDef = config.animations[config.defaultAnimation];

    this.sprite = scene.add.sprite(x, y, config.spritesheet.key);
    this.sprite.setOrigin(0.5, 0.5);

    this.stateMachine = new AnimationStateMachine(
      config.defaultAnimation,
      config.transitions
    );

    this.stateMachine.setOnStateChange((_from, to) => {
      this.playAnimation(to);
    });

    this.playAnimation(config.defaultAnimation);
  }

  private playAnimation(id: AnimationId): void {
    const def = this.config.animations[id];
    if (!def) return;
    this.currentDef = def;

    const animKey = `${def.prefix}_${id.toLowerCase()}`;
    if (this.sprite.anims.currentAnim?.key !== animKey) {
      this.sprite.play(animKey);
    }
  }

  public requestState(id: AnimationId): void {
    this.stateMachine.requestTransition(id);
  }

  public update(_delta: number, speed?: number): void {
    if (speed !== undefined && this.currentDef.speedScale) {
      const speedPercent = speed / 280;
      const scale = Math.max(0.5, Math.min(2, speedPercent)) * this.currentDef.speedScale;
      this.sprite.anims.timeScale = scale;
    } else {
      this.sprite.anims.timeScale = 1;
    }
  }

  public getSprite(): Phaser.GameObjects.Sprite {
    return this.sprite;
  }

  public setPosition(x: number, y: number): void {
    this.sprite.setPosition(x, y);
  }

  public getCurrentAnimationId(): AnimationId {
    return this.stateMachine.getCurrentState();
  }

  public destroy(): void {
    this.sprite.destroy();
  }

  public setVisible(visible: boolean): void {
    this.sprite.setVisible(visible);
  }

  public setDepth(depth: number): void {
    this.sprite.setDepth(depth);
  }

  public setFlipX(flip: boolean): void {
    this.sprite.setFlipX(flip);
  }

  public setTint(color: number): void {
    this.sprite.setTint(color);
  }

  public clearTint(): void {
    this.sprite.clearTint();
  }
}
