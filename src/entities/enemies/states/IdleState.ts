import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class IdleState implements IEnemyState {
  public readonly id = EnemyStateId.IDLE;
  private idleTimer: number = 0;
  private pauseDuration: number = 2;
  private lookInterval: number = 0;
  private lookTimer: number = 0;
  private isLooking: boolean = false;
  private lookChangeTimer: number = 0;

  public enter(ai: EnemyAI): void {
    this.idleTimer = 0;
    const min = ai.getConfig().patrolPauseMin;
    const max = ai.getConfig().patrolPauseMax;
    this.pauseDuration = min + Math.random() * (max - min);
    this.lookInterval = 1.0 + Math.random() * 2.0;
    this.lookTimer = 0;
    this.isLooking = false;
    this.lookChangeTimer = 0;
    ai.stopMoving();
  }

  public update(ai: EnemyAI, dt: number): void {
    if (ai.canSeePlayer()) {
      ai.stopLookingAround();
      ai.transitionTo(EnemyStateId.CHASE);
      return;
    }

    if (ai.isPlayerInAggroRange()) {
      ai.stopLookingAround();
      ai.transitionTo(EnemyStateId.INVESTIGATE);
      return;
    }

    this.lookTimer += dt;

    if (this.isLooking) {
      this.lookChangeTimer -= dt;
      if (this.lookChangeTimer <= 0) {
        this.isLooking = false;
        this.lookTimer = 0;
        this.lookInterval = 1.5 + Math.random() * 2.5;
      }
    } else if (this.lookTimer >= this.lookInterval) {
      this.isLooking = true;
      this.lookChangeTimer = 0.4 + Math.random() * 0.8;
      const angle = Math.random() * Math.PI * 2;
      ai.faceTarget({
        x: ai.getPosition().x + Math.cos(angle) * 100,
        y: ai.getPosition().y + Math.sin(angle) * 100,
      });
    }

    this.idleTimer += dt;
    if (this.idleTimer >= this.pauseDuration) {
      ai.stopLookingAround();
      ai.transitionTo(EnemyStateId.PATROL);
    }
  }

  public exit(_ai: EnemyAI): void {
  }
}
