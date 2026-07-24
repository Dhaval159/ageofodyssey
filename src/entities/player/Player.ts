import Phaser from "phaser";
import { PlayerController } from "./PlayerController";
import { PlayerInputBridge } from "./PlayerInputBridge";
import { DEFAULT_PLAYER_CONFIG, IPlayerConfig } from "./PlayerConfig";
import { AnimationController } from "../../systems/animation/AnimationController";
import { AnimationManager } from "../../systems/animation/AnimationManager";
import { AnimationId } from "../../systems/animation/AnimationConfig";
import { PlayerStateId } from "./PlayerStateMachine";
import { CombatController } from "../../systems/combat/CombatController";
import { CombatManager } from "../../systems/combat/CombatManager";
import { WeaponManager } from "../../systems/combat/WeaponManager";
import { AttackType } from "../../data/AttackData";
import { HealthComponent } from "../../systems/combat/HealthComponent";
import { EffectsManager } from "../../systems/effects/EffectsManager";

const STATE_TO_ANIMATION: Record<PlayerStateId, AnimationId> = {
  [PlayerStateId.IDLE]: AnimationId.IDLE,
  [PlayerStateId.WALKING]: AnimationId.WALK,
  [PlayerStateId.RUNNING]: AnimationId.RUN,
  [PlayerStateId.ROLLING]: AnimationId.ROLL,
  [PlayerStateId.ATTACKING]: AnimationId.ATTACK,
  [PlayerStateId.HEAVY_ATTACKING]: AnimationId.HEAVY_ATTACK,
  [PlayerStateId.BLOCKING]: AnimationId.BLOCK,
  [PlayerStateId.HURT]: AnimationId.HURT,
  [PlayerStateId.DEAD]: AnimationId.DEATH,
};

export class Player extends Phaser.GameObjects.Container {
  private controller: PlayerController;
  private inputBridge: PlayerInputBridge;
  private animationController: AnimationController;
  private combatController: CombatController;
  private directionIndicator: Phaser.GameObjects.Arc;
  public healthComponent: HealthComponent;

  private invulnerable: boolean = false;
  private invulnerabilityTimer: number = 0;
  private readonly INVULNERABILITY_DURATION: number = 0.5;
  private hitFlashTween: Phaser.Tweens.Tween | null = null;

  private damagePopupPool: Phaser.GameObjects.Text[] = [];

  private knockbackVelocity: { x: number; y: number } = { x: 0, y: 0 };
  private knockbackDecay: number = 0;

  private prevStateId: PlayerStateId | null = null;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: IPlayerConfig = DEFAULT_PLAYER_CONFIG
  ) {
    super(scene, x, y);

    this.healthComponent = new HealthComponent(config.combat.maxHealth);

    // Initialize controller and input bridge
    this.controller = new PlayerController(config);
    this.controller.setPosition(x, y);
    this.inputBridge = new PlayerInputBridge();

    // Create animation controller via AnimationManager
    const animManager = AnimationManager.getInstance();
    const animController = animManager.createController(
      scene,
      "player",
      "player",
      x,
      y
    );
    if (!animController) {
      throw new Error("Failed to create AnimationController for player");
    }
    this.animationController = animController;

    const sprite = this.animationController.getSprite();
    this.add(sprite);

    const weapon = WeaponManager.getInstance().createWeapon(scene, config.combat.weaponKey);
    if (!weapon) {
      throw new Error(`Failed to create weapon: ${config.combat.weaponKey}`);
    }

    const combatMgr = CombatManager.getInstance();
    this.combatController = new CombatController(
      weapon,
      combatMgr.getHitboxManager(),
      "player"
    );
    combatMgr.registerController("player", this.combatController);

    // Direction Indicator - Gold Circle
    this.directionIndicator = scene.add.circle(0, 16, 6, 0xffd700);
    this.add(this.directionIndicator);

    // Add to scene
    scene.add.existing(this);

    // Enable physics
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(config.size.width, config.size.height);
    body.setOffset(-config.size.width / 2, -config.size.height / 2);
    body.setCollideWorldBounds(true);
    body.setGravity(0, 0);
    body.setAllowGravity(false);
  }

  public getController(): PlayerController {
    return this.controller;
  }

  public getAnimationController(): AnimationController {
    return this.animationController;
  }

  public getCombatController(): CombatController {
    return this.combatController;
  }

  public update(_time: number, delta: number): void {
    const dt = delta / 1000;

    this.updateInvulnerability(dt);
    this.updateKnockback(dt);

    // Get input and update controller
    const input = this.inputBridge.getInput();
    this.controller.update(dt, input);

    // Sync physics body
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Apply knockback velocity on top of controller velocity
    const velocity = this.controller.getVelocity();
    body.setVelocity(
      velocity.x + this.knockbackVelocity.x,
      velocity.y + this.knockbackVelocity.y
    );

    // Sync controller logical position back from Phaser
    this.controller.setPosition(this.x, this.y);

    // Player state machine handling
    const playerStateId = this.controller.getStateMachine().getCurrentStateId();

    // Combat: request attack only once when entering ATTACKING or HEAVY_ATTACKING state
    if (playerStateId !== this.prevStateId) {
      if (playerStateId === PlayerStateId.ATTACKING) {
        const dir = this.controller.getFacingDirection();
        this.combatController.requestAttack(
          AttackType.LIGHT,
          dir,
          { x: this.x, y: this.y }
        );
        if (this.scene) {
          this.scene.cameras.main.shake(30, 0.002);
        }
      } else if (playerStateId === PlayerStateId.HEAVY_ATTACKING) {
        const dir = this.controller.getFacingDirection();
        this.combatController.requestAttack(
          AttackType.HEAVY,
          dir,
          { x: this.x, y: this.y }
        );
        if (this.scene) {
          this.scene.cameras.main.shake(50, 0.004);
        }
      }
    }
    this.prevStateId = playerStateId;

    // Update combat controller each frame
    const dir = this.controller.getFacingDirection();
    this.combatController.update(dt, { x: this.x, y: this.y }, dir);

    // Map player state to animation state and request it
    if (playerStateId !== null) {
      const animId = STATE_TO_ANIMATION[playerStateId];
      this.animationController.requestState(animId);
    }

    // Compute speed from velocity for animation speed scaling
    const pSpeed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    this.animationController.update(delta, pSpeed);

    // Dust particles while moving
    if (pSpeed > 40) {
      const facingDir = this.controller.getFacingDirection();
      EffectsManager.getInstance().checkDustEmission(this.x, this.y, pSpeed, facingDir, dt);
    }

    // Update direction indicator relative to facing direction
    const facingDir = this.controller.getFacingDirection();
    const distance = 16;
    this.directionIndicator.setPosition(facingDir.x * distance, facingDir.y * distance);
  }

  public takeDamage(amount: number, source?: { x: number; y: number }): boolean {
    if (this.invulnerable || !this.healthComponent.isAlive()) return false;

    const actualDamage = this.healthComponent.takeDamage(amount);
    if (actualDamage <= 0) return false;

    this.invulnerable = true;
    this.invulnerabilityTimer = this.INVULNERABILITY_DURATION;

    this.controller.getStateMachine().transitionTo(PlayerStateId.HURT);

    this.startHitFlash();

    const scene = this.scene;
    if (scene) {
      const shakeIntensity = Math.min(0.003 + actualDamage * 0.0003, 0.015);
      scene.cameras.main.shake(100, shakeIntensity);

      EffectsManager.getInstance().emitHitSpark(this.x, this.y, 6);

      if (source) {
        const knockDir = {
          x: this.x - source.x,
          y: this.y - source.y,
        };
        const len = Math.sqrt(knockDir.x ** 2 + knockDir.y ** 2);
        if (len > 0) {
          this.knockbackVelocity.x = (knockDir.x / len) * 200;
          this.knockbackVelocity.y = (knockDir.y / len) * 200;
          this.knockbackDecay = 400;
        }
      }

      this.showDamagePopup(actualDamage);
    }

    if (!this.healthComponent.isAlive()) {
      this.controller.getStateMachine().transitionTo(PlayerStateId.DEAD);
    }

    return true;
  }

  private updateInvulnerability(dt: number): void {
    if (!this.invulnerable) return;
    this.invulnerabilityTimer -= dt;
    if (this.invulnerabilityTimer <= 0) {
      this.invulnerable = false;
      this.clearHitFlash();
    }
  }

  private updateKnockback(dt: number): void {
    if (this.knockbackDecay > 0) {
      this.knockbackVelocity.x *= (1 - dt * 10);
      this.knockbackVelocity.y *= (1 - dt * 10);
      this.knockbackDecay -= dt * 400;
      if (this.knockbackDecay <= 0) {
        this.knockbackVelocity.x = 0;
        this.knockbackVelocity.y = 0;
      }
    }
  }

  private startHitFlash(): void {
    const sprite = this.animationController.getSprite();
    if (!sprite) return;
    if (this.hitFlashTween) {
      this.hitFlashTween.stop();
    }
    sprite.setTint(0xff0000);
    this.hitFlashTween = this.scene.tweens.add({
      targets: sprite,
      alpha: { from: 1, to: 0.4 },
      duration: 100,
      yoyo: true,
      repeat: 2,
      onComplete: () => {
        sprite.clearTint();
        sprite.setAlpha(1);
      },
    });
  }

  private clearHitFlash(): void {
    const sprite = this.animationController.getSprite();
    if (sprite) {
      sprite.clearTint();
      sprite.setAlpha(1);
    }
  }

  private showDamagePopup(amount: number): void {
    const scene = this.scene;
    if (!scene) return;

    let text = this.damagePopupPool.find(t => !t.visible);
    if (!text) {
      text = scene.add.text(0, 0, "", {
        fontSize: "18px",
        color: "#ff6644",
        stroke: "#000000",
        strokeThickness: 4,
        fontStyle: "bold",
      });
      text.setDepth(9999);
      this.damagePopupPool.push(text);
    }

    text.setText(`-${amount}`);
    text.setPosition(
      this.x + Phaser.Math.Between(-12, 12),
      this.y - 25
    );
    text.setVisible(true);
    text.setAlpha(1);
    text.setScale(1.2);

    scene.tweens.add({
      targets: text,
      y: text.y - 40,
      alpha: 0,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: 700,
      ease: "Power2",
      onComplete: () => {
        text.setVisible(false);
      },
    });
  }
}
