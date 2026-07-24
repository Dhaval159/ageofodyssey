import Phaser from "phaser";
import { IInteractable } from "./IInteractable";
import { PuzzleEventBus, PuzzleEventType } from "./PuzzleEvent";

export interface BaseInteractableConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  promptText?: string;
  interactionRange?: number;
  depth?: number;
  isStatic?: boolean;
  color?: number;
  alpha?: number;
  strokeColor?: number;
  strokeWidth?: number;
}

export abstract class BaseInteractable
  extends Phaser.GameObjects.Container
  implements IInteractable
{
  protected interactableId: string;
  protected promptText: string;
  protected interactionRange: number;
  protected interactionEnabled: boolean = true;
  protected puzzleBus: PuzzleEventBus;
  protected bodyWidth: number;
  protected bodyHeight: number;
  protected bodyColor: number;
  protected bodyAlpha: number;
  protected strokeColor: number;
  protected strokeWidth: number;
  protected isStatic: boolean;

  protected bodyGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: BaseInteractableConfig) {
    super(scene, config.x, config.y);

    this.interactableId = config.id;
    this.promptText = config.promptText ?? "[E] Interact";
    this.interactionRange = config.interactionRange ?? 50;
    this.bodyWidth = config.width;
    this.bodyHeight = config.height;
    this.bodyColor = config.color ?? 0x666666;
    this.bodyAlpha = config.alpha ?? 1;
    this.strokeColor = config.strokeColor ?? 0x444444;
    this.strokeWidth = config.strokeWidth ?? 1;
    this.isStatic = config.isStatic ?? true;

    this.bodyGfx = scene.add.graphics();
    this.drawBody();
    this.add(this.bodyGfx);

    scene.add.existing(this);
    this.setDepth(config.depth ?? 5);

    if (this.isStatic) {
      scene.physics.add.existing(this, true);
    } else {
      scene.physics.add.existing(this, false);
    }

    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setSize(this.bodyWidth, this.bodyHeight);
      body.setOffset(-this.bodyWidth / 2, -this.bodyHeight / 2);
    }

    this.puzzleBus = PuzzleEventBus.getInstance();
  }

  protected drawBody(): void {
    this.bodyGfx.clear();
    this.bodyGfx.fillStyle(this.bodyColor, this.bodyAlpha);
    this.bodyGfx.fillRect(
      -this.bodyWidth / 2,
      -this.bodyHeight / 2,
      this.bodyWidth,
      this.bodyHeight
    );
    this.bodyGfx.lineStyle(this.strokeWidth, this.strokeColor, 0.8);
    this.bodyGfx.strokeRect(
      -this.bodyWidth / 2,
      -this.bodyHeight / 2,
      this.bodyWidth,
      this.bodyHeight
    );
  }

  public getId(): string {
    return this.interactableId;
  }

  public getInteractionPrompt(): string {
    return this.promptText;
  }

  public getPosition(): { x: number; y: number } {
    return { x: this.x, y: this.y };
  }

  public getInteractionRange(): number {
    return this.interactionRange;
  }

  public isInteractionEnabled(): boolean {
    return this.interactionEnabled;
  }

  public setInteractionEnabled(enabled: boolean): void {
    this.interactionEnabled = enabled;
  }

  public abstract interact(): void;

  protected emitPuzzleEvent(eventType: PuzzleEventType, data?: Record<string, unknown>): void {
    this.puzzleBus.emit(this.interactableId, eventType, data);
  }

  public getBodyBounds(): { x: number; y: number; width: number; height: number } {
    return {
      x: this.x - this.bodyWidth / 2,
      y: this.y - this.bodyHeight / 2,
      width: this.bodyWidth,
      height: this.bodyHeight,
    };
  }

  public getBodyWidth(): number { return this.bodyWidth; }
  public getBodyHeight(): number { return this.bodyHeight; }
}
