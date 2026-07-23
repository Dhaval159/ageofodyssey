import { EnemyAI } from "../framework/EnemyAI";

export interface IEnemyState {
  readonly id: string;
  enter(ai: EnemyAI): void;
  update(ai: EnemyAI, dt: number): void;
  exit(ai: EnemyAI): void;
}
