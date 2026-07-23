export class HealthComponent {
  private currentHealth: number;
  private maxHealth: number;

  constructor(maxHealth: number, initialHealth?: number) {
    this.maxHealth = maxHealth;
    this.currentHealth = initialHealth ?? maxHealth;
  }

  public takeDamage(amount: number): number {
    if (!this.isAlive()) return 0;
    const actualDamage = Math.min(amount, this.currentHealth);
    this.currentHealth -= actualDamage;
    return actualDamage;
  }

  public heal(amount: number): number {
    if (!this.isAlive()) return 0;
    const missing = this.maxHealth - this.currentHealth;
    const actualHeal = Math.min(amount, missing);
    this.currentHealth += actualHeal;
    return actualHeal;
  }

  public isAlive(): boolean {
    return this.currentHealth > 0;
  }

  public getCurrentHealth(): number {
    return this.currentHealth;
  }

  public getMaxHealth(): number {
    return this.maxHealth;
  }

  public getHealthPercent(): number {
    return this.currentHealth / this.maxHealth;
  }

  public setMaxHealth(value: number, adjustCurrent?: boolean): void {
    this.maxHealth = value;
    if (adjustCurrent) {
      this.currentHealth = Math.min(this.currentHealth, this.maxHealth);
    }
  }
}
