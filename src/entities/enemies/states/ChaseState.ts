import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class ChaseState implements IEnemyState {
  public readonly id = EnemyStateId.CHASE;
  private lostPlayerTimer: number = 0;
  private reactionTimer: number = 0;
  private readonly LOST_PLAYER_TIMEOUT: number = 2.5;
  private isReacting: boolean = false;
  private attackOnCooldown: boolean = false;
  private readonly ATTACK_COOLDOWN_TIME: number = 0.3;

  public enter(ai: EnemyAI): void {
    this.lostPlayerTimer = 0;
    this.reactionTimer = 0;
    this.isReacting = false;
    this.attackOnCooldown = false;
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

    // Reset lost timer when player is visible
    this.lostPlayerTimer = 0;

    const inRange = ai.isPlayerInAttackRange();
    const inRangeHysteresis = ai.isPlayerInAttackRangeHysteresis();

    // Handle reaction delay before attacking
    if (inRange && !this.isReacting && !this.attackOnCooldown) {
      this.isReacting = true;
      this.reactionTimer = ai.getConfig().reactionTime;
    }

    if (this.isReacting) {
      if (!inRangeHysteresis) {
        // Player moved out of range during reaction
        this.isReacting = false;
        this.reactionTimer = 0;
      } else {
        // Slowly approach while waiting to attack
        ai.moveToward(playerPos, ai.getConfig().chaseSpeed * 0.3);
        ai.faceTarget(playerPos);
        this.reactionTimer -= dt;
        if (this.reactionTimer <= 0) {
          this.isReacting = false;
          ai.stopMoving();
          ai.transitionTo(EnemyStateId.ATTACK);
          return;
        }
        return;
      }
    }

    // If already in attack range, transition to attack
    if (inRange && !this.isReacting && !this.attackOnCooldown) {
      ai.stopMoving();
      ai.transitionTo(EnemyStateId.ATTACK);
      return;
    }

    // Check if player left vision range
    if (!ai.canSeePlayer()) {
      this.lostPlayerTimer += dt;
      if (this.lostPlayerTimer >= this.LOST_PLAYER_TIMEOUT) {
        ai.transitionTo(EnemyStateId.INVESTIGATE);
        return;
      }
    }

    // Continue chasing
    ai.moveToward(playerPos, ai.getConfig().chaseSpeed);
    ai.faceTarget(playerPos);
  }

  public exit(_ai: EnemyAI): void {
  }
}
