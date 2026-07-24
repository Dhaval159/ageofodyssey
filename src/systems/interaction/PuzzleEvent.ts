export enum PuzzleEventType {
  ACTIVATED = "puzzle:activated",
  DEACTIVATED = "puzzle:deactivated",
  TOGGLED = "puzzle:toggled",
  OPENED = "puzzle:opened",
  CLOSED = "puzzle:closed",
  LOCKED = "puzzle:locked",
  UNLOCKED = "puzzle:unlocked",
  LIT = "puzzle:lit",
  EXTINGUISHED = "puzzle:extinguished",
  TRIGGER_ENTER = "puzzle:trigger_enter",
  TRIGGER_STAY = "puzzle:trigger_stay",
  TRIGGER_EXIT = "puzzle:trigger_exit",
  MOVED = "puzzle:moved",
  INSPECTED = "puzzle:inspected",
  COMPLETED = "puzzle:completed",
}

export interface PuzzleEventPayload {
  sourceId: string;
  eventType: PuzzleEventType;
  data?: Record<string, unknown>;
  timestamp: number;
}

type PuzzleEventHandler = (payload: PuzzleEventPayload) => void;

export class PuzzleEventBus {
  private static instance: PuzzleEventBus;
  private handlers: Map<string, PuzzleEventHandler[]> = new Map();
  private wildcardHandlers: PuzzleEventHandler[] = [];

  private constructor() {}

  public static getInstance(): PuzzleEventBus {
    if (!PuzzleEventBus.instance) {
      PuzzleEventBus.instance = new PuzzleEventBus();
    }
    return PuzzleEventBus.instance;
  }

  public on(sourceId: string, eventType: PuzzleEventType, handler: PuzzleEventHandler): void {
    const key = `${sourceId}:${eventType}`;
    if (!this.handlers.has(key)) {
      this.handlers.set(key, []);
    }
    this.handlers.get(key)!.push(handler);
  }

  public off(sourceId: string, eventType: PuzzleEventType, handler: PuzzleEventHandler): void {
    const key = `${sourceId}:${eventType}`;
    const list = this.handlers.get(key);
    if (!list) return;
    const idx = list.indexOf(handler);
    if (idx !== -1) list.splice(idx, 1);
  }

  public emit(sourceId: string, eventType: PuzzleEventType, data?: Record<string, unknown>): void {
    const payload: PuzzleEventPayload = {
      sourceId,
      eventType,
      data,
      timestamp: Date.now(),
    };

    const key = `${sourceId}:${eventType}`;
    const specific = this.handlers.get(key);
    if (specific) {
      for (const h of specific) h(payload);
    }

    for (const h of this.wildcardHandlers) h(payload);
  }

  public onAny(handler: PuzzleEventHandler): void {
    this.wildcardHandlers.push(handler);
  }

  public offAny(handler: PuzzleEventHandler): void {
    const idx = this.wildcardHandlers.indexOf(handler);
    if (idx !== -1) this.wildcardHandlers.splice(idx, 1);
  }

  public clear(): void {
    this.handlers.clear();
    this.wildcardHandlers = [];
  }
}
