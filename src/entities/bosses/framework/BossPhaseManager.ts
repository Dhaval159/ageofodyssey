import { BossState } from "./BossState";
import { Logger } from "../../../core/Logger";

export class BossPhaseManager<T = any> {
  public owner: T;
  private phases: Map<string, BossState<T>> = new Map();
  private currentPhase: BossState<T> | null = null;

  constructor(owner: T) {
    this.owner = owner;
  }

  public registerPhase(id: string, phase: BossState<T>): void {
    this.phases.set(id, phase);
  }

  public changePhase(id: string): void {
    const nextPhase = this.phases.get(id);
    if (!nextPhase) {
      Logger.getInstance().warn(`BossPhaseManager: Phase "${id}" not found.`);
      return;
    }

    if (this.currentPhase) {
      Logger.getInstance().log(`BossPhaseManager: Exiting phase "${this.currentPhase.id}"`);
      this.currentPhase.exit();
    }

    this.currentPhase = nextPhase;
    Logger.getInstance().log(`BossPhaseManager: Entering phase "${this.currentPhase.id}"`);
    this.currentPhase.enter();
  }

  public getCurrentPhase(): BossState<T> | null {
    return this.currentPhase;
  }

  public update(time: number, delta: number): void {
    if (this.currentPhase) {
      this.currentPhase.update(time, delta);
    }
  }

  public destroy(): void {
    if (this.currentPhase) {
      this.currentPhase.exit();
      this.currentPhase = null;
    }
    this.phases.clear();
  }
}
