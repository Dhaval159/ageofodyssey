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

  private lookTimer: number = 0;
  private lookDirection: { x: number; y: number } = { x: 0, y: 1 };
  private isLookingAround: boolean = false;

  private stuckTimer: number = 0;
  private stuckDirection: { x: number; y: number } = { x: 0, y: 0 };
  private stuckAvoidTimer: number = 0;
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };

  private readonly MOVE_SMOOTHING: number = 12;
  private readonly VELOCITY_DEAD_ZONE: number = 0.8;
  private readonly STUCK_THRESHOLD: number = 0.8;
  private readonly STUCK_TIME: number = 0.5;
  private readonly AVOID_TIME: number = 0.25;
  private readonly SLOW_RADIUS: number = 32;

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
    this.lastPosition = { x, y };
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

  // --- Look-around system for natural idle/patrol behavior ---

  public startLookingAround(): void {
    this.isLookingAround = true;
    this.lookTimer = 0.5 + Math.random() * 1.0;
    const angle = Math.random() * Math.PI * 2;
    this.lookDirection = {
      x: Math.cos(angle),
      y: Math.sin(angle),
    };
  }

  public updateLookAround(dt: number): boolean {
    if (!this.isLookingAround) return false;
    this.lookTimer -= dt;
    if (this.lookTimer <= 0) {
      this.isLookingAround = false;
      return false;
    }
    this.facingDirection = { ...this.lookDirection };
    return true;
  }

  public isCurrentlyLookingAround(): boolean {
    return this.isLookingAround;
  }

  public getIsLookingAround(): boolean {
    return this.isLookingAround;
  }

  public stopLookingAround(): void {
    this.isLookingAround = false;
  }

  // --- Main update ---

  public update(dt: number): void {
    this.stateMachine.update(this, dt);
    this.applyTargetVelocity(dt);
  }

  private applyTargetVelocity(dt: number): void {
    const smoothFactor = 1 - Math.exp(-this.MOVE_SMOOTHING * dt);
    this.velocity.x += (this.targetVelocity.x - this.velocity.x) * smoothFactor;
    this.velocity.y += (this.targetVelocity.y - this.velocity.y) * smoothFactor;

    if (Math.abs(this.velocity.x) < this.VELOCITY_DEAD_ZONE) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < this.VELOCITY_DEAD_ZONE) this.velocity.y = 0;

    if (this.targetVelocity.x !== 0 || this.targetVelocity.y !== 0) {
      const len = Math.sqrt(
        this.targetVelocity.x ** 2 + this.targetVelocity.y ** 2
      );
      if (len > 0) {
        this.facingDirection = {
          x: this.targetVelocity.x / len,
          y: this.targetVelocity.y / len,
        };
      }
    }

    this.detectStuck(dt);
  }

  // --- Stuck detection for basic obstacle avoidance ---

  private detectStuck(dt: number): void {
    const moveX = this.position.x - this.lastPosition.x;
    const moveY = this.position.y - this.lastPosition.y;
    const moved = Math.sqrt(moveX * moveX + moveY * moveY);
    this.lastPosition = { ...this.position };

    const isTryingToMove =
      Math.abs(this.targetVelocity.x) > 1 || Math.abs(this.targetVelocity.y) > 1;

    if (isTryingToMove && moved < this.STUCK_THRESHOLD * dt) {
      this.stuckTimer += dt;
    } else {
      this.stuckTimer = 0;
      this.stuckAvoidTimer = 0;
    }

    if (this.stuckTimer >= this.STUCK_TIME && this.stuckAvoidTimer <= 0) {
      this.stuckAvoidTimer = this.AVOID_TIME;
      const perpX = -this.targetVelocity.y;
      const perpY = this.targetVelocity.x;
      const pLen = Math.sqrt(perpX * perpX + perpY * perpY);
      if (pLen > 0) {
        const sign = Math.random() > 0.5 ? 1 : -1;
        this.stuckDirection = {
          x: (perpX / pLen) * sign,
          y: (perpY / pLen) * sign,
        };
      } else {
        const angle = Math.random() * Math.PI * 2;
        this.stuckDirection = { x: Math.cos(angle), y: Math.sin(angle) };
      }
    }

    if (this.stuckAvoidTimer > 0) {
      this.stuckAvoidTimer -= dt;
      const avoidSpeed = this.config.speed * 0.5;
      this.targetVelocity.x += this.stuckDirection.x * avoidSpeed;
      this.targetVelocity.y += this.stuckDirection.y * avoidSpeed;
    }
  }

  public isStuck(): boolean {
    return this.stuckAvoidTimer > 0;
  }

  // --- Movement controls called by states ---

  public setMoveTarget(target: { x: number; y: number }, speed: number): void {
    const dx = target.x - this.position.x;
    const dy = target.y - this.position.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 2) {
      if (dist < this.SLOW_RADIUS) {
        const speedFactor = dist / this.SLOW_RADIUS;
        this.targetVelocity.x = (dx / dist) * speed * speedFactor;
        this.targetVelocity.y = (dy / dist) * speed * speedFactor;
      } else {
        this.targetVelocity.x = (dx / dist) * speed;
        this.targetVelocity.y = (dy / dist) * speed;
      }
    } else {
      this.targetVelocity.x = 0;
      this.targetVelocity.y = 0;
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

  public isPlayerInAttackRangeHysteresis(): boolean {
    if (!this.playerRef) return false;
    const dist = this.getDistanceToPlayer();
    return dist <= this.config.attackRange + 8;
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
    return Math.sqrt(dx * dx + dy * dy) < 20;
  }

  public getDistanceToHome(): number {
    const dx = this.position.x - this.homePosition.x;
    const dy = this.position.y - this.homePosition.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  public distanceBetween(a: { x: number; y: number }, b: { x: number; y: number }): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
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
