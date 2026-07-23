import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { InputManager } from "../../core/InputManager";
import { InputAction } from "../../core/InputAction";
import { CameraManager } from "../camera/CameraManager";

export class DebugOverlay {
  private container: Phaser.GameObjects.Container;
  private fpsText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private collisionGraphics: Phaser.GameObjects.Graphics;
  private deadzoneGraphics: Phaser.GameObjects.Graphics;
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

    this.container.setVisible(false);
    this.collisionGraphics.setVisible(false);
    this.deadzoneGraphics.setVisible(false);

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

    if (this.cameraManager && this.cameraManager.isActive()) {
      const view = this.cameraManager.getCameraView();
      const dz = this.cameraManager.getDeadzone();
      const zoom = this.cameraManager.getZoom();
      info += `\nCamera: (${view.x.toFixed(1)}, ${view.y.toFixed(1)}) | Zoom: ${zoom.toFixed(
        2
      )}`;
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

  public destroy(): void {
    this.container.destroy();
    this.collisionGraphics.destroy();
    this.deadzoneGraphics.destroy();
    Logger.getInstance().log("[DebugOverlay] Destroyed");
  }
}
