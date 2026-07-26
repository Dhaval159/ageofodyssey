export interface ICombatConfig {
  weaponKey: string;
  maxHealth: number;
  lightAttackDuration: number;
  heavyAttackDuration: number;
}

export interface IPlayerConfig {
  walkSpeed: number;
  runSpeed: number;
  rollSpeed: number;
  attackMoveSpeed: number;
  heavyAttackMoveSpeed: number;
  maxVelocity: number;
  acceleration: number;
  deceleration: number;
  size: { width: number; height: number };
  color: number;
  camera: {
    lerpX: number;
    lerpY: number;
    deadzoneWidth: number;
    deadzoneHeight: number;
  };
  combat: ICombatConfig;
}

export const DEFAULT_PLAYER_CONFIG: IPlayerConfig = {
  walkSpeed: 160,
  runSpeed: 280,
  rollSpeed: 320,
  attackMoveSpeed: 64,
  heavyAttackMoveSpeed: 40,
  maxVelocity: 420,
  acceleration: 1600,
  deceleration: 1800,
  size: { width: 32, height: 48 },
  color: 0x00ffcc,
  camera: {
    lerpX: 0.1,
    lerpY: 0.1,
    deadzoneWidth: 60,
    deadzoneHeight: 60,
  },
  combat: {
    weaponKey: "placeholder_sword",
    maxHealth: 100,
    lightAttackDuration: 0.25,
    heavyAttackDuration: 0.5,
  },
};
