import Phaser from "phaser";
import { BaseInteractable, BaseInteractableConfig } from "../../systems/interaction/BaseInteractable";
import { PuzzleEventType } from "../../systems/interaction/PuzzleEvent";
import { DialogueManager, DialogueLine } from "../../systems/dialogue/DialogueManager";
import { ObjectiveManager } from "../../systems/objectives/ObjectiveManager";

export interface InspectPointConfig extends BaseInteractableConfig {
  lines: DialogueLine[];
  onEnd?: () => void;
  objectiveOnInspect?: { id: string; text: string };
  completeObjectiveOnInspect?: string;
  inspectColor?: number;
  icon?: string;
}

export class InspectPoint extends BaseInteractable {
  private lines: DialogueLine[];
  private onEnd: (() => void) | undefined;
  private objectiveOnInspect: { id: string; text: string } | undefined;
  private completeObjectiveOnInspect: string | undefined;
  private alreadyInspected: boolean = false;
  private iconGfx: Phaser.GameObjects.Graphics;

  constructor(scene: Phaser.Scene, config: InspectPointConfig) {
    super(scene, {
      ...config,
      color: config.inspectColor ?? 0x888877,
      strokeColor: 0x666655,
      alpha: 0.5,
      promptText: config.promptText ?? "[E] Examine",
    });

    this.lines = config.lines;
    this.onEnd = config.onEnd;
    this.objectiveOnInspect = config.objectiveOnInspect;
    this.completeObjectiveOnInspect = config.completeObjectiveOnInspect;

    this.iconGfx = scene.add.graphics();
    this.add(this.iconGfx);
    this.drawIcon();
  }

  private drawIcon(): void {
    const hw = this.bodyWidth / 2;
    const hh = this.bodyHeight / 2;

    this.iconGfx.clear();
    this.iconGfx.fillStyle(0x888877, 0.4);
    this.iconGfx.fillCircle(0, 0, Math.min(hw, hh) - 2);
    this.iconGfx.lineStyle(1, 0xaaa999, 0.6);
    this.iconGfx.strokeCircle(0, 0, Math.min(hw, hh) - 2);

    this.iconGfx.fillStyle(0xcccbbb, 0.7);
    this.iconGfx.fillCircle(0, -2, 2);
    this.iconGfx.fillRect(-1, 2, 2, 5);
  }

  public interact(): void {
    if (this.alreadyInspected) {
      this.showDialogueAgain();
      return;
    }

    this.alreadyInspected = true;

    if (this.completeObjectiveOnInspect) {
      ObjectiveManager.getInstance().completeObjective(this.completeObjectiveOnInspect);
    }
    if (this.objectiveOnInspect) {
      ObjectiveManager.getInstance().setObjective(
        this.objectiveOnInspect.id,
        this.objectiveOnInspect.text
      );
    }

    this.emitPuzzleEvent(PuzzleEventType.INSPECTED);

    DialogueManager.getInstance().start({
      lines: this.lines,
      onEnd: () => {
        if (this.onEnd) this.onEnd();
      },
    });
  }

  private showDialogueAgain(): void {
    DialogueManager.getInstance().start({
      lines: this.lines,
      onEnd: () => {
        if (this.onEnd) this.onEnd();
      },
    });
  }

  public getInteractionPrompt(): string {
    return this.alreadyInspected ? "[E] Examine again" : this.promptText;
  }

  public hasBeenInspected(): boolean {
    return this.alreadyInspected;
  }
}
