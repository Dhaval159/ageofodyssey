import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class ReturnHomeState implements IEnemyState {
  public readonly id = EnemyStateId.RETURN_HOME;

  public enter(_ai: EnemyAI): void {}

  public update(ai: EnemyAI, _dt: number): void {
    if (ai.canSeePlayer()) {
      ai.transitionTo(EnemyStateId.CHASE);
      return;
    }

    if (ai.isPlayerInAggroRange()) {
      ai.transitionTo(EnemyStateId.INVESTIGATE);
      return;
    }

    if (ai.isAtHome()) {
      ai.stopMoving();
      ai.transitionTo(EnemyStateId.IDLE);
      return;
    }

    const home = ai.getHomePosition();
    ai.moveToward(home, ai.getConfig().speed);
    ai.faceTarget(home);
  }

  public exit(_ai: EnemyAI): void {}
}
