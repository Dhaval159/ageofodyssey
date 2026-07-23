import Phaser from "phaser";
import { Logger } from "./Logger";
import { InputAction } from "./InputAction";
import { IInputBinding, DEFAULT_BINDINGS_PROFILE } from "../constants/InputBindings";
import { InputState } from "./InputState";

export interface IInputManagerOptions {
  bindingsProfile?: IInputBinding[];
}

/**
 * InputManager is the single entry point for all player input.
 * Scenes and systems must NEVER access Phaser keyboard, mouse, gamepad,
 * or touch APIs directly. All input queries must go through this manager.
 */
export class InputManager {
  private static instance: InputManager;
  private scene: Phaser.Scene | null = null;
  private bindings: IInputBinding[] = [];
  private states: Map<InputAction, InputState>;
  private keyboardKeys: Map<string, Phaser.Input.Keyboard.Key> = new Map();
  private callbacks: Map<InputAction, Set<(active: boolean) => void>>;

  private constructor() {
    this.bindings = [...DEFAULT_BINDINGS_PROFILE.bindings];
    this.states = new Map<InputAction, InputState>();
    this.callbacks = new Map<InputAction, Set<(active: boolean) => void>>();
  }

  public static getInstance(): InputManager {
    if (!InputManager.instance) {
      InputManager.instance = new InputManager();
    }
    return InputManager.instance;
  }

  public initialize(scene: Phaser.Scene, options?: IInputManagerOptions): void {
    this.scene = scene;

    if (options?.bindingsProfile) {
      this.bindings = [...options.bindingsProfile];
    } else {
      this.bindings = [...DEFAULT_BINDINGS_PROFILE.bindings];
    }

    this.setupKeyboardInputs();
    this.setupCallbacks();
    Logger.getInstance().log("InputManager initialized");
  }

  public update(): void {
    if (!this.scene) return;

    for (const [action, state] of this.states) {
      state.resetFrameState();
      const active = this.evaluateAction(action);
      state.setPressed(active);
      state.setHeld(active);
      state.setReleased(false);

      if (active) {
        state.setJustPressed(true);
        this.emitActionCallbacks(action, true);
      }
    }
  }

  public isPressed(action: InputAction): boolean {
    const state = this.states.get(action);
    return state ? state.isPressed() : false;
  }

  public isHeld(action: InputAction): boolean {
    const state = this.states.get(action);
    return state ? state.isHeld() : false;
  }

  public isReleased(action: InputAction): boolean {
    const state = this.states.get(action);
    return state ? state.isReleased() : false;
  }

  public wasJustPressed(action: InputAction): boolean {
    const state = this.states.get(action);
    return state ? state.wasJustPressed() : false;
  }

  public on(action: InputAction, callback: (active: boolean) => void): void {
    if (!this.callbacks.has(action)) {
      this.callbacks.set(action, new Set());
    }
    this.callbacks.get(action)!.add(callback);
  }

  public off(action: InputAction, callback: (active: boolean) => void): void {
    const cbs = this.callbacks.get(action);
    if (cbs) {
      cbs.delete(callback);
    }
  }

  public setBindingsProfile(bindings: IInputBinding[]): void {
    this.bindings = [...bindings];
    this.setupKeyboardInputs();
  }

  public getBindingsProfile(): IInputBinding[] {
    return [...this.bindings];
  }

  public destroy(): void {
    this.keyboardKeys.clear();
    this.callbacks.clear();
    this.states.clear();
    this.scene = null;
  }

  private setupKeyboardInputs(): void {
    this.keyboardKeys.clear();

    const keyboardBindings = this.bindings.filter((b) => b.device === "keyboard" && b.code);
    const seenCodes = new Set<string>();

    for (const binding of keyboardBindings) {
      if (binding.code && !seenCodes.has(binding.code)) {
        seenCodes.add(binding.code);
        if (this.scene?.input?.keyboard) {
          const key = this.scene.input.keyboard.addKey(binding.code);
          this.keyboardKeys.set(binding.code, key);
        }
      }
    }

    for (const action of Object.values(InputAction)) {
      if (!this.states.has(action)) {
        this.states.set(action, new InputState());
      }
    }
  }

  private setupCallbacks(): void {
    for (const action of Object.values(InputAction)) {
      if (!this.states.has(action)) {
        this.states.set(action, new InputState());
      }
    }
  }

  private evaluateAction(action: InputAction): boolean {
    const relevantBindings = this.bindings.filter((b) => b.action === action);
    if (relevantBindings.length === 0) return false;

    for (const binding of relevantBindings) {
      if (binding.device === "keyboard" && binding.code) {
        const key = this.keyboardKeys.get(binding.code);
        if (key && key.isDown) {
          return true;
        }
      }
    }

    return false;
  }

  private emitActionCallbacks(action: InputAction, active: boolean): void {
    const cbs = this.callbacks.get(action);
    if (cbs) {
      cbs.forEach((cb) => {
        try {
          cb(active);
        } catch (error) {
          Logger.getInstance().error(`Input callback error for ${action}:`, error);
        }
      });
    }
  }
}
