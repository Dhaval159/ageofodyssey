import { CombatController } from "./CombatController";
import { HitboxManager } from "./HitboxManager";
import { DamageSystem } from "./DamageSystem";
import { Logger } from "../../core/Logger";

export class CombatManager {
  private static instance: CombatManager;
  private hitboxManager: HitboxManager = new HitboxManager();
  private damageSystem: DamageSystem = new DamageSystem();
  private controllers: Map<string, CombatController> = new Map();
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): CombatManager {
    if (!CombatManager.instance) {
      CombatManager.instance = new CombatManager();
    }
    return CombatManager.instance;
  }

  public initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    Logger.getInstance().log("CombatManager initialized");
  }

  public registerController(entityId: string, controller: CombatController): void {
    this.controllers.set(entityId, controller);
  }

  public unregisterController(entityId: string): void {
    const controller = this.controllers.get(entityId);
    if (controller) {
      controller.destroy();
      this.controllers.delete(entityId);
    }
  }

  public getController(entityId: string): CombatController | undefined {
    return this.controllers.get(entityId);
  }

  public getHitboxManager(): HitboxManager {
    return this.hitboxManager;
  }

  public getDamageSystem(): DamageSystem {
    return this.damageSystem;
  }

  public update(delta: number): void {
    for (const controller of this.controllers.values()) {
      const entity = (controller as any).__entity;
      if (entity && entity.x !== undefined && entity.y !== undefined) {
        const dir = entity.controller?.getFacingDirection?.() ?? { x: 0, y: 1 };
        controller.update(delta / 1000, { x: entity.x, y: entity.y }, dir);
      }
    }

    this.hitboxManager.update(delta);
  }

  public updateController(
    controller: CombatController,
    delta: number,
    position: { x: number; y: number },
    direction: { x: number; y: number }
  ): void {
    controller.update(delta / 1000, position, direction);
    this.hitboxManager.update(delta);
  }

  public destroy(): void {
    for (const controller of this.controllers.values()) {
      controller.destroy();
    }
    this.controllers.clear();
    this.hitboxManager.clearAll();
    this.initialized = false;
  }
}
