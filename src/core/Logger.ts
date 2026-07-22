/**
 * Logger utility for the game
 */
export class Logger {
  private static instance: Logger;
  private enabled: boolean = true;

  private constructor() {}

  public static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  public log(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.log(`[Odyssey] ${message}`, ...args);
    }
  }

  public warn(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.warn(`[Odyssey][WARN] ${message}`, ...args);
    }
  }

  public error(message: string, ...args: unknown[]): void {
    if (this.enabled) {
      console.error(`[Odyssey][ERROR] ${message}`, ...args);
    }
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }
}