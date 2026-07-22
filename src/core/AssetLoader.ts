import { Logger } from "./Logger";

/**
 * Asset loader helper for centralized asset management
 */
export class AssetLoader {
  private static instance: AssetLoader;

  private constructor() { }

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  public getImagePath(key: string): string {
    return `/assets/images/${key}.png`;
  }

  public getSpritePath(key: string): string {
    return `/assets/sprites/${key}.png`;
  }

  public getTilesetPath(key: string): string {
    return `/assets/tilesets/${key}.png`;
  }

  public getAudioPath(key: string): string {
    return `/assets/audio/${key}.mp3`;
  }

  public getFontPath(key: string): string {
    return `/assets/fonts/${key}.woff2`;
  }

  public loadAssets(): void {
    Logger.getInstance().log("Loading assets...");
  }
}