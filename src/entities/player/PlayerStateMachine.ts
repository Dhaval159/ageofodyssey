import { PlayerController } from "./PlayerController";

export enum PlayerStateId {
  IDLE = "IDLE",
  WALKING = "WALKING",
  RUNNING = "RUNNING",
  ROLLING = "ROLLING",
  ATTACKING = "ATTACKING",
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
      console.warn(`State ${stateId} is not registered.`);
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

// State Implementations

export class IdleState implements IPlayerState {
  public id = PlayerStateId.IDLE;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    const input = controller.getCurrentInput();
    if (input.moveVector.x !== 0 || input.moveVector.y !== 0) {
      if (input.isRunning) {
        controller.getStateMachine().transitionTo(PlayerStateId.RUNNING);
      } else {
        controller.getStateMachine().transitionTo(PlayerStateId.WALKING);
      }
      return;
    }

    // Check action states (placeholders)
    if (input.isRolling) {
      controller.getStateMachine().transitionTo(PlayerStateId.ROLLING);
      return;
    }
    if (input.isAttacking) {
      controller.getStateMachine().transitionTo(PlayerStateId.ATTACKING);
      return;
    }
    if (input.isBlocking) {
      controller.getStateMachine().transitionTo(PlayerStateId.BLOCKING);
      return;
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class WalkingState implements IPlayerState {
  public id = PlayerStateId.WALKING;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    const input = controller.getCurrentInput();
    if (input.moveVector.x === 0 && input.moveVector.y === 0) {
      controller.getStateMachine().transitionTo(PlayerStateId.IDLE);
      return;
    }
    if (input.isRunning) {
      controller.getStateMachine().transitionTo(PlayerStateId.RUNNING);
      return;
    }

    // Check action states (placeholders)
    if (input.isRolling) {
      controller.getStateMachine().transitionTo(PlayerStateId.ROLLING);
      return;
    }
    if (input.isAttacking) {
      controller.getStateMachine().transitionTo(PlayerStateId.ATTACKING);
      return;
    }
    if (input.isBlocking) {
      controller.getStateMachine().transitionTo(PlayerStateId.BLOCKING);
      return;
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class RunningState implements IPlayerState {
  public id = PlayerStateId.RUNNING;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    const input = controller.getCurrentInput();
    if (input.moveVector.x === 0 && input.moveVector.y === 0) {
      controller.getStateMachine().transitionTo(PlayerStateId.IDLE);
      return;
    }
    if (!input.isRunning) {
      controller.getStateMachine().transitionTo(PlayerStateId.WALKING);
      return;
    }

    // Check action states (placeholders)
    if (input.isRolling) {
      controller.getStateMachine().transitionTo(PlayerStateId.ROLLING);
      return;
    }
    if (input.isAttacking) {
      controller.getStateMachine().transitionTo(PlayerStateId.ATTACKING);
      return;
    }
    if (input.isBlocking) {
      controller.getStateMachine().transitionTo(PlayerStateId.BLOCKING);
      return;
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class RollingState implements IPlayerState {
  public id = PlayerStateId.ROLLING;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    // Placeholder transitions back to Idle
    controller.getStateMachine().transitionTo(PlayerStateId.IDLE);
  }
  public exit(_controller: PlayerController): void {}
}

export class AttackingState implements IPlayerState {
  public id = PlayerStateId.ATTACKING;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    // Placeholder transitions back to Idle
    controller.getStateMachine().transitionTo(PlayerStateId.IDLE);
  }
  public exit(_controller: PlayerController): void {}
}

export class BlockingState implements IPlayerState {
  public id = PlayerStateId.BLOCKING;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    const input = controller.getCurrentInput();
    if (!input.isBlocking) {
      controller.getStateMachine().transitionTo(PlayerStateId.IDLE);
    }
  }
  public exit(_controller: PlayerController): void {}
}

export class HurtState implements IPlayerState {
  public id = PlayerStateId.HURT;
  public enter(_controller: PlayerController): void {}
  public update(controller: PlayerController, _dt: number): void {
    // Placeholder transitions back to Idle
    controller.getStateMachine().transitionTo(PlayerStateId.IDLE);
  }
  public exit(_controller: PlayerController): void {}
}

export class DeadState implements IPlayerState {
  public id = PlayerStateId.DEAD;
  public enter(_controller: PlayerController): void {}
  public update(_controller: PlayerController, _dt: number): void {}
  public exit(_controller: PlayerController): void {}
}
