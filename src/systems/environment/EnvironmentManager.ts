import Phaser from "phaser";
import { ENVIRONMENT_CONFIGS, IEnvironmentConfig } from "./EnvironmentConfig";
import { WorldObject } from "../../entities/world/WorldObject";

export class EnvironmentManager {
  private scene: Phaser.Scene;
  private config: IEnvironmentConfig;
  
  public map!: Phaser.Tilemaps.Tilemap;
  public groundLayer!: Phaser.Tilemaps.TilemapLayer;
  public cliffLayer!: Phaser.Tilemaps.TilemapLayer;
  public decorationLayer!: Phaser.Tilemaps.TilemapLayer;
  public foregroundLayer!: Phaser.Tilemaps.TilemapLayer;
  public collisionLayer!: Phaser.Tilemaps.TilemapLayer;
  public shadowLayer!: Phaser.Tilemaps.TilemapLayer;
  public waterLayer!: Phaser.Tilemaps.TilemapLayer;
  public lightingLayer!: Phaser.Tilemaps.TilemapLayer;

  constructor(scene: Phaser.Scene, environmentType: string) {
    this.scene = scene;
    this.config = ENVIRONMENT_CONFIGS[environmentType] || ENVIRONMENT_CONFIGS.forest;
  }

  /**
   * Initializes the tilemap system for the scene with standard layers.
   */
  public initialize(worldWidth: number, worldHeight: number): void {
    const tileW = 64;
    const tileH = 64;
    const cols = Math.ceil(worldWidth / tileW);
    const rows = Math.ceil(worldHeight / tileH);

    // Create a dynamic blank tilemap
    this.map = this.scene.make.tilemap({
      tileWidth: tileW,
      tileHeight: tileH,
      width: cols,
      height: rows,
    });

    // Add the registered tileset image
    const tileset = this.map.addTilesetImage(
      this.config.tilesetKey,
      this.config.tilesetKey,
      tileW,
      tileH,
      0,
      0
    );

    if (!tileset) {
      console.warn(`[EnvironmentManager] Failed to load tileset: ${this.config.tilesetKey}`);
      return;
    }

    // Initialize layers with respective depths
    this.groundLayer = this.map.createBlankLayer("Ground Layer", tileset)!;
    this.groundLayer.setDepth(-10);

    this.cliffLayer = this.map.createBlankLayer("Cliff Layer", tileset)!;
    this.cliffLayer.setDepth(-8);

    this.shadowLayer = this.map.createBlankLayer("Shadow Layer", tileset)!;
    this.shadowLayer.setDepth(-7);

    this.waterLayer = this.map.createBlankLayer("Future Water Layer", tileset)!;
    this.waterLayer.setDepth(-6);

    this.collisionLayer = this.map.createBlankLayer("Collision Layer", tileset)!;
    this.collisionLayer.setDepth(-5);

    this.decorationLayer = this.map.createBlankLayer("Decoration Layer", tileset)!;
    this.decorationLayer.setDepth(1);

    this.foregroundLayer = this.map.createBlankLayer("Foreground Layer", tileset)!;
    this.foregroundLayer.setDepth(10);

    this.lightingLayer = this.map.createBlankLayer("Future Lighting Layer", tileset)!;
    this.lightingLayer.setDepth(12);

    // Fill the ground layer with the default ground tile
    this.fillGround(this.config.groundTileIndex);
  }

  /**
   * Fills the ground layer with a specific tile.
   */
  public fillGround(tileIndex: number): void {
    if (!this.groundLayer) return;
    for (let ty = 0; ty < this.map.height; ty++) {
      for (let tx = 0; tx < this.map.width; tx++) {
        this.groundLayer.putTileAt(tileIndex, tx, ty);
      }
    }
  }

  /**
   * Fills a specific rectangular region with a ground tile.
   */
  public fillGroundRegion(x: number, y: number, width: number, height: number, tileIndex: number): void {
    if (!this.groundLayer) return;
    const startX = Math.floor(x / 64);
    const startY = Math.floor(y / 64);
    const endX = Math.ceil((x + width) / 64);
    const endY = Math.ceil((y + height) / 64);

    for (let ty = startY; ty < endY; ty++) {
      for (let tx = startX; tx < endX; tx++) {
        if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
          this.groundLayer.putTileAt(tileIndex, tx, ty);
        }
      }
    }
  }

  /**
   * Automatically renders cliff tiles over a rectangular collider.
   */
  public drawCliff(x: number, y: number, width: number, height: number): void {
    if (!this.cliffLayer) return;
    const startX = Math.floor(x / 64);
    const startY = Math.floor(y / 64);
    const numTilesX = Math.max(1, Math.round(width / 64));
    const numTilesY = Math.max(1, Math.round(height / 64));
    const mapping = this.config.cliffMapping;

    for (let dy = 0; dy < numTilesY; dy++) {
      const ty = startY + dy;
      if (ty < 0 || ty >= this.map.height) continue;

      for (let dx = 0; dx < numTilesX; dx++) {
        const tx = startX + dx;
        if (tx < 0 || tx >= this.map.width) continue;

        let tileId = -1;
        if (dy === 0) {
          // Top layer of cliff
          if (dx === 0 && numTilesX > 1) {
            tileId = mapping.topLeft;
          } else if (dx === numTilesX - 1 && numTilesX > 1) {
            tileId = mapping.topRight;
          } else {
            tileId = mapping.topCenter;
          }
        } else {
          // Cliff face walls
          if (dx === 0 && numTilesX > 1) {
            tileId = mapping.wallLeft;
          } else if (dx === numTilesX - 1 && numTilesX > 1) {
            tileId = mapping.wallRight;
          } else {
            tileId = mapping.wallCenter;
          }
        }

        if (tileId !== -1) {
          this.cliffLayer.putTileAt(tileId, tx, ty);
        }
      }
    }
  }

  /**
   * Draws a dirt path along a set of waypoints.
   */
  public drawPath(points: { x: number; y: number }[], thickness: number = 64): void {
    if (!this.groundLayer || points.length < 2) return;

    // Draw path tiles by sampling points along line segments
    const pathTile = this.config.pathTileIndex;
    
    for (let i = 0; i < points.length - 1; i++) {
      const p1 = points[i];
      const p2 = points[i + 1];
      const dist = Phaser.Math.Distance.Between(p1.x, p1.y, p2.x, p2.y);
      const steps = Math.ceil(dist / 16); // sample every 16px

      for (let step = 0; step <= steps; step++) {
        const t = step / steps;
        const px = Phaser.Math.Linear(p1.x, p2.x, t);
        const py = Phaser.Math.Linear(p1.y, p2.y, t);

        const tx = Math.floor(px / 64);
        const ty = Math.floor(py / 64);

        if (tx >= 0 && tx < this.map.width && ty >= 0 && ty < this.map.height) {
          this.groundLayer.putTileAt(pathTile, tx, ty);
          
          // Draw thickness padding
          if (thickness > 64) {
            const rad = Math.ceil(thickness / 128);
            for (let dy = -rad; dy <= rad; dy++) {
              for (let dx = -rad; dx <= rad; dx++) {
                const nx = tx + dx;
                const ny = ty + dy;
                if (nx >= 0 && nx < this.map.width && ny >= 0 && ny < this.map.height) {
                  this.groundLayer.putTileAt(pathTile, nx, ny);
                }
              }
            }
          }
        }
      }
    }
  }

  /**
   * Integrates dynamically spawned WorldObjects: hides their flat shapes
   * and draws corresponding high-quality tiles on the map layer.
   */
  public decorateWorldObjects(objects: WorldObject[]): void {
    if (!this.decorationLayer) return;

    for (const obj of objects) {
      // Hide the default color rectangle
      obj.gameObject.setAlpha(0);

      const tx = Math.floor(obj.x / 64);
      const ty = Math.floor(obj.y / 64);

      if (tx < 0 || tx >= this.map.width || ty < 0 || ty >= this.map.height) continue;

      if (obj.type === "rock") {
        // Draw rock tiles (pebbles/stones)
        const rockTiles = this.config.key === "cave" ? [118, 119] : [104, 105, 121, 135];
        const tileId = rockTiles[Phaser.Math.Between(0, rockTiles.length - 1)];
        this.decorationLayer.putTileAt(tileId, tx, ty);
      } else if (obj.type === "tree") {
        // Draw tree stump/root tiles
        const treeTiles = [123, 137]; // stump/roots
        const tileId = treeTiles[Phaser.Math.Between(0, treeTiles.length - 1)];
        this.decorationLayer.putTileAt(tileId, tx, ty);
      } else if (obj.type === "obstacle") {
        // Draw debris/stick tiles
        const obstacleTiles = [122, 136]; // sticks
        const tileId = obstacleTiles[Phaser.Math.Between(0, obstacleTiles.length - 1)];
        this.decorationLayer.putTileAt(tileId, tx, ty);
      } else if (obj.type === "wall") {
        // Draw a cliff wall matching the dimensions
        const leftX = obj.x - obj.width / 2;
        const topY = obj.y - obj.height / 2;
        this.drawCliff(leftX, topY, obj.width, obj.height);
      }
    }
  }

  /**
   * Scatters environmental decorations naturally in empty spaces.
   */
  public scatterDecorations(density: number = 0.05, playerSpawnX?: number, playerSpawnY?: number): void {
    if (!this.decorationLayer || this.config.decorations.length === 0) return;

    const bufferTiles = 3;
    const playerTileX = playerSpawnX ? Math.floor(playerSpawnX / 64) : -10;
    const playerTileY = playerSpawnY ? Math.floor(playerSpawnY / 64) : -10;

    for (let ty = 0; ty < this.map.height; ty++) {
      for (let tx = 0; tx < this.map.width; tx++) {
        // Skip player spawn buffer zone to keep paths clear
        if (playerTileX >= 0 && playerTileY >= 0) {
          const dist = Phaser.Math.Distance.Between(tx, ty, playerTileX, playerTileY);
          if (dist < bufferTiles) continue;
        }

        // Avoid placing on top of existing cliff/wall structures
        const cliffTile = this.cliffLayer.getTileAt(tx, ty);
        if (cliffTile) continue;

        // Scatter based on density probability
        if (Math.random() < density) {
          const decorations = this.config.decorations;
          const tileId = decorations[Phaser.Math.Between(0, decorations.length - 1)];
          this.decorationLayer.putTileAt(tileId, tx, ty);
        }
      }
    }
  }
}
