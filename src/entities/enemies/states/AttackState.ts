import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class AttackState implements IEnemyState {
  public readonly id = EnemyStateId.ATTACK;
  private attackTimer: number = 0;
  private hasAttacked: boolean = false;
  private cooldownTimer: number = 0;
  private inCooldown: boolean = false;

  public enter(ai: EnemyAI): void {
    this.attackTimer = 0;
    this.hasAttacked = false;
    this.cooldownTimer = 0;
    this.inCooldown = false;
    ai.stopMoving();
  }

  public update(ai: EnemyAI, dt: number): void {
    if (!ai.isPlayerInAttackRange()) {
      this.attackTimer = 0;
      this.hasAttacked = false;
      this.inCooldown = false;

      if (ai.canSeePlayer()) {
        ai.transitionTo(EnemyStateId.CHASE);
      } else {
        ai.transitionTo(EnemyStateId.INVESTIGATE);
      }
      return;
    }

    const playerPos = ai.getPlayerPosition();
    if (playerPos) {
      ai.faceTarget(playerPos);
    }

    if (this.inCooldown) {
      this.cooldownTimer -= dt;
      if (this.cooldownTimer <= 0) {
        this.inCooldown = false;
        this.hasAttacked = false;
        this.attackTimer = 0;
      }
      return;
    }

    this.attackTimer += dt;

    if (!this.hasAttacked && this.attackTimer >= ai.getConfig().attackDuration * 0.3) {
      this.hasAttacked = true;
      this.performAttack(ai);
    }

    if (this.attackTimer >= ai.getConfig().attackDuration) {
      this.inCooldown = true;
      this.cooldownTimer = ai.getConfig().attackCooldown;
    }
  }

  private performAttack(ai: EnemyAI): void {
    const config = ai.getConfig();
    const playerPos = ai.getPlayerPosition();
    if (!playerPos) return;

    const dx = playerPos.x - ai.getPosition().x;
    const dy = playerPos.y - ai.getPosition().y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= config.attackRange) {
      ai.requestAttack();
    }
  }

  public exit(_ai: EnemyAI): void {}
}
