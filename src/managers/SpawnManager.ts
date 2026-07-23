import Phaser from "phaser";
import { Logger } from "../core/Logger";
import { WorldObject } from "../entities/world/WorldObject";
import { WorldBounds } from "../world/WorldBounds";
import { CollisionManager } from "./CollisionManager";

export class SpawnManager {
  private scene: Phaser.Scene;
  private collisionManager: CollisionManager;
  private idCounter: number = 0;

  constructor(scene: Phaser.Scene, collisionManager: CollisionManager) {
    this.scene = scene;
    this.collisionManager = collisionManager;
  }

  private generateId(prefix: string): string {
    return `${prefix}_${++this.idCounter}`;
  }

  public createGround(width: number, height: number): void {
    const ground = this.scene.add.graphics();
    ground.fillStyle(0x1a1a2e, 1);
    ground.fillRect(0, 0, width, height);
    ground.lineStyle(1, 0x2e2e4f, 0.5);
    for (let x = 0; x <= width; x += 80) {
      ground.lineBetween(x, 0, x, height);
    }
    for (let y = 0; y <= height; y += 80) {
      ground.lineBetween(0, y, width, y);
    }
    ground.setDepth(-10);
    Logger.getInstance().log("[SpawnManager] Ground created");
  }

  public createBoundary(width: number, height: number): void {
    const boundary = this.scene.add.graphics();
    boundary.lineStyle(6, 0xff5555, 0.4);
    boundary.strokeRect(0, 0, width, height);
    boundary.setDepth(-5);
    Logger.getInstance().log("[SpawnManager] Boundary created");
  }

  public spawnRock(bounds: WorldBounds): WorldObject {
    const size = Phaser.Math.Between(30, 70);
    const x = Phaser.Math.Between(
      bounds.x + size,
      bounds.x + bounds.width - size
    );
    const y = Phaser.Math.Between(
      bounds.y + size,
      bounds.y + bounds.height - size
    );

    const obj = new WorldObject({
      scene: this.scene,
      id: this.generateId("rock"),
      type: "rock",
      x,
      y,
      width: size,
      height: size,
      color: 0x3a3a5c,
      alpha: 1,
      isCollidable: true,
      strokeColor: 0x5a5a8c,
      strokeWidth: 2,
    });
    obj.setDepth(1);
    this.collisionManager.addObject(obj);
    return obj;
  }

  public spawnTree(bounds: WorldBounds): WorldObject {
    const size = Phaser.Math.Between(40, 80);
    const x = Phaser.Math.Between(
      bounds.x + size,
      bounds.x + bounds.width - size
    );
    const y = Phaser.Math.Between(
      bounds.y + size,
      bounds.y + bounds.height - size
    );

    const obj = new WorldObject({
      scene: this.scene,
      id: this.generateId("tree"),
      type: "tree",
      x,
      y,
      width: size,
      height: size,
      color: 0x1b5e20,
      alpha: 1,
      isCollidable: true,
      strokeColor: 0x2e7d32,
      strokeWidth: 3,
    });
    obj.setDepth(1);
    this.collisionManager.addObject(obj);
    return obj;
  }

  public spawnWall(bounds: WorldBounds): WorldObject {
    const width = Phaser.Math.Between(80, 200);
    const height = Phaser.Math.Between(20, 40);
    const x = Phaser.Math.Between(
      bounds.x + width / 2 + 20,
      bounds.x + bounds.width - width / 2 - 20
    );
    const y = Phaser.Math.Between(
      bounds.y + height / 2 + 20,
      bounds.y + bounds.height - height / 2 - 20
    );

    const obj = new WorldObject({
      scene: this.scene,
      id: this.generateId("wall"),
      type: "wall",
      x,
      y,
      width,
      height,
      color: 0x4a4e69,
      alpha: 1,
      isCollidable: true,
      strokeColor: 0x6b7094,
      strokeWidth: 3,
    });
    obj.setDepth(2);
    this.collisionManager.addObject(obj);
    return obj;
  }

  public spawnObstacle(bounds: WorldBounds): WorldObject {
    const size = Phaser.Math.Between(50, 90);
    const x = Phaser.Math.Between(
      bounds.x + size,
      bounds.x + bounds.width - size
    );
    const y = Phaser.Math.Between(
      bounds.y + size,
      bounds.y + bounds.height - size
    );

    const obj = new WorldObject({
      scene: this.scene,
      id: this.generateId("obstacle"),
      type: "obstacle",
      x,
      y,
      width: size,
      height: size,
      color: 0x22223b,
      alpha: 1,
      isCollidable: true,
      strokeColor: 0x4a4e69,
      strokeWidth: 2,
    });
    obj.setDepth(1);
    this.collisionManager.addObject(obj);
    return obj;
  }

  public generateLevelObjects(
    bounds: WorldBounds,
    config: {
      rockCount: number;
      treeCount: number;
      wallCount: number;
      obstacleCount: number;
      playerSpawnX: number;
      playerSpawnY: number;
      spawnBuffer: number;
    }
  ): WorldObject[] {
    const objects: WorldObject[] = [];

    for (let i = 0; i < config.rockCount; i++) {
      objects.push(this.spawnRock(bounds));
    }
    for (let i = 0; i < config.treeCount; i++) {
      objects.push(this.spawnTree(bounds));
    }
    for (let i = 0; i < config.wallCount; i++) {
      objects.push(this.spawnWall(bounds));
    }
    for (let i = 0; i < config.obstacleCount; i++) {
      objects.push(this.spawnObstacle(bounds));
    }

    Logger.getInstance().log(
      `[SpawnManager] Spawned ${objects.length} world objects`
    );
    return objects;
  }
}
