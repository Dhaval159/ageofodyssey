import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class InvestigateState implements IEnemyState {
  public readonly id = EnemyStateId.INVESTIGATE;
  private investigateTarget: { x: number; y: number } | null = null;
  private timer: number = 0;
  private readonly MAX_INVESTIGATE_TIME: number = 5;

  public enter(ai: EnemyAI): void {
    this.timer = 0;

    const playerPos = ai.getPlayerPosition();
    if (playerPos) {
      this.investigateTarget = { ...playerPos };
    } else {
      const dir = ai.getDirectionToPlayer();
      const dist = ai.getDistanceToPlayer();
      if (dist < Infinity) {
        const pos = ai.getPosition();
        this.investigateTarget = {
          x: pos.x + dir.x * Math.min(dist, 100),
          y: pos.y + dir.y * Math.min(dist, 100),
        };
      } else {
        this.investigateTarget = null;
      }
    }
  }

  public update(ai: EnemyAI, dt: number): void {
    this.timer += dt;

    if (ai.canSeePlayer()) {
      ai.transitionTo(EnemyStateId.CHASE);
      return;
    }

    if (this.timer >= this.MAX_INVESTIGATE_TIME) {
      ai.transitionTo(EnemyStateId.RETURN_HOME);
      return;
    }

    if (this.investigateTarget) {
      const pos = ai.getPosition();
      const dx = this.investigateTarget.x - pos.x;
      const dy = this.investigateTarget.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 8) {
        ai.moveToward(this.investigateTarget, ai.getConfig().speed);
        ai.faceTarget(this.investigateTarget);
      } else {
        ai.stopMoving();
        ai.transitionTo(EnemyStateId.RETURN_HOME);
      }
    } else {
      ai.transitionTo(EnemyStateId.RETURN_HOME);
    }
  }

  public exit(_ai: EnemyAI): void {}
}
