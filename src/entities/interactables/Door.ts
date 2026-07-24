import Phaser from "phaser";
import { BaseInteractable, BaseInteractableConfig } from "../../systems/interaction/BaseInteractable";
import { PuzzleEventBus, PuzzleEventType, PuzzleEventPayload } from "../../systems/interaction/PuzzleEvent";

export enum DoorState {
  LOCKED = "LOCKED",
  CLOSED = "CLOSED",
  OPENING = "OPENING",
  OPEN = "OPEN",
  CLOSING = "CLOSING",
}

export interface DoorConfig extends BaseInteractableConfig {
  initialState?: DoorState;
  openEventSource?: string;
  openEventType?: PuzzleEventType;
  closeEventSource?: string;
  closeEventType?: PuzzleEventType;
  doorColor?: number;
  doorWidth?: number;
}

export class Door extends BaseInteractable {
  private doorState: DoorState;
  private doorGfx: Phaser.GameObjects.Graphics;
  private leftPanel: Phaser.GameObjects.Graphics | null = null;
  private rightPanel: Phaser.GameObjects.Graphics | null = null;
  private doorW: number;
  private doorH: number;
  private openSub: (() => void) | null = null;
  private closeSub: (() => void) | null = null;

  constructor(scene: Phaser.Scene, config: DoorConfig) {
    super(scene, {
      ...config,
      color: config.color ?? 0x4a4a3a,
      strokeColor: config.strokeColor ?? 0x3a3a2a,
      alpha: 0,
      promptText: "",
    });

    this.doorState = config.initialState ?? DoorState.CLOSED;
    this.doorW = config.doorWidth ?? config.width;
    this.doorH = config.height;

    this.doorGfx = scene.add.graphics();
    this.add(this.doorGfx);

    this.leftPanel = scene.add.graphics();
    this.rightPanel = scene.add.graphics();
    this.add(this.leftPanel);
    this.add(this.rightPanel);

    this.drawDoor();
    this.setupEventListeners(config);
  }

  private setupEventListeners(config: DoorConfig): void {
    const bus = PuzzleEventBus.getInstance();

    if (config.openEventSource && config.openEventType) {
      const handler = (_payload: PuzzleEventPayload) => { this.open(); };
      bus.on(config.openEventSource, config.openEventType, handler);
      this.openSub = () => bus.off(config.openEventSource!, config.openEventType!, handler);
    }

    if (config.closeEventSource && config.closeEventType) {
      const handler = (_payload: PuzzleEventPayload) => { this.close(); };
      bus.on(config.closeEventSource, config.closeEventType, handler);
      this.closeSub = () => bus.off(config.closeEventSource!, config.closeEventType!, handler);
    }
  }

  private drawDoor(): void {
    const hw = this.doorW / 2;
    const hh = this.doorH / 2;

    this.doorGfx.clear();
    this.doorGfx.fillStyle(0x3a3a2a, 1);
    this.doorGfx.fillRect(-hw - 3, -hh - 3, this.doorW + 6, this.doorH + 6);
    this.doorGfx.lineStyle(2, 0x2a2a1a, 0.6);
    this.doorGfx.strokeRect(-hw - 3, -hh - 3, this.doorW + 6, this.doorH + 6);

    if (this.doorState === DoorState.LOCKED) {
      this.drawLockedDoor();
    } else if (this.doorState === DoorState.CLOSED || this.doorState === DoorState.OPENING || this.doorState === DoorState.CLOSING) {
      this.drawClosedDoor();
    }
  }

  private drawLockedDoor(): void {
    const hw = this.doorW / 2;
    const hh = this.doorH / 2;
    if (!this.leftPanel || !this.rightPanel) return;

    this.leftPanel.clear();
    this.leftPanel.fillStyle(0x5a4a3a, 1);
    this.leftPanel.fillRect(-hw, -hh, hw, this.doorH);
    this.leftPanel.lineStyle(2, 0x4a3a2a, 0.6);
    this.leftPanel.strokeRect(-hw, -hh, hw, this.doorH);

    this.rightPanel.clear();
    this.rightPanel.fillStyle(0x5a4a3a, 1);
    this.rightPanel.fillRect(0, -hh, hw, this.doorH);
    this.rightPanel.lineStyle(2, 0x4a3a2a, 0.6);
    this.rightPanel.strokeRect(0, -hh, hw, this.doorH);

    const lockG = this.scene.add.graphics();
    lockG.fillStyle(0xffcc00, 1);
    lockG.fillCircle(0, 0, 4);
    lockG.lineStyle(1, 0xcc9900, 0.8);
    lockG.strokeCircle(0, 0, 4);
    lockG.fillStyle(0x333333, 1);
    lockG.fillRect(-2, -3, 4, 6);
    this.add(lockG);
  }

  private drawClosedDoor(): void {
    const hw = this.doorW / 2;
    const hh = this.doorH / 2;
    if (!this.leftPanel || !this.rightPanel) return;

    this.leftPanel.clear();
    this.leftPanel.fillStyle(0x5a5a4a, 1);
    this.leftPanel.fillRect(-hw, -hh, hw, this.doorH);
    this.leftPanel.lineStyle(2, 0x4a4a3a, 0.6);
    this.leftPanel.strokeRect(-hw, -hh, hw, this.doorH);
    this.leftPanel.lineStyle(1, 0x6a6a5a, 0.3);
    this.leftPanel.lineBetween(-hw + 2, -hh + 6, -hw + 2, this.doorH / 2);

    this.rightPanel.clear();
    this.rightPanel.fillStyle(0x5a5a4a, 1);
    this.rightPanel.fillRect(0, -hh, hw, this.doorH);
    this.rightPanel.lineStyle(2, 0x4a4a3a, 0.6);
    this.rightPanel.strokeRect(0, -hh, hw, this.doorH);
    this.rightPanel.lineStyle(1, 0x6a6a5a, 0.3);
    this.rightPanel.lineBetween(hw - 2, -hh + 6, hw - 2, this.doorH / 2);
  }

  public open(): void {
    if (this.doorState === DoorState.OPEN || this.doorState === DoorState.OPENING) return;
    if (this.doorState === DoorState.LOCKED) return;

    this.doorState = DoorState.OPENING;

    this.scene.tweens.add({
      targets: this.leftPanel,
      x: -this.doorW,
      duration: 600,
      ease: "Power2",
      onComplete: () => {
        this.doorState = DoorState.OPEN;
        this.setInteractionEnabled(false);
        this.emitPuzzleEvent(PuzzleEventType.OPENED);
      },
    });
    this.scene.tweens.add({
      targets: this.rightPanel,
      x: this.doorW,
      duration: 600,
      ease: "Power2",
    });

    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = false;
    }
  }

  public close(): void {
    if (this.doorState === DoorState.CLOSED || this.doorState === DoorState.CLOSING) return;

    this.doorState = DoorState.CLOSING;

    this.scene.tweens.add({
      targets: this.leftPanel,
      x: 0,
      duration: 600,
      ease: "Power2",
      onComplete: () => {
        this.doorState = DoorState.CLOSED;
        this.setInteractionEnabled(true);
        this.emitPuzzleEvent(PuzzleEventType.CLOSED);
      },
    });
    this.scene.tweens.add({
      targets: this.rightPanel,
      x: 0,
      duration: 600,
      ease: "Power2",
    });

    if (this.body) {
      (this.body as Phaser.Physics.Arcade.Body).enable = true;
    }
  }

  public unlock(): void {
    if (this.doorState !== DoorState.LOCKED) return;
    this.doorState = DoorState.CLOSED;
    this.drawDoor();
    this.emitPuzzleEvent(PuzzleEventType.UNLOCKED);
  }

  public lock(): void {
    if (this.doorState === DoorState.LOCKED) return;
    this.doorState = DoorState.LOCKED;
    this.drawDoor();
    this.emitPuzzleEvent(PuzzleEventType.LOCKED);
  }

  public interact(): void {}

  public getDoorState(): DoorState {
    return this.doorState;
  }

  public getInteractionPrompt(): string {
    if (this.doorState === DoorState.LOCKED) return "[Locked]";
    if (this.doorState === DoorState.OPEN) return "";
    return "[E] Open door";
  }

  public isInteractionEnabled(): boolean {
    return this.doorState === DoorState.CLOSED || this.doorState === DoorState.LOCKED;
  }

  public destroy(): void {
    if (this.openSub) this.openSub();
    if (this.closeSub) this.closeSub();
    super.destroy();
  }
}
