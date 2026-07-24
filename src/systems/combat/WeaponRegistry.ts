import { AttackType, AttackDef, HitboxShape } from "../../data/AttackData";

export interface WeaponDef {
  name: string;
  key: string;
  baseDamage: number;
  range: number;
  attackDuration: number;
  cooldownDuration: number;
  attacks: Partial<Record<AttackType, AttackDef>>;
}

export class WeaponRegistry {
  private static weapons: Map<string, WeaponDef> = new Map();

  public static register(name: string, def: WeaponDef): void {
    WeaponRegistry.weapons.set(name, def);
  }

  public static getDef(name: string): WeaponDef | undefined {
    return WeaponRegistry.weapons.get(name);
  }

  public static registerDefaultSword(): void {
    WeaponRegistry.register("placeholder_sword", {
      name: "Placeholder Sword",
      key: "placeholder_weapon_sword",
      baseDamage: 15,
      range: 28,
      attackDuration: 0.3,
      cooldownDuration: 0.5,
      attacks: {
        [AttackType.LIGHT]: {
          type: AttackType.LIGHT,
          damage: 15,
          range: 28,
          duration: 0.15,
          cooldown: 0.3,
          windUp: 0.04,
          hitbox: {
            shape: HitboxShape.RECTANGLE,
            width: 28,
            height: 16,
            offsetX: 18,
            offsetY: 0,
          },
        },
        [AttackType.HEAVY]: {
          type: AttackType.HEAVY,
          damage: 25,
          range: 32,
          duration: 0.35,
          cooldown: 0.4,
          windUp: 0.08,
          hitbox: {
            shape: HitboxShape.RECTANGLE,
            width: 32,
            height: 20,
            offsetX: 20,
            offsetY: 0,
          },
        },
      },
    });
  }

  public static registerWolfClaw(): void {
    WeaponRegistry.register("wolf_claw", {
      name: "Wolf Claw",
      key: "wolf_claw",
      baseDamage: 8,
      range: 24,
      attackDuration: 0.5,
      cooldownDuration: 1.2,
      attacks: {
        [AttackType.LIGHT]: {
          type: AttackType.LIGHT,
          damage: 8,
          range: 24,
          duration: 0.5,
          cooldown: 1.2,
          windUp: 0.15,
          hitbox: {
            shape: HitboxShape.RECTANGLE,
            width: 24,
            height: 20,
            offsetX: 14,
            offsetY: 0,
          },
        },
      },
    });
  }
}
