export type WorldObjectType =
  | "rock"
  | "tree"
  | "wall"
  | "obstacle"
  | "ground"
  | "boundary"
  | "crate"
  | "gate"
  | "torch"
  | "barrel"
  | "pillar"
  | "fence"
  | "mat";

export interface IWorldObject {
  readonly id: string;
  readonly type: WorldObjectType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isCollidable: boolean;
}
