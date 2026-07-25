import Phaser from "phaser";

export class BossTriggerVolume extends Phaser.GameObjects.Zone {
  private wasOverlapping: boolean = false;
  private isOverlappingThisFrame: boolean = false;
  private enabled: boolean = true;

  public onEnter: (() => void) | null = null;
  public onStay: (() => void) | null = null;
  public onExit: (() => void) | null = null;

  constructor(scene: Phaser.Scene, x: number, y: number, width: number, height: number) {
    super(scene, x, y, width, height);
    scene.add.existing(this);
    scene.physics.add.existing(this, true); // static body
  }

  public setCallbacks(onEnter?: () => void, onStay?: () => void, onExit?: () => void): void {
    this.onEnter = onEnter ?? null;
    this.onStay = onStay ?? null;
    this.onExit = onExit ?? null;
  }

  public setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    const body = this.body as Phaser.Physics.Arcade.StaticBody;
    if (body) {
      body.enable = enabled;
    }
    if (!enabled) {
      if (this.wasOverlapping && this.onExit) {
        this.onExit();
      }
      this.wasOverlapping = false;
      this.isOverlappingThisFrame = false;
    }
  }

  public onOverlap(): void {
    if (!this.enabled) return;
    this.isOverlappingThisFrame = true;
  }

  public update(): void {
    if (!this.enabled) return;

    if (this.isOverlappingThisFrame) {
      if (!this.wasOverlapping) {
        if (this.onEnter) this.onEnter();
        this.wasOverlapping = true;
      } else {
        if (this.onStay) this.onStay();
      }
    } else {
      if (this.wasOverlapping) {
        if (this.onExit) this.onExit();
        this.wasOverlapping = false;
      }
    }

    // Reset for next frame
    this.isOverlappingThisFrame = false;
  }
}
