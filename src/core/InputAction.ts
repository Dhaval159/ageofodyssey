/**
 * All semantic input actions used across the game.
 * Scenes communicate through these actions, never raw key codes.
 */
export enum InputAction {
  MOVE_UP = "MOVE_UP",
  MOVE_DOWN = "MOVE_DOWN",
  MOVE_LEFT = "MOVE_LEFT",
  MOVE_RIGHT = "MOVE_RIGHT",
  RUN = "RUN",
  ATTACK = "ATTACK",
  HEAVY_ATTACK = "HEAVY_ATTACK",
  ROLL = "ROLL",
  BLOCK = "BLOCK",
  INTERACT = "INTERACT",
  MENU = "MENU",
  PAUSE = "PAUSE",
  CONFIRM = "CONFIRM",
  BACK = "BACK",
}
