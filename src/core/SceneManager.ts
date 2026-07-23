import Phaser from "phaser";
import { Logger } from "./Logger";

/**
 * Centralized scene registry and transition manager.
 * Tracks registered scenes and current scene state.
 */
export class SceneManager {
  private static instance: SceneManager;
  private scenes: Map<string, Phaser.Scene>;
  private currentSceneKey: string | null = null;

  private constructor() {
    this.scenes = new Map<string, Phaser.Scene>();
  }

  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  public register(scene: Phaser.Scene): void {
    this.scenes.set(scene.scene.key, scene);
    Logger.getInstance().log(`Scene registered: ${scene.scene.key}`);
  }

  public getScene(key: string): Phaser.Scene | undefined {
    return this.scenes.get(key);
  }

  public setCurrentScene(key: string): void {
    this.currentSceneKey = key;
  }

  public getCurrentSceneKey(): string | null {
    return this.currentSceneKey;
  }
}
