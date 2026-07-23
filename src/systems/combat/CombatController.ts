import { Weapon } from "./Weapon";
import { HitboxManager } from "./HitboxManager";
import { AttackType, AttackDef, HitboxShape } from "../../data/AttackData";

export enum CombatState {
  IDLE = "IDLE",
  ATTACKING = "ATTACKING",
  COOLDOWN = "COOLDOWN",
}

export class CombatController {
  private weapon: Weapon;
  private hitboxManager: HitboxManager;
  private ownerId: string;
  private state: CombatState = CombatState.IDLE;
  private currentAttackType: AttackType = AttackType.LIGHT;
  private stateTimer: number = 0;
  private activeHitboxId: string | null = null;
  private attackQueue: AttackType[] = [];
  private comboStep: number = 0;

  constructor(
    weapon: Weapon,
    hitboxManager: HitboxManager,
    ownerId: string
  ) {
    this.weapon = weapon;
    this.hitboxManager = hitboxManager;
    this.ownerId = ownerId;
  }

  public requestAttack(
    type: AttackType,
    direction: { x: number; y: number },
    position: { x: number; y: number }
  ): boolean {
    if (this.state === CombatState.ATTACKING) {
      this.attackQueue.push(type);
      return false;
    }

    const attackDef = this.weapon.getAttackDef(type);
    if (!attackDef) return false;

    if (this.state === CombatState.COOLDOWN) {
      this.attackQueue.push(type);
      return false;
    }

    this.startAttack(type, attackDef, direction, position);
    return true;
  }

  private startAttack(
    type: AttackType,
    def: AttackDef,
    direction: { x: number; y: number },
    position: { x: number; y: number }
  ): void {
    this.state = CombatState.ATTACKING;
    this.currentAttackType = type;
    this.stateTimer = def.duration;
    this.comboStep++;

    this.weapon.startSwing(direction.x, direction.y, position.x, position.y);

    this.createHitbox(def, position, direction);
  }

  private createHitbox(
    def: AttackDef,
    position: { x: number; y: number },
    direction: { x: number; y: number }
  ): void {
    if (this.activeHitboxId) {
      this.hitboxManager.removeOwner(this.ownerId);
      this.activeHitboxId = null;
    }

    const hb = def.hitbox;
    const cx = position.x + direction.x * hb.offsetX;
    const cy = position.y + direction.y * hb.offsetY;

    this.activeHitboxId = this.hitboxManager.createHitbox(
      this.ownerId,
      hb.shape,
      cx,
      cy,
      def.damage,
      def.duration,
      hb.shape === HitboxShape.RECTANGLE
        ? { width: hb.width, height: hb.height }
        : { radius: hb.radius }
    );
  }

  public update(dt: number, position: { x: number; y: number }, direction: { x: number; y: number }): void {
    this.weapon.updateSwing(dt, direction.x, direction.y);

    if (this.activeHitboxId) {
      const hb = this.hitboxManager.getActiveHitboxes().get(this.activeHitboxId);
      if (hb) {
        const def = this.weapon.getAttackDef(this.currentAttackType);
        const offsetX = def ? def.hitbox.offsetX : 18;
        const offsetY = def ? def.hitbox.offsetY : 0;
        hb.shape.x = position.x + direction.x * offsetX;
        hb.shape.y = position.y + direction.y * offsetY;
      }
    }

    switch (this.state) {
      case CombatState.ATTACKING:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.endAttack();
        }
        break;

      case CombatState.COOLDOWN:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = CombatState.IDLE;
          this.processQueue();
        }
        break;
    }
  }

  private endAttack(): void {
    this.weapon.endSwing();
    if (this.activeHitboxId) {
      this.hitboxManager.removeOwner(this.ownerId);
      this.activeHitboxId = null;
    }

    const def = this.weapon.getAttackDef(this.currentAttackType);
    if (def) {
      this.state = CombatState.COOLDOWN;
      this.stateTimer = def.cooldown;
    } else {
      this.state = CombatState.IDLE;
      this.processQueue();
    }
  }

  private processQueue(): void {
    if (this.attackQueue.length > 0) {
      this.attackQueue = [];
    }
  }

  public isAttacking(): boolean {
    return this.state === CombatState.ATTACKING;
  }

  public isOnCooldown(): boolean {
    return this.state === CombatState.COOLDOWN;
  }

  public isIdle(): boolean {
    return this.state === CombatState.IDLE;
  }

  public getState(): CombatState {
    return this.state;
  }

  public getCurrentAttackType(): AttackType {
    return this.currentAttackType;
  }

  public getWeapon(): Weapon {
    return this.weapon;
  }

  public getComboStep(): number {
    return this.comboStep;
  }

  public destroy(): void {
    this.hitboxManager.removeOwner(this.ownerId);
    this.weapon.destroy();
  }
}
