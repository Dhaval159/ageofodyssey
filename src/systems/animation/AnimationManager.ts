import Phaser from "phaser";
import { AnimationController } from "./AnimationController";
import { AnimationRegistry } from "./AnimationRegistry";
import { EntityAnimationConfig } from "./AnimationConfig";

export class AnimationManager {
  private static instance: AnimationManager;
  private controllers: Map<string, AnimationController> = new Map();

  private constructor() {}

  public static getInstance(): AnimationManager {
    if (!AnimationManager.instance) {
      AnimationManager.instance = new AnimationManager();
    }
    return AnimationManager.instance;
  }

  public createController(
    scene: Phaser.Scene,
    entityId: string,
    entityType: string,
    x: number,
    y: number
  ): AnimationController | null {
    const config: EntityAnimationConfig | null =
      AnimationRegistry.getConfig(entityType);
    if (!config) return null;

    const controller = new AnimationController(scene, x, y, config);
    this.controllers.set(entityId, controller);
    return controller;
  }

  public getController(entityId: string): AnimationController | undefined {
    return this.controllers.get(entityId);
  }

  public removeController(entityId: string): void {
    const controller = this.controllers.get(entityId);
    if (controller) {
      controller.destroy();
      this.controllers.delete(entityId);
    }
  }

  public destroyAll(): void {
    this.controllers.forEach((controller) => controller.destroy());
    this.controllers.clear();
  }
}
