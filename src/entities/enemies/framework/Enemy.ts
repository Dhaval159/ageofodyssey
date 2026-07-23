import Phaser from "phaser";
import { IEnemyConfig } from "./EnemyConfig";
import { EnemyController } from "./EnemyController";
import { CombatManager } from "../../../systems/combat/CombatManager";
import { IEnemyState } from "../states/IEnemyState";
import { EnemyStateId } from "../states/EnemyStateId";

export class Enemy extends Phaser.GameObjects.Container {
  public controller: EnemyController;
  protected entityId: string;
  private deathTimer: number = 0;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: IEnemyConfig,
    controller: EnemyController
  ) {
    super(scene, x, y);
    this.entityId = `enemy_${config.entityType}_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    this.controller = controller;

    scene.add.existing(this);
    scene.physics.add.existing(this);

    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(config.size.width, config.size.height);
    body.setOffset(-config.size.width / 2, -config.size.height / 2);
    body.setCollideWorldBounds(true);
    body.setGravity(0, 0);
    body.setAllowGravity(false);
  }

  public initialize(
    player: Phaser.GameObjects.GameObject,
    states: IEnemyState[],
    initialState: string
  ): void {
    this.controller.initialize(this.x, this.y, player, states, initialState);
  }

  public update(_time: number, delta: number): void {
    const dt = delta / 1000;

    this.controller.update(dt);

    const stateId = this.controller.ai.getCurrentStateId();
    const body = this.body as Phaser.Physics.Arcade.Body;

    if (stateId === EnemyStateId.DEAD) {
      body.setVelocity(0, 0);
      this.deathTimer += dt;
      const config = this.controller.getConfig();
      if (this.deathTimer >= config.deathRemoveDelay) {
        this.destroyEnemy();
      }
      return;
    }

    const aiVelocity = this.controller.ai.getVelocity();
    body.setVelocity(aiVelocity.x, aiVelocity.y);

    this.controller.ai.setPosition(this.x, this.y);

    if (body.velocity.x !== 0 || body.velocity.y !== 0) {
      const dir = this.controller.ai.getFacingDirection();
      const sprite = this.controller.animator?.getSprite();
      if (sprite) {
        sprite.setFlipX(dir.x < 0);
      }
    }
  }

  public getEntityId(): string {
    return this.entityId;
  }

  public takeDamage(amount: number): number {
    return this.controller.health.takeDamage(amount);
  }

  public isAlive(): boolean {
    return this.controller.health.isAlive();
  }

  public destroyEnemy(): void {
    CombatManager.getInstance().unregisterController(this.entityId);
    if (this.controller.animator) {
      const sprite = this.controller.animator.getSprite();
      if (sprite && sprite.scene) {
        sprite.destroy();
      }
    }
    this.destroy();
  }
}
