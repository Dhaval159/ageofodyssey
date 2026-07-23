export enum AnimationId {
  IDLE = "IDLE",
  WALK = "WALK",
  RUN = "RUN",
  ROLL = "ROLL",
  ATTACK = "ATTACK",
  HEAVY_ATTACK = "HEAVY_ATTACK",
  BLOCK = "BLOCK",
  HURT = "HURT",
  DEATH = "DEATH",
}

export interface AnimationDef {
  key: string;
  prefix: string;
  frameCount: number;
  frameRate: number;
  repeat: number;
  speedScale?: number;
}

export interface AnimationTransition {
  from: AnimationId;
  to: AnimationId;
  duration?: number;
}

export interface EntityAnimationConfig {
  entityType: string;
  animations: Record<AnimationId, AnimationDef>;
  defaultAnimation: AnimationId;
  transitions: AnimationTransition[];
  spritesheet: {
    key: string;
    frameWidth: number;
    frameHeight: number;
  };
}
