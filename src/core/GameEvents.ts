/**
 * Centralized game events emitted through the EventBus or any listener system.
 * Use these constants instead of hardcoded event strings.
 */
export const GameEvents = {
  SCENE_STARTED: "game:scene:started",
  SCENE_ENDED: "game:scene:ended",
  STATE_CHANGED: "game:state:changed",
  TRANSITION_STARTED: "game:transition:started",
  TRANSITION_FINISHED: "game:transition:finished",
} as const;

export type GameEventName = typeof GameEvents[keyof typeof GameEvents];
