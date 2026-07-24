import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class AttackState implements IEnemyState {
  public readonly id = EnemyStateId.ATTACK;
  private attackTimer: number = 0;
  private hasAttacked: boolean = false;
  private cooldownTimer: number = 0;
  private inCooldown: boolean = false;
  private windUpPhase: boolean = true;
  private readonly WIND_UP_DURATION: number = 0.15;

  public enter(ai: EnemyAI): void {
    this.attackTimer = 0;
    this.hasAttacked = false;
    this.cooldownTimer = 0;
    this.inCooldown = false;
    this.windUpPhase = true;
    ai.stopMoving();
  }

  public update(ai: EnemyAI, dt: number): void {
    if (!ai.isPlayerInAttackRange()) {
      this.resetState();

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

    if (this.windUpPhase) {
      this.attackTimer += dt;
      if (this.attackTimer >= this.WIND_UP_DURATION) {
        this.attackTimer = 0;
        this.windUpPhase = false;
        this.hasAttacked = true;
        this.performAttack(ai);
      }
      return;
    }

    if (!this.hasAttacked) {
      this.hasAttacked = true;
      this.performAttack(ai);
    }

    if (!this.inCooldown) {
      this.attackTimer += dt;
      if (this.attackTimer >= ai.getConfig().attackDuration) {
        this.inCooldown = true;
        this.cooldownTimer = ai.getConfig().attackCooldown;
      }
    }

    if (this.inCooldown) {
      this.cooldownTimer -= dt;
      if (this.cooldownTimer <= 0) {
        this.resetState();
        ai.transitionTo(EnemyStateId.CHASE);
      }
    }
  }

  private resetState(): void {
    this.attackTimer = 0;
    this.hasAttacked = false;
    this.cooldownTimer = 0;
    this.inCooldown = false;
    this.windUpPhase = true;
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
