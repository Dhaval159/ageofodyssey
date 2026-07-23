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

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: IPlayerConfig = DEFAULT_PLAYER_CONFIG
  ) {
    super(scene, x, y);

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

    // Get input and update controller
    const input = this.inputBridge.getInput();
    this.controller.update(dt, input);

    // Sync physics body
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Apply controller velocity to Phaser physics body
    const velocity = this.controller.getVelocity();
    body.setVelocity(velocity.x, velocity.y);

    // Sync controller logical position back from Phaser
    this.controller.setPosition(this.x, this.y);

    // Player state machine handling
    const playerStateId = this.controller.getStateMachine().getCurrentStateId();

    // Combat: request attack when entering ATTACKING or HEAVY_ATTACKING state
    if (playerStateId === PlayerStateId.ATTACKING) {
      const dir = this.controller.getFacingDirection();
      this.combatController.requestAttack(
        AttackType.LIGHT,
        dir,
        { x: this.x, y: this.y }
      );
    } else if (playerStateId === PlayerStateId.HEAVY_ATTACKING) {
      const dir = this.controller.getFacingDirection();
      this.combatController.requestAttack(
        AttackType.HEAVY,
        dir,
        { x: this.x, y: this.y }
      );
    }

    // Update combat controller each frame
    const dir = this.controller.getFacingDirection();
    this.combatController.update(dt, { x: this.x, y: this.y }, dir);

    // Map player state to animation state and request it
    if (playerStateId !== null) {
      const animId = STATE_TO_ANIMATION[playerStateId];
      this.animationController.requestState(animId);
    }

    // Compute speed from velocity for animation speed scaling
    const speed = Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    this.animationController.update(delta, speed);

    // Update direction indicator relative to facing direction
    const facingDir = this.controller.getFacingDirection();
    const distance = 16;
    this.directionIndicator.setPosition(facingDir.x * distance, facingDir.y * distance);
  }
}
