import Phaser from "phaser";
import { IAssetDefinition } from "../constants/AssetTypes";

/**
 * ResourceCache tracks loaded assets and stores manifest metadata.
 * Provides a lightweight lookup layer above Phaser's built-in cache.
 */
export class ResourceCache {
  private static instance: ResourceCache;
  private loadedKeys: Set<string>;
  private metadata: Map<string, IAssetDefinition>;

  private constructor() {
    this.loadedKeys = new Set<string>();
    this.metadata = new Map<string, IAssetDefinition>();
  }

  public static getInstance(): ResourceCache {
    if (!ResourceCache.instance) {
      ResourceCache.instance = new ResourceCache();
    }
    return ResourceCache.instance;
  }

  public initialize(_scene: Phaser.Scene): void {
    // reserved for future scene-specific cache integration
  }

  public markLoaded(key: string): void {
    this.loadedKeys.add(key);
  }

  public isLoaded(key: string): boolean {
    return this.loadedKeys.has(key);
  }

  public getLoadedCount(): number {
    return this.loadedKeys.size;
  }

  public registerMetadata(definition: IAssetDefinition): void {
    this.metadata.set(definition.key, definition);
  }

  public getMetadata(key: string): IAssetDefinition | undefined {
    return this.metadata.get(key);
  }

  public getAllLoaded(): string[] {
    return Array.from(this.loadedKeys);
  }

  public getAllMetadata(): IAssetDefinition[] {
    return Array.from(this.metadata.values());
  }

  public clear(): void {
    this.loadedKeys.clear();
    this.metadata.clear();
  }
}
