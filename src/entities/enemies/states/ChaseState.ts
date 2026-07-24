import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class ChaseState implements IEnemyState {
  public readonly id = EnemyStateId.CHASE;
  private lostPlayerTimer: number = 0;
  private reactionTimer: number = 0;
  private readonly LOST_PLAYER_TIMEOUT: number = 2;
  private isReacting: boolean = false;

  public enter(ai: EnemyAI): void {
    this.lostPlayerTimer = 0;
    this.reactionTimer = 0;
    const prevState = ai.getStateMachine().getPreviousStateId();
    this.isReacting = prevState === EnemyStateId.ATTACK;
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

    const inRange = ai.isPlayerInAttackRange();
    const inRangeHysteresis = ai.isPlayerInAttackRangeHysteresis();

    if (inRange && !this.isReacting) {
      this.isReacting = true;
      this.reactionTimer = ai.getConfig().reactionTime;
    }

    if (this.isReacting) {
      if (!inRangeHysteresis) {
        this.isReacting = false;
        this.reactionTimer = 0;
      } else {
        this.reactionTimer -= dt;
        ai.moveToward(playerPos, ai.getConfig().chaseSpeed * 0.4);
        ai.faceTarget(playerPos);
        if (this.reactionTimer <= 0) {
          this.isReacting = false;
          ai.stopMoving();
          ai.transitionTo(EnemyStateId.ATTACK);
          return;
        }
        this.lostPlayerTimer = 0;
        return;
      }
    }

    if (inRange && !this.isReacting) {
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
  }
}
