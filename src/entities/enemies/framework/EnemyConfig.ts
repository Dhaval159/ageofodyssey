export interface IEnemyConfig {
  entityType: string;
  maxHealth: number;
  damage: number;
  attackCooldown: number;
  attackDuration: number;
  attackRange: number;
  visionRadius: number;
  aggroRadius: number;
  speed: number;
  chaseSpeed: number;
  size: { width: number; height: number };
  color: number;
  deathRemoveDelay: number;
  patrolRadius: number;
  patrolPauseMin: number;
  patrolPauseMax: number;
}

export const DEFAULT_ENEMY_CONFIG: IEnemyConfig = {
  entityType: "enemy",
  maxHealth: 50,
  damage: 10,
  attackCooldown: 1.0,
  attackDuration: 0.4,
  attackRange: 32,
  visionRadius: 200,
  aggroRadius: 300,
  speed: 80,
  chaseSpeed: 140,
  size: { width: 32, height: 32 },
  color: 0xff4444,
  deathRemoveDelay: 3.0,
  patrolRadius: 150,
  patrolPauseMin: 1.0,
  patrolPauseMax: 3.0,
};
