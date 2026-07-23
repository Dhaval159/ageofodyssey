export type WorldObjectType =
  | "rock"
  | "tree"
  | "wall"
  | "obstacle"
  | "ground"
  | "boundary";

export interface IWorldObject {
  readonly id: string;
  readonly type: WorldObjectType;
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly isCollidable: boolean;
}
