import Phaser from "phaser";
import { IEnemyConfig } from "./EnemyConfig";
import { EnemyController } from "./EnemyController";
import { CombatManager } from "../../../systems/combat/CombatManager";
import { CombatController } from "../../../systems/combat/CombatController";
import { IEnemyState } from "../states/IEnemyState";
import { EnemyStateId } from "../states/EnemyStateId";
import { AttackType } from "../../../data/AttackData";

export class Enemy extends Phaser.GameObjects.Container {
  public controller: EnemyController;
  public combatController: CombatController | null = null;
  protected entityId: string;
  private deathTimer: number = 0;
  private deathStarted: boolean = false;

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
      if (!this.deathStarted) {
        this.deathStarted = true;
        this.startDeathVisual();
      }
      this.deathTimer += dt;
      const config = this.controller.getConfig();
      if (this.deathTimer >= config.deathRemoveDelay) {
        this.destroyEnemy();
      }
      return;
    }

    if (this.combatController) {
      const dir = this.controller.ai.getFacingDirection();
      this.combatController.update(dt, { x: this.x, y: this.y }, dir);

      if (this.controller.ai.consumeAttackRequest()) {
        this.combatController.requestAttack(
          AttackType.LIGHT,
          dir,
          { x: this.x, y: this.y }
        );
      }
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

  private startDeathVisual(): void {
    if (!this.scene) return;
    this.scene.tweens.add({
      targets: this,
      alpha: 0,
      angle: 90,
      duration: 400,
      ease: "Power2",
    });
  }

  public getEntityId(): string {
    return this.entityId;
  }

  public takeDamage(amount: number): number {
    return this.controller.health.takeDamage(amount);
  }

  public applyKnockback(from: { x: number; y: number }, force: number): void {
    const len = Math.sqrt(from.x ** 2 + from.y ** 2);
    if (len > 0) {
      const knockX = (from.x / len) * force;
      const knockY = (from.y / len) * force;
      const aiVel = this.controller.ai.getVelocity();
      this.controller.ai.setVelocity(aiVel.x + knockX, aiVel.y + knockY);
    }
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
