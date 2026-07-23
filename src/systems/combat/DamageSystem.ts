import { HealthComponent } from "./HealthComponent";

export interface DamageResult {
  damageDealt: number;
  targetKilled: boolean;
  overkill: number;
}

export class DamageSystem {
  public applyDamage(
    target: HealthComponent,
    baseDamage: number
  ): DamageResult {
    if (!target.isAlive()) {
      return { damageDealt: 0, targetKilled: false, overkill: 0 };
    }

    const damageDealt = target.takeDamage(baseDamage);
    const targetKilled = !target.isAlive();
    const overkill = targetKilled ? Math.abs(target.getCurrentHealth()) : 0;

    return { damageDealt, targetKilled, overkill };
  }
}
