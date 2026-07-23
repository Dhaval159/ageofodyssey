import Phaser from "phaser";

export interface ICameraConfig {
  lerpX: number;
  lerpY: number;
  deadzoneWidth?: number;
  deadzoneHeight?: number;
  bounds?: { x: number; y: number; width: number; height: number };
  initialZoom?: number;
}

export class CameraController {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private config: ICameraConfig;

  constructor(camera: Phaser.Cameras.Scene2D.Camera, config: ICameraConfig) {
    this.camera = camera;
    this.config = config;

    if (config.initialZoom !== undefined) {
      this.camera.setZoom(config.initialZoom);
    }
  }

  public follow(target: Phaser.GameObjects.GameObject): void {

    // Start following the target with smooth linear interpolation
    this.camera.startFollow(
      target,
      true, // roundPixels to avoid micro-jitter
      this.config.lerpX,
      this.config.lerpY
    );

    // Apply dead zone constraints if defined
    if (
      this.config.deadzoneWidth !== undefined &&
      this.config.deadzoneHeight !== undefined
    ) {
      this.camera.setDeadzone(this.config.deadzoneWidth, this.config.deadzoneHeight);
    }

    // Restrict camera to specified world bounds
    if (this.config.bounds) {
      const { x, y, width, height } = this.config.bounds;
      this.camera.setBounds(x, y, width, height);
    }
  }

  public setZoom(zoom: number): void {
    this.camera.setZoom(zoom);
  }

  public getZoom(): number {
    return this.camera.zoom;
  }

  public update(): void {
    // Placeholder for potential future dynamic effects (e.g. camera shakes, zoom updates)
  }
}
