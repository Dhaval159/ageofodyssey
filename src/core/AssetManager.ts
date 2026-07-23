import Phaser from "phaser";
import { Logger } from "./Logger";
import { AssetLoader } from "./AssetLoader";
import { ResourceCache } from "./ResourceCache";
import { getAllAssetEntries } from "../constants/AssetManifest";

/**
 * AssetManager is the single entry point for all asset operations.
 * Scenes and systems should request assets through AssetManager rather
 * than accessing Phaser loaders or textures directly.
 */
export class AssetManager {
  private static instance: AssetManager;
  private assetLoader: AssetLoader;
  private resourceCache: ResourceCache;
  private scene: Phaser.Scene | null = null;

  private constructor() {
    this.assetLoader = AssetLoader.getInstance();
    this.resourceCache = ResourceCache.getInstance();
  }

  public static getInstance(): AssetManager {
    if (!AssetManager.instance) {
      AssetManager.instance = new AssetManager();
    }
    return AssetManager.instance;
  }

  public initialize(scene: Phaser.Scene): void {
    this.scene = scene;
    this.resourceCache.initialize(scene);
    Logger.getInstance().log("AssetManager initialized");
  }

  public loadAll(onProgress?: (percent: number) => void): void {
    if (!this.scene) {
      throw new Error("AssetManager not initialized. Call initialize() first.");
    }

    Logger.getInstance().log("AssetManager: loading all manifest assets");
    const entries = getAllAssetEntries();

    entries.forEach((def) => {
      this.resourceCache.registerMetadata(def);
    });

    this.assetLoader.loadManifest(this.scene.load);

    this.scene.load.on("progress", (value: number) => {
      if (onProgress) onProgress(value);
    });

    this.scene.load.on("complete", () => {
      entries.forEach((def) => {
        this.resourceCache.markLoaded(def.key);
      });
      Logger.getInstance().log(`AssetManager: loaded ${entries.length} assets`);
    });
  }

  public isLoaded(key: string): boolean {
    return this.resourceCache.isLoaded(key);
  }

  public getTexture(key: string): Phaser.Textures.Texture | undefined {
    if (!this.scene) return undefined;
    return this.scene.textures.get(key);
  }

  public getAudio(key: string): Phaser.Sound.BaseSound | undefined {
    if (!this.scene) return undefined;
    return this.scene.sound.get(key);
  }

  public getLoadedAssets(): string[] {
    return this.resourceCache.getAllLoaded();
  }

  public getMetadata(key: string) {
    return this.resourceCache.getMetadata(key);
  }
}
