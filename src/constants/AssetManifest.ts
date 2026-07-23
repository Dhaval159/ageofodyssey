import { AssetKeys } from "./AssetKeys";
import { AssetCategory, IAssetDefinition } from "./AssetTypes";

/**
 * Single source of truth for every asset in the project.
 * Add new assets here before referencing them in scenes or systems.
 */
export const AssetManifest: Record<AssetCategory, IAssetDefinition[]> = {
  ui: [
    {
      key: AssetKeys.UI_BUTTON_NORMAL,
      path: "/assets/ui/btn-normal.png",
      category: "ui",
      type: "image",
    },
    {
      key: AssetKeys.UI_BUTTON_HOVER,
      path: "/assets/ui/btn-hover.png",
      category: "ui",
      type: "image",
    },
    {
      key: AssetKeys.UI_BUTTON_ACTIVE,
      path: "/assets/ui/btn-active.png",
      category: "ui",
      type: "image",
    },
    {
      key: AssetKeys.UI_LOADING_BG,
      path: "/assets/ui/loading-bg.png",
      category: "ui",
      type: "image",
    },
    {
      key: AssetKeys.UI_LOADING_FILL,
      path: "/assets/ui/loading-fill.png",
      category: "ui",
      type: "image",
    },
  ],
  images: [
    {
      key: AssetKeys.IMAGE_LOGO,
      path: "/assets/images/logo.png",
      category: "images",
      type: "image",
    },
    {
      key: AssetKeys.IMAGE_PARTICLE,
      path: "/assets/images/particle.png",
      category: "images",
      type: "image",
    },
  ],
  sprites: [],
  tilesets: [],
  audio: [],
  music: [],
  sfx: [],
  fonts: [],
  effects: [],
  cutscenes: [],
  bosses: [],
};

export function getManifestByCategory(category: AssetCategory): IAssetDefinition[] {
  return AssetManifest[category] || [];
}

export function getManifestEntry(key: string): IAssetDefinition | undefined {
  for (const category of Object.values(AssetManifest)) {
    const entry = category.find((def) => def.key === key);
    if (entry) return entry;
  }
  return undefined;
}

export function getAllAssetEntries(): IAssetDefinition[] {
  return Object.values(AssetManifest).flat() as IAssetDefinition[];
}
