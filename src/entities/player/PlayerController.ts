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
  private facingDirection: { x: number; y: number } = { x: 0, y: 1 }; // Default down

  constructor(config: IPlayerConfig) {
    this.config = config;
    this.stateMachine = new PlayerStateMachine(this);

    // Register all states
    this.stateMachine.registerState(new IdleState());
    this.stateMachine.registerState(new WalkingState());
    this.stateMachine.registerState(new RunningState());
    this.stateMachine.registerState(new RollingState());
    this.stateMachine.registerState(new AttackingState());
    this.stateMachine.registerState(new HeavyAttackingState());
    this.stateMachine.registerState(new BlockingState());
    this.stateMachine.registerState(new HurtState());
    this.stateMachine.registerState(new DeadState());

    // Initial state
    this.stateMachine.transitionTo(PlayerStateId.IDLE);
  }

  public update(dt: number, input: IPlayerInput): void {
    this.currentInput = input;

    // Update state machine transitions
    this.stateMachine.update(dt);

    // Update kinematic calculations
    this.updateMovement(dt);
  }

  private updateMovement(dt: number): void {
    const stateId = this.stateMachine.getCurrentStateId();
    let speed = 0;

    if (stateId === PlayerStateId.WALKING) {
      speed = this.config.walkSpeed;
    } else if (stateId === PlayerStateId.RUNNING) {
      speed = this.config.runSpeed;
    } else if (stateId === PlayerStateId.ROLLING) {
      speed = this.config.runSpeed; // Use running speed for placeholder roll speed
    }

    let targetVx = 0;
    let targetVy = 0;

    const canMove =
      stateId === PlayerStateId.WALKING ||
      stateId === PlayerStateId.RUNNING ||
      stateId === PlayerStateId.ROLLING;

    if (canMove) {
      targetVx = this.currentInput.moveVector.x * speed;
      targetVy = this.currentInput.moveVector.y * speed;

      // Update direction if moving
      if (this.currentInput.moveVector.x !== 0 || this.currentInput.moveVector.y !== 0) {
        this.facingDirection = { ...this.currentInput.moveVector };
      }
    }

    // Apply linear acceleration and deceleration frame-rate independently
    // X Axis
    if (targetVx !== 0) {
      const diff = targetVx - this.velocity.x;
      const step = this.config.acceleration * dt;
      if (Math.abs(diff) <= step) {
        this.velocity.x = targetVx;
      } else {
        this.velocity.x += Math.sign(diff) * step;
      }
    } else {
      const diff = -this.velocity.x;
      const step = this.config.deceleration * dt;
      if (Math.abs(diff) <= step) {
        this.velocity.x = 0;
      } else {
        this.velocity.x += Math.sign(diff) * step;
      }
    }

    // Y Axis
    if (targetVy !== 0) {
      const diff = targetVy - this.velocity.y;
      const step = this.config.acceleration * dt;
      if (Math.abs(diff) <= step) {
        this.velocity.y = targetVy;
      } else {
        this.velocity.y += Math.sign(diff) * step;
      }
    } else {
      const diff = -this.velocity.y;
      const step = this.config.deceleration * dt;
      if (Math.abs(diff) <= step) {
        this.velocity.y = 0;
      } else {
        this.velocity.y += Math.sign(diff) * step;
      }
    }

    // Integrate position (this will be updated from Phaser body coordinates on the next frame)
    this.position.x += this.velocity.x * dt;
    this.position.y += this.velocity.y * dt;
  }

  // Getters/Setters
  public getPosition(): { x: number; y: number } {
    return this.position;
  }

  public setPosition(x: number, y: number): void {
    this.position.x = x;
    this.position.y = y;
  }

  public getVelocity(): { x: number; y: number } {
    return this.velocity;
  }

  public setVelocity(vx: number, vy: number): void {
    this.velocity.x = vx;
    this.velocity.y = vy;
  }

  public getFacingDirection(): { x: number; y: number } {
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
