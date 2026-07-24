import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { GameStateManager } from "../../core/GameStateManager";
import { GameState } from "../../core/GameStateManager";
import { InputManager } from "../../core/InputManager";
import { InputAction } from "../../core/InputAction";
import { DialogueBox } from "./DialogueBox";

export interface DialogueLine {
  speaker: string;
  text: string;
}

export interface DialogueChoice {
  text: string;
  onSelect: () => void;
}

export interface DialogueData {
  lines: DialogueLine[];
  onEnd?: () => void;
  choices?: DialogueChoice[];
}

export class DialogueManager {
  private static instance: DialogueManager;
  private scene: Phaser.Scene | null = null;
  private box: DialogueBox | null = null;
  private queue: DialogueData[] = [];
  private currentData: DialogueData | null = null;
  private lineIndex: number = 0;
  private active: boolean = false;
  private initialized: boolean = false;
  private onDialogueEnd: (() => void) | null = null;

  private constructor() {}

  public static getInstance(): DialogueManager {
    if (!DialogueManager.instance) {
      DialogueManager.instance = new DialogueManager();
    }
    return DialogueManager.instance;
  }

  public initialize(scene: Phaser.Scene): void {
    if (this.initialized) return;
    this.scene = scene;
    this.box = new DialogueBox(scene);
    this.initialized = true;
    Logger.getInstance().log("[DialogueManager] Initialized");
  }

  public start(data: DialogueData): void {
    if (!this.box || !this.scene) return;

    this.queue.push(data);

    if (!this.active) {
      this.processNext();
    }
  }

  private processNext(): void {
    if (this.queue.length === 0) {
      this.endDialogue();
      return;
    }

    this.currentData = this.queue.shift()!;
    this.lineIndex = 0;
    this.active = true;
    GameStateManager.getInstance().setState(GameState.DIALOGUE);
    this.showLine();
  }

  private showLine(): void {
    if (!this.currentData || !this.box) return;

    if (this.lineIndex >= this.currentData.lines.length) {
      this.currentData.onEnd?.();
      this.currentData = null;
      this.processNext();
      return;
    }

    const line = this.currentData.lines[this.lineIndex];
    this.box.show(line.speaker, line.text, () => this.nextLine());
  }

  private nextLine(): void {
    this.lineIndex++;
    this.showLine();
  }

  private endDialogue(): void {
    this.active = false;
    this.currentData = null;
    this.box?.hide();
    GameStateManager.getInstance().setState(GameState.PLAYING);

    if (this.onDialogueEnd) {
      this.onDialogueEnd();
      this.onDialogueEnd = null;
    }
  }

  public update(delta: number): void {
    if (!this.active || !this.box) return;

    this.box.update(delta);

    if (InputManager.getInstance().wasJustPressed(InputAction.CONFIRM) ||
        InputManager.getInstance().wasJustPressed(InputAction.INTERACT)) {
      this.box.continue();
    }

    if (InputManager.getInstance().wasJustPressed(InputAction.BACK)) {
      this.box.skip();
    }
  }

  public isActive(): boolean {
    return this.active;
  }

  public setOnDialogueEnd(callback: () => void): void {
    this.onDialogueEnd = callback;
  }

  public destroy(): void {
    if (this.box) {
      this.box.destroy();
      this.box = null;
    }
    this.queue = [];
    this.currentData = null;
    this.active = false;
    this.initialized = false;
    Logger.getInstance().log("[DialogueManager] Destroyed");
  }
}
