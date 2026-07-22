// Enhanced EventBus with proper event handling
export class EventBus {
  private eventMap: Map<string, ((...args: any[]) => void)[]> = new Map();

  public static SCORE_CHANGED = "scoreChanged";
  public static PLAYER_DEATH = "playerDeath";
  public static PAUSE_TOGGLED = "pauseToggled";

  public emit(event: string, ...args: any[]): void {
    const callbacks = this.eventMap.get(event);
    if (callbacks) {
      callbacks.forEach((cb) => cb(...args));
    }
  }

  public on(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventMap.has(event)) {
      this.eventMap.set(event, []);
    }
    this.eventMap.get(event)!.push(callback);
  }

  public off(event: string, callback: (...args: any[]) => void): void {
    if (!this.eventMap.has(event)) return;
    const callbacks = this.eventMap.get(event)!;
    const index = callbacks.indexOf(callback);
    if (index !== -1) {
      callbacks.splice(index, 1);
    }
  }
}

