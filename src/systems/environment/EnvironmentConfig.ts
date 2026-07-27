export interface ICliffMapping {
  topLeft: number;
  topCenter: number;
  topRight: number;
  wallLeft: number;
  wallCenter: number;
  wallRight: number;
}

export interface IEnvironmentConfig {
  key: string;
  tilesetKey: string;
  groundTileIndex: number;
  pathTileIndex: number;
  cliffMapping: ICliffMapping;
  decorations: number[];
}

export const ENVIRONMENT_CONFIGS: Record<string, IEnvironmentConfig> = {
  forest: {
    key: "forest",
    tilesetKey: "env-forest-tileset",
    groundTileIndex: 0, // Green grass
    pathTileIndex: 3,   // Dirt path
    cliffMapping: {
      topLeft: 56,
      topCenter: 57,
      topRight: 58,
      wallLeft: 70,
      wallCenter: 71,
      wallRight: 72,
    },
    decorations: [
      98, 99, 100, 101, 102, // Grass tufts, weeds
      112, 113, 114, 115,    // Flowers
      126, 127, 128, 129,    // Pink/white flowers
    ],
  },
  cave: {
    key: "cave",
    tilesetKey: "env-cave-tileset",
    groundTileIndex: 9, // Mossy stone floor
    pathTileIndex: 5,   // Rocky dirt
    cliffMapping: {
      topLeft: 68,
      topCenter: 68,
      topRight: 69,
      wallLeft: 82,
      wallCenter: 82,
      wallRight: 83,
    },
    decorations: [
      104, 105, // Pebbles
      116, 130, 131, // Mushrooms
      118, 119, // Small stones
    ],
  },
  sandbox: {
    key: "sandbox",
    tilesetKey: "env-sandbox-tileset",
    groundTileIndex: 4, // Dark soil
    pathTileIndex: 6,   // Gravel
    cliffMapping: {
      topLeft: 56,
      topCenter: 57,
      topRight: 58,
      wallLeft: 70,
      wallCenter: 71,
      wallRight: 72,
    },
    decorations: [
      98, 104, 118, // Weeds, pebbles, stones
    ],
  },
};
