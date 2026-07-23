import { IEnemyConfig } from "./EnemyConfig";

export class EnemyRegistry {
  private static configs: Map<string, IEnemyConfig> = new Map();

  public static register(entityType: string, config: IEnemyConfig): void {
    EnemyRegistry.configs.set(entityType, { ...config });
  }

  public static getConfig(entityType: string): IEnemyConfig | null {
    const config = EnemyRegistry.configs.get(entityType);
    return config ? { ...config } : null;
  }

  public static has(entityType: string): boolean {
    return EnemyRegistry.configs.has(entityType);
  }

  public static getAllTypes(): string[] {
    return Array.from(EnemyRegistry.configs.keys());
  }
}
