import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class DeadState implements IEnemyState {
  public readonly id = EnemyStateId.DEAD;

  public enter(ai: EnemyAI): void {
    ai.stopMoving();
  }

  public update(_ai: EnemyAI, _dt: number): void {
  }

  public exit(_ai: EnemyAI): void {}
}
