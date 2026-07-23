import Phaser from "phaser";
import { IWorldObject, WorldObjectType } from "../../world/IWorldObject";

export interface IWorldObjectSpawnParams {
  scene: Phaser.Scene;
  id: string;
  type: WorldObjectType;
  x: number;
  y: number;
  width: number;
  height: number;
  color: number;
  alpha?: number;
  isCollidable?: boolean;
  strokeColor?: number;
  strokeWidth?: number;
}

export class WorldObject implements IWorldObject {
  public readonly id: string;
  public readonly type: WorldObjectType;
  public readonly x: number;
  public readonly y: number;
  public readonly width: number;
  public readonly height: number;
  public readonly isCollidable: boolean;
  public readonly gameObject: Phaser.GameObjects.Rectangle;
  public readonly body: Phaser.Physics.Arcade.StaticBody | null;

  constructor(params: IWorldObjectSpawnParams) {
    this.id = params.id;
    this.type = params.type;
    this.x = params.x;
    this.y = params.y;
    this.width = params.width;
    this.height = params.height;
    this.isCollidable = params.isCollidable ?? false;

    this.gameObject = params.scene.add.rectangle(
      params.x,
      params.y,
      params.width,
      params.height,
      params.color,
      params.alpha ?? 1
    );

    if (params.strokeColor !== undefined && params.strokeWidth !== undefined) {
      this.gameObject.setStrokeStyle(params.strokeWidth, params.strokeColor);
    }

    this.body = null;
    if (this.isCollidable) {
      params.scene.physics.add.existing(this.gameObject, true);
      this.body = this.gameObject.body as Phaser.Physics.Arcade.StaticBody;
    }
  }

  public setDepth(depth: number): void {
    this.gameObject.setDepth(depth);
  }

  public setVisible(visible: boolean): void {
    this.gameObject.setVisible(visible);
  }

  public destroy(): void {
    this.gameObject.destroy();
  }
}
