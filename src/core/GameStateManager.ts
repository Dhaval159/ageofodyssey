// GameStateManager for centralized pause/resume and state management
export class GameStateManager {
  private static instance: GameStateManager;
  private isPaused: boolean = false;
  private listeners: Map<string, Array<(data: unknown) => void>> = new Map();

  private constructor() { }

  public static getInstance(): GameStateManager {
    if (!GameStateManager.instance) {
      GameStateManager.instance = new GameStateManager();
    }
    return GameStateManager.instance;
  }

  public togglePause(): void {
    this.isPaused = !this.isPaused;
    this.emit("pauseToggle", this.isPaused);
  }

  public isPausedState(): boolean {
    return this.isPaused;
  }

  public on(event: string, callback: (data: unknown) => void): void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, []);
    }
    this.listeners.get(event)!.push(callback);
  }

  public emit(event: string, data: unknown): void {
    const callbacks = this.listeners.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(data));
    }
  }
}

