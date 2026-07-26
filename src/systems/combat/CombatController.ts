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
  private windUpRemaining: number = 0;
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
    this.stateTimer = def.duration + (def.windUp ?? 0);
    this.windUpRemaining = def.windUp ?? 0;
    this.comboStep++;

    this.weapon.startSwing(direction.x, direction.y, position.x, position.y);

    if (this.windUpRemaining <= 0) {
      this.createHitbox(def, position, direction);
    }
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
    const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
    const dx = len > 0 ? direction.x / len : 1;
    const dy = len > 0 ? direction.y / len : 0;

    const cx = position.x + dx * hb.offsetX;
    const cy = position.y + dy * hb.offsetX;

    let width = hb.width;
    let height = hb.height;

    if (hb.shape === HitboxShape.RECTANGLE && Math.abs(dy) > Math.abs(dx)) {
      width = hb.height;
      height = hb.width;
    }

    this.activeHitboxId = this.hitboxManager.createHitbox(
      this.ownerId,
      hb.shape,
      cx,
      cy,
      def.damage,
      def.duration,
      hb.shape === HitboxShape.RECTANGLE
        ? { width, height }
        : { radius: hb.radius }
    );
  }

  public update(dt: number, position: { x: number; y: number }, direction: { x: number; y: number }): void {
    this.lastPosition = { ...position };
    this.lastDirection = { ...direction };
    this.weapon.updateSwing(dt, direction.x, direction.y, position.x, position.y);

    if (this.activeHitboxId) {
      const hb = this.hitboxManager.getActiveHitboxes().get(this.activeHitboxId);
      if (hb) {
        const def = this.weapon.getAttackDef(this.currentAttackType);
        if (def) {
          const len = Math.sqrt(direction.x * direction.x + direction.y * direction.y);
          const dx = len > 0 ? direction.x / len : 1;
          const dy = len > 0 ? direction.y / len : 0;
          hb.shape.x = position.x + dx * def.hitbox.offsetX;
          hb.shape.y = position.y + dy * def.hitbox.offsetX;

          if (def.hitbox.shape === HitboxShape.RECTANGLE) {
            if (Math.abs(dy) > Math.abs(dx)) {
              hb.shape.width = def.hitbox.height;
              hb.shape.height = def.hitbox.width;
            } else {
              hb.shape.width = def.hitbox.width;
              hb.shape.height = def.hitbox.height;
            }
          }
        }
      }
    }

    switch (this.state) {
      case CombatState.ATTACKING:
        if (this.windUpRemaining > 0) {
          this.windUpRemaining -= dt;
          if (this.windUpRemaining <= 0) {
            const def = this.weapon.getAttackDef(this.currentAttackType);
            if (def) {
              this.createHitbox(def, position, direction);
            }
          }
        }
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.endAttack();
        }
        break;

      case CombatState.COOLDOWN:
        this.stateTimer -= dt;
        if (this.stateTimer <= 0) {
          this.state = CombatState.IDLE;
          if (this.attackQueue.length === 0) {
            this.comboStep = 0;
          }
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

  private lastDirection: { x: number; y: number } = { x: 0, y: 1 };
  private lastPosition: { x: number; y: number } = { x: 0, y: 0 };

  private processQueue(): void {
    if (this.attackQueue.length > 0) {
      const nextType = this.attackQueue.shift()!;
      const def = this.weapon.getAttackDef(nextType);
      if (def) {
        this.startAttack(nextType, def, this.lastDirection, this.lastPosition);
      }
    }
  }

  public updateLastTransform(position: { x: number; y: number }, direction: { x: number; y: number }): void {
    this.lastPosition = { ...position };
    this.lastDirection = { ...direction };
  }

  public getLastDirection(): { x: number; y: number } {
    return { ...this.lastDirection };
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

  public getRemainingCooldown(): number {
    if (this.state === CombatState.COOLDOWN) return this.stateTimer;
    if (this.state === CombatState.ATTACKING) return this.stateTimer + (this.weapon.getAttackDef(this.currentAttackType)?.cooldown ?? 0);
    return 0;
  }

  public getWindUpRemaining(): number {
    return this.windUpRemaining;
  }

  public getStateTimer(): number {
    return this.stateTimer;
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
