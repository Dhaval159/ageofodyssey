import { IEnemyConfig } from "../framework/EnemyConfig";

export const WOLF_CONFIG: IEnemyConfig = {
  entityType: "wolf",
  maxHealth: 40,
  damage: 8,
  attackCooldown: 1.0,
  attackDuration: 0.4,
  attackRange: 48,
  visionRadius: 220,
  aggroRadius: 300,
  speed: 60,
  chaseSpeed: 140,
  size: { width: 28, height: 24 },
  color: 0x808080,
  deathRemoveDelay: 1.5,
  patrolRadius: 160,
  patrolPauseMin: 1.0,
  patrolPauseMax: 3.0,
  reactionTime: 0.2,
};
