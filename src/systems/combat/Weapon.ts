import Phaser from "phaser";
import { AttackType, AttackDef } from "../../data/AttackData";

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

    const weaponDistance = 18;
    const tipX = ownerX + facingX * weaponDistance;
    const tipY = ownerY + facingY * weaponDistance;

    if (this.sprite) {
      this.sprite.setPosition(tipX, tipY);
      this.sprite.setVisible(true);
      const angle = Math.atan2(facingY, facingX) * (180 / Math.PI);
      this.sprite.setAngle(angle);
    }

    if (this.graphics) {
      this.graphics.setVisible(true);
    }
  }

  public updateSwing(dt: number, facingX: number, facingY: number): boolean {
    if (!this.isSwinging) return false;

    this.swingProgress += dt / this.attackDuration;
    if (this.swingProgress >= 1) {
      this.swingProgress = 1;
      this.endSwing();
      return true;
    }

    const weaponDistance = 18;
    const ownerX = this.ownerX;
    const ownerY = this.ownerY;
    const tipX = ownerX + facingX * weaponDistance;
    const tipY = ownerY + facingY * weaponDistance;

    if (this.sprite) {
      this.sprite.setPosition(tipX, tipY);
      const baseAngle = Math.atan2(facingY, facingX) * (180 / Math.PI);
      const arc = 60;
      const t = this.swingProgress;
      const swingAngle = baseAngle - arc / 2 + arc * t;
      this.sprite.setAngle(swingAngle);
    }

    if (this.graphics) {
      this.graphics.clear();
      this.graphics.lineStyle(3, 0xc0c0c0, 1);
      const angle = Math.atan2(facingY, facingX);
      const arc = Math.PI / 3;
      const t = this.swingProgress;
      const currentAngle = angle - arc / 2 + arc * t;
      const len = this.range;
      const tipGx = ownerX + Math.cos(currentAngle) * len;
      const tipGy = ownerY + Math.sin(currentAngle) * len;
      this.graphics.beginPath();
      this.graphics.moveTo(ownerX, ownerY);
      this.graphics.lineTo(tipGx, tipGy);
      this.graphics.strokePath();
    }

    return false;
  }

  public endSwing(): void {
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

  public destroy(): void {
    if (this.sprite) this.sprite.destroy();
    if (this.graphics) this.graphics.destroy();
  }
}
