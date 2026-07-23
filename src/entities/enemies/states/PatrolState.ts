import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class PatrolState implements IEnemyState {
  public readonly id = EnemyStateId.PATROL;
  private patrolTimer: number = 0;
  private patrolDuration: number = 4;
  private hasTarget: boolean = false;

  public enter(ai: EnemyAI): void {
    this.patrolTimer = 0;
    this.patrolDuration = 2 + Math.random() * 3;
    this.hasTarget = false;

    const home = ai.getHomePosition();
    const radius = ai.getConfig().patrolRadius;
    const angle = Math.random() * Math.PI * 2;
    const dist = Math.random() * radius;
    const tx = home.x + Math.cos(angle) * dist;
    const ty = home.y + Math.sin(angle) * dist;

    ai.setPatrolTarget({ x: tx, y: ty });
  }

  public update(ai: EnemyAI, dt: number): void {
    if (ai.canSeePlayer()) {
      ai.clearPatrolTarget();
      ai.transitionTo(EnemyStateId.CHASE);
      return;
    }

    if (ai.isPlayerInAggroRange()) {
      ai.clearPatrolTarget();
      ai.transitionTo(EnemyStateId.INVESTIGATE);
      return;
    }

    const target = ai.getPatrolTarget();
    if (target) {
      const dx = target.x - ai.getPosition().x;
      const dy = target.y - ai.getPosition().y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 8) {
        ai.moveToward(target, ai.getConfig().speed);
        ai.faceTarget(target);
      } else {
        ai.stopMoving();
        this.hasTarget = true;
      }
    }

    this.patrolTimer += dt;
    if (this.patrolTimer >= this.patrolDuration || this.hasTarget) {
      ai.clearPatrolTarget();
      ai.transitionTo(EnemyStateId.IDLE);
    }
  }

  public exit(ai: EnemyAI): void {
    ai.clearPatrolTarget();
  }
}
