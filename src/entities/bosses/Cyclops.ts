import Phaser from "phaser";
import { Enemy } from "../enemies/framework/Enemy";
import { EnemyController } from "../enemies/framework/EnemyController";
import { EnemyAI } from "../enemies/framework/EnemyAI";
import { EnemyHealth } from "../enemies/framework/EnemyHealth";
import { EnemyAnimator } from "../enemies/framework/EnemyAnimator";
import { IEnemyConfig } from "../enemies/framework/EnemyConfig";
import { AnimationManager } from "../../systems/animation/AnimationManager";
import { EnemyManager } from "../enemies/framework/EnemyManager";
import { AnimationId } from "../../systems/animation/AnimationConfig";
import { Logger } from "../../core/Logger";
import { EffectsManager } from "../../systems/effects/EffectsManager";
import { AudioManager } from "../../systems/audio/AudioManager";
import { RockProjectile } from "./RockProjectile";


export const CYCLOPS_BOSS_CONFIG: IEnemyConfig = {
  entityType: "cyclops",
  maxHealth: 1000,
  damage: 20,
  attackCooldown: 1.5,
  attackDuration: 0.5,
  attackRange: 90,
  visionRadius: 600,
  aggroRadius: 600,
  speed: 55,
  chaseSpeed: 65,
  size: { width: 56, height: 76 },
  color: 0xbc9c8c,
  deathRemoveDelay: 9999.0, // Managed manually
  patrolRadius: 0,
  patrolPauseMin: 0,
  patrolPauseMax: 0,
  reactionTime: 0.1,
};

type AttackState = "idle" | "telegraph" | "active" | "recovery";
type AttackType = "none" | "club_slam" | "stomp" | "grab" | "double_slam" | "rock_throw" | "charge" | "roar";

export class Cyclops extends Enemy {
  public activeAttackState: AttackState = "idle";
  public currentAttack: AttackType = "none";

  // State timers (ms)
  public telegraphTimer: number = 0;
  public activeTimer: number = 0;
  public recoveryTimer: number = 0;
  public attackCooldownTimer: number = 0;

  // Attack configurations based on phase
  private attackStateDuration: Record<AttackType, { telegraph: number; active: number; recovery: [number, number, number] }> = {
    none: { telegraph: 0, active: 0, recovery: [0, 0, 0] },
    club_slam: { telegraph: 700, active: 300, recovery: [1600, 1100, 600] },
    stomp: { telegraph: 600, active: 200, recovery: [1300, 900, 500] },
    grab: { telegraph: 800, active: 300, recovery: [1800, 1300, 800] },
    double_slam: { telegraph: 600, active: 600, recovery: [1400, 1000, 550] },
    rock_throw: { telegraph: 900, active: 200, recovery: [1500, 1100, 700] },
    charge: { telegraph: 1000, active: 800, recovery: [1600, 1200, 800] },
    roar: { telegraph: 800, active: 400, recovery: [1000, 700, 450] },
  };

  private telegraphGraphics: Phaser.GameObjects.Graphics;
  private rockProjectiles: RockProjectile[] = [];
  private hasHitDuringActive: boolean = false;
  private currentChargeDir: { x: number; y: number } = { x: 0, y: 0 };
  private chargeVelocity: number = 320;
  private doubleSlamTriggered: boolean[] = [false, false]; // [slam1, slam2]

  constructor(scene: Phaser.Scene, x: number, y: number, player: Phaser.GameObjects.GameObject) {
    const ai = new EnemyAI(CYCLOPS_BOSS_CONFIG);
    const health = new EnemyHealth(CYCLOPS_BOSS_CONFIG.maxHealth);

    let animator: EnemyAnimator | null = null;
    const animController = AnimationManager.getInstance().createController(
      scene,
      `cyclops_${Date.now()}`,
      "cyclops",
      x,
      y
    );
    if (animController) {
      animator = new EnemyAnimator(animController);
    }

    const controller = new EnemyController(CYCLOPS_BOSS_CONFIG, ai, health, animator);
    super(scene, x, y, CYCLOPS_BOSS_CONFIG, controller);

    if (animator) {
      const sprite = animator.getSprite();
      sprite.setPosition(0, 0);
      this.add(sprite);
    }

    // Custom telegraph graphics layer drawn on the ground
    this.telegraphGraphics = scene.add.graphics();
    this.telegraphGraphics.setDepth(1);

    this.initialize(player, [], "IDLE");
    EnemyManager.getInstance().addEnemy(this);

    Logger.getInstance().log("[Cyclops] Polyphemus spawned at " + x + ", " + y);
  }

  public takeDamage(amount: number): number {
    const bossEncounter = (this.scene as any).bossEncounterController;
    if (bossEncounter) {
      bossEncounter.takeDamage(amount);
      const actualHp = bossEncounter.getBossHp();
      this.controller.health.takeDamage(amount); // sync health locally

      // Hit flash & particle effect
      const animator = this.controller.animator;
      if (animator) {
        animator.getSprite().setTint(0xff0000);
        this.scene.time.delayedCall(100, () => animator.getSprite().clearTint());
      }
      EffectsManager.getInstance().emitHitSpark(this.x, this.y, 8);

      if (actualHp <= 0) {
        this.activeAttackState = "idle";
        this.currentAttack = "none";
        this.controller.ai.transitionTo("DEAD");
        if (animator) {
          animator.play(AnimationId.DEATH);
        }
      } else {
        // Hurt reaction
        if (this.activeAttackState === "idle") {
          this.controller.ai.transitionTo("HURT");
          if (animator) {
            animator.play(AnimationId.HURT);
          }
          this.scene.time.delayedCall(400, () => {
            if (this.controller.health.isAlive()) {
              this.controller.ai.transitionTo("CHASE");
            }
          });
        }
      }
      return amount;
    }
    return super.takeDamage(amount);
  }

  public update(time: number, delta: number): void {
    // 1. Update Rock Projectiles in flight
    for (let i = this.rockProjectiles.length - 1; i >= 0; i--) {
      const proj = this.rockProjectiles[i];
      if (proj && proj.scene) {
        proj.update(time, delta);
      } else {
        this.rockProjectiles.splice(i, 1);
      }
    }

    const bossEncounter = (this.scene as any).bossEncounterController;
    if (!bossEncounter || !this.isAlive()) {
      this.telegraphGraphics.clear();
      super.update(time, delta);
      return;
    }

    // Wait until introduction cinematic completes
    if (!bossEncounter.isEncounterActive()) {
      this.telegraphGraphics.clear();
      const body = this.body as Phaser.Physics.Arcade.Body;
      if (body) body.setVelocity(0, 0);
      return;
    }

    // Sync speed based on active phase
    const phaseId = bossEncounter.getCurrentPhaseId();
    let moveSpeed = CYCLOPS_BOSS_CONFIG.chaseSpeed;
    let phaseIdx = 0; // P1
    if (phaseId === "PHASE_2") {
      moveSpeed = 100;
      phaseIdx = 1; // P2
    } else if (phaseId === "PHASE_3" || phaseId === "ENRAGED") {
      moveSpeed = 135;
      phaseIdx = 2; // P3
    }

    // Update attack cooldowns
    if (this.attackCooldownTimer > 0) {
      this.attackCooldownTimer -= delta;
    }

    const player = (this.scene as any).player;
    if (!player) return;

    // AI State Processing
    if (this.activeAttackState === "idle") {
      this.telegraphGraphics.clear();

      // Chase Player
      const dx = player.x - this.x;
      const dy = player.y - this.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Face the player
      const facingDir = { x: dx > 0 ? 1 : -1, y: dy > 0 ? 1 : -1 };
      const sprite = this.controller.animator?.getSprite();
      if (sprite) {
        sprite.setFlipX(facingDir.x < 0);
      }

      // Determine if boss should start attacking
      const inAttackRange = dist <= (this.currentAttack === "charge" ? 350 : 100);
      const isCooldownOver = this.attackCooldownTimer <= 0;

      if (inAttackRange && isCooldownOver) {
        this.selectAttack(dist, phaseIdx);
      } else {
        // Move towards player
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len > 0) {
            body.setVelocity((dx / len) * moveSpeed, (dy / len) * moveSpeed);
            if (this.controller.animator) {
              this.controller.animator.play(phaseIdx > 0 ? AnimationId.RUN : AnimationId.WALK);
            }
          }
        }
      }
    } else {
      // Execute Active Attack States
      this.executeAttackState(delta, phaseIdx, player);
    }

    // Sync position in AI class
    this.controller.ai.setPosition(this.x, this.y);
  }

  private selectAttack(dist: number, phaseIdx: number): void {
    const attacks: AttackType[] = [];
    
    if (phaseIdx === 0) {
      // Phase 1 attacks
      attacks.push("club_slam", "stomp");
      if (dist < 70) attacks.push("grab");
    } else if (phaseIdx === 1) {
      // Phase 2 attacks
      attacks.push("stomp", "double_slam");
      if (dist > 180) attacks.push("rock_throw", "charge");
      else attacks.push("charge");
    } else {
      // Phase 3 attacks
      attacks.push("double_slam", "charge", "stomp", "roar");
      if (dist > 160) attacks.push("rock_throw");
    }

    this.currentAttack = Phaser.Utils.Array.GetRandom(attacks) as AttackType;
    this.activeAttackState = "telegraph";
    this.telegraphTimer = this.attackStateDuration[this.currentAttack].telegraph;
    this.hasHitDuringActive = false;

    // Reset physics velocity on start
    const body = this.body as Phaser.Physics.Arcade.Body;
    if (body) body.setVelocity(0, 0);

    // Setup charge direction
    if (this.currentAttack === "charge") {
      const player = (this.scene as any).player;
      if (player) {
        const dx = player.x - this.x;
        const dy = player.y - this.y;
        const len = Math.sqrt(dx * dx + dy * dy);
        this.currentChargeDir = len > 0 ? { x: dx / len, y: dy / len } : { x: 1, y: 0 };
      }
    }

    // Set double slam markers
    this.doubleSlamTriggered = [false, false];

    // Trigger animator state
    if (this.controller.animator) {
      if (this.currentAttack === "club_slam" || this.currentAttack === "double_slam") {
        this.controller.animator.play(AnimationId.HEAVY_ATTACK);
      } else if (this.currentAttack === "stomp") {
        this.controller.animator.play(AnimationId.ATTACK);
      } else {
        this.controller.animator.play(AnimationId.BLOCK);
      }
    }

    // Play telegraph sound
    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized() && this.scene.cache.audio.has("rumble")) {
        if (this.currentAttack === "charge" || this.currentAttack === "roar") {
          audioManager.getSFXPlayer().play("rumble", { volume: 0.25, rate: 1.3 });
        }
      }
    } catch {}
  }

  private executeAttackState(delta: number, phaseIdx: number, player: any): void {
    this.telegraphGraphics.clear();

    if (this.activeAttackState === "telegraph") {
      this.telegraphTimer -= delta;
      this.drawTelegraph(player);

      if (this.telegraphTimer <= 0) {
        this.activeAttackState = "active";
        this.activeTimer = this.attackStateDuration[this.currentAttack].active;
        
        // Trigger stomp / charge screenshake instantly
        if (this.currentAttack === "stomp" || this.currentAttack === "roar") {
          this.scene.cameras.main.shake(120, this.currentAttack === "roar" ? 0.007 : 0.005);
          EffectsManager.getInstance().emitRockDebris(this.x, this.y, 8);
        }
      }
    } else if (this.activeAttackState === "active") {
      this.activeTimer -= delta;
      this.processActiveAttack(delta, player);

      if (this.activeTimer <= 0) {
        this.activeAttackState = "recovery";
        this.recoveryTimer = this.attackStateDuration[this.currentAttack].recovery[phaseIdx];
      }
    } else if (this.activeAttackState === "recovery") {
      this.recoveryTimer -= delta;
      // Recovering state animation
      if (this.controller.animator) {
        this.controller.animator.play(AnimationId.IDLE);
      }

      if (this.recoveryTimer <= 0) {
        this.activeAttackState = "idle";
        this.currentAttack = "none";
        
        // Phase-specific next attack cooldowns
        this.attackCooldownTimer = phaseIdx === 0 ? 1800 : (phaseIdx === 1 ? 1000 : 400);
      }
    }
  }

  private drawTelegraph(player: any): void {
    const g = this.telegraphGraphics;
    const px = player.x;
    const py = player.y;

    const facing = this.x < px ? 1 : -1;

    switch (this.currentAttack) {
      case "stomp": {
        // Expanding circular stomp warning
        const ratio = 1 - Math.max(0, this.telegraphTimer) / this.attackStateDuration.stomp.telegraph;
        g.lineStyle(2, 0xffaa00, 0.8);
        g.strokeCircle(this.x, this.y, 110);
        g.fillStyle(0xffaa00, 0.3 * ratio);
        g.fillCircle(this.x, this.y, 110 * ratio);
        break;
      }
      case "club_slam": {
        // Front impact rectangle
        g.lineStyle(2, 0xff3333, 0.8);
        g.strokeRect(this.x + (facing > 0 ? 10 : -70), this.y - 30, 60, 60);
        g.fillStyle(0xff3333, 0.25);
        g.fillRect(this.x + (facing > 0 ? 10 : -70), this.y - 30, 60, 60);
        break;
      }
      case "double_slam": {
        // Double slam indicators
        g.lineStyle(2, 0xff3333, 0.8);
        g.strokeRect(this.x + (facing > 0 ? 10 : -80), this.y - 45, 70, 90);
        g.fillStyle(0xff3333, 0.2);
        g.fillRect(this.x + (facing > 0 ? 10 : -80), this.y - 45, 70, 90);
        break;
      }
      case "grab": {
        g.lineStyle(2, 0xffcc00, 0.8);
        g.strokeRect(this.x + (facing > 0 ? 5 : -55), this.y - 25, 50, 50);
        g.fillStyle(0xffcc00, 0.25);
        g.fillRect(this.x + (facing > 0 ? 5 : -55), this.y - 25, 50, 50);
        break;
      }
      case "charge": {
        // Charging warning lane in direction of charge
        const ratio = 1 - Math.max(0, this.telegraphTimer) / this.attackStateDuration.charge.telegraph;
        const dx = this.currentChargeDir.x;
        const dy = this.currentChargeDir.y;

        g.lineStyle(2.5, 0xff3333, 0.9);
        // Draw the charge trajectory path
        g.strokeRect(this.x - 20, this.y - 20, dx * 320 + 40, dy * 320 + 40);
        g.fillStyle(0xff3333, 0.3 * ratio);
        g.fillRect(this.x - 20, this.y - 20, dx * 320 + 40, dy * 320 + 40);
        break;
      }
      case "rock_throw": {
        // Draw circle at player position to show where rock is targeted
        g.lineStyle(1.5, 0xff5555, 0.7);
        g.strokeCircle(px, py, 45);
        g.fillStyle(0xff5555, 0.15);
        g.fillCircle(px, py, 45);
        break;
      }
      case "roar": {
        g.lineStyle(1.5, 0xee77ff, 0.8);
        g.strokeCircle(this.x, this.y, 220);
        break;
      }
    }
  }

  private processActiveAttack(_delta: number, player: any): void {
    const px = player.x;
    const py = player.y;
    const facing = this.x < px ? 1 : -1;

    switch (this.currentAttack) {
      case "stomp": {
        if (this.hasHitDuringActive) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
        if (dist <= 110) {
          this.hasHitDuringActive = true;
          player.takeDamage(15, { x: this.x, y: this.y });
        }
        break;
      }
      case "club_slam": {
        if (this.hasHitDuringActive) return;
        // Slam hitbox logic: 60x60 square in front of boss
        const bx = this.x + (facing > 0 ? 10 : -70);
        const by = this.y - 30;
        const hit = px >= bx && px <= bx + 60 && py >= by && py <= by + 60;
        if (hit) {
          this.hasHitDuringActive = true;
          player.takeDamage(25, { x: this.x, y: this.y });
        }
        // Check overlap with standing pillars to destroy them
        this.checkPillarCollision(bx + 30, by + 30, 45);
        break;
      }
      case "double_slam": {
        // Double slam timing checks
        const activeElapsed = this.attackStateDuration.double_slam.active - this.activeTimer;

        // Slam 1 at 150ms
        if (activeElapsed >= 150 && !this.doubleSlamTriggered[0]) {
          this.doubleSlamTriggered[0] = true;
          this.scene.cameras.main.shake(100, 0.006);
          EffectsManager.getInstance().emitRockDebris(this.x + (facing > 0 ? 25 : -25), this.y, 8);
          // Check damage
          const bx = this.x + (facing > 0 ? 10 : -80);
          const by = this.y - 45;
          if (px >= bx && px <= bx + 70 && py >= by && py <= by + 90) {
            player.takeDamage(18, { x: this.x, y: this.y });
          }
          this.checkPillarCollision(this.x + (facing > 0 ? 30 : -30), this.y, 50);
        }

        // Slam 2 at 450ms
        if (activeElapsed >= 450 && !this.doubleSlamTriggered[1]) {
          this.doubleSlamTriggered[1] = true;
          this.scene.cameras.main.shake(100, 0.007);
          EffectsManager.getInstance().emitRockDebris(this.x + (facing > 0 ? 35 : -35), this.y, 10);
          // Check damage
          const bx = this.x + (facing > 0 ? 10 : -80);
          const by = this.y - 45;
          if (px >= bx && px <= bx + 70 && py >= by && py <= by + 90) {
            player.takeDamage(18, { x: this.x, y: this.y });
          }
          this.checkPillarCollision(this.x + (facing > 0 ? 30 : -30), this.y, 50);
        }
        break;
      }
      case "grab": {
        if (this.hasHitDuringActive) return;
        const bx = this.x + (facing > 0 ? 5 : -55);
        const by = this.y - 25;
        const hit = px >= bx && px <= bx + 50 && py >= by && py <= by + 50;
        if (hit) {
          this.hasHitDuringActive = true;
          // Stun grab: high damage and large knockback
          player.takeDamage(35, { x: this.x, y: this.y });
        }
        break;
      }
      case "charge": {
        // Move forward at high speed
        const body = this.body as Phaser.Physics.Arcade.Body;
        if (body) {
          body.setVelocity(this.currentChargeDir.x * this.chargeVelocity, this.currentChargeDir.y * this.chargeVelocity);
        }

        // Running dust trails
        if (Math.random() < 0.25) {
          EffectsManager.getInstance().emitRunningDust(this.x, this.y, this.currentChargeDir);
        }

        // Damage overlap checking (constant during charge)
        const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
        if (dist <= 40 && !this.hasHitDuringActive) {
          this.hasHitDuringActive = true;
          player.takeDamage(30, { x: this.x, y: this.y });
        }

        // Destroy columns hit during charge
        this.checkPillarCollision(this.x, this.y, 50);

        // Check if hitting wall bounds
        if (this.x < 80 || this.x > 3900 || this.y < 80 || this.y > 3900) {
          this.activeTimer = 0; // stop charge
        }
        break;
      }
      case "rock_throw": {
        if (this.hasHitDuringActive) return;
        this.hasHitDuringActive = true;
        // Spawn the rock projectile flying from the boss center to player target
        const proj = new RockProjectile(
          this.scene,
          this.x,
          this.y - 30, // throw from hands
          px,
          py,
          20,
          () => {}
        );
        this.rockProjectiles.push(proj);
        break;
      }
      case "roar": {
        if (this.hasHitDuringActive) return;
        const dist = Phaser.Math.Distance.Between(this.x, this.y, px, py);
        if (dist <= 220) {
          this.hasHitDuringActive = true;
          // Roar slows and knocks back
          player.takeDamage(10, { x: this.x, y: this.y });
          // Knocks player back
          const knockDir = { x: px - this.x, y: py - this.y };
          const len = Math.sqrt(knockDir.x ** 2 + knockDir.y ** 2);
          if (len > 0 && player.body) {
            player.body.setVelocity((knockDir.x / len) * 350, (knockDir.y / len) * 350);
          }
        }
        break;
      }
    }
  }

  private checkPillarCollision(x: number, y: number, checkRadius: number): void {
    const arenaController = (this.scene as any).bossEncounterController?.arenaController;
    if (arenaController) {
      const stoodPillars = arenaController.getPillarStates().filter((p: any) => !p.fallen);
      for (const pillar of stoodPillars) {
        const dist = Phaser.Math.Distance.Between(x, y, pillar.x, pillar.y);
        if (dist <= checkRadius) {
          arenaController.destroyPillar(pillar.id);
        }
      }
    }
  }

  public cleanupProjectiles(): void {
    for (const proj of this.rockProjectiles) {
      if (proj) proj.destroy();
    }
    this.rockProjectiles = [];
    this.telegraphGraphics.clear();
  }

  public destroyEnemy(): void {
    this.cleanupProjectiles();
    this.telegraphGraphics.destroy();
    super.destroyEnemy();
  }
}
