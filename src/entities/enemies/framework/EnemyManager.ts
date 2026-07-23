import Phaser from "phaser";
import { IEnemyConfig } from "./EnemyConfig";
import { Enemy } from "./Enemy";
import { EnemyController } from "./EnemyController";
import { EnemyAI } from "./EnemyAI";
import { EnemyHealth } from "./EnemyHealth";
import { EnemyAnimator } from "./EnemyAnimator";
import { IEnemyState } from "../states/IEnemyState";
import { AnimationManager } from "../../../systems/animation/AnimationManager";
import { CombatManager } from "../../../systems/combat/CombatManager";
import { CombatController } from "../../../systems/combat/CombatController";
import { WeaponManager } from "../../../systems/combat/WeaponManager";
import { Logger } from "../../../core/Logger";

export interface EnemyDebugInfo {
  x: number;
  y: number;
  visionRadius: number;
  aggroRadius: number;
  attackRadius: number;
  state: string;
  health: number;
  maxHealth: number;
  isAlive: boolean;
}

export class EnemyManager {
  private static instance: EnemyManager;
  private enemies: Map<string, Enemy> = new Map();
  private initialized: boolean = false;

  private constructor() {}

  public static getInstance(): EnemyManager {
    if (!EnemyManager.instance) {
      EnemyManager.instance = new EnemyManager();
    }
    return EnemyManager.instance;
  }

  public initialize(): void {
    if (this.initialized) return;
    this.initialized = true;
    Logger.getInstance().log("[EnemyManager] Initialized");
  }

  public createEnemy(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: IEnemyConfig,
    player: Phaser.GameObjects.GameObject,
    customStates?: IEnemyState[],
    initialState?: string
  ): Enemy | null {
    const ai = new EnemyAI(config);
    const health = new EnemyHealth(config.maxHealth);

    let animator: EnemyAnimator | null = null;
    const animController = AnimationManager.getInstance().createController(
      scene,
      `enemy_${config.entityType}_${Date.now()}`,
      config.entityType,
      x,
      y
    );
    if (animController) {
      animator = new EnemyAnimator(animController);
    }

    const controller = new EnemyController(config, ai, health, animator);

    const states = customStates ?? [];
    const initial = initialState ?? "IDLE";
    controller.initialize(x, y, player, states, initial);

    const enemy = new Enemy(scene, x, y, config, controller);

    if (animator) {
      const sprite = animator.getSprite();
      sprite.setPosition(0, 0);
      enemy.add(sprite);
    }

    this.setupCombat(enemy, config, scene);
    this.setupHealthCallbacks(enemy, controller);

    this.enemies.set(enemy.getEntityId(), enemy);
    Logger.getInstance().log(`[EnemyManager] Created ${config.entityType} at (${x}, ${y})`);
    return enemy;
  }

  private setupCombat(enemy: Enemy, _config: IEnemyConfig, scene: Phaser.Scene): void {
    const weapon = WeaponManager.getInstance().createWeapon(scene, "placeholder_sword");
    if (weapon) {
      const combatMgr = CombatManager.getInstance();
      const combatController = new CombatController(
        weapon,
        combatMgr.getHitboxManager(),
        enemy.getEntityId()
      );
      combatMgr.registerController(enemy.getEntityId(), combatController);
    }
  }

  private setupHealthCallbacks(_enemy: Enemy, controller: EnemyController): void {
    controller.health.setOnDamage((_amount: number) => {
      const currentState = controller.ai.getCurrentStateId();
      if (currentState !== "DEAD" && currentState !== "HURT") {
        controller.ai.transitionTo("HURT");
      }
    });

    controller.health.setOnDeath(() => {
      controller.ai.transitionTo("DEAD");
    });
  }

  public removeEnemy(entityId: string): void {
    const enemy = this.enemies.get(entityId);
    if (enemy) {
      CombatManager.getInstance().unregisterController(entityId);
      this.enemies.delete(entityId);
      Logger.getInstance().log(`[EnemyManager] Removed enemy ${entityId}`);
    }
  }

  public update(_time: number, delta: number): void {
    const deadEnemies: string[] = [];

    for (const [id, enemy] of this.enemies) {
      if (!enemy.scene) {
        deadEnemies.push(id);
        continue;
      }
      enemy.update(_time, delta);
    }

    for (const id of deadEnemies) {
      this.enemies.delete(id);
    }
  }

  public checkPlayerHitboxCollisions(): void {
    const combatMgr = CombatManager.getInstance();
    const hitboxManager = combatMgr.getHitboxManager();
    const hitboxes = hitboxManager.getActiveHitboxes();
    const playerId = "player";

    for (const [, hb] of hitboxes) {
      if (hb.ownerId !== playerId) continue;

      for (const [enemyId, enemy] of this.enemies) {
        if (hb.hitEntities.has(enemyId)) continue;
        if (!enemy.isAlive()) continue;

        const ex = enemy.x;
        const ey = enemy.y;
        const hx = hb.shape.x;
        const hy = hb.shape.y;
        const dx = ex - hx;
        const dy = ey - hy;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const hitRadius = hb.shape.radius ?? Math.max(hb.shape.width ?? 16, hb.shape.height ?? 16) / 2;

        if (dist < hitRadius + 16) {
          hb.hitEntities.add(enemyId);
          const damage = enemy.takeDamage(hb.damage);
          if (damage > 0) {
            Logger.getInstance().log(`[Combat] Player hit ${enemyId} for ${damage} damage`);
          }
        }
      }
    }
  }

  public checkEnemyHitboxCollisions(player: Phaser.GameObjects.GameObject): void {
    const combatMgr = CombatManager.getInstance();
    const hitboxManager = combatMgr.getHitboxManager();
    const hitboxes = hitboxManager.getActiveHitboxes();

    for (const [, hb] of hitboxes) {
      if (!hb.ownerId || hb.ownerId === "player") continue;
      const playerId = "PLAYER_TARGET";
      if (hb.hitEntities.has(playerId)) continue;

      const px = (player as unknown as { x: number; y: number }).x ?? 0;
      const py = (player as unknown as { x: number; y: number }).y ?? 0;
      const hx = hb.shape.x;
      const hy = hb.shape.y;
      const dx = px - hx;
      const dy = py - hy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const hitRadius = hb.shape.radius ?? Math.max(hb.shape.width ?? 16, hb.shape.height ?? 16) / 2;

      if (dist < hitRadius + 16) {
        hb.hitEntities.add(playerId);
        Logger.getInstance().log(`[Combat] Enemy hit player for ${hb.damage} damage`);
      }
    }
  }

  public getEnemy(entityId: string): Enemy | undefined {
    return this.enemies.get(entityId);
  }

  public getAllEnemies(): Enemy[] {
    return Array.from(this.enemies.values());
  }

  public getDebugInfo(): EnemyDebugInfo[] {
    const info: EnemyDebugInfo[] = [];
    for (const enemy of this.enemies.values()) {
      const config = enemy.controller.getConfig();
      info.push({
        x: enemy.x,
        y: enemy.y,
        visionRadius: config.visionRadius,
        aggroRadius: config.aggroRadius,
        attackRadius: config.attackRange,
        state: enemy.controller.ai.getCurrentStateId() ?? "NONE",
        health: enemy.controller.health.getCurrentHealth(),
        maxHealth: enemy.controller.health.getMaxHealth(),
        isAlive: enemy.controller.health.isAlive(),
      });
    }
    return info;
  }

  public destroyAll(): void {
    for (const [id, enemy] of this.enemies) {
      CombatManager.getInstance().unregisterController(id);
      enemy.destroyEnemy();
    }
    this.enemies.clear();
    this.initialized = false;
  }
}
