import Phaser from "phaser";
import { Logger } from "./Logger";
import { SceneManager } from "./SceneManager";
import { ScreenFadeSystem } from "./ScreenFadeSystem";
import { GameState, GameStateManager } from "./GameStateManager";
import { GameEvents } from "./GameEvents";

export interface ITransitionOptions {
  /** Fade out duration in milliseconds. Defaults to 500. */
  fadeDuration?: number;
  /** Delay before starting the fade out. Defaults to 0. */
  preDelay?: number;
  /** Delay after starting the new scene. Defaults to 0. */
  postDelay?: number;
}

/**
 * SceneTransitionManager is the single authority for all scene changes.
 * Scenes must never call scene.start() directly; they must request transitions through this manager.
 */
export class SceneTransitionManager {
  private static instance: SceneTransitionManager;
  private sceneManager: SceneManager;
  private isTransitioning: boolean = false;

  private constructor() {
    this.sceneManager = SceneManager.getInstance();
  }

  public static getInstance(): SceneTransitionManager {
    if (!SceneTransitionManager.instance) {
      SceneTransitionManager.instance = new SceneTransitionManager();
    }
    return SceneTransitionManager.instance;
  }

  /**
   * Register the active scene so the manager can control transitions from it.
   */
  public initialize(scene: Phaser.Scene): void {
    this.sceneManager.register(scene);
    this.sceneManager.setCurrentScene(scene.scene.key);
  }

  /**
   * Transition from the current scene to the target scene.
   */
  public async transitionTo(targetKey: string, options: ITransitionOptions = {}): Promise<void> {
    if (this.isTransitioning) {
      Logger.getInstance().warn(`Transition blocked: already transitioning to ${targetKey}`);
      return;
    }

    const currentScene = this.sceneManager.getScene(
      this.sceneManager.getCurrentSceneKey() || ""
    );

    if (!currentScene || currentScene.scene.key === targetKey) {
      return;
    }

    this.isTransitioning = true;
    const from = currentScene.scene.key;
    const fadeDuration = options.fadeDuration ?? 500;
    const preDelay = options.preDelay ?? 0;
    const postDelay = options.postDelay ?? 0;

    Logger.getInstance().log(`Transition requested: ${from} -> ${targetKey}`);

    const payload = { from, to: targetKey } as const;
    Logger.getInstance().log(`Transition started: ${from} -> ${targetKey}`);
    GameStateManager.getInstance().emit(GameEvents.TRANSITION_STARTED, payload);

    if (preDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, preDelay));
    }

    await ScreenFadeSystem.fadeOut(currentScene, fadeDuration);

    GameStateManager.getInstance().setState(GameState.LOADING);

    currentScene.scene.start(targetKey);

    if (postDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, postDelay));
    }

    Logger.getInstance().log(`Transition complete: ${from} -> ${targetKey}`);
    GameStateManager.getInstance().emit(GameEvents.TRANSITION_FINISHED, payload);
    this.isTransitioning = false;
  }

  public get isBusy(): boolean {
    return this.isTransitioning;
  }
}
