import { HealthComponent } from "../../../systems/combat/HealthComponent";
import { DamageSystem } from "../../../systems/combat/DamageSystem";
import { Logger } from "../../../core/Logger";

export class EnemyHealth {
  private health: HealthComponent;
  private onDeathCallback: (() => void) | null = null;
  private onDamageCallback: ((amount: number) => void) | null = null;

  constructor(maxHealth: number) {
    this.health = new HealthComponent(maxHealth);
  }

  public setOnDeath(callback: () => void): void {
    this.onDeathCallback = callback;
  }

  public setOnDamage(callback: (amount: number) => void): void {
    this.onDamageCallback = callback;
  }

  public takeDamage(amount: number): number {
    const damageSystem = new DamageSystem();
    const result = damageSystem.applyDamage(this.health, amount);

    if (result.damageDealt > 0 && this.onDamageCallback) {
      this.onDamageCallback(result.damageDealt);
    }

    if (result.targetKilled && this.onDeathCallback) {
      Logger.getInstance().log(`[EnemyHealth] Entity killed, overkill: ${result.overkill}`);
      this.onDeathCallback();
    }

    return result.damageDealt;
  }

  public heal(amount: number): number {
    return this.health.heal(amount);
  }

  public isAlive(): boolean {
    return this.health.isAlive();
  }

  public getCurrentHealth(): number {
    return this.health.getCurrentHealth();
  }

  public getMaxHealth(): number {
    return this.health.getMaxHealth();
  }

  public getHealthPercent(): number {
    return this.health.getHealthPercent();
  }
}
