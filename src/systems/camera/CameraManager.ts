import Phaser from "phaser";
import { Logger } from "../../core/Logger";

export interface ICameraConfig {
  lerpX: number;
  lerpY: number;
  worldBounds?: { x: number; y: number; width: number; height: number };
  deadzoneWidth?: number;
  deadzoneHeight?: number;
  lookAheadFactor?: number;
  initialZoom?: number;
  roundPixels?: boolean;
  minZoom?: number;
  maxZoom?: number;
}

export interface ICameraShakeConfig {
  intensity: number;
  duration: number;
}

interface ICameraShakeState {
  active: boolean;
  startTime: number;
  intensity: number;
  duration: number;
}

export class CameraManager {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private target: Phaser.GameObjects.GameObject | null = null;
  private currentCenterX: number = 0;
  private currentCenterY: number = 0;
  private shakeState: ICameraShakeState | null = null;
  private isFollowing: boolean = false;

  private readonly minZoom: number;
  private readonly maxZoom: number;
  private readonly deadzoneWidth: number;
  private readonly deadzoneHeight: number;
  private readonly lerpX: number;
  private readonly lerpY: number;
  private readonly lookAheadFactor: number;
  private readonly roundPixels: boolean;
  private readonly worldBounds: { x: number; y: number; width: number; height: number } | undefined;

  public constructor(camera: Phaser.Cameras.Scene2D.Camera, config: ICameraConfig) {
    this.camera = camera;
    this.minZoom = config.minZoom ?? 0.5;
    this.maxZoom = config.maxZoom ?? 2.0;
    this.deadzoneWidth = config.deadzoneWidth ?? 0;
    this.deadzoneHeight = config.deadzoneHeight ?? 0;
    this.lerpX = config.lerpX;
    this.lerpY = config.lerpY;
    this.lookAheadFactor = config.lookAheadFactor ?? 0;
    this.roundPixels = config.roundPixels ?? true;
    this.worldBounds = config.worldBounds;

    if (config.initialZoom !== undefined) {
      this.camera.setZoom(config.initialZoom);
    }
  }

  public follow(target: Phaser.GameObjects.GameObject): void {
    const posTarget = target as Phaser.GameObjects.GameObject & {
      x: number;
      y: number;
    };
    this.target = target;
    this.isFollowing = true;
    this.currentCenterX = posTarget.x;
    this.currentCenterY = posTarget.y;
    this.camera.setDeadzone(this.deadzoneWidth, this.deadzoneHeight);

    if (this.worldBounds) {
      const { x, y, width, height } = this.worldBounds;
      this.camera.setBounds(x, y, width, height);
    }

    Logger.getInstance().log("[CameraManager] Following target");
  }

  public update(delta: number): void {
    if (!this.isFollowing || !this.target) return;

    const posTarget = this.target as Phaser.GameObjects.GameObject & {
      x: number;
      y: number;
    };
    const targetX = posTarget.x;
    const targetY = posTarget.y;

    const deadzoneHalfW = this.deadzoneWidth / 2;
    const deadzoneHalfH = this.deadzoneHeight / 2;

    let idealCenterX = targetX;
    let idealCenterY = targetY;

    if (this.lookAheadFactor > 0 && this.target.body) {
      const body = this.target.body as Phaser.Physics.Arcade.Body;
      idealCenterX += body.velocity.x * this.lookAheadFactor;
      idealCenterY += body.velocity.y * this.lookAheadFactor;
    }

    let destX = this.currentCenterX;
    let destY = this.currentCenterY;

    const outX =
      Math.abs(idealCenterX - this.currentCenterX) > deadzoneHalfW;
    const outY =
      Math.abs(idealCenterY - this.currentCenterY) > deadzoneHalfH;

    if (outX) {
      destX =
        idealCenterX > this.currentCenterX
          ? idealCenterX - deadzoneHalfW
          : idealCenterX + deadzoneHalfW;
    }

    if (outY) {
      destY =
        idealCenterY > this.currentCenterY
          ? idealCenterY - deadzoneHalfH
          : idealCenterY + deadzoneHalfH;
    }

    const smoothingFactor = Math.min(delta / 16.67, 2);

    this.currentCenterX +=
      (destX - this.currentCenterX) * this.lerpX * smoothingFactor;
    this.currentCenterY +=
      (destY - this.currentCenterY) * this.lerpY * smoothingFactor;

    if (this.shakeState && this.shakeState.active) {
      const elapsed = performance.now() - this.shakeState.startTime;
      if (elapsed >= this.shakeState.duration) {
        this.shakeState = null;
      } else {
        const progress = elapsed / this.shakeState.duration;
        const decay = 1 - progress;
        const magnitude = this.shakeState.intensity * decay;
        const shakeX = Phaser.Math.Between(-magnitude, magnitude);
        const shakeY = Phaser.Math.Between(-magnitude, magnitude);
        this.currentCenterX += shakeX;
        this.currentCenterY += shakeY;
      }
    }

    const { width: viewW, height: viewH } = this.camera;
    let finalX = this.currentCenterX;
    let finalY = this.currentCenterY;

    if (this.worldBounds) {
      const b = this.worldBounds;
      const halfW = viewW / 2;
      const halfH = viewH / 2;
      finalX = Phaser.Math.Clamp(finalX, b.x + halfW, b.x + b.width - halfW);
      finalY = Phaser.Math.Clamp(finalY, b.y + halfH, b.y + b.height - halfH);
    }

    this.camera.centerOn(finalX, finalY);

    if (this.roundPixels) {
      this.camera.setRoundPixels(true);
    }
  }

  public shake(config: ICameraShakeConfig): void {
    this.shakeState = {
      active: true,
      startTime: performance.now(),
      intensity: config.intensity,
      duration: config.duration,
    };
  }

  public setZoom(zoom: number): void {
    const clamped = Phaser.Math.Clamp(zoom, this.minZoom, this.maxZoom);
    this.camera.setZoom(clamped);
  }

  public getZoom(): number {
    return this.camera.zoom;
  }

  public getDeadzone(): { width: number; height: number } {
    return {
      width: this.deadzoneWidth,
      height: this.deadzoneHeight,
    };
  }

  public getCameraView(): {
    x: number;
    y: number;
    width: number;
    height: number;
  } {
    const view = this.camera.worldView;
    return {
      x: view.x,
      y: view.y,
      width: view.width,
      height: view.height,
    };
  }

  public setBounds(
    bounds: { x: number; y: number; width: number; height: number }
  ): void {
    const { x, y, width, height } = bounds;
    this.camera.setBounds(x, y, width, height);
  }

  public isActive(): boolean {
    return this.isFollowing;
  }

  public destroy(): void {
    this.isFollowing = false;
    this.target = null;
    this.shakeState = null;
    Logger.getInstance().log("[CameraManager] Destroyed");
  }
}
