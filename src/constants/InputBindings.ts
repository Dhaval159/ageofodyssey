import { InputAction } from "../core/InputAction";

export type InputDeviceType = "keyboard" | "gamepad" | "touch";

export interface IInputBinding {
  action: InputAction;
  device: InputDeviceType;
  code?: string;
  key?: string;
  gamepadIndex?: number;
  gamepadButton?: number;
  touchZoneId?: string;
}

export const DEFAULT_KEYBOARD_BINDINGS: IInputBinding[] = [
  { action: InputAction.MOVE_UP, device: "keyboard", code: "KeyW" },
  { action: InputAction.MOVE_UP, device: "keyboard", code: "ArrowUp" },
  { action: InputAction.MOVE_DOWN, device: "keyboard", code: "KeyS" },
  { action: InputAction.MOVE_DOWN, device: "keyboard", code: "ArrowDown" },
  { action: InputAction.MOVE_LEFT, device: "keyboard", code: "KeyA" },
  { action: InputAction.MOVE_LEFT, device: "keyboard", code: "ArrowLeft" },
  { action: InputAction.MOVE_RIGHT, device: "keyboard", code: "KeyD" },
  { action: InputAction.MOVE_RIGHT, device: "keyboard", code: "ArrowRight" },
  { action: InputAction.ATTACK, device: "keyboard", code: "KeyJ" },
  { action: InputAction.HEAVY_ATTACK, device: "keyboard", code: "KeyK" },
  { action: InputAction.ROLL, device: "keyboard", code: "Space" },
  { action: InputAction.BLOCK, device: "keyboard", code: "KeyL" },
  { action: InputAction.INTERACT, device: "keyboard", code: "KeyE" },
  { action: InputAction.MENU, device: "keyboard", code: "Escape" },
  { action: InputAction.PAUSE, device: "keyboard", code: "Escape" },
  { action: InputAction.CONFIRM, device: "keyboard", code: "Enter" },
  { action: InputAction.CONFIRM, device: "keyboard", code: "Space" },
  { action: InputAction.BACK, device: "keyboard", code: "Escape" },
  { action: InputAction.BACK, device: "keyboard", code: "Backspace" },
];

export const DEFAULT_GAMEPAD_BINDINGS: IInputBinding[] = [
  { action: InputAction.MOVE_UP, device: "gamepad", gamepadIndex: 0, gamepadButton: 12 },
  { action: InputAction.MOVE_DOWN, device: "gamepad", gamepadIndex: 0, gamepadButton: 13 },
  { action: InputAction.MOVE_LEFT, device: "gamepad", gamepadIndex: 0, gamepadButton: 14 },
  { action: InputAction.MOVE_RIGHT, device: "gamepad", gamepadIndex: 0, gamepadButton: 15 },
  { action: InputAction.ATTACK, device: "gamepad", gamepadIndex: 0, gamepadButton: 0 },
  { action: InputAction.HEAVY_ATTACK, device: "gamepad", gamepadIndex: 0, gamepadButton: 1 },
  { action: InputAction.ROLL, device: "gamepad", gamepadIndex: 0, gamepadButton: 0 },
  { action: InputAction.BLOCK, device: "gamepad", gamepadIndex: 0, gamepadButton: 2 },
  { action: InputAction.INTERACT, device: "gamepad", gamepadIndex: 0, gamepadButton: 3 },
  { action: InputAction.MENU, device: "gamepad", gamepadIndex: 0, gamepadButton: 9 },
  { action: InputAction.PAUSE, device: "gamepad", gamepadIndex: 0, gamepadButton: 9 },
  { action: InputAction.CONFIRM, device: "gamepad", gamepadIndex: 0, gamepadButton: 0 },
  { action: InputAction.BACK, device: "gamepad", gamepadIndex: 0, gamepadButton: 1 },
];

export const DEFAULT_TOUCH_BINDINGS: IInputBinding[] = [
  { action: InputAction.MOVE_UP, device: "touch", touchZoneId: "touch-left-up" },
  { action: InputAction.MOVE_DOWN, device: "touch", touchZoneId: "touch-left-down" },
  { action: InputAction.MOVE_LEFT, device: "touch", touchZoneId: "touch-left-left" },
  { action: InputAction.MOVE_RIGHT, device: "touch", touchZoneId: "touch-left-right" },
  { action: InputAction.ATTACK, device: "touch", touchZoneId: "touch-right-attack" },
  { action: InputAction.HEAVY_ATTACK, device: "touch", touchZoneId: "touch-right-heavy" },
  { action: InputAction.ROLL, device: "touch", touchZoneId: "touch-right-roll" },
  { action: InputAction.BLOCK, device: "touch", touchZoneId: "touch-right-block" },
  { action: InputAction.INTERACT, device: "touch", touchZoneId: "touch-right-interact" },
  { action: InputAction.CONFIRM, device: "touch", touchZoneId: "touch-right-confirm" },
  { action: InputAction.BACK, device: "touch", touchZoneId: "touch-right-back" },
  { action: InputAction.MENU, device: "touch", touchZoneId: "touch-menu" },
  { action: InputAction.PAUSE, device: "touch", touchZoneId: "touch-pause" },
];

export type IBindingsProfile = {
  name: string;
  bindings: IInputBinding[];
};

export const DEFAULT_BINDINGS_PROFILE: IBindingsProfile = {
  name: "default",
  bindings: [...DEFAULT_KEYBOARD_BINDINGS, ...DEFAULT_GAMEPAD_BINDINGS, ...DEFAULT_TOUCH_BINDINGS],
};
