import { Logger } from "../../../core/Logger";

export type ArenaEventHandler = (data?: any) => void;

export class ArenaEventController {
  private handlers: Map<string, ArenaEventHandler> = new Map();

  public registerHandler(eventType: string, handler: ArenaEventHandler): void {
    this.handlers.set(eventType, handler);
  }

  public triggerEvent(eventType: string, data?: any): void {
    const handler = this.handlers.get(eventType);
    if (handler) {
      Logger.getInstance().log(`[ArenaEventController] Triggering event: "${eventType}"`);
      try {
        handler(data);
      } catch (e) {
        Logger.getInstance().error(`[ArenaEventController] Error executing handler for event "${eventType}":`, e);
      }
    } else {
      Logger.getInstance().warn(`[ArenaEventController] Unhandled event type: "${eventType}"`);
    }
  }

  public clear(): void {
    this.handlers.clear();
  }
}
