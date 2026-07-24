import Phaser from "phaser";
import { IInteractable } from "../../systems/interaction/IInteractable";

export interface InteractablePropConfig {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  promptText: string;
  dialogueId: string;
  drawFn: (g: Phaser.GameObjects.Graphics, w: number, h: number) => void;
  interactionRange?: number;
  depth?: number;
}

export class InteractableProp extends Phaser.GameObjects.Container implements IInteractable {
  private propId: string;
  private promptText: string;
  private dialogueId: string;
  private interactionEnabled: boolean = true;
  private interactionRange: number;
  private gfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: InteractablePropConfig) {
    super(scene, config.x, config.y);

    this.propId = config.id;
    this.promptText = config.promptText;
    this.dialogueId = config.dialogueId;
    this.interactionRange = config.interactionRange ?? 60;

    this.gfx = scene.add.graphics();
    config.drawFn(this.gfx, config.width, config.height);
    this.add(this.gfx);

    scene.add.existing(this);
    this.setDepth(config.depth ?? 4);
  }

  getId(): string { return this.propId; }
  getInteractionPrompt(): string { return this.promptText; }
  getPosition(): { x: number; y: number } { return { x: this.x, y: this.y }; }
  getInteractionRange(): number { return this.interactionRange; }
  isInteractionEnabled(): boolean { return this.interactionEnabled; }
  setInteractionEnabled(enabled: boolean): void { this.interactionEnabled = enabled; }
  interact(): void {}
  getDialogueId(): string { return this.dialogueId; }
}
