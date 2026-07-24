import Phaser from "phaser";
import { BaseInteractable, BaseInteractableConfig } from "../../systems/interaction/BaseInteractable";
import { CheckpointSystem } from "../../systems/save/CheckpointSystem";
import { PuzzleEventType } from "../../systems/interaction/PuzzleEvent";

export interface CheckpointInteractableConfig extends BaseInteractableConfig {
  checkpointId: string;
  checkpointLabel: string;
  checkpointColor?: number;
  activeColor?: number;
}

export class CheckpointInteractable extends BaseInteractable {
  private checkpointId: string;
  private checkpointLabel: string;
  private activated: boolean = false;
  private activeColor: number;
  private inactiveColor: number;
  private flagGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: CheckpointInteractableConfig) {
    super(scene, {
      ...config,
      color: config.checkpointColor ?? 0x8899aa,
      strokeColor: 0x667788,
      alpha: 0.6,
      promptText: "[E] Rest at checkpoint",
    });

    this.checkpointId = config.checkpointId;
    this.checkpointLabel = config.checkpointLabel;
    this.inactiveColor = config.checkpointColor ?? 0x8899aa;
    this.activeColor = config.activeColor ?? 0x44ff88;

    CheckpointSystem.getInstance().registerCheckpoint(
      this.checkpointId,
      this.checkpointLabel,
      config.x,
      config.y
    );

    this.flagGfx = scene.add.graphics();
    this.add(this.flagGfx);
    this.drawFlag(false);
  }

  private drawFlag(active: boolean): void {
    const hw = this.bodyWidth / 2;
    const hh = this.bodyHeight / 2;
    const color = active ? this.activeColor : this.inactiveColor;

    this.flagGfx.clear();
    this.flagGfx.fillStyle(0x666655, 1);
    this.flagGfx.fillRect(-2, -hh, 4, this.bodyHeight);

    this.flagGfx.fillStyle(color, 0.8);
    this.flagGfx.beginPath();
    this.flagGfx.moveTo(2, -hh + 2);
    this.flagGfx.lineTo(hw + 2, -hh + hh / 3);
    this.flagGfx.lineTo(2, -hh + hh * 0.6);
    this.flagGfx.closePath();
    this.flagGfx.fillPath();

    this.flagGfx.lineStyle(1, active ? 0x22cc66 : 0x667788, 0.6);
    this.flagGfx.strokeRect(-hw, -hh, this.bodyWidth, this.bodyHeight);

    if (active) {
      this.flagGfx.fillStyle(0x44ff88, 0.1);
      this.flagGfx.fillCircle(0, 0, hw + 2);
    }
  }

  public interact(): void {
    if (this.activated) return;

    this.activated = true;
    CheckpointSystem.getInstance().activateCheckpoint(this.checkpointId);
    this.drawFlag(true);
    this.emitPuzzleEvent(PuzzleEventType.ACTIVATED, {
      checkpointId: this.checkpointId,
    });
  }

  public isActivated(): boolean {
    return this.activated;
  }

  public getInteractionPrompt(): string {
    return this.activated ? "[Saved]" : "[E] Rest";
  }
}
