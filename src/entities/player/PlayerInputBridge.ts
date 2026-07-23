import { InputManager } from "../../core/InputManager";
import { InputAction } from "../../core/InputAction";

export interface IPlayerInput {
  moveVector: { x: number; y: number };
  isRunning: boolean;
  isRolling: boolean;
  isAttacking: boolean;
  isHeavyAttacking: boolean;
  isBlocking: boolean;
}

export class PlayerInputBridge {
  private inputManager: InputManager;

  constructor() {
    this.inputManager = InputManager.getInstance();
  }

  public getInput(): IPlayerInput {
    let x = 0;
    let y = 0;

    if (this.inputManager.isHeld(InputAction.MOVE_LEFT)) x -= 1;
    if (this.inputManager.isHeld(InputAction.MOVE_RIGHT)) x += 1;
    if (this.inputManager.isHeld(InputAction.MOVE_UP)) y -= 1;
    if (this.inputManager.isHeld(InputAction.MOVE_DOWN)) y += 1;

    // Normalize input vector so diagonal movement isn't faster
    const length = Math.sqrt(x * x + y * y);
    if (length > 0) {
      x /= length;
      y /= length;
    }

    return {
      moveVector: { x, y },
      isRunning: this.inputManager.isHeld(InputAction.RUN),
      isRolling: this.inputManager.isPressed(InputAction.ROLL),
      isAttacking: this.inputManager.isPressed(InputAction.ATTACK),
      isHeavyAttacking: this.inputManager.isPressed(InputAction.HEAVY_ATTACK),
      isBlocking: this.inputManager.isHeld(InputAction.BLOCK),
    };
  }
}
