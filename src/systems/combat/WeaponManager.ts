import Phaser from "phaser";
import { Weapon } from "./Weapon";
import { WeaponRegistry } from "./WeaponRegistry";
import { AttackType } from "../../data/AttackData";

export class WeaponManager {
  private static instance: WeaponManager;
  private weapons: Map<string, Weapon> = new Map();

  private constructor() {}

  public static getInstance(): WeaponManager {
    if (!WeaponManager.instance) {
      WeaponManager.instance = new WeaponManager();
    }
    return WeaponManager.instance;
  }

  public createWeapon(scene: Phaser.Scene, weaponName: string): Weapon | null {
    const def = WeaponRegistry.getDef(weaponName);
    if (!def) return null;

    const weapon = new Weapon(
      scene,
      def.key,
      def.baseDamage,
      def.range,
      def.attackDuration,
      def.cooldownDuration
    );

    for (const [typeStr, attackDef] of Object.entries(def.attacks)) {
      if (attackDef) {
        weapon.registerAttack(typeStr as AttackType, attackDef);
      }
    }

    return weapon;
  }

  public registerWeapon(id: string, weapon: Weapon): void {
    this.weapons.set(id, weapon);
  }

  public getWeapon(id: string): Weapon | undefined {
    return this.weapons.get(id);
  }

  public removeWeapon(id: string): void {
    const weapon = this.weapons.get(id);
    if (weapon) {
      weapon.destroy();
      this.weapons.delete(id);
    }
  }

  public destroyAll(): void {
    for (const weapon of this.weapons.values()) {
      weapon.destroy();
    }
    this.weapons.clear();
  }
}
