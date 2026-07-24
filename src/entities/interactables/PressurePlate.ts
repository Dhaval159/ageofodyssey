import Phaser from "phaser";
import { BaseInteractable, BaseInteractableConfig } from "../../systems/interaction/BaseInteractable";
import { PuzzleEventType } from "../../systems/interaction/PuzzleEvent";

export interface PressurePlateConfig extends BaseInteractableConfig {
  triggerOnStay?: boolean;
  requiredWeight?: number;
  plateColor?: number;
  activeColor?: number;
}

export class PressurePlate extends BaseInteractable {
  private pressed: boolean = false;
  private plateGfx: Phaser.GameObjects.Graphics;
  private activeColor: number;
  private inactiveColor: number;
  private overlapObjects: Set<Phaser.GameObjects.GameObject> = new Set();
  private triggerOnStay: boolean;

  constructor(scene: Phaser.Scene, config: PressurePlateConfig) {
    super(scene, {
      ...config,
      promptText: "",
      alpha: 0,
      isStatic: true,
    });

    this.activeColor = config.activeColor ?? 0x44ff44;
    this.inactiveColor = config.plateColor ?? 0x666655;
    this.triggerOnStay = config.triggerOnStay ?? false;

    this.plateGfx = scene.add.graphics();
    this.add(this.plateGfx);
    this.drawPlate(false);

    const zone = scene.add.zone(0, 0, config.width - 4, config.height - 4);
    this.add(zone);

    this.setDepth(config.depth ?? 3);
  }

  private drawPlate(active: boolean): void {
    this.plateGfx.clear();
    const color = active ? this.activeColor : this.inactiveColor;
    const hw = this.bodyWidth / 2;
    const hh = this.bodyHeight / 2;

    this.plateGfx.fillStyle(0x444433, 1);
    this.plateGfx.fillRect(-hw - 2, -hh - 2, this.bodyWidth + 4, this.bodyHeight + 4);

    this.plateGfx.fillStyle(color, active ? 0.9 : 0.6);
    this.plateGfx.fillRect(-hw, -hh, this.bodyWidth, this.bodyHeight);

    this.plateGfx.lineStyle(1, active ? 0x22aa22 : 0x555544, 0.8);
    this.plateGfx.strokeRect(-hw, -hh, this.bodyWidth, this.bodyHeight);

    if (active) {
      this.plateGfx.fillStyle(0x88ff88, 0.3);
      this.plateGfx.fillRect(-hw + 2, -hh + 2, this.bodyWidth - 4, this.bodyHeight - 4);
    }
  }

  public checkOverlap(targets: Phaser.GameObjects.GameObject[]): void {
    const currentlyOverlapping = new Set<Phaser.GameObjects.GameObject>();
    const bounds = this.getBodyBounds();

    for (const obj of targets) {
      const objPos = (obj as any).getPosition?.() ?? { x: (obj as any).x, y: (obj as any).y };
      const objW = (obj as any).bodyWidth ?? (obj as any).width ?? 28;
      const objH = (obj as any).bodyHeight ?? (obj as any).height ?? 28;

      if (!objPos.x && !objPos.y) continue;

      if (
        objPos.x + objW / 2 > bounds.x &&
        objPos.x - objW / 2 < bounds.x + bounds.width &&
        objPos.y + objH / 2 > bounds.y &&
        objPos.y - objH / 2 < bounds.y + bounds.height
      ) {
        currentlyOverlapping.add(obj);
      }
    }

    for (const obj of currentlyOverlapping) {
      if (!this.overlapObjects.has(obj)) {
        this.overlapObjects.add(obj);
        this.pressed = true;
        this.drawPlate(true);
        this.emitPuzzleEvent(PuzzleEventType.TRIGGER_ENTER, { objectId: (obj as any).getId?.() ?? "unknown" });
      }
    }

    for (const obj of this.overlapObjects) {
      if (!currentlyOverlapping.has(obj)) {
        this.overlapObjects.delete(obj);
        if (this.overlapObjects.size === 0) {
          this.pressed = false;
          this.drawPlate(false);
          this.emitPuzzleEvent(PuzzleEventType.TRIGGER_EXIT, { objectId: (obj as any).getId?.() ?? "unknown" });
        }
      }
    }

    if (this.triggerOnStay && this.pressed) {
      this.emitPuzzleEvent(PuzzleEventType.TRIGGER_STAY, {
        count: this.overlapObjects.size,
      });
    }
  }

  public interact(): void {}

  public isPressed(): boolean {
    return this.pressed;
  }

  public getOverlapCount(): number {
    return this.overlapObjects.size;
  }

  public getInteractionPrompt(): string {
    return "";
  }

  public isInteractionEnabled(): boolean {
    return false;
  }
}
