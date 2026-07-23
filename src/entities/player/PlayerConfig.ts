export interface ICombatConfig {
  weaponKey: string;
  maxHealth: number;
  lightAttackDuration: number;
  heavyAttackDuration: number;
}

export interface IPlayerConfig {
  walkSpeed: number;
  runSpeed: number;
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
  acceleration: 1200,
  deceleration: 1400,
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
    lightAttackDuration: 0.3,
    heavyAttackDuration: 0.6,
  },
};
