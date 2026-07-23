import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class HurtState implements IEnemyState {
  public readonly id = EnemyStateId.HURT;
  private readonly HURT_DURATION: number = 0.3;
  private timer: number = 0;

  public enter(ai: EnemyAI): void {
    this.timer = this.HURT_DURATION;
    ai.stopMoving();
    ai.setHurtTimer(this.HURT_DURATION);
  }

  public update(ai: EnemyAI, dt: number): void {
    ai.tickHurtTimer(dt);
    this.timer -= dt;

    if (this.timer <= 0) {
      if (ai.canSeePlayer()) {
        ai.transitionTo(EnemyStateId.CHASE);
      } else if (ai.isPlayerInAggroRange()) {
        ai.transitionTo(EnemyStateId.INVESTIGATE);
      } else {
        ai.transitionTo(EnemyStateId.RETURN_HOME);
      }
    }
  }

  public exit(_ai: EnemyAI): void {}
}
