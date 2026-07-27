import Phaser from "phaser";
import { Logger } from "../../core/Logger";
import { UIHelpers } from "../../utils/UIHelpers";
import { InputManager } from "../../core/InputManager";
import { InputAction } from "../../core/InputAction";
import { CameraManager } from "../camera/CameraManager";
import { CombatManager } from "../combat/CombatManager";
import { HitboxShape } from "../../data/AttackData";
import { EnemyManager } from "../../entities/enemies/framework/EnemyManager";
import { Player } from "../../entities/player/Player";
import { CombatState } from "../combat/CombatController";
import { InteractionManager } from "../interaction/InteractionManager";
import { BaseInteractable } from "../interaction/BaseInteractable";

const STATE_COLORS: Record<string, number> = {
  IDLE: 0x888888,
  PATROL: 0x44aaff,
  INVESTIGATE: 0xffaa44,
  CHASE: 0xff4444,
  ATTACK: 0xff0000,
  HURT: 0xffff00,
  DEAD: 0x333333,
  RETURN_HOME: 0x44ff88,
};

export class DebugOverlay {
  private container: Phaser.GameObjects.Container;
  private fpsText: Phaser.GameObjects.Text;
  private infoText: Phaser.GameObjects.Text;
  private collisionGraphics: Phaser.GameObjects.Graphics;
  private deadzoneGraphics: Phaser.GameObjects.Graphics;
  private hitboxGraphics: Phaser.GameObjects.Graphics;
  private enemyDebugGraphics: Phaser.GameObjects.Graphics;
  private interactableGraphics: Phaser.GameObjects.Graphics;
  private enabled: boolean = false;
  private cameraManager: CameraManager | null = null;
  private player: Player | null = null;
  private frameCount: number = 0;
  private fps: number = 0;
  private fpsAccumulator: number = 0;
  private fpsUpdateInterval: number = 500;
  private lastFpsUpdate: number = 0;

  private readonly COLLISION_STROKE: number;
  private readonly DEADZONE_STROKE: number;

  public constructor(scene: Phaser.Scene) {
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(9999);

    this.fpsText = scene.add.text(8, 8, "", {
      fontSize: "14px",
      color: "#00ff00",
      backgroundColor: "#00000088",
      padding: { x: 4, y: 2 },
    });
    this.container.add(this.fpsText);

    this.infoText = scene.add.text(8, 28, "", {
      fontSize: "13px",
      color: "#00ff00",
      backgroundColor: "#00000088",
      padding: { x: 4, y: 2 },
    });
    this.container.add(this.infoText);

    this.collisionGraphics = scene.add.graphics();
    this.collisionGraphics.setScrollFactor(1);
    this.collisionGraphics.setDepth(9998);

    this.deadzoneGraphics = scene.add.graphics();
    this.deadzoneGraphics.setScrollFactor(0);
    this.deadzoneGraphics.setDepth(9997);

    this.hitboxGraphics = scene.add.graphics();
    this.hitboxGraphics.setScrollFactor(1);
    this.hitboxGraphics.setDepth(9998);

    this.enemyDebugGraphics = scene.add.graphics();
    this.enemyDebugGraphics.setScrollFactor(1);
    this.enemyDebugGraphics.setDepth(9996);

    this.interactableGraphics = scene.add.graphics();
    this.interactableGraphics.setScrollFactor(1);
    this.interactableGraphics.setDepth(9995);

    this.container.setVisible(false);
    this.collisionGraphics.setVisible(false);
    this.deadzoneGraphics.setVisible(false);
    this.hitboxGraphics.setVisible(false);
    this.enemyDebugGraphics.setVisible(false);
    this.interactableGraphics.setVisible(false);

    this.COLLISION_STROKE = 0xff00ff;
    this.DEADZONE_STROKE = 0x00ffff;

    this.bindInput();
    Logger.getInstance().log("[DebugOverlay] Initialized (F3 to toggle)");
  }

  public setCameraManager(cameraManager: CameraManager): void {
    this.cameraManager = cameraManager;
  }

  public setPlayer(player: Player): void {
    this.player = player;
  }

  private bindInput(): void {
    const inputManager = InputManager.getInstance();
    inputManager.on(InputAction.DEBUG_TOGGLE, (active: boolean) => {
      if (active) {
        this.toggle();
      }
    });
  }

  public toggle(): void {
    this.enabled = !this.enabled;
    this.container.setVisible(this.enabled);
    this.collisionGraphics.setVisible(this.enabled);
    this.deadzoneGraphics.setVisible(this.enabled);
    this.hitboxGraphics.setVisible(this.enabled);
    this.enemyDebugGraphics.setVisible(this.enabled);
    this.interactableGraphics.setVisible(this.enabled);
    if (!this.enabled) {
      this.clearEnemyLabels();
    }
    Logger.getInstance().log(
      `[DebugOverlay] Toggled ${this.enabled ? "ON" : "OFF"}`
    );
  }

  private clearEnemyLabels(): void {
    for (const label of this.enemyLabels) {
      label.destroy();
    }
    this.enemyLabels = [];
  }

  public update(time: number, delta: number): void {
    UIHelpers.adjustForZoom(this.container, 0, 0);
    if (!this.enabled) return;

    this.frameCount++;
    this.fpsAccumulator += delta;

    if (time - this.lastFpsUpdate >= this.fpsUpdateInterval) {
      const elapsed = time - this.lastFpsUpdate;
      this.fps = Math.round((this.frameCount / elapsed) * 1000);
      this.frameCount = 0;
      this.fpsAccumulator = 0;
      this.lastFpsUpdate = time;
    }

    this.renderFpsText();
    this.renderInfoText();
    this.renderCollisionBoxes();
    this.renderDeadzone();
    this.renderHitboxes();
    this.renderEnemyDebug();
    this.renderInteractableDebug();
  }

  private renderFpsText(): void {
    this.fpsText.setText(`FPS: ${this.fps}`);
  }

  private renderInfoText(): void {
    let info = "";

    if (this.player) {
      const px = this.player.x;
      const py = this.player.y;

      const playerState = this.player.getController().getStateMachine().getCurrentStateId() ?? "?";
      const playerHp = this.player.healthComponent.getCurrentHealth();
      const playerMaxHp = this.player.healthComponent.getMaxHealth();

      const combatCtrl = this.player.getCombatController();
      const combatState = combatCtrl ? combatCtrl.getState() : "?";
      const invulnMs = this.player["invulnerabilityTimer"] ? Math.round(this.player["invulnerabilityTimer"] * 1000) : 0;

      const facingDir = this.player.getController().getFacingDirection();
      let attackDirStr = "N/A";
      if (combatCtrl) {
        const ad = combatCtrl.getLastDirection();
        attackDirStr = `(${ad.x.toFixed(2)}, ${ad.y.toFixed(2)})`;
      }

      info += `Player: (${px.toFixed(1)}, ${py.toFixed(1)})`;
      info += `\nHP: ${playerHp}/${playerMaxHp} | State: ${playerState}`;
      info += `\nFacing: (${facingDir.x.toFixed(2)}, ${facingDir.y.toFixed(2)}) | AttackDir: ${attackDirStr}`;
      info += `\nCombat: ${combatState}`;

      if (combatCtrl) {
        if (combatCtrl.getState() !== CombatState.IDLE) {
          info += ` (${combatCtrl.getCurrentAttackType()})`;
        }
        const cd = combatCtrl.getRemainingCooldown();
        info += ` | CD: ${(cd * 1000).toFixed(0)}ms`;
        const wu = combatCtrl.getWindUpRemaining();
        if (wu > 0) {
          info += ` | WindUp: ${(wu * 1000).toFixed(0)}ms`;
        }
      }

      if (invulnMs > 0) {
        info += `\nInvuln: ${invulnMs}ms`;
      }
    } else {
      info += "Player: N/A";
    }

    const enemyMgr = EnemyManager.getInstance();
    info += `\nHitPause: ${enemyMgr.isHitPaused() ? Math.round(enemyMgr["hitPauseTimer"]) + "ms" : "No"}`;

    const enemies = enemyMgr.getAllEnemies();
    info += `\nEnemies: ${enemies.length} (alive: ${enemyMgr.getAliveCount()})`;

    for (const enemy of enemies) {
      const state = enemy.controller.ai.getCurrentStateId() ?? "?";
      const hp = enemy.controller.health.getCurrentHealth();
      const maxHp = enemy.controller.health.getMaxHealth();
      const shortId = enemy.getEntityId().slice(-8);
      const cc = enemy.combatController;
      const combatState = cc ? cc.getState() : "N/A";
      const cd = cc ? cc.getRemainingCooldown() : 0;
      const wu = cc ? cc.getWindUpRemaining() : 0;
      info += `\n  [${shortId}] ${state} HP:${hp}/${maxHp} Cbt:${combatState}`;
      if (cd > 0) info += ` CD:${(cd * 1000).toFixed(0)}ms`;
      if (wu > 0) info += ` WU:${(wu * 1000).toFixed(0)}ms`;
    }

    const hbCount = CombatManager.getInstance().getHitboxManager().getActiveHitboxCount();
    info += `\nActive Hitboxes: ${hbCount}`;

    if (this.cameraManager && this.cameraManager.isActive()) {
      const view = this.cameraManager.getCameraView();
      const dz = this.cameraManager.getDeadzone();
      const zoom = this.cameraManager.getZoom();
      info += `\nCamera: (${view.x.toFixed(1)}, ${view.y.toFixed(1)}) | Zoom: ${zoom.toFixed(2)}`;
      info += `\nDeadzone: ${dz.width}x${dz.height}`;
    }

    const im = InteractionManager.getInstance();
    const nearest = im.getNearestInteractable();
    if (nearest) {
      info += `\nTarget: ${nearest.getId()} [${nearest.getInteractionPrompt()}]`;
    } else {
      info += `\nTarget: None`;
    }
    info += `\nInteractables: ${im.getInteractableCount()}`;

    const activeScene = this.infoText.scene;
    const bossCtrl = (activeScene as any).bossEncounterController;
    if (bossCtrl) {
      info += `\n\n--- BOSS ENCOUNTER SYSTEM ---`;
      info += `\nBoss: ${bossCtrl.config.bossName} | HP: ${bossCtrl.getBossHp()}/${bossCtrl.getMaxHp()}`;
      info += `\nPhase: ${bossCtrl.getCurrentPhaseId()} (${bossCtrl.phaseString})`;
      info += `\nActive: ${bossCtrl.isEncounterActive() ? "YES" : "NO"}`;
      info += `\nTriggers: ${bossCtrl.getTriggerStatus()}`;
      info += `\nSpawn Point: (${bossCtrl.config.arenaConfig.bossSpawnX}, ${bossCtrl.config.arenaConfig.bossSpawnY})`;
      info += `\nCheckpoint: ${bossCtrl.config.checkpointId}`;

      const boss = bossCtrl.bossEntity;
      if (boss) {
        info += `\nAttack: ${boss.currentAttack.toUpperCase()} (${boss.activeAttackState})`;
        info += `\nTelegraph: ${Math.max(0, boss.telegraphTimer).toFixed(0)}ms | Recovery: ${Math.max(0, boss.recoveryTimer).toFixed(0)}ms`;
        info += `\nCooldown: ${Math.max(0, boss.attackCooldownTimer).toFixed(0)}ms`;
      }
      const arena = bossCtrl.arenaController;
      if (arena) {
        const pillars = arena.getPillarStates();
        const standing = pillars.filter((p: any) => !p.fallen).length;
        const destroyed = pillars.filter((p: any) => p.fallen).length;
        info += `\nPillars: Stood:${standing} | Collapsed:${destroyed}`;
      }

      const escapeCtrl = bossCtrl.getEscapeController?.();
      if (escapeCtrl && escapeCtrl.isEscapeActive()) {
        info += `\n\n--- ESCAPE SEQUENCE ---`;
        info += `\nPhase: ${escapeCtrl.getPhase().toUpperCase()}`;
        info += `\nTimer: ${escapeCtrl.getEscapeTimer().toFixed(1)}s / ${escapeCtrl.getTimeLimit()}s`;
        info += `\nBoulders: ${escapeCtrl.getBoulderCount()} active`;
        info += `\nTriggers: ${escapeCtrl.getTriggeredZoneCount()} hit`;
      }
    }

    this.infoText.setText(info);
  }

  private renderCollisionBoxes(): void {
    this.collisionGraphics.clear();

    if (!this.player) return;

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (!body) return;

    this.collisionGraphics.lineStyle(1, this.COLLISION_STROKE, 0.8);
    this.collisionGraphics.strokeRect(
      body.x,
      body.y,
      body.width,
      body.height
    );

    for (const enemy of EnemyManager.getInstance().getAllEnemies()) {
      if (!enemy.isAlive()) continue;
      const eBody = enemy.body as Phaser.Physics.Arcade.Body;
      if (!eBody) continue;
      this.collisionGraphics.lineStyle(1, 0xff6600, 0.6);
      this.collisionGraphics.strokeRect(
        eBody.x,
        eBody.y,
        eBody.width,
        eBody.height
      );
    }
  }

  private renderDeadzone(): void {
    this.deadzoneGraphics.clear();

    if (!this.cameraManager || !this.cameraManager.isActive()) return;

    const view = this.cameraManager.getCameraView();
    const dz = this.cameraManager.getDeadzone();

    const dzX = view.x + (view.width - dz.width) / 2;
    const dzY = view.y + (view.height - dz.height) / 2;

    this.deadzoneGraphics.lineStyle(2, this.DEADZONE_STROKE, 0.9);
    this.deadzoneGraphics.strokeRect(dzX, dzY, dz.width, dz.height);
  }

  private renderHitboxes(): void {
    this.hitboxGraphics.clear();

    const combatManager = CombatManager.getInstance();
    const hbMgr = combatManager.getHitboxManager();
    const hitboxes = hbMgr.getHitboxesForDebug();
    const scene = this.hitboxGraphics.scene;

    for (const hb of hitboxes) {
      const color = hb.ownerId === "player" ? 0x44ff44 : 0xff4444;
      this.hitboxGraphics.lineStyle(2, color, 0.9);
      this.hitboxGraphics.fillStyle(color, 0.15);

      if (hb.shape === HitboxShape.RECTANGLE && hb.width && hb.height) {
        const hw = hb.width / 2;
        const hh = hb.height / 2;
        this.hitboxGraphics.fillRect(hb.x - hw, hb.y - hh, hb.width, hb.height);
        this.hitboxGraphics.strokeRect(hb.x - hw, hb.y - hh, hb.width, hb.height);
      } else if (hb.shape === HitboxShape.CIRCLE && hb.radius) {
        this.hitboxGraphics.fillCircle(hb.x, hb.y, hb.radius);
        this.hitboxGraphics.strokeCircle(hb.x, hb.y, hb.radius);
      }

      if (scene && scene.add) {
        this.hitboxGraphics.fillStyle(0x000000, 0.6);
        this.hitboxGraphics.fillRect(hb.x - 10, hb.y - 16, 20, 10);
      }
    }
  }

  private renderEnemyDebug(): void {
    this.enemyDebugGraphics.clear();

    const debugInfo = EnemyManager.getInstance().getDebugInfo();
    const scene = this.enemyDebugGraphics.scene;

    for (const info of debugInfo) {
      if (!info.isAlive) continue;

      const stateColor = STATE_COLORS[info.state] ?? 0xffffff;

      this.enemyDebugGraphics.lineStyle(1, 0x4488ff, 0.2);
      this.enemyDebugGraphics.strokeCircle(info.x, info.y, info.visionRadius);
      this.enemyDebugGraphics.fillStyle(0x4488ff, 0.03);
      this.enemyDebugGraphics.fillCircle(info.x, info.y, info.visionRadius);

      this.enemyDebugGraphics.lineStyle(1, 0xff4444, 0.4);
      this.enemyDebugGraphics.strokeCircle(info.x, info.y, info.attackRadius);

      if (info.patrolTarget) {
        this.enemyDebugGraphics.lineStyle(1, 0x44aaff, 0.5);
        this.enemyDebugGraphics.beginPath();
        this.enemyDebugGraphics.moveTo(info.x, info.y);
        this.enemyDebugGraphics.lineTo(info.patrolTarget.x, info.patrolTarget.y);
        this.enemyDebugGraphics.strokePath();
        this.enemyDebugGraphics.lineStyle(1, 0x44aaff, 0.7);
        this.enemyDebugGraphics.strokeCircle(info.patrolTarget.x, info.patrolTarget.y, 4);
      }

      this.enemyDebugGraphics.lineStyle(1, 0x44ff88, 0.5);
      const hx = info.homePosition.x;
      const hy = info.homePosition.y;
      this.enemyDebugGraphics.beginPath();
      this.enemyDebugGraphics.moveTo(hx, hy - 5);
      this.enemyDebugGraphics.lineTo(hx + 5, hy);
      this.enemyDebugGraphics.lineTo(hx, hy + 5);
      this.enemyDebugGraphics.lineTo(hx - 5, hy);
      this.enemyDebugGraphics.closePath();
      this.enemyDebugGraphics.strokePath();

      const facingLen = 20;
      this.enemyDebugGraphics.lineStyle(1, stateColor, 0.6);
      this.enemyDebugGraphics.beginPath();
      this.enemyDebugGraphics.moveTo(info.x, info.y);
      this.enemyDebugGraphics.lineTo(
        info.x + info.facingDir.x * facingLen,
        info.y + info.facingDir.y * facingLen
      );
      this.enemyDebugGraphics.strokePath();

      const barW = 28;
      const barH = 3;
      const barX = info.x - barW / 2;
      const barY = info.y - 24;
      this.enemyDebugGraphics.fillStyle(0x000000, 0.6);
      this.enemyDebugGraphics.fillRect(barX - 1, barY - 1, barW + 2, barH + 2);
      this.enemyDebugGraphics.fillStyle(0x333333, 0.7);
      this.enemyDebugGraphics.fillRect(barX, barY, barW, barH);
      const hpPct = info.maxHealth > 0 ? info.health / info.maxHealth : 0;
      const hpColor = hpPct > 0.5 ? 0x44ff44 : hpPct > 0.25 ? 0xffaa44 : 0xff4444;
      this.enemyDebugGraphics.fillStyle(hpColor, 0.9);
      this.enemyDebugGraphics.fillRect(barX, barY, barW * hpPct, barH);

      if (scene) {
        const labelText = `${info.state}${info.isLookingAround ? ' (looking)' : ''}`;
        const hpText = `${info.health}/${info.maxHealth}`;

        const textWidth = Math.max(labelText.length * 7, hpText.length * 6);
        this.enemyDebugGraphics.fillStyle(0x000000, 0.6);
        this.enemyDebugGraphics.fillRect(info.x - textWidth / 2 - 2, info.y - 44, textWidth + 4, 18);
      }
    }

    if (scene && scene.add) {
      this.renderEnemyLabels(debugInfo);
    }
  }

  private enemyLabels: Phaser.GameObjects.Text[] = [];
  private renderEnemyLabels(debugInfo: import("../../entities/enemies/framework/EnemyManager").EnemyDebugInfo[]): void {
    for (const label of this.enemyLabels) {
      label.destroy();
    }
    this.enemyLabels = [];

    for (const info of debugInfo) {
      if (!info.isAlive) continue;

      const stateName = info.state;
      const vel = info.velocity;
      const speed = Math.round(Math.sqrt(vel.x * vel.x + vel.y * vel.y));

      const lines = [
        `${stateName}  HP:${info.health}/${info.maxHealth}`,
        `vel:${speed}  ${info.isLookingAround ? '(looking)' : ''}`,
      ];

      const text = this.enemyDebugGraphics.scene.add.text(
        info.x, info.y - 58, lines.join('\n'), {
          fontSize: '10px',
          fontFamily: 'monospace',
          color: '#ffffff',
          backgroundColor: '#00000088',
          padding: { x: 3, y: 2 },
          align: 'center',
        }
      );
      text.setOrigin(0.5, 0);
      text.setDepth(9997);
      this.enemyLabels.push(text);
    }
  }

  private renderInteractableDebug(): void {
    this.interactableGraphics.clear();

    const im = InteractionManager.getInstance();
    const interactables = im.getAllInteractables();
    const nearest = im.getNearestInteractable();

    for (const int of interactables) {
      if (!int.isInteractionEnabled()) continue;

      const pos = int.getPosition();
      const range = int.getInteractionRange();

      const isNearest = nearest === int;

      const color = isNearest ? 0x00ff88 : 0xffaa44;
      const alpha = isNearest ? 0.5 : 0.2;

      this.interactableGraphics.lineStyle(1, color, alpha);
      this.interactableGraphics.strokeCircle(pos.x, pos.y, range);

      this.interactableGraphics.fillStyle(color, 0.03);
      this.interactableGraphics.fillCircle(pos.x, pos.y, range);

      if (int instanceof BaseInteractable) {
        const bounds = int.getBodyBounds();
        this.interactableGraphics.lineStyle(isNearest ? 2 : 1, color, isNearest ? 0.8 : 0.4);
        this.interactableGraphics.strokeRect(bounds.x, bounds.y, bounds.width, bounds.height);
      }

      if (isNearest) {
        this.interactableGraphics.lineStyle(1, 0x00ff88, 0.3);
        this.interactableGraphics.beginPath();
        this.interactableGraphics.moveTo(pos.x, pos.y);
        if (this.player) {
          this.interactableGraphics.lineTo(this.player.x, this.player.y);
        }
        this.interactableGraphics.strokePath();
      }
    }
  }

  public destroy(): void {
    this.clearEnemyLabels();
    this.container.destroy();
    this.collisionGraphics.destroy();
    this.deadzoneGraphics.destroy();
    this.hitboxGraphics.destroy();
    this.enemyDebugGraphics.destroy();
    this.interactableGraphics.destroy();
    Logger.getInstance().log("[DebugOverlay] Destroyed");
  }
}
