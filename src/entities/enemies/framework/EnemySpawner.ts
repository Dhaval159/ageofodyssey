import Phaser from "phaser";
import { EnemyRegistry } from "./EnemyRegistry";
import { EnemyManager } from "./EnemyManager";
import { Logger } from "../../../core/Logger";

export interface SpawnPoint {
  x: number;
  y: number;
  entityType: string;
}

export class EnemySpawner {
  private scene: Phaser.Scene;
  private enemyManager: EnemyManager;
  private player: Phaser.GameObjects.GameObject;

  constructor(
    scene: Phaser.Scene,
    enemyManager: EnemyManager,
    player: Phaser.GameObjects.GameObject
  ) {
    this.scene = scene;
    this.enemyManager = enemyManager;
    this.player = player;
  }

  public spawnAt(x: number, y: number, entityType: string): boolean {
    const config = EnemyRegistry.getConfig(entityType);
    if (!config) {
      Logger.getInstance().error(`[EnemySpawner] Unknown entity type: ${entityType}`);
      return false;
    }
    this.enemyManager.createEnemy(this.scene, x, y, config, this.player);
    Logger.getInstance().log(`[EnemySpawner] Spawned ${entityType} at (${x}, ${y})`);
    return true;
  }

  public spawnFromPoints(points: SpawnPoint[]): void {
    for (const point of points) {
      this.spawnAt(point.x, point.y, point.entityType);
    }
  }
}
