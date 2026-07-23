import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class ChaseState implements IEnemyState {
  public readonly id = EnemyStateId.CHASE;
  private lostPlayerTimer: number = 0;
  private readonly LOST_PLAYER_TIMEOUT: number = 3;

  public enter(_ai: EnemyAI): void {
    this.lostPlayerTimer = 0;
  }

  public update(ai: EnemyAI, dt: number): void {
    const playerPos = ai.getPlayerPosition();

    if (!playerPos) {
      this.lostPlayerTimer += dt;
      if (this.lostPlayerTimer >= this.LOST_PLAYER_TIMEOUT) {
        ai.transitionTo(EnemyStateId.RETURN_HOME);
      }
      return;
    }

    if (ai.isPlayerInAttackRange()) {
      ai.stopMoving();
      ai.transitionTo(EnemyStateId.ATTACK);
      return;
    }

    if (!ai.canSeePlayer()) {
      this.lostPlayerTimer += dt;
      if (this.lostPlayerTimer >= this.LOST_PLAYER_TIMEOUT) {
        ai.transitionTo(EnemyStateId.INVESTIGATE);
        return;
      }
    } else {
      this.lostPlayerTimer = 0;
    }

    ai.moveToward(playerPos, ai.getConfig().chaseSpeed);
    ai.faceTarget(playerPos);
  }

  public exit(_ai: EnemyAI): void {
    // No cleanup needed
  }
}
