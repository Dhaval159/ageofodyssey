import { IEnemyConfig } from "./EnemyConfig";
import { EnemyStateMachine } from "./EnemyStateMachine";
import { IEnemyState } from "../states/IEnemyState";

export class EnemyAI {
  private config: IEnemyConfig;
  private stateMachine: EnemyStateMachine;

  private position: { x: number; y: number } = { x: 0, y: 0 };
  private velocity: { x: number; y: number } = { x: 0, y: 0 };
  private facingDirection: { x: number; y: number } = { x: 0, y: 1 };
  private homePosition: { x: number; y: number } = { x: 0, y: 0 };
  private targetVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private playerRef: Phaser.GameObjects.GameObject | null = null;
  private attackRequested: boolean = false;
  private hurtTimer: number = 0;
  private patrolTarget: { x: number; y: number } | null = null;

  private idCounter: number = 0;
  public readonly id: string;

  constructor(config: IEnemyConfig) {
    this.config = config;
    this.stateMachine = new EnemyStateMachine();
    this.id = `enemy_ai_${++this.idCounter}_${Date.now()}`;
  }

  public setStateMachine(states: IEnemyState[], initialState: string): void {
    for (const state of states) {
      this.stateMachine.registerState(state);
    }
    this.stateMachine.transitionTo(initialState, this);
  }

  public registerState(state: IEnemyState): void {
    this.stateMachine.registerState(state);
  }

  public initialize(x: number, y: number, player: Phaser.GameObjects.GameObject): void {
    this.position = { x, y };
    this.homePosition = { x, y };
    this.playerRef = player;
  }

  public setPatrolTarget(target: { x: number; y: number }): void {
    this.patrolTarget = target;
  }

  public getPatrolTarget(): { x: number; y: number } | null {
    return this.patrolTarget;
  }

  public clearPatrolTarget(): void {
    this.patrolTarget = null;
  }

  public setHurtTimer(duration: number): void {
    this.hurtTimer = duration;
  }

  public getHurtTimer(): number {
    return this.hurtTimer;
  }

  public tickHurtTimer(dt: number): void {
    if (this.hurtTimer > 0) {
      this.hurtTimer -= dt;
    }
  }

  public isHurtTimerExpired(): boolean {
    return this.hurtTimer <= 0;
  }

  public requestAttack(): void {
    this.attackRequested = true;
  }

  public consumeAttackRequest(): boolean {
    const val = this.attackRequested;
    this.attackRequested = false;
    return val;
  }

  public update(dt: number): void {
    this.stateMachine.update(this, dt);
    this.applyTargetVelocity(dt);
  }

  private applyTargetVelocity(dt: number): void {
    const lerpFactor = 8 * dt;
    this.velocity.x += (this.targetVelocity.x - this.velocity.x) * lerpFactor;
    this.velocity.y += (this.targetVelocity.y - this.velocity.y) * lerpFactor;

    if (Math.abs(this.velocity.x) < 0.5) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < 0.5) this.velocity.y = 0;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    if (this.targetVelocity.x !== 0 || this.targetVelocity.y !== 0) {
      this.facingDirection = {
        x: this.targetVelocity.x,
        y: this.targetVelocity.y,
      };
      const len = Math.sqrt(
        this.facingDirection.x ** 2 + this.facingDirection.y ** 2
      );
      if (len > 0) {
        this.facingDirection.x /= len;
        this.facingDirection.y /= len;
      }
    }
  }

  // --- Movement controls called by states ---

  public setMoveTarget(target: { x: number; y: number }, speed: number): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      this.targetVelocity.x = (dx / dist) * speed;
      this.targetVelocity.y = (dy / dist) * speed;
    } else {
      this.stopMoving();
    }
  }

  public moveToward(target: { x: number; y: number }, speed: number): void {
    this.setMoveTarget(target, speed);
  }

  public moveInDirection(dir: { x: number; y: number }, speed: number): void {
    const len = Math.sqrt(dir.x ** 2 + dir.y ** 2);
    if (len > 0) {
      this.targetVelocity.x = (dir.x / len) * speed;
      this.targetVelocity.y = (dir.y / len) * speed;
    }
  }

  public stopMoving(): void {
    this.targetVelocity.x = 0;
    this.targetVelocity.y = 0;
  }

  public setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  public faceTarget(target: { x: number; y: number }): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) {
      this.facingDirection = { x: dx / len, y: dy / len };
    }
  }

  // --- Detection ---

  public canSeePlayer(): boolean {
    if (!this.playerRef) return false;
    const dist = this.getDistanceToPlayer();
    return dist <= this.config.visionRadius;
  }

  public isPlayerInAttackRange(): boolean {
    if (!this.playerRef) return false;
    const dist = this.getDistanceToPlayer();
    return dist <= this.config.attackRange;
  }

  public isPlayerInAggroRange(): boolean {
    if (!this.playerRef) return false;
    const dist = this.getDistanceToPlayer();
    return dist <= this.config.aggroRadius;
  }

  public getDistanceToPlayer(): number {
    if (!this.playerRef) return Infinity;
    const ppos = this.playerRef as Phaser.GameObjects.GameObject & {
      x: number;
      y: number;
    };
    const dx = ppos.x - this.position.x;
    const dy = ppos.y - this.position.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public getDirectionToPlayer(): { x: number; y: number } {
    if (!this.playerRef) return { x: 0, y: 0 };
    const ppos = this.playerRef as Phaser.GameObjects.GameObject & {
      x: number;
      y: number;
    };
    const dx = ppos.x - this.position.x;
    const dy = ppos.y - this.position.y;
    const len = Math.sqrt(dx * dx + dy * dy);
    if (len > 0) return { x: dx / len, y: dy / len };
    return { x: 0, y: 0 };
  }

  public getPlayerPosition(): { x: number; y: number } | null {
    if (!this.playerRef) return null;
    const ppos = this.playerRef as Phaser.GameObjects.GameObject & {
      x: number;
      y: number;
    };
    return { x: ppos.x, y: ppos.y };
  }

  // --- Home / Patrol ---

  public getHomePosition(): { x: number; y: number } {
    return { ...this.homePosition };
  }

  public isAtHome(): boolean {
    const dx = this.position.x - this.homePosition.x;
    const dy = this.position.y - this.homePosition.y;
    return Math.sqrt(dx * dx + dy * dy) < 16;
  }

  public getDistanceToHome(): number {
    const dx = this.position.x - this.homePosition.x;
    const dy = this.position.y - this.homePosition.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  // --- Getters ---

  public getStateMachine(): EnemyStateMachine {
    return this.stateMachine;
  }

  public transitionTo(stateId: string): void {
    this.stateMachine.transitionTo(stateId, this);
  }

  public getCurrentStateId(): string | null {
    return this.stateMachine.getCurrentStateId();
  }

  public getPosition(): { x: number; y: number } {
    return { ...this.position };
  }

  public getVelocity(): { x: number; y: number } {
    return { ...this.velocity };
  }

  public setVelocity(vx: number, vy: number): void {
    this.velocity.x = vx;
    this.velocity.y = vy;
  }

  public getFacingDirection(): { x: number; y: number } {
    return { ...this.facingDirection };
  }

  public getConfig(): IEnemyConfig {
    return this.config;
  }
}
