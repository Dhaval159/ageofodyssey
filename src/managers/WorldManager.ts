import Phaser from "phaser";
import { Logger } from "../core/Logger";
import { CollisionManager } from "./CollisionManager";
import { SpawnManager } from "./SpawnManager";
import { WorldBounds } from "../world/WorldBounds";
import { DEFAULT_LEVEL_CONFIG } from "../data/LevelConfig";
import { WORLD_CONSTANTS } from "../constants/WorldConstants";
import { Player } from "../entities/player/Player";

export class WorldManager {
  private static instance: WorldManager;
  private scene: Phaser.Scene;
  private collisionManager: CollisionManager;
  private spawnManager: SpawnManager;
  private worldBounds: WorldBounds;
  private levelConfig: typeof DEFAULT_LEVEL_CONFIG;

  private _player: Player | null = null;

  private constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.collisionManager = CollisionManager.getInstance();
    this.spawnManager = new SpawnManager(scene, this.collisionManager);
    const wb = DEFAULT_LEVEL_CONFIG.worldBounds;
    this.worldBounds = new WorldBounds({
      x: wb.x,
      y: wb.y,
      width: wb.width,
      height: wb.height,
    });
    this.levelConfig = DEFAULT_LEVEL_CONFIG;
  }

  public static initialize(scene: Phaser.Scene): WorldManager {
    const manager = new WorldManager(scene);
    manager.setupWorld();
    return manager;
  }

  public static getInstance(): WorldManager {
    return WorldManager.instance;
  }

  private setupWorld(): void {
    const { width, height } = this.levelConfig.worldBounds;
    this.collisionManager.initialize(this.scene);
    this.spawnManager.createGround(width, height);
    this.spawnManager.createBoundary(width, height);

    this.spawnManager.generateLevelObjects(this.worldBounds, {
      rockCount: WORLD_CONSTANTS.OBJECTS.ROCK_COUNT,
      treeCount: WORLD_CONSTANTS.OBJECTS.TREE_COUNT,
      wallCount: WORLD_CONSTANTS.OBJECTS.WALL_COUNT,
      obstacleCount: WORLD_CONSTANTS.OBJECTS.OBSTACLE_COUNT,
      playerSpawnX: width / 2,
      playerSpawnY: height / 2,
      spawnBuffer: WORLD_CONSTANTS.OBJECTS.PLAYER_SPAWN_BUFFER,
    });

    Logger.getInstance().log("[WorldManager] World setup complete");
  }

  public setPlayer(player: Player): void {
    this._player = player;
    this.collisionManager.setPlayer(player);
    Logger.getInstance().log("[WorldManager] Player registered with collision system");
  }

  public getPlayer(): Player | null {
    return this._player;
  }

  public getWorldBounds(): WorldBounds {
    return this.worldBounds;
  }

  public getCollisionManager(): CollisionManager {
    return this.collisionManager;
  }

  public getSpawnManager(): SpawnManager {
    return this.spawnManager;
  }

  public getLevelConfig(): typeof DEFAULT_LEVEL_CONFIG {
    return this.levelConfig;
  }

  public destroy(): void {
    this.collisionManager.destroy();
    Logger.getInstance().log("[WorldManager] Destroyed");
  }
}
