import { IEnemyConfig } from "./EnemyConfig";
import { EnemyAI } from "./EnemyAI";
import { EnemyHealth } from "./EnemyHealth";
import { EnemyAnimator } from "./EnemyAnimator";
import { IEnemyState } from "../states/IEnemyState";

export class EnemyController {
  public readonly ai: EnemyAI;
  public readonly health: EnemyHealth;
  public readonly animator: EnemyAnimator | null = null;

  private config: IEnemyConfig;

  constructor(
    config: IEnemyConfig,
    ai: EnemyAI,
    health: EnemyHealth,
    animator: EnemyAnimator | null
  ) {
    this.config = config;
    this.ai = ai;
    this.health = health;
    this.animator = animator;
  }

  public initialize(
    x: number,
    y: number,
    player: Phaser.GameObjects.GameObject,
    states: IEnemyState[],
    initialState: string
  ): void {
    this.ai.initialize(x, y, player);
    this.ai.setStateMachine(states, initialState);
  }

  public update(dt: number): void {
    this.ai.update(dt);
    if (this.animator) {
      this.animator.update(dt * 1000);
    }
  }

  public getConfig(): IEnemyConfig {
    return this.config;
  }
}
