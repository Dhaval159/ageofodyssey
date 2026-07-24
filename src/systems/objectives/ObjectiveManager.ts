import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { ObjectiveWidget } from "./ObjectiveWidget";

export interface Objective {
  id: string;
  text: string;
  completed: boolean;
}

export class ObjectiveManager {
  private static instance: ObjectiveManager;
  private widget: ObjectiveWidget | null = null;
  private currentObjective: Objective | null = null;
  private completedObjectives: Objective[] = [];
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): ObjectiveManager {
    if (!ObjectiveManager.instance) {
      ObjectiveManager.instance = new ObjectiveManager();
    }
    return ObjectiveManager.instance;
  }

  public initialize(scene: Phaser.Scene): void {
    if (this.initialized) return;
    this.widget = new ObjectiveWidget(scene);
    this.initialized = true;
    Logger.getInstance().log("[ObjectiveManager] Initialized");
  }

  public setObjective(id: string, text: string): void {
    this.currentObjective = { id, text, completed: false };
    if (this.widget) {
      this.widget.show(text);
    }
    Logger.getInstance().log(`[ObjectiveManager] Objective set: ${id} - ${text}`);
  }

  public completeObjective(id: string): void {
    if (this.currentObjective && this.currentObjective.id === id) {
      this.currentObjective.completed = true;
      this.completedObjectives.push({ ...this.currentObjective });
      this.currentObjective = null;
      if (this.widget) {
        this.widget.hide();
      }
      Logger.getInstance().log(`[ObjectiveManager] Objective completed: ${id}`);
    }
  }

  public getCurrentObjective(): Objective | null {
    return this.currentObjective;
  }

  public hasObjective(id: string): boolean {
    return this.completedObjectives.some((o) => o.id === id);
  }

  public update(delta: number): void {
    if (this.widget) {
      this.widget.update(delta);
    }
  }

  public destroy(): void {
    if (this.widget) {
      this.widget.destroy();
      this.widget = null;
    }
    this.currentObjective = null;
    this.completedObjectives = [];
    this.initialized = false;
    Logger.getInstance().log("[ObjectiveManager] Destroyed");
  }
}
