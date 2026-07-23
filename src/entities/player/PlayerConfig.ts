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
}

export const DEFAULT_PLAYER_CONFIG: IPlayerConfig = {
  walkSpeed: 160,
  runSpeed: 280,
  acceleration: 1200, // Pixels per second squared
  deceleration: 1400, // Pixels per second squared
  size: { width: 32, height: 48 },
  color: 0x00ffcc, // Neon cyan/teal
  camera: {
    lerpX: 0.1,
    lerpY: 0.1,
    deadzoneWidth: 60,
    deadzoneHeight: 60,
  },
};
