import Phaser from "phaser";
import { BaseInteractable, BaseInteractableConfig } from "../../systems/interaction/BaseInteractable";
import { PuzzleEventType } from "../../systems/interaction/PuzzleEvent";

export interface SwitchConfig extends BaseInteractableConfig {
  initialState?: boolean;
  switchColor?: number;
  activeColor?: number;
}

export class Switch extends BaseInteractable {
  private toggled: boolean;
  private switchGfx: Phaser.GameObjects.Graphics;
  private inactiveColor: number;
  private activeColorVal: number;
  private animating: boolean = false;

  constructor(scene: Phaser.Scene, config: SwitchConfig) {
    super(scene, {
      ...config,
      color: config.switchColor ?? 0x555566,
      strokeColor: 0x444455,
      alpha: 0,
      promptText: "[E] Flip switch",
    });

    this.toggled = config.initialState ?? false;
    this.inactiveColor = config.switchColor ?? 0x555566;
    this.activeColorVal = config.activeColor ?? 0x44aaff;

    this.switchGfx = scene.add.graphics();
    this.add(this.switchGfx);
    this.drawSwitch();
  }

  private drawSwitch(): void {
    const hw = this.bodyWidth / 2;
    const hh = this.bodyHeight / 2;

    this.switchGfx.clear();
    this.switchGfx.fillStyle(0x444455, 1);
    this.switchGfx.fillRoundedRect(-hw, -hh, this.bodyWidth, this.bodyHeight, 4);

    this.switchGfx.lineStyle(1, 0x333344, 0.6);
    this.switchGfx.strokeRoundedRect(-hw, -hh, this.bodyWidth, this.bodyHeight, 4);

    const toggleX = this.toggled ? hw - 6 : -hw + 6;
    this.switchGfx.fillStyle(this.toggled ? this.activeColorVal : this.inactiveColor, 0.9);
    this.switchGfx.fillRoundedRect(toggleX - 5, -hh + 3, 10, this.bodyHeight - 6, 3);

    this.switchGfx.lineStyle(1, this.toggled ? 0x2288cc : 0x444455, 0.8);
    this.switchGfx.strokeRoundedRect(toggleX - 5, -hh + 3, 10, this.bodyHeight - 6, 3);

    if (this.toggled) {
      this.switchGfx.fillStyle(this.activeColorVal, 0.1);
      this.switchGfx.fillCircle(0, 0, hw + 4);
    }
  }

  public interact(): void {
    if (this.animating) return;
    this.animating = true;

    this.toggled = !this.toggled;
    this.drawSwitch();

    this.scene.time.delayedCall(150, () => {
      this.animating = false;
      this.emitPuzzleEvent(PuzzleEventType.TOGGLED, { toggled: this.toggled });
      if (this.toggled) {
        this.emitPuzzleEvent(PuzzleEventType.ACTIVATED);
      } else {
        this.emitPuzzleEvent(PuzzleEventType.DEACTIVATED);
      }
    });
  }

  public isToggled(): boolean {
    return this.toggled;
  }

  public getInteractionPrompt(): string {
    return this.toggled ? "[E] Flip switch (OFF)" : "[E] Flip switch (ON)";
  }
}
