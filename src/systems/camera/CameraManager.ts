import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { WORLD_CONSTANTS } from "../../constants/WorldConstants";

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
  elapsed: number;
  intensity: number;
  duration: number;
}

interface ICameraImpulseState {
  x: number;
  y: number;
  decay: number;
}

export class CameraManager {
  private camera: Phaser.Cameras.Scene2D.Camera;
  private target: Phaser.GameObjects.GameObject | null = null;
  private currentCenterX: number = 0;
  private currentCenterY: number = 0;
  private shakeState: ICameraShakeState | null = null;
  private impulseState: ICameraImpulseState | null = null;
  private isFollowing: boolean = false;
  private combatZoomActive: boolean = false;
  private baseZoom: number = WORLD_CONSTANTS.CAMERA.DEFAULT_ZOOM;
  private currentZoom: number = WORLD_CONSTANTS.CAMERA.DEFAULT_ZOOM;

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

    if (this.roundPixels) {
      this.camera.setRoundPixels(true);
    }

    this.baseZoom = config.initialZoom ?? WORLD_CONSTANTS.CAMERA.DEFAULT_ZOOM;
    this.currentZoom = this.baseZoom;
    this.camera.setZoom(this.baseZoom);
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

    const outX = Math.abs(idealCenterX - this.currentCenterX) > deadzoneHalfW;
    const outY = Math.abs(idealCenterY - this.currentCenterY) > deadzoneHalfH;

    if (outX) {
      destX = idealCenterX > this.currentCenterX
        ? idealCenterX - deadzoneHalfW
        : idealCenterX + deadzoneHalfW;
    }

    if (outY) {
      destY = idealCenterY > this.currentCenterY
        ? idealCenterY - deadzoneHalfH
        : idealCenterY + deadzoneHalfH;
    }

    const dt = delta / 1000;
    const smoothingFactor = Math.min(dt / (1 / 60), 2);

    this.currentCenterX += (destX - this.currentCenterX) * this.lerpX * smoothingFactor;
    this.currentCenterY += (destY - this.currentCenterY) * this.lerpY * smoothingFactor;

    if (this.shakeState && this.shakeState.active) {
      this.shakeState.elapsed += delta;
      if (this.shakeState.elapsed >= this.shakeState.duration) {
        this.shakeState = null;
      } else {
        const progress = this.shakeState.elapsed / this.shakeState.duration;
        const decay = 1 - progress;
        const magnitude = this.shakeState.intensity * decay;
        const shakeX = Phaser.Math.Between(-magnitude, magnitude);
        const shakeY = Phaser.Math.Between(-magnitude, magnitude);
        this.currentCenterX += shakeX;
        this.currentCenterY += shakeY;
      }
    }

    if (this.impulseState) {
      const dtSec = dt;
      this.currentCenterX += this.impulseState.x * dtSec * 0.06;
      this.currentCenterY += this.impulseState.y * dtSec * 0.06;
      this.impulseState.x *= (1 - this.impulseState.decay * dtSec * 0.001);
      this.impulseState.y *= (1 - this.impulseState.decay * dtSec * 0.001);
      if (Math.abs(this.impulseState.x) < 0.5 && Math.abs(this.impulseState.y) < 0.5) {
        this.impulseState = null;
      }
    }

    const { width: viewW, height: viewH } = this.camera;
    let finalX = this.currentCenterX;
    let finalY = this.currentCenterY;

    if (this.worldBounds) {
      const b = this.worldBounds;
      const zoom = this.currentZoom;
      const halfW = (viewW / zoom) / 2;
      const halfH = (viewH / zoom) / 2;
      const minX = b.width > viewW / zoom ? b.x + halfW : b.x + b.width / 2;
      const maxX = b.width > viewW / zoom ? b.x + b.width - halfW : b.x + b.width / 2;
      const minY = b.height > viewH / zoom ? b.y + halfH : b.y + b.height / 2;
      const maxY = b.height > viewH / zoom ? b.y + b.height - halfH : b.y + b.height / 2;
      finalX = Phaser.Math.Clamp(finalX, minX, maxX);
      finalY = Phaser.Math.Clamp(finalY, minY, maxY);
    }

    this.camera.centerOn(finalX, finalY);

    const targetZoom = this.combatZoomActive ? this.baseZoom * 1.15 : this.baseZoom;
    const zoomDiff = targetZoom - this.currentZoom;
    if (Math.abs(zoomDiff) > 0.001) {
      this.currentZoom += zoomDiff * 0.06;
      this.camera.setZoom(this.currentZoom);
    }
  }

  public shake(config: ICameraShakeConfig): void {
    this.shakeState = {
      active: true,
      elapsed: 0,
      intensity: config.intensity,
      duration: config.duration,
    };
  }

  public setZoom(zoom: number): void {
    const clamped = Phaser.Math.Clamp(zoom, this.minZoom, this.maxZoom);
    this.camera.setZoom(clamped);
    this.currentZoom = clamped;
    this.baseZoom = clamped;
  }

  public setCombatZoom(active: boolean): void {
    this.combatZoomActive = active;
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

  public addImpulse(x: number, y: number, decay: number = 8): void {
    if (this.impulseState) {
      this.impulseState.x += x;
      this.impulseState.y += y;
    } else {
      this.impulseState = { x, y, decay };
    }
  }

  public destroy(): void {
    this.isFollowing = false;
    this.target = null;
    this.shakeState = null;
    this.impulseState = null;
    Logger.getInstance().log("[CameraManager] Destroyed");
  }
}
