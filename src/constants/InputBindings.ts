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
  { action: InputAction.MOVE_UP, device: "keyboard", code: "W" },
  { action: InputAction.MOVE_UP, device: "keyboard", code: "UP" },
  { action: InputAction.MOVE_DOWN, device: "keyboard", code: "S" },
  { action: InputAction.MOVE_DOWN, device: "keyboard", code: "DOWN" },
  { action: InputAction.MOVE_LEFT, device: "keyboard", code: "A" },
  { action: InputAction.MOVE_LEFT, device: "keyboard", code: "LEFT" },
  { action: InputAction.MOVE_RIGHT, device: "keyboard", code: "D" },
  { action: InputAction.MOVE_RIGHT, device: "keyboard", code: "RIGHT" },
  { action: InputAction.RUN, device: "keyboard", code: "SHIFT" },
  { action: InputAction.ATTACK, device: "keyboard", code: "J" },
  { action: InputAction.HEAVY_ATTACK, device: "keyboard", code: "K" },
  { action: InputAction.ROLL, device: "keyboard", code: "SPACE" },
  { action: InputAction.BLOCK, device: "keyboard", code: "L" },
  { action: InputAction.INTERACT, device: "keyboard", code: "E" },
  { action: InputAction.MENU, device: "keyboard", code: "ESC" },
  { action: InputAction.PAUSE, device: "keyboard", code: "ESC" },
  { action: InputAction.CONFIRM, device: "keyboard", code: "ENTER" },
  { action: InputAction.CONFIRM, device: "keyboard", code: "SPACE" },
  { action: InputAction.BACK, device: "keyboard", code: "ESC" },
  { action: InputAction.BACK, device: "keyboard", code: "BACKSPACE" },
  { action: InputAction.DEBUG_TOGGLE, device: "keyboard", code: "F3" },
];

export const DEFAULT_GAMEPAD_BINDINGS: IInputBinding[] = [
  { action: InputAction.MOVE_UP, device: "gamepad", gamepadIndex: 0, gamepadButton: 12 },
  { action: InputAction.MOVE_DOWN, device: "gamepad", gamepadIndex: 0, gamepadButton: 13 },
  { action: InputAction.MOVE_LEFT, device: "gamepad", gamepadIndex: 0, gamepadButton: 14 },
  { action: InputAction.MOVE_RIGHT, device: "gamepad", gamepadIndex: 0, gamepadButton: 15 },
  { action: InputAction.RUN, device: "gamepad", gamepadIndex: 0, gamepadButton: 10 },
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
  { action: InputAction.RUN, device: "touch", touchZoneId: "touch-right-run" },
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
