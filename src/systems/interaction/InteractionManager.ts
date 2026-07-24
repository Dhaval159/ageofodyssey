import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { InputManager } from "../../core/InputManager";
import { InputAction } from "../../core/InputAction";
import { IInteractable } from "./IInteractable";
import { InteractionPrompt } from "./InteractionPrompt";

export class InteractionManager {
  private static instance: InteractionManager;
  private scene: Phaser.Scene | null = null;
  private interactables: IInteractable[] = [];
  private prompt: InteractionPrompt | null = null;
  private player: Phaser.GameObjects.GameObject | null = null;
  private nearestInteractable: IInteractable | null = null;
  private initialized: boolean = false;
  private onInteractionCallback: ((target: IInteractable) => void) | null = null;

  private constructor() {}

  public static getInstance(): InteractionManager {
    if (!InteractionManager.instance) {
      InteractionManager.instance = new InteractionManager();
    }
    return InteractionManager.instance;
  }

  public initialize(scene: Phaser.Scene, player: Phaser.GameObjects.GameObject): void {
    if (this.initialized) return;
    this.scene = scene;
    this.player = player;
    this.prompt = new InteractionPrompt(scene);
    this.interactables = [];
    this.initialized = true;
    Logger.getInstance().log("[InteractionManager] Initialized");
  }

  public register(interactable: IInteractable): void {
    this.interactables.push(interactable);
  }

  public unregister(interactable: IInteractable): void {
    const index = this.interactables.indexOf(interactable);
    if (index !== -1) {
      this.interactables.splice(index, 1);
    }
  }

  public setOnInteractionCallback(callback: ((target: IInteractable) => void) | null): void {
    this.onInteractionCallback = callback;
  }

  public update(): void {
    if (!this.initialized || !this.player || !this.prompt || !this.scene) return;

    const playerPos = this.player as Phaser.GameObjects.GameObject & { x: number; y: number };
    const px = playerPos.x;
    const py = playerPos.y;

    let nearest: IInteractable | null = null;
    let nearestDist = Infinity;

    for (const interactable of this.interactables) {
      if (!interactable.isInteractionEnabled()) continue;
      const pos = interactable.getPosition();
      const dist = Phaser.Math.Distance.Between(px, py, pos.x, pos.y);
      if (dist <= interactable.getInteractionRange() && dist < nearestDist) {
        nearest = interactable;
        nearestDist = dist;
      }
    }

    this.nearestInteractable = nearest;

    if (nearest) {
      const pos = nearest.getPosition();
      this.prompt.show(nearest.getInteractionPrompt(), pos.x, pos.y);
    } else {
      this.prompt.hide();
    }

    this.prompt.update(this.scene.cameras.main);

    const interactPressed = InputManager.getInstance().wasJustPressed(InputAction.INTERACT);

    if (interactPressed && nearest && this.onInteractionCallback) {
      this.onInteractionCallback(nearest);
    }
  }

  public getNearestInteractable(): IInteractable | null {
    return this.nearestInteractable;
  }

  public destroy(): void {
    if (this.prompt) {
      this.prompt.destroy();
      this.prompt = null;
    }
    this.interactables = [];
    this.player = null;
    this.scene = null;
    this.initialized = false;
    Logger.getInstance().log("[InteractionManager] Destroyed");
  }
}
