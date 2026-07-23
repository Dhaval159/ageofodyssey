import Phaser from "phaser";
import { Logger } from "../core/Logger";
import { WorldObject } from "../entities/world/WorldObject";

export class CollisionManager {
  private static instance: CollisionManager;
  private scene: Phaser.Scene | null = null;
  private objectGroup: Phaser.Physics.Arcade.StaticGroup | null = null;
  private collider: Phaser.Physics.Arcade.Collider | null = null;
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): CollisionManager {
    if (!CollisionManager.instance) {
      CollisionManager.instance = new CollisionManager();
    }
    return CollisionManager.instance;
  }

  public initialize(scene: Phaser.Scene): void {
    if (this.initialized) return;
    this.scene = scene;
    this.objectGroup = scene.physics.add.staticGroup();
    this.initialized = true;
    Logger.getInstance().log("[CollisionManager] Initialized");
  }

  public setPlayer(player: Phaser.GameObjects.GameObject): void {
    if (!this.scene || !this.objectGroup) return;
    this.removeCollider();
    this.collider = this.scene.physics.add.collider(player, this.objectGroup);
  }

  public addObject(obj: WorldObject): void {
    if (!this.objectGroup) return;
    this.objectGroup.add(obj.gameObject);
  }

  public addObjects(objects: WorldObject[]): void {
    for (const obj of objects) {
      this.addObject(obj);
    }
  }

  public removeCollider(): void {
    if (this.collider) {
      this.collider.destroy();
      this.collider = null;
    }
  }

  public getObjectGroup(): Phaser.Physics.Arcade.StaticGroup | null {
    return this.objectGroup;
  }

  public isInitialized(): boolean {
    return this.initialized;
  }

  public destroy(): void {
    this.removeCollider();
    if (this.objectGroup) {
      this.objectGroup.destroy();
      this.objectGroup = null;
    }
    this.scene = null;
    this.initialized = false;
  }
}
