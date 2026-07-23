import { GameEvents } from "./GameEvents";

/**
 * Enumeration of all high-level game states.
 * Add future states here before referencing them elsewhere.
 */
export enum GameState {
  BOOTING = "BOOTING",
  LOADING = "LOADING",
  MAIN_MENU = "MAIN_MENU",
  PLAYING = "PLAYING",
  PAUSED = "PAUSED",
  CUTSCENE = "CUTSCENE",
  DIALOGUE = "DIALOGUE",
  GAME_OVER = "GAME_OVER",
  SETTINGS = "SETTINGS",
  CREDITS = "CREDITS",
}

export interface IStateChangePayload {
  oldState: GameState;
  newState: GameState;
}

export interface ITransitionPayload {
  from: string;
  to: string;
}

export class GameStateManager {
  private static instance: GameStateManager;
  private currentState: GameState;
  private listeners: Map<string, Array<(data: unknown) => void>>;

  private constructor() {
    this.currentState = GameState.BOOTING;
    this.listeners = new Map<string, Array<(data: unknown) => void>>();
  }

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  public getState(): GameState {
    return this.currentState;
  }

  public setState(newState: GameState): void {
    if (this.currentState === newState) return;

    const oldState = this.currentState;
    this.currentState = newState;

    const payload: IStateChangePayload = { oldState, newState };
    this.emit(GameEvents.STATE_CHANGED, payload);
  }

  public on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public off(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) return;
    const callbacks = this.listeners.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }

  public emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}
