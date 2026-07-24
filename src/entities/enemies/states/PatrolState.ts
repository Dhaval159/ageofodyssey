import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class PatrolState implements IEnemyState {
  public readonly id = EnemyStateId.PATROL;
  private patrolTimer: number = 0;
  private patrolDuration: number = 4;
  private hasArrived: boolean = false;
  private arrivedPauseTimer: number = 0;
  private readonly ARRIVED_PAUSE: number = 0.8;
  private readonly ARRIVAL_THRESHOLD: number = 8;

  public enter(ai: EnemyAI): void {
    this.patrolTimer = 0;
    this.patrolDuration = 3 + Math.random() * 4;
    this.hasArrived = false;
    this.arrivedPauseTimer = 0;

    const home = ai.getHomePosition();
    const radius = ai.getConfig().patrolRadius;
    const angle = Math.random() * Math.PI * 2;
    const dist = 40 + Math.random() * Math.max(radius - 40, 10);
    const tx = home.x + Math.cos(angle) * dist;
    const ty = home.y + Math.sin(angle) * dist;

    ai.setPatrolTarget({ x: tx, y: ty });
  }

  public update(ai: EnemyAI, dt: number): void {
    if (ai.canSeePlayer()) {
      ai.clearPatrolTarget();
      ai.stopLookingAround();
      ai.transitionTo(EnemyStateId.CHASE);
      return;
    }

    if (ai.isPlayerInAggroRange()) {
      ai.clearPatrolTarget();
      ai.stopLookingAround();
      ai.transitionTo(EnemyStateId.INVESTIGATE);
      return;
    }

    if (this.hasArrived) {
      this.arrivedPauseTimer -= dt;
      if (!ai.updateLookAround(dt) && this.arrivedPauseTimer <= 0) {
        ai.clearPatrolTarget();
        ai.transitionTo(EnemyStateId.IDLE);
      }
      return;
    }

    const target = ai.getPatrolTarget();
    if (target) {
      const pos = ai.getPosition();
      const dx = target.x - pos.x;
      const dy = target.y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > this.ARRIVAL_THRESHOLD) {
        ai.moveToward(target, ai.getConfig().speed);
        ai.faceTarget(target);
      } else {
        ai.stopMoving();
        this.hasArrived = true;
        this.arrivedPauseTimer = this.ARRIVED_PAUSE;
        ai.faceTarget(target);
        ai.startLookingAround();
      }
    }

    this.patrolTimer += dt;
    if (this.patrolTimer >= this.patrolDuration && !this.hasArrived) {
      ai.clearPatrolTarget();
      ai.transitionTo(EnemyStateId.IDLE);
    }
  }

  public exit(ai: EnemyAI): void {
    ai.clearPatrolTarget();
    ai.stopLookingAround();
  }
}
