import Phaser from "phaser";
import { IInteractable } from "../../systems/interaction/IInteractable";

export interface CrewNPCConfig {
  name: string;
  x: number;
  y: number;
  color: number;
  dialogueId: string;
  promptText: string;
  interactionRange?: number;
}

export class CrewNPC extends Phaser.GameObjects.Container implements IInteractable {
  private npcName: string;
  private bodyColor: number;
  private dialogueId: string;
  private promptText: string;
  private interactionRange: number;
  private interactionEnabled: boolean = true;
  private nameLabel: Phaser.GameObjects.Text;
  private bodyGraphics: Phaser.GameObjects.Graphics;
  private bobTimer: number = 0;

  constructor(scene: Phaser.Scene, config: CrewNPCConfig) {
    super(scene, config.x, config.y);

    this.npcName = config.name;
    this.bodyColor = config.color;
    this.dialogueId = config.dialogueId;
    this.promptText = config.promptText;
    this.interactionRange = config.interactionRange ?? 60;

    this.bodyGraphics = scene.add.graphics();
    this.drawBody();
    this.add(this.bodyGraphics);

    this.nameLabel = scene.add.text(0, -24, config.name, {
      fontSize: "12px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    });
    this.nameLabel.setOrigin(0.5, 1);
    this.add(this.nameLabel);

    scene.add.existing(this);
    this.setDepth(5);
  }

  private drawBody(): void {
    const g = this.bodyGraphics;
    g.clear();

    g.fillStyle(this.bodyColor, 1);
    g.fillCircle(0, -4, 6);
    g.fillRect(-7, 2, 14, 16);
    g.fillRect(-8, 18, 5, 10);
    g.fillRect(3, 18, 5, 10);

    g.lineStyle(1, 0xffffff, 0.3);
    g.strokeCircle(0, -4, 6);
    g.strokeRect(-7, 2, 14, 16);
  }

  public getId(): string {
    return `npc_${this.npcName}`;
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

  public interact(): void {
  }

  public getDialogueId(): string {
    return this.dialogueId;
  }

  public update(_time: number, _delta: number): void {
    this.bobTimer += 0.03;
    this.bodyGraphics.y = Math.sin(this.bobTimer) * 1.5;
  }
}
