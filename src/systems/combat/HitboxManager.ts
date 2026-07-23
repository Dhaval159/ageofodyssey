import { HitboxShape } from "../../data/AttackData";

interface IActiveHitbox {
  id: string;
  ownerId: string;
  shape: { type: HitboxShape; x: number; y: number; width?: number; height?: number; radius?: number };
  damage: number;
  lifetime: number;
  maxLifetime: number;
  hitEntities: Set<string>;
}

export interface HitboxVisual {
  shape: HitboxShape;
  x: number;
  y: number;
  width?: number;
  height?: number;
  radius?: number;
  active: boolean;
}

export class HitboxManager {
  private hitboxes: Map<string, IActiveHitbox> = new Map();
  private nextId: number = 0;

  public createHitbox(
    ownerId: string,
    shape: HitboxShape,
    centerX: number,
    centerY: number,
    damage: number,
    lifetime: number,
    size: { width?: number; height?: number; radius?: number }
  ): string {
    const id = `hitbox_${this.nextId++}_${ownerId}`;
    const hitbox: IActiveHitbox = {
      id,
      ownerId,
      shape: { type: shape, x: centerX, y: centerY, ...size },
      damage,
      lifetime,
      maxLifetime: lifetime,
      hitEntities: new Set(),
    };
    this.hitboxes.set(id, hitbox);
    return id;
  }

  public update(delta: number): Array<{ hitboxId: string; ownerId: string; damage: number; x: number; y: number }> {
    const hits: Array<{ hitboxId: string; ownerId: string; damage: number; x: number; y: number }> = [];
    const expired: string[] = [];

    const dt = delta / 1000;

    for (const [id, hb] of this.hitboxes) {
      hb.lifetime -= dt;
      if (hb.lifetime <= 0) {
        expired.push(id);
      }
    }

    for (const id of expired) {
      this.hitboxes.delete(id);
    }

    return hits;
  }

  public updatePosition(hitboxId: string, x: number, y: number): void {
    const hb = this.hitboxes.get(hitboxId);
    if (hb) {
      hb.shape.x = x;
      hb.shape.y = y;
    }
  }

  public removeOwner(ownerId: string): void {
    for (const [id, hb] of this.hitboxes) {
      if (hb.ownerId === ownerId) {
        this.hitboxes.delete(id);
      }
    }
  }

  public getActiveHitboxes(): Map<string, IActiveHitbox> {
    return this.hitboxes;
  }

  public getActiveHitboxCount(): number {
    return this.hitboxes.size;
  }

  public getHitboxesForDebug(): HitboxVisual[] {
    const visuals: HitboxVisual[] = [];
    for (const hb of this.hitboxes.values()) {
      visuals.push({
        shape: hb.shape.type,
        x: hb.shape.x,
        y: hb.shape.y,
        width: hb.shape.width,
        height: hb.shape.height,
        radius: hb.shape.radius,
        active: hb.lifetime > 0,
      });
    }
    return visuals;
  }

  public clearAll(): void {
    this.hitboxes.clear();
  }
}
