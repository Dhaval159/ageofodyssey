import { CheckpointSystem } from "../../../systems/save/CheckpointSystem";
import { Logger } from "../../../core/Logger";

export class BossCheckpoint {
  private system: CheckpointSystem;
  private checkpointId: string;
  private onResetCallback: (() => void) | null = null;

  constructor(checkpointId: string) {
    this.system = CheckpointSystem.getInstance();
    this.checkpointId = checkpointId;
  }

  public register(label: string, x: number, y: number): void {
    this.system.registerCheckpoint(this.checkpointId, label, x, y);
    Logger.getInstance().log(`[BossCheckpoint] Registered: ${this.checkpointId} at (${x}, ${y})`);
  }

  public activate(): void {
    this.system.activateCheckpoint(this.checkpointId);
    Logger.getInstance().log(`[BossCheckpoint] Activated: ${this.checkpointId}`);
  }

  public setOnResetCallback(callback: () => void): void {
    this.onResetCallback = callback;
  }

  public triggerReset(): void {
    if (this.onResetCallback) {
      Logger.getInstance().log(`[BossCheckpoint] Triggering reset callback for: ${this.checkpointId}`);
      this.onResetCallback();
    }
  }
}
