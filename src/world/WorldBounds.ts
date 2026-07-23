export interface IWorldBoundsData {
  x: number;
  y: number;
  width: number;
  height: number;
}

export class WorldBounds implements IWorldBoundsData {
  public readonly x: number;
  public readonly y: number;
  public readonly width: number;
  public readonly height: number;

  constructor(data: IWorldBoundsData) {
    this.x = data.x;
    this.y = data.y;
    this.width = data.width;
    this.height = data.height;
  }

  public contains(x: number, y: number): boolean {
    return (
      x >= this.x &&
      x <= this.x + this.width &&
      y >= this.y &&
      y <= this.y + this.height
    );
  }

  public clamp(x: number, y: number): { x: number; y: number } {
    return {
      x: Math.max(this.x, Math.min(this.x + this.width, x)),
      y: Math.max(this.y, Math.min(this.y + this.height, y)),
    };
  }

  public getRight(): number {
    return this.x + this.width;
  }

  public getBottom(): number {
    return this.y + this.height;
  }

  public getCenterX(): number {
    return this.x + this.width / 2;
  }

  public getCenterY(): number {
    return this.y + this.height / 2;
  }
}
