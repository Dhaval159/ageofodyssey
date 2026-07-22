// Global Phaser Scene Manager for scene registration and transitions
export class SceneManager {
  private static instance: SceneManager;
  private scenes: Map<string, () => Phaser.Scene>;

  private constructor() {
    this.scenes = new Map<string, () => Phaser.Scene>();
  }

  public static getInstance(): SceneManager {
    if (!SceneManager.instance) {
      SceneManager.instance = new SceneManager();
    }
    return SceneManager.instance;
  }

  public register(sceneName: string, sceneFactory: () => Phaser.Scene): void {
    this.scenes.set(sceneName, sceneFactory);
  }

  public getScene(sceneName: string): Phaser.Scene | undefined {
    const factory = this.scenes.get(sceneName);
    if (factory) {
      return factory();
    }
    return undefined;
  }

  public transitionTo(_sceneName: string): Promise<void> {
    return new Promise((resolve) => {
      setTimeout(() => resolve(), 100);
    });
  }
}
