import { WorldObjectType } from "../world/IWorldObject";

export interface IWorldObjectSpawnData {
  type: WorldObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  alpha: number;
  isCollidable: boolean;
  strokeColor: number;
  strokeWidth: number;
}

export interface ILevelConfig {
  worldBounds: { x: number; y: number; width: number; height: number };
  groundColor: number;
  groundAlpha: number;
  gridColor: number;
  gridAlpha: number;
  gridSpacing: number;
  boundaryColor: number;
  boundaryAlpha: number;
  boundaryWidth: number;
  objectSpawnData: IWorldObjectSpawnData[];
}

export const DEFAULT_LEVEL_CONFIG: ILevelConfig = {
  worldBounds: { x: 0, y: 0, width: 2000, height: 2000 },
  groundColor: 0x1a1a2e,
  groundAlpha: 1,
  gridColor: 0x2e2e4f,
  gridAlpha: 0.5,
  gridSpacing: 80,
  boundaryColor: 0xff5555,
  boundaryAlpha: 0.4,
  boundaryWidth: 6,
  objectSpawnData: [],
};
