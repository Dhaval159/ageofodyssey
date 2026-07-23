import Phaser from "phaser";
import { Enemy } from "../framework/Enemy";
import { EnemyController } from "../framework/EnemyController";
import { EnemyAI } from "../framework/EnemyAI";
import { EnemyHealth } from "../framework/EnemyHealth";
import { EnemyAnimator } from "../framework/EnemyAnimator";
import { IEnemyConfig } from "../framework/EnemyConfig";
import { WOLF_CONFIG } from "./WolfConfig";
import { EnemyStateId } from "../states/EnemyStateId";
import { IEnemyState } from "../states/IEnemyState";
import { IdleState } from "../states/IdleState";
import { PatrolState } from "../states/PatrolState";
import { ChaseState } from "../states/ChaseState";
import { AttackState } from "../states/AttackState";
import { HurtState } from "../states/HurtState";
import { DeadState } from "../states/DeadState";
import { ReturnHomeState } from "../states/ReturnHomeState";
import { InvestigateState } from "../states/InvestigateState";
import { AnimationManager } from "../../../systems/animation/AnimationManager";
import { CombatManager } from "../../../systems/combat/CombatManager";
import { CombatController } from "../../../systems/combat/CombatController";
import { WeaponManager } from "../../../systems/combat/WeaponManager";

export class Wolf extends Enemy {
  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    player: Phaser.GameObjects.GameObject,
    config: IEnemyConfig = WOLF_CONFIG
  ) {
    const ai = new EnemyAI(config);
    const health = new EnemyHealth(config.maxHealth);

    let animator: EnemyAnimator | null = null;
    const animController = AnimationManager.getInstance().createController(
      scene,
      `wolf_${Date.now()}`,
      "wolf",
      x,
      y
    );
    if (animController) {
      animator = new EnemyAnimator(animController);
    }

    const controller = new EnemyController(config, ai, health, animator);

    super(scene, x, y, config, controller);

    if (animator) {
      const sprite = animator.getSprite();
      sprite.setPosition(0, 0);
      this.add(sprite);
    }

    const states: IEnemyState[] = [
      new IdleState(),
      new PatrolState(),
      new ChaseState(),
      new AttackState(),
      new HurtState(),
      new DeadState(),
      new ReturnHomeState(),
      new InvestigateState(),
    ];

    this.initialize(player, states, EnemyStateId.IDLE);

    const weapon = WeaponManager.getInstance().createWeapon(scene, "placeholder_sword");
    if (weapon) {
      const combatMgr = CombatManager.getInstance();
      const combatController = new CombatController(
        weapon,
        combatMgr.getHitboxManager(),
        this.getEntityId()
      );
      combatMgr.registerController(this.getEntityId(), combatController);
    }

    controller.health.setOnDamage((_amount: number) => {
      const current = controller.ai.getCurrentStateId();
      if (current !== "DEAD" && current !== "HURT") {
        controller.ai.transitionTo(EnemyStateId.HURT);
      }
    });

    controller.health.setOnDeath(() => {
      controller.ai.transitionTo(EnemyStateId.DEAD);
    });
  }
}
