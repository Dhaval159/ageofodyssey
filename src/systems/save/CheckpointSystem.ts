import Phaser from "phaser";
import { Logger } from "../../core/Logger";

export interface CheckpointData {
  id: string;
  label: string;
  x: number;
  y: number;
  activated: boolean;
  worldState?: Record<string, unknown>;
}

export interface CheckpointSaveData {
  checkpointId: string;
  playerPosition: { x: number; y: number };
  completedObjectives: string[];
  activatedCheckpoints: string[];
  worldState: Record<string, unknown>;
  timestamp: number;
}

export class CheckpointSystem {
  private static instance: CheckpointSystem;
  private checkpoints: Map<string, CheckpointData> = new Map();
  private activeCheckpoint: CheckpointData | null = null;
  private initialized: boolean = false;
  private persistCallback: ((data: CheckpointSaveData) => void) | null = null;

  private constructor() {}

  public static getInstance(): CheckpointSystem {
    if (!CheckpointSystem.instance) {
      CheckpointSystem.instance = new CheckpointSystem();
    }
    return CheckpointSystem.instance;
  }

  public initialize(_scene: Phaser.Scene): void {
    if (this.initialized) return;
    this.checkpoints.clear();
    this.activeCheckpoint = null;
    this.initialized = true;
    Logger.getInstance().log("[CheckpointSystem] Initialized");
  }

  public registerCheckpoint(id: string, label: string, x: number, y: number): void {
    if (this.checkpoints.has(id)) return;
    this.checkpoints.set(id, {
      id,
      label,
      x,
      y,
      activated: false,
    });
  }

  public activateCheckpoint(id: string): void {
    const cp = this.checkpoints.get(id);
    if (!cp) return;

    cp.activated = true;
    this.activeCheckpoint = cp;

    this.autoSave();

    Logger.getInstance().log(`[CheckpointSystem] Activated: ${id} - ${cp.label}`);
  }

  public getCheckpoint(id: string): CheckpointData | undefined {
    return this.checkpoints.get(id);
  }

  public getActiveCheckpoint(): CheckpointData | null {
    return this.activeCheckpoint;
  }

  public isCheckpointActivated(id: string): boolean {
    return this.checkpoints.get(id)?.activated ?? false;
  }

  public getAllCheckpoints(): CheckpointData[] {
    return Array.from(this.checkpoints.values());
  }

  public getCheckpointCount(): number {
    return this.checkpoints.size;
  }

  public getActivatedCount(): number {
    return Array.from(this.checkpoints.values()).filter((c) => c.activated).length;
  }

  public setPersistCallback(callback: (data: CheckpointSaveData) => void): void {
    this.persistCallback = callback;
  }

  public save(): CheckpointSaveData | null {
    if (!this.activeCheckpoint) return null;

    const data: CheckpointSaveData = {
      checkpointId: this.activeCheckpoint.id,
      playerPosition: { x: this.activeCheckpoint.x, y: this.activeCheckpoint.y },
      completedObjectives: [],
      activatedCheckpoints: Array.from(this.checkpoints.values())
        .filter((c) => c.activated)
        .map((c) => c.id),
      worldState: {},
      timestamp: Date.now(),
    };

    if (this.persistCallback) {
      this.persistCallback(data);
    }

    Logger.getInstance().log("[CheckpointSystem] Save data created");
    return data;
  }

  public load(data: CheckpointSaveData): boolean {
    if (!data) return false;

    const cp = this.checkpoints.get(data.checkpointId);
    if (!cp) return false;

    this.activeCheckpoint = cp;
    this.activeCheckpoint.activated = true;

    Logger.getInstance().log(`[CheckpointSystem] Loaded checkpoint: ${data.checkpointId}`);
    return true;
  }

  private autoSave(): void {
    this.save();
  }

  public destroy(): void {
    this.checkpoints.clear();
    this.activeCheckpoint = null;
    this.persistCallback = null;
    this.initialized = false;
    Logger.getInstance().log("[CheckpointSystem] Destroyed");
  }
}
