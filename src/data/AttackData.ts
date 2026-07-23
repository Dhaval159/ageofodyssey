export enum AttackType {
  LIGHT = "LIGHT",
  HEAVY = "HEAVY",
}

export enum HitboxShape {
  RECTANGLE = "RECTANGLE",
  CIRCLE = "CIRCLE",
}

export interface HitboxDef {
  shape: HitboxShape;
  width?: number;
  height?: number;
  radius?: number;
  offsetX: number;
  offsetY: number;
}

export interface AttackDef {
  type: AttackType;
  damage: number;
  range: number;
  duration: number;
  cooldown: number;
  hitbox: HitboxDef;
  animationSpeed?: number;
  knockback?: number;
}

export interface AttackRequest {
  type: AttackType;
  direction: { x: number; y: number };
  position: { x: number; y: number };
}
