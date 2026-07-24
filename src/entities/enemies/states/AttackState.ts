import { IEnemyState } from "./IEnemyState";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyStateId } from "./EnemyStateId";

export class AttackState implements IEnemyState {
  public readonly id = EnemyStateId.ATTACK;
  private phaseTimer: number = 0;
  private readonly WIND_UP: number = 0.15;
  private phase: 'windup' | 'cooldown' = 'windup';

  public enter(ai: EnemyAI): void {
    this.phaseTimer = 0;
    this.phase = 'windup';
    ai.stopMoving();
  }

  public update(ai: EnemyAI, dt: number): void {
    const playerPos = ai.getPlayerPosition();
    if (playerPos) {
      ai.faceTarget(playerPos);
    }

    this.phaseTimer += dt;

    if (this.phase === 'windup') {
      if (this.phaseTimer >= this.WIND_UP) {
        this.performAttack(ai);
        this.phase = 'cooldown';
        this.phaseTimer = 0;
      }
      return;
    }

    if (this.phase === 'cooldown') {
      const remainingCooldown = ai.getConfig().attackCooldown - this.WIND_UP;
      if (this.phaseTimer >= remainingCooldown) {
        ai.transitionTo(EnemyStateId.CHASE);
      }
      return;
    }
  }

  private performAttack(ai: EnemyAI): void {
    const playerPos = ai.getPlayerPosition();
    if (!playerPos) return;

    const pos = ai.getPosition();
    const dx = playerPos.x - pos.x;
    const dy = playerPos.y - pos.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist <= ai.getConfig().attackRange + 10) {
      ai.requestAttack();
    }
  }

  public exit(_ai: EnemyAI): void {}
}
