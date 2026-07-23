import { IEnemyConfig } from "../framework/EnemyConfig";

export const WOLF_CONFIG: IEnemyConfig = {
  entityType: "wolf",
  maxHealth: 40,
  damage: 8,
  attackCooldown: 1.2,
  attackDuration: 0.5,
  attackRange: 35,
  visionRadius: 200,
  aggroRadius: 280,
  speed: 70,
  chaseSpeed: 130,
  size: { width: 28, height: 24 },
  color: 0x808080,
  deathRemoveDelay: 3.0,
  patrolRadius: 150,
  patrolPauseMin: 1.5,
  patrolPauseMax: 4.0,
};
