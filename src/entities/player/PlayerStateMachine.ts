import { PlayerController } from "./PlayerController";
import { Logger } from "../../core/Logger";

export enum PlayerStateId {
  IDLE = "IDLE",
  WALKING = "WALKING",
  RUNNING = "RUNNING",
  ROLLING = "ROLLING",
  ATTACKING = "ATTACKING",
  HEAVY_ATTACKING = "HEAVY_ATTACKING",
  BLOCKING = "BLOCKING",
  HURT = "HURT",
  DEAD = "DEAD",
}

export interface IPlayerState {
  id: PlayerStateId;
  enter(controller: PlayerController): void;
  update(controller: PlayerController, dt: number): void;
  exit(controller: PlayerController): void;
}

export class PlayerStateMachine {
  private states: Map<PlayerStateId, IPlayerState> = new Map();
  private currentState: IPlayerState | null = null;
  private controller: PlayerController;

  constructor(controller: PlayerController) {
    this.controller = controller;
  }

  public registerState(state: IPlayerState): void {
    this.states.set(state.id, state);
  }

  public transitionTo(stateId: PlayerStateId): void {
    const nextState = this.states.get(stateId);
    if (!nextState) {
      Logger.getInstance().warn(`PlayerStateMachine: state ${stateId} is not registered.`);
      return;
    }

    if (this.currentState) {
      this.currentState.exit(this.controller);
    }

    this.currentState = nextState;
    this.currentState.enter(this.controller);
  }

  public update(dt: number): void {
    if (this.currentState) {
      this.currentState.update(this.controller, dt);
    }
  }

  public getCurrentStateId(): PlayerStateId | null {
    return this.currentState ? this.currentState.id : null;
  }
}

function checkActionInputs(controller: PlayerController): PlayerStateId | null {
  const input = controller.getCurrentInput();
  if (input.isRolling) return PlayerStateId.ROLLING;
  if (input.isAttacking) return PlayerStateId.ATTACKING;
  if (input.isHeavyAttacking) return PlayerStateId.HEAVY_ATTACKING;
  if (input.isBlocking) return PlayerStateId.BLOCKING;
  return null;
}

function checkMovementState(controller: PlayerController): PlayerStateId {
  const input = controller.getCurrentInput();
  if (input.moveVector.x === 0 && input.moveVector.y === 0) return PlayerStateId.IDLE;
  return input.isRunning ? PlayerStateId.RUNNING : PlayerStateId.WALKING;
}

export class IdleState implements IPlayerState {
  public id = PlayerStateId.IDLE;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    const moveState = checkMovementState(controller);
    if (moveState !== PlayerStateId.IDLE) {
      controller.getStateMachine().transitionTo(moveState);
      return;
    }
    const action = checkActionInputs(controller);
    if (action) {
      controller.getStateMachine().transitionTo(action);
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class WalkingState implements IPlayerState {
  public id = PlayerStateId.WALKING;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    const moveState = checkMovementState(controller);
    if (moveState !== PlayerStateId.WALKING) {
      controller.getStateMachine().transitionTo(moveState);
      return;
    }
    const action = checkActionInputs(controller);
    if (action) {
      controller.getStateMachine().transitionTo(action);
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class RunningState implements IPlayerState {
  public id = PlayerStateId.RUNNING;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    const moveState = checkMovementState(controller);
    if (moveState !== PlayerStateId.RUNNING) {
      controller.getStateMachine().transitionTo(moveState);
      return;
    }
    const action = checkActionInputs(controller);
    if (action) {
      controller.getStateMachine().transitionTo(action);
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class RollingState implements IPlayerState {
  public id = PlayerStateId.ROLLING;
  private timer: number = 0;
  private readonly DURATION: number = 0.35;

  public enter(_controller: PlayerController): void {
    this.timer = this.DURATION;
  }
  public update(controller: PlayerController, dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      controller.getStateMachine().transitionTo(checkMovementState(controller));
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class AttackingState implements IPlayerState {
  public id = PlayerStateId.ATTACKING;
  private timer: number = 0;
  private totalDuration: number = 0;
  private readonly RECOVERY_MOVE_THRESHOLD: number = 0.65;

  public enter(controller: PlayerController): void {
    this.totalDuration = controller.getConfig().combat.lightAttackDuration;
    this.timer = this.totalDuration;
  }
  public update(controller: PlayerController, dt: number): void {
    this.timer -= dt;
    const progress = 1 - this.timer / this.totalDuration;
    const input = controller.getCurrentInput();

    if (progress >= this.RECOVERY_MOVE_THRESHOLD) {
      if (!input.isAttacking) {
        if (input.moveVector.x !== 0 || input.moveVector.y !== 0) {
          controller.getStateMachine().transitionTo(checkMovementState(controller));
          return;
        }
      }
    }

    if (this.timer <= 0) {
      if (input.isAttacking) {
        controller.getStateMachine().transitionTo(PlayerStateId.ATTACKING);
        return;
      }
      controller.getStateMachine().transitionTo(checkMovementState(controller));
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class HeavyAttackingState implements IPlayerState {
  public id = PlayerStateId.HEAVY_ATTACKING;
  private timer: number = 0;
  private totalDuration: number = 0;
  private readonly RECOVERY_MOVE_THRESHOLD: number = 0.6;

  public enter(controller: PlayerController): void {
    this.totalDuration = controller.getConfig().combat.heavyAttackDuration;
    this.timer = this.totalDuration;
  }
  public update(controller: PlayerController, dt: number): void {
    this.timer -= dt;
    const progress = 1 - this.timer / this.totalDuration;
    const input = controller.getCurrentInput();

    if (progress >= this.RECOVERY_MOVE_THRESHOLD) {
      if (!input.isHeavyAttacking) {
        if (input.moveVector.x !== 0 || input.moveVector.y !== 0) {
          controller.getStateMachine().transitionTo(checkMovementState(controller));
          return;
        }
      }
    }

    if (this.timer <= 0) {
      if (input.isHeavyAttacking) {
        controller.getStateMachine().transitionTo(PlayerStateId.HEAVY_ATTACKING);
        return;
      }
      controller.getStateMachine().transitionTo(checkMovementState(controller));
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class BlockingState implements IPlayerState {
  public id = PlayerStateId.BLOCKING;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    const input = controller.getCurrentInput();
    if (!input.isBlocking) {
      controller.getStateMachine().transitionTo(checkMovementState(controller));
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class HurtState implements IPlayerState {
  public id = PlayerStateId.HURT;
  private timer: number = 0;
  private readonly DURATION: number = 0.3;

  public enter(_controller: PlayerController): void {
    this.timer = this.DURATION;
  }
  public update(controller: PlayerController, dt: number): void {
    this.timer -= dt;
    if (this.timer <= 0) {
      controller.getStateMachine().transitionTo(checkMovementState(controller));
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class DeadState implements IPlayerState {
  public id = PlayerStateId.DEAD;
  public enter(_controller: PlayerController): void {}
  public update(_controller: PlayerController, _dt: number): void {}
  public exit(_controller: PlayerController): void {}
}
