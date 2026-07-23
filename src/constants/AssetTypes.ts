/**
 * Asset category and type definitions used in the manifest system.
 */
export type AssetCategory =
  | "ui"
  | "images"
  | "sprites"
  | "tilesets"
  | "audio"
  | "music"
  | "sfx"
  | "fonts"
  | "effects"
  | "cutscenes"
  | "bosses";

export type AssetType = "image" | "spritesheet" | "audio" | "font" | "tilemap" | "tileset";

export interface IAssetDefinition {
  key: string;
  path: string;
  category: AssetCategory;
  type: AssetType;
  metadata?: Record<string, unknown>;
}
