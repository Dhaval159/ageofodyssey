import Phaser from "phaser";
import { Logger } from "./Logger";
import { getAllAssetEntries } from "../constants/AssetManifest";

/**
 * AssetLoader reads the manifest and queues every file into Phaser's loader.
 * Does not load files directly outside the Phaser preload pipeline.
 */
export class AssetLoader {
  private static instance: AssetLoader;

  private constructor() {}

  public static getInstance(): AssetLoader {
    if (!AssetLoader.instance) {
      AssetLoader.instance = new AssetLoader();
    }
    return AssetLoader.instance;
  }

  public loadManifest(loader: Phaser.Loader.LoaderPlugin): void {
    const entries = getAllAssetEntries();
    Logger.getInstance().log(`Asset manifest: queuing ${entries.length} files for loading`);

    entries.forEach((def) => {
      this.loadDefinition(loader, def);
    });
  }

  private loadDefinition(
    loader: Phaser.Loader.LoaderPlugin,
    def: { key: string; path: string; type: string; metadata?: Record<string, unknown> }
  ): void {
    switch (def.type) {
      case "image":
        loader.image(def.key, def.path);
        break;
      case "spritesheet":
        loader.spritesheet(def.key, def.path, {
          frameWidth: (def.metadata?.frameWidth as number) || 32,
          frameHeight: (def.metadata?.frameHeight as number) || 32,
        });
        break;
      case "audio":
        loader.audio(def.key, def.path);
        break;
      case "font":
        loader.font(def.key, def.path);
        break;
      case "tilemap":
        loader.tilemapTiledJSON(def.key, def.path);
        break;
      case "tileset":
        loader.image(def.key, def.path);
        break;
      default:
        Logger.getInstance().warn(`Unknown asset type: ${def.type} for key ${def.key}`);
    }
  }
}
