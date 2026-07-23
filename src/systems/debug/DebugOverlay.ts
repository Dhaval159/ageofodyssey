import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { InputManager } from "../../core/InputManager";
import { InputAction } from "../../core/InputAction";
import { CameraManager } from "../camera/CameraManager";
import { CombatManager } from "../combat/CombatManager";
import { HitboxShape } from "../../data/AttackData";
import { EnemyManager } from "../../entities/enemies/framework/EnemyManager";

export class DebugOverlay {
  private container: Phaser.GameObjects.Container;
  private fpsText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private collisionGraphics: Phaser.GameObjects.Graphics;
  private deadzoneGraphics: Phaser.GameObjects.Graphics;
  private hitboxGraphics: Phaser.GameObjects.Graphics;
  private enemyDebugGraphics: Phaser.GameObjects.Graphics;
  private enabled: boolean = false;
  private cameraManager: CameraManager | null = null;
  private player: Phaser.GameObjects.GameObject | null = null;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsAccumulator: number = 0;
  private fpsUpdateInterval: number = 500;
  private lastFpsUpdate: number = 0;

  private readonly COLLISION_STROKE: number;
  private readonly DEADZONE_STROKE: number;

  public constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(9999);

    this.fpsText = scene.add.text(8, 8, "", {
      fontSize: "14px",
      color: "#00ff00",
      backgroundColor: "#00000088",
      padding: { x: 4, y: 2 },
    });
    this.container.add(this.fpsText);

    this.infoText = scene.add.text(8, 28, "", {
      fontSize: "14px",
      color: "#00ff00",
      backgroundColor: "#00000088",
      padding: { x: 4, y: 2 },
    });
    this.container.add(this.infoText);

    this.collisionGraphics = scene.add.graphics();
    this.collisionGraphics.setScrollFactor(1);
    this.collisionGraphics.setDepth(9998);

    this.deadzoneGraphics = scene.add.graphics();
    this.deadzoneGraphics.setScrollFactor(0);
    this.deadzoneGraphics.setDepth(9997);

    this.hitboxGraphics = scene.add.graphics();
    this.hitboxGraphics.setScrollFactor(1);
    this.hitboxGraphics.setDepth(9998);

    this.enemyDebugGraphics = scene.add.graphics();
    this.enemyDebugGraphics.setScrollFactor(1);
    this.enemyDebugGraphics.setDepth(9996);

    this.container.setVisible(false);
    this.collisionGraphics.setVisible(false);
    this.deadzoneGraphics.setVisible(false);
    this.hitboxGraphics.setVisible(false);
    this.enemyDebugGraphics.setVisible(false);

    this.COLLISION_STROKE = 0xff00ff;
    this.DEADZONE_STROKE = 0x00ffff;

    this.bindInput();
    Logger.getInstance().log("[DebugOverlay] Initialized (F3 to toggle)");
  }

  public setCameraManager(cameraManager: CameraManager): void {
    this.cameraManager = cameraManager;
  }

  public setPlayer(player: Phaser.GameObjects.GameObject): void {
    this.player = player;
  }

  private bindInput(): void {
    const inputManager = InputManager.getInstance();
    inputManager.on(InputAction.DEBUG_TOGGLE, (active: boolean) => {
      if (active) {
        this.toggle();
      }
    });
  }

  public toggle(): void {
    this.enabled = !this.enabled;
    this.container.setVisible(this.enabled);
    this.collisionGraphics.setVisible(this.enabled);
    this.deadzoneGraphics.setVisible(this.enabled);
    this.hitboxGraphics.setVisible(this.enabled);
    this.enemyDebugGraphics.setVisible(this.enabled);
    Logger.getInstance().log(
      `[DebugOverlay] Toggled ${this.enabled ? "ON" : "OFF"}`
    );
  }

  public update(time: number, delta: number): void {
    if (!this.enabled) return;

    this.frameCount++;
    this.fpsAccumulator += delta;

    if (time - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      const elapsed = time - this.lastFpsUpdate;
      this.fps = Math.round((this.frameCount / elapsed) * 1000);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
      this.lastFpsUpdate = time;
    }

    this.renderFpsText();
    this.renderInfoText();
    this.renderCollisionBoxes();
    this.renderDeadzone();
    this.renderHitboxes();
    this.renderEnemyDebug();
  }

  private renderFpsText(): void {
    this.fpsText.setText(`FPS: ${this.fps}`);
  }

  private renderInfoText(): void {
    let info = `Player: `;
    if (this.player) {
      const pos = this.player as Phaser.GameObjects.GameObject & {
        x: number;
        y: number;
      };
      info += `(${pos.x.toFixed(1)}, ${pos.y.toFixed(1)})`;
    } else {
      info += "N/A";
    }

    const enemies = EnemyManager.getInstance().getAllEnemies();
    info += `\nEnemies: ${enemies.length}`;
    for (const enemy of enemies) {
      const state = enemy.controller.ai.getCurrentStateId() ?? "?";
      const hp = enemy.controller.health.getCurrentHealth();
      info += `\n  ${enemy.getEntityId().slice(0, 20)}: ${state} HP:${hp}`;
    }

    if (this.cameraManager && this.cameraManager.isActive()) {
      const view = this.cameraManager.getCameraView();
      const dz = this.cameraManager.getDeadzone();
      const zoom = this.cameraManager.getZoom();
      info += `\nCamera: (${view.x.toFixed(1)}, ${view.y.toFixed(1)}) | Zoom: ${zoom.toFixed(2)}`;
      info += `\nDeadzone: ${dz.width}x${dz.height}`;
    }

    this.infoText.setText(info);
  }

  private renderCollisionBoxes(): void {
    this.collisionGraphics.clear();

    if (!this.player) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    this.collisionGraphics.lineStyle(1, this.COLLISION_STROKE, 0.8);
    this.collisionGraphics.strokeRect(
      body.x,
      body.y,
      body.width,
      body.height
    );
  }

  private renderDeadzone(): void {
    this.deadzoneGraphics.clear();

    if (!this.cameraManager || !this.cameraManager.isActive()) return;

    const view = this.cameraManager.getCameraView();
    const dz = this.cameraManager.getDeadzone();

    const dzX = view.x + (view.width - dz.width) / 2;
    const dzY = view.y + (view.height - dz.height) / 2;

    this.deadzoneGraphics.lineStyle(2, this.DEADZONE_STROKE, 0.9);
    this.deadzoneGraphics.strokeRect(dzX, dzY, dz.width, dz.height);
  }

  private renderHitboxes(): void {
    this.hitboxGraphics.clear();

    const combatManager = CombatManager.getInstance();
    const hitboxes = combatManager.getHitboxManager().getHitboxesForDebug();

    for (const hb of hitboxes) {
      this.hitboxGraphics.lineStyle(2, 0xff4444, 0.9);
      this.hitboxGraphics.fillStyle(0xff4444, 0.2);

      if (hb.shape === HitboxShape.RECTANGLE && hb.width && hb.height) {
        const hw = hb.width / 2;
        const hh = hb.height / 2;
        this.hitboxGraphics.fillRect(hb.x - hw, hb.y - hh, hb.width, hb.height);
        this.hitboxGraphics.strokeRect(hb.x - hw, hb.y - hh, hb.width, hb.height);
      } else if (hb.shape === HitboxShape.CIRCLE && hb.radius) {
        this.hitboxGraphics.fillCircle(hb.x, hb.y, hb.radius);
        this.hitboxGraphics.strokeCircle(hb.x, hb.y, hb.radius);
      }
    }
  }

  private renderEnemyDebug(): void {
    this.enemyDebugGraphics.clear();

    const debugInfo = EnemyManager.getInstance().getDebugInfo();

    for (const info of debugInfo) {
      if (!info.isAlive) continue;

      // Vision radius - blue
      this.enemyDebugGraphics.lineStyle(1, 0x4488ff, 0.3);
      this.enemyDebugGraphics.strokeCircle(info.x, info.y, info.visionRadius);

      // Aggro radius - yellow
      this.enemyDebugGraphics.lineStyle(1, 0xffff44, 0.3);
      this.enemyDebugGraphics.strokeCircle(info.x, info.y, info.aggroRadius);

      // Attack radius - red
      this.enemyDebugGraphics.lineStyle(1, 0xff4444, 0.5);
      this.enemyDebugGraphics.strokeCircle(info.x, info.y, info.attackRadius);

      // State label
      this.enemyDebugGraphics.lineStyle(1, 0x00ff00, 0.6);
      this.enemyDebugGraphics.strokeCircle(info.x, info.y, 4);
    }
  }

  public destroy(): void {
    this.container.destroy();
    this.collisionGraphics.destroy();
    this.deadzoneGraphics.destroy();
    this.hitboxGraphics.destroy();
    this.enemyDebugGraphics.destroy();
    Logger.getInstance().log("[DebugOverlay] Destroyed");
  }
}
