export const EnemyStateId = {
  IDLE: "IDLE",
  PATROL: "PATROL",
  INVESTIGATE: "INVESTIGATE",
  CHASE: "CHASE",
  ATTACK: "ATTACK",
  HURT: "HURT",
  DEAD: "DEAD",
  RETURN_HOME: "RETURN_HOME",
} as const;

export type EnemyStateIdType = (typeof EnemyStateId)[keyof typeof EnemyStateId];
