import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class IdleState implements IEnemyState {
  public readonly id = EnemyStateId.IDLE;
  private idleTimer: number = 0;
  private pauseDuration: number = 2;

  public enter(ai: EnemyAI): void {
    this.idleTimer = 0;
    const min = ai.getConfig().patrolPauseMin;
    const max = ai.getConfig().patrolPauseMax;
    this.pauseDuration = min + Math.random() * (max - min);
    ai.stopMoving();
  }

  public update(ai: EnemyAI, dt: number): void {
    if (ai.canSeePlayer()) {
      ai.transitionTo(EnemyStateId.CHASE);
      return;
    }

    if (ai.isPlayerInAggroRange()) {
      ai.transitionTo(EnemyStateId.INVESTIGATE);
      return;
    }

    this.idleTimer += dt;
    if (this.idleTimer >= this.pauseDuration) {
      ai.transitionTo(EnemyStateId.PATROL);
    }
  }

  public exit(_ai: EnemyAI): void {}
}
