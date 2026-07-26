import Phaser from "phaser";
import { AttackType, AttackDef } from "../../data/AttackData";
import { EffectsManager } from "../effects/EffectsManager";

export class Weapon {
  private sprite: Phaser.GameObjects.Sprite | null = null;
  private graphics: Phaser.GameObjects.Graphics | null = null;
  private attackDefs: Map<AttackType, AttackDef>;
  private baseDamage: number;
  private range: number;
  private attackDuration: number;
  private cooldownDuration: number;
  private ownerX: number = 0;
  private ownerY: number = 0;
  private isSwinging: boolean = false;
  private swingProgress: number = 0;
  private trailTip: { x: number; y: number } = { x: 0, y: 0 };

  constructor(
    scene: Phaser.Scene,
    key: string,
    baseDamage: number,
    range: number,
    attackDuration: number,
    cooldownDuration: number
  ) {
    this.baseDamage = baseDamage;
    this.range = range;
    this.attackDuration = attackDuration;
    this.cooldownDuration = cooldownDuration;
    this.attackDefs = new Map();

    if (scene.textures.exists(key)) {
      this.sprite = scene.add.sprite(0, 0, key);
      this.sprite.setOrigin(0, 0.5);
      this.sprite.setVisible(false);
      this.sprite.setDepth(10);
    } else {
      this.graphics = scene.add.graphics();
      this.graphics.setVisible(false);
      this.graphics.setDepth(10);
    }
  }

  public registerAttack(type: AttackType, def: AttackDef): void {
    this.attackDefs.set(type, def);
  }

  public getAttackDef(type: AttackType): AttackDef | undefined {
    return this.attackDefs.get(type);
  }

  public getBaseDamage(): number {
    return this.baseDamage;
  }

  public getRange(): number {
    return this.range;
  }

  public getAttackDuration(): number {
    return this.attackDuration;
  }

  public getCooldownDuration(): number {
    return this.cooldownDuration;
  }

  public startSwing(facingX: number, facingY: number, ownerX: number, ownerY: number): void {
    this.ownerX = ownerX;
    this.ownerY = ownerY;
    this.isSwinging = true;
    this.swingProgress = 0;

    EffectsManager.getInstance().startSwordTrail();

    const weaponDistance = 18;
    const tipX = ownerX + facingX * weaponDistance;
    const tipY = ownerY + facingY * weaponDistance;
    this.trailTip = { x: tipX, y: tipY };

    if (this.sprite) {
      this.sprite.setPosition(tipX, tipY);
      this.sprite.setVisible(false); // Hide placeholder sword sprite
      const angle = Math.atan2(facingY, facingX) * (180 / Math.PI);
      this.sprite.setAngle(angle);
    }

    if (this.graphics) {
      this.graphics.setVisible(false); // Hide placeholder line graphics
    }
  }

  public updateSwing(dt: number, facingX: number, facingY: number, ownerX?: number, ownerY?: number): boolean {
    if (!this.isSwinging) return false;

    if (ownerX !== undefined) this.ownerX = ownerX;
    if (ownerY !== undefined) this.ownerY = ownerY;

    this.swingProgress += dt / this.attackDuration;
    if (this.swingProgress >= 1) {
      this.swingProgress = 1;
      this.endSwing();
      return true;
    }

    const weaponDistance = 18;
    const currentOwnerX = this.ownerX;
    const currentOwnerY = this.ownerY;
    const tipX = currentOwnerX + facingX * weaponDistance;
    const tipY = currentOwnerY + facingY * weaponDistance;
    this.trailTip = { x: tipX, y: tipY };

    EffectsManager.getInstance().updateSwordTrail(tipX, tipY);

    if (this.sprite) {
      this.sprite.setPosition(tipX, tipY);
      this.sprite.setVisible(false);
      const baseAngle = Math.atan2(facingY, facingX) * (180 / Math.PI);
      const arc = 60;
      const t = this.swingProgress;
      const swingAngle = baseAngle - arc / 2 + arc * t;
      this.sprite.setAngle(swingAngle);
    }

    if (this.graphics) {
      this.graphics.clear();
      this.graphics.setVisible(false);
    }

    return false;
  }

  public endSwing(): void {
    EffectsManager.getInstance().endSwordTrail();
    this.isSwinging = false;
    this.swingProgress = 0;
    if (this.sprite) {
      this.sprite.setVisible(false);
    }
    if (this.graphics) {
      this.graphics.clear();
      this.graphics.setVisible(false);
    }
  }

  public isCurrentlySwinging(): boolean {
    return this.isSwinging;
  }

  public getSwingProgress(): number {
    return this.swingProgress;
  }

  public getTrailTip(): { x: number; y: number } {
    return { ...this.trailTip };
  }

  public destroy(): void {
    if (this.sprite) this.sprite.destroy();
    if (this.graphics) this.graphics.destroy();
  }
}
