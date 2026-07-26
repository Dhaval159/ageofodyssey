import Phaser from "phaser";
import { IPlayerConfig } from "./PlayerConfig";
import { IPlayerInput } from "./PlayerInputBridge";
import {
  PlayerStateMachine,
  PlayerStateId,
  IdleState,
  WalkingState,
  RunningState,
  RollingState,
  AttackingState,
  HeavyAttackingState,
  BlockingState,
  HurtState,
  DeadState,
} from "./PlayerStateMachine";

const STATE_SPEEDS: Partial<Record<PlayerStateId, number>> = {};
const CAN_MOVE_STATES = new Set([
  PlayerStateId.WALKING,
  PlayerStateId.RUNNING,
  PlayerStateId.ROLLING,
  PlayerStateId.ATTACKING,
  PlayerStateId.HEAVY_ATTACKING,
]);

const INPUT_BUFFER_MS = 0.15;

interface BufferedInput {
  type: "attack" | "heavy_attack" | "roll";
  remaining: number;
}

export class PlayerController {
  private config: IPlayerConfig;
  private stateMachine: PlayerStateMachine;
  private currentInput: IPlayerInput = {
    moveVector: { x: 0, y: 0 },
    isRunning: false,
    isRolling: false,
    isAttacking: false,
    isHeavyAttacking: false,
    isBlocking: false,
  };

  private position: { x: number; y: number } = { x: 0, y: 0 };
  private velocity: { x: number; y: number } = { x: 0, y: 0 };
  private facingDirection: { x: number; y: number } = { x: 0, y: 1 };

  private worldBounds: { minX: number; minY: number; maxX: number; maxY: number } | null = null;

  private inputBuffer: BufferedInput | null = null;

  constructor(config: IPlayerConfig) {
    this.config = config;

    STATE_SPEEDS[PlayerStateId.WALKING] = config.walkSpeed;
    STATE_SPEEDS[PlayerStateId.RUNNING] = config.runSpeed;
    STATE_SPEEDS[PlayerStateId.ROLLING] = config.rollSpeed;
    STATE_SPEEDS[PlayerStateId.ATTACKING] = config.attackMoveSpeed;
    STATE_SPEEDS[PlayerStateId.HEAVY_ATTACKING] = config.heavyAttackMoveSpeed;

    this.stateMachine = new PlayerStateMachine(this);
    this.stateMachine.registerState(new IdleState());
    this.stateMachine.registerState(new WalkingState());
    this.stateMachine.registerState(new RunningState());
    this.stateMachine.registerState(new RollingState());
    this.stateMachine.registerState(new AttackingState());
    this.stateMachine.registerState(new HeavyAttackingState());
    this.stateMachine.registerState(new BlockingState());
    this.stateMachine.registerState(new HurtState());
    this.stateMachine.registerState(new DeadState());
    this.stateMachine.transitionTo(PlayerStateId.IDLE);
  }

  public setWorldBounds(minX: number, minY: number, maxX: number, maxY: number): void {
    this.worldBounds = { minX, minY, maxX, maxY };
  }

  public update(dt: number, input: IPlayerInput): void {
    this.currentInput = input;

    if (input.isAttacking) this.bufferInput("attack");
    if (input.isHeavyAttacking) this.bufferInput("heavy_attack");
    if (input.isRolling) this.bufferInput("roll");
    this.tickInputBuffer(dt);

    this.stateMachine.update(dt);
    this.updateMovement(dt);
  }

  public consumeBufferedAttack(): boolean {
    if (!this.inputBuffer) return false;
    if (this.inputBuffer.type === "attack" || this.inputBuffer.type === "heavy_attack") {
      this.inputBuffer = null;
      return true;
    }
    return false;
  }

  public consumeBufferedRoll(): boolean {
    if (this.inputBuffer && this.inputBuffer.type === "roll") {
      this.inputBuffer = null;
      return true;
    }
    return false;
  }

  public hasBufferedInput(): boolean {
    return this.inputBuffer !== null;
  }

  private bufferInput(type: BufferedInput["type"]): void {
    this.inputBuffer = { type, remaining: INPUT_BUFFER_MS };
  }

  private tickInputBuffer(dt: number): void {
    if (!this.inputBuffer) return;
    this.inputBuffer.remaining -= dt;
    if (this.inputBuffer.remaining <= 0) {
      this.inputBuffer = null;
    }
  }

  private updateMovement(dt: number): void {
    const stateId = this.stateMachine.getCurrentStateId();
    const speed = STATE_SPEEDS[stateId as PlayerStateId] ?? 0;

    let targetVx = 0;
    let targetVy = 0;

    if (CAN_MOVE_STATES.has(stateId!)) {
      targetVx = this.currentInput.moveVector.x * speed;
      targetVy = this.currentInput.moveVector.y * speed;

      if (this.currentInput.moveVector.x !== 0 || this.currentInput.moveVector.y !== 0) {
        this.facingDirection = {
          x: this.currentInput.moveVector.x,
          y: this.currentInput.moveVector.y,
        };
      }
    }

    this.applyAxisAcceleration(
      this.velocity,
      "x",
      targetVx,
      this.config.acceleration,
      this.config.deceleration,
      dt
    );
    this.applyAxisAcceleration(
      this.velocity,
      "y",
      targetVy,
      this.config.acceleration,
      this.config.deceleration,
      dt
    );

    const maxSpeed = this.config.maxVelocity > 0 ? this.config.maxVelocity : speed * 1.5;
    const velLen = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2);
    if (velLen > maxSpeed) {
      this.velocity.x = (this.velocity.x / velLen) * maxSpeed;
      this.velocity.y = (this.velocity.y / velLen) * maxSpeed;
    }

    const zeroThreshold = 1.5;
    if (Math.abs(this.velocity.x) < zeroThreshold) this.velocity.x = 0;
    if (Math.abs(this.velocity.y) < zeroThreshold) this.velocity.y = 0;

    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;

    if (this.worldBounds) {
      this.position.x = Phaser.Math.Clamp(
        this.position.x,
        this.worldBounds.minX,
        this.worldBounds.maxX
      );
      this.position.y = Phaser.Math.Clamp(
        this.position.y,
        this.worldBounds.minY,
        this.worldBounds.maxY
      );
    }
  }

  private applyAxisAcceleration(
    vel: { x: number; y: number },
    axis: "x" | "y",
    target: number,
    accel: number,
    decel: number,
    dt: number
  ): void {
    if (target !== 0) {
      const diff = target - vel[axis];
      const step = accel * dt;
      if (Math.abs(diff) <= step) {
        vel[axis] = target;
      } else {
        vel[axis] += Math.sign(diff) * step;
      }
    } else {
      const diff = -vel[axis];
      const step = decel * dt;
      if (Math.abs(diff) <= step) {
        vel[axis] = 0;
      } else {
        vel[axis] += Math.sign(diff) * step;
      }
    }
  }

  public getPosition(): Readonly<{ x: number; y: number }> {
    return this.position;
  }

  public setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  public getVelocity(): Readonly<{ x: number; y: number }> {
    return this.velocity;
  }

  public setVelocity(vx: number, vy: number): void {
    this.velocity.x = vx;
    this.velocity.y = vy;
  }

  public getFacingDirection(): Readonly<{ x: number; y: number }> {
    return this.facingDirection;
  }

  public getStateMachine(): PlayerStateMachine {
    return this.stateMachine;
  }

  public getCurrentInput(): IPlayerInput {
    return this.currentInput;
  }

  public getConfig(): IPlayerConfig {
    return this.config;
  }
}
