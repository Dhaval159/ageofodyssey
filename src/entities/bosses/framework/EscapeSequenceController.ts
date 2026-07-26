import Phaser from "phaser";
import { BossCutsceneSequence, CutsceneStep } from "./BossCutsceneSequence";
import { FallingBoulder, BoulderConfig } from "./FallingBoulder";
import { EscapeTimerUI } from "./EscapeTimerUI";
import { ObjectiveManager } from "../../../systems/objectives/ObjectiveManager";
import { GameStateManager, GameState } from "../../../core/GameStateManager";
import { AudioManager } from "../../../systems/audio/AudioManager";
import { EffectsManager } from "../../../systems/effects/EffectsManager";
import { CollisionManager } from "../../../managers/CollisionManager";
import { CheckpointSystem } from "../../../systems/save/CheckpointSystem";
import { Logger } from "../../../core/Logger";

export interface EscapeTriggerZone {
  x: number;
  y: number;
  width: number;
  height: number;
  objectiveId: string;
  objectiveText: string;
  collapseDelay: number;
  collapseX: number;
  collapseY: number;
  collapseW: number;
  collapseH: number;
}

export interface CollapsingBridgeConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  triggerDistance: number;
  collapseDelay: number;
  segments: number;
}

export interface BreakingFloorConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  triggerDistance: number;
  breakDelay: number;
  tileSize: number;
}

export interface DustZoneConfig {
  x: number;
  y: number;
  width: number;
  height: number;
  density: number;
  color: number;
}

export interface TorchExtinguishConfig {
  x: number;
  y: number;
  triggerDistance: number;
  delay: number;
}

export interface EscapeSequenceConfig {
  escapeTimeLimit: number;
  triggerZones: EscapeTriggerZone[];
  boulders: BoulderConfig[];
  collapsingBridges: CollapsingBridgeConfig[];
  breakingFloors: BreakingFloorConfig[];
  dustZones: DustZoneConfig[];
  torchExtinguish: TorchExtinguishConfig[];
  introCutsceneSteps: CutsceneStep[];
  outroCutsceneSteps: CutsceneStep[];
  onEscapeComplete: () => void;
}

export type EscapePhase = "idle" | "cinematic" | "escaping" | "complete";

export class EscapeSequenceController {
  private scene: Phaser.Scene;
  private config: EscapeSequenceConfig;

  private cutsceneSequence: BossCutsceneSequence;
  private timerUI: EscapeTimerUI;
  private fallingBoulders: FallingBoulder[] = [];
  private collapsingBridges: Phaser.GameObjects.Container[] = [];
  private breakingFloorTiles: Phaser.GameObjects.Rectangle[][] = [];
  private dustZoneGraphics: Phaser.GameObjects.Graphics[] = [];
  private dustParticles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number; color: number }> = [];
  private torchExtinguishList: Array<{ x: number; y: number; graphics: Phaser.GameObjects.Graphics; lit: boolean; triggered: boolean }> = [];

  private phase: EscapePhase = "idle";
  private escapeTimer: number = 0;
  private timeLimit: number = 0;
  private elapsed: number = 0;
  private isActive: boolean = false;

  private triggeredZones: Set<string> = new Set();
  private triggeredBridges: Set<number> = new Set();
  private triggeredFloors: Set<number> = new Set();
  private triggeredTorches: Set<number> = new Set();
  private collapseWalls: Phaser.GameObjects.Rectangle[] = [];
  private collapseGraphics: Phaser.GameObjects.Graphics[] = [];
  private playerRef: Phaser.GameObjects.GameObject | null = null;
  private exitTriggerX: number = 0;

  private shakeTimer: number = 0;
  private ambientRumbleTimer: number = 0;
  private dustCloudTimer: number = 0;
  private fogIntensity: number = 0.3;
  private checkpointDisabled: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.cutsceneSequence = new BossCutsceneSequence(scene);
    this.timerUI = new EscapeTimerUI(scene);
    this.timeLimit = 100;
    this.config = {
      escapeTimeLimit: 100,
      triggerZones: [],
      boulders: [],
      collapsingBridges: [],
      breakingFloors: [],
      dustZones: [],
      torchExtinguish: [],
      introCutsceneSteps: [],
      outroCutsceneSteps: [],
      onEscapeComplete: () => {},
    };
  }

  public start(config: EscapeSequenceConfig, player: Phaser.GameObjects.GameObject, exitTriggerX: number): void {
    if (this.isActive) return;

    this.config = config;
    this.timeLimit = config.escapeTimeLimit;
    this.escapeTimer = config.escapeTimeLimit;
    this.elapsed = 0;
    this.isActive = true;
    this.playerRef = player;
    this.exitTriggerX = exitTriggerX;
    this.triggeredZones.clear();
    this.triggeredBridges.clear();
    this.triggeredFloors.clear();
    this.triggeredTorches.clear();
    this.phase = "cinematic";

    this.disableCheckpoints();

    Logger.getInstance().log("[EscapeSequence] Starting escape sequence");

    this.cutsceneSequence.start(config.introCutsceneSteps, () => {
      this.beginEscapeGameplay();
    });
  }

  private disableCheckpoints(): void {
    const checkpointSystem = CheckpointSystem.getInstance();
    this.checkpointDisabled = true;
    Logger.getInstance().log("[EscapeSequence] Checkpoints disabled during escape");
  }

  private enableCheckpoints(): void {
    this.checkpointDisabled = false;
    Logger.getInstance().log("[EscapeSequence] Checkpoints re-enabled");
  }

  private beginEscapeGameplay(): void {
    this.phase = "escaping";
    this.escapeTimer = this.timeLimit;
    this.elapsed = 0;

    GameStateManager.getInstance().setState(GameState.PLAYING);

    const scene = this.scene as any;
    if (scene.playerControlEnabled !== undefined) {
      scene.playerControlEnabled = true;
    }
    if (scene.setupCamera && scene.cameraManager && scene.player) {
      scene.setupCamera();
      scene.cameraManager.follow(scene.player);
    }

    ObjectiveManager.getInstance().setObjective("escape_cave", "Escape the collapsing cave!");

    this.timerUI.show(this.timeLimit);

    this.spawnBoulders();
    this.buildCollapseWalls();
    this.buildCollapsingBridges();
    this.buildBreakingFloors();
    this.buildDustZones();
    this.buildTorchExtinguish();

    this.startAmbientEffects();

    Logger.getInstance().log("[EscapeSequence] Escape gameplay began. Time limit: " + this.timeLimit + "s");
  }

  private spawnBoulders(): void {
    for (const boulderConfig of this.config.boulders) {
      const boulder = new FallingBoulder(this.scene, boulderConfig);
      this.fallingBoulders.push(boulder);
    }
  }

  private buildCollapseWalls(): void {
    for (const zone of this.config.triggerZones) {
      const wall = this.scene.add.rectangle(zone.collapseX, zone.collapseY, zone.collapseW, zone.collapseH, 0x4a4a3a, 0);
      wall.setDepth(5);
      this.scene.physics.add.existing(wall, true);
      this.collapseWalls.push(wall);
      CollisionManager.getInstance().getObjectGroup()?.add(wall);

      const vis = this.scene.add.graphics();
      this.collapseGraphics.push(vis);
    }
  }

  private buildCollapsingBridges(): void {
    for (let i = 0; i < this.config.collapsingBridges.length; i++) {
      const bridge = this.config.collapsingBridges[i];
      const container = this.scene.add.container(bridge.x, bridge.y);
      container.setDepth(5);

      const segmentWidth = bridge.width / bridge.segments;
      for (let s = 0; s < bridge.segments; s++) {
        const seg = this.scene.add.rectangle(
          (s - bridge.segments / 2 + 0.5) * segmentWidth,
          0,
          segmentWidth - 2,
          bridge.height,
          0x5a4a3a,
          1
        );
        seg.setStrokeStyle(2, 0x4a3a2a, 1);
        container.add(seg);
      }

      this.scene.physics.add.existing(container, true);
      (container.body as Phaser.Physics.Arcade.StaticBody).setSize(bridge.width, bridge.height);
      this.collapsingBridges.push(container);
    }
  }

  private buildBreakingFloors(): void {
    for (let i = 0; i < this.config.breakingFloors.length; i++) {
      const floor = this.config.breakingFloors[i];
      const tiles: Phaser.GameObjects.Rectangle[] = [];
      const cols = Math.ceil(floor.width / floor.tileSize);
      const rows = Math.ceil(floor.height / floor.tileSize);

      for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
          const tile = this.scene.add.rectangle(
            floor.x - floor.width / 2 + col * floor.tileSize + floor.tileSize / 2,
            floor.y - floor.height / 2 + row * floor.tileSize + floor.tileSize / 2,
            floor.tileSize - 1,
            floor.tileSize - 1,
            0x3a3a2a,
            1
          );
          tile.setStrokeStyle(1, 0x2a2a1a, 0.8);
          tile.setDepth(2);
          this.scene.physics.add.existing(tile, true);
          tiles.push(tile);
        }
      }
      this.breakingFloorTiles.push(tiles);
    }
  }

  private buildDustZones(): void {
    for (const zone of this.config.dustZones) {
      const g = this.scene.add.graphics();
      g.setDepth(945);
      this.dustZoneGraphics.push(g);
    }

    for (let i = 0; i < 60; i++) {
      const zone = this.config.dustZones[i % this.config.dustZones.length];
      this.dustParticles.push({
        x: Phaser.Math.Between(zone.x - zone.width / 2, zone.x + zone.width / 2),
        y: Phaser.Math.Between(zone.y - zone.height / 2, zone.y + zone.height / 2),
        vx: Phaser.Math.FloatBetween(-10, 10),
        vy: Phaser.Math.FloatBetween(-5, 5),
        alpha: Phaser.Math.FloatBetween(0.05, 0.15),
        size: Phaser.Math.FloatBetween(1, 3),
        color: zone.color,
      });
    }
  }

  private buildTorchExtinguish(): void {
    for (const torch of this.config.torchExtinguish) {
      const g = this.scene.add.graphics();
      g.fillStyle(0x5a3a1a, 1);
      g.fillRect(torch.x - 2, torch.y - 15, 4, 30);
      g.fillStyle(0xff6600, 1);
      g.fillCircle(torch.x, torch.y - 17, 5);
      g.fillStyle(0xffaa00, 0.8);
      g.fillCircle(torch.x, torch.y - 18, 3);
      g.setDepth(6);
      this.torchExtinguishList.push({ x: torch.x, y: torch.y, graphics: g, lit: true, triggered: false });
    }
  }

  private startAmbientEffects(): void {
    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized() && this.scene.cache.audio.has("rumble")) {
        audioManager.getSFXPlayer().play("rumble", { volume: 0.15, loop: true, rate: 0.7 });
      }
    } catch {}

    this.startFogEffect();
  }

  private startFogEffect(): void {
    const cam = this.scene.cameras.main;
    this.scene.tweens.add({
      targets: { value: this.fogIntensity },
      value: 0.6,
      duration: 3000,
      ease: "Power2",
      onUpdate: (tween) => {
        this.fogIntensity = tween.getValue();
        this.updateFogOverlay();
      },
    });
  }

  private updateFogOverlay(): void {
    const cam = this.scene.cameras.main;
    if (!this.fogOverlay) {
      this.fogOverlay = this.scene.add.graphics();
      this.fogOverlay.setScrollFactor(0);
      this.fogOverlay.setDepth(960);
    }
    this.fogOverlay.clear();
    this.fogOverlay.fillStyle(0x0a0a12, this.fogIntensity);
    this.fogOverlay.fillRect(0, 0, cam.width, cam.height);
  }

  private fogOverlay: Phaser.GameObjects.Graphics | null = null;

  public update(time: number, delta: number): void {
    if (!this.isActive) return;

    if (this.phase === "cinematic" || this.phase === "complete") {
      return;
    }

    if (this.phase !== "escaping") return;

    const dt = delta / 1000;
    this.elapsed += dt;
    this.escapeTimer = Math.max(0, this.timeLimit - this.elapsed);

    this.timerUI.update(this.escapeTimer);

    this.updateAmbientEffects(delta);
    this.updateBoulders(time, delta);
    this.checkTriggerZones();
    this.updateCollapseAnimations(delta);
    this.updateCollapsingBridges();
    this.updateBreakingFloors();
    this.updateDustZones(delta);
    this.updateTorchExtinguish();
    this.updateFog(delta);
    this.checkPlayerExit();

    if (this.escapeTimer <= 0) {
      this.handleTimeUp();
    }
  }

  private updateAmbientEffects(delta: number): void {
    this.shakeTimer += delta;
    this.ambientRumbleTimer += delta;

    const urgency = 1 - (this.escapeTimer / this.timeLimit);

    if (this.shakeTimer > 800 + (1 - urgency) * 2000) {
      this.shakeTimer = 0;
      const intensity = 0.002 + urgency * 0.006;
      this.scene.cameras.main.shake(300, intensity);
    }

    if (this.ambientRumbleTimer > 3000) {
      this.ambientRumbleTimer = 0;
      try {
        const audioManager = AudioManager.getInstance();
        if (audioManager.isInitialized() && this.scene.cache.audio.has("rumble")) {
          audioManager.getSFXPlayer().play("rumble", { volume: 0.08 + urgency * 0.12, rate: 0.6 + Math.random() * 0.3 });
        }
      } catch {}
    }

    this.dustCloudTimer += delta;
    if (this.dustCloudTimer > 2000 - urgency * 800) {
      this.dustCloudTimer = 0;
      const player = this.playerRef as any;
      if (player) {
        const spawnX = player.x + Phaser.Math.Between(-400, 400);
        const spawnY = player.y + Phaser.Math.Between(-200, 200);
        EffectsManager.getInstance().emitRockDebris(spawnX, spawnY, 3);
      }
    }
  }

  private updateBoulders(time: number, delta: number): void {
    for (let i = this.fallingBoulders.length - 1; i >= 0; i--) {
      const boulder = this.fallingBoulders[i];
      boulder.update(time, delta);

      if (boulder.isDone()) {
        boulder.destroy();
        this.fallingBoulders.splice(i, 1);
      }
    }
  }

  private checkTriggerZones(): void {
    const player = this.playerRef as any;
    if (!player) return;

    for (const zone of this.config.triggerZones) {
      if (this.triggeredZones.has(zone.objectiveId)) continue;

      const dx = Math.abs(player.x - zone.x);
      const dy = Math.abs(player.y - zone.y);

      if (dx < zone.width / 2 && dy < zone.height / 2) {
        this.triggeredZones.add(zone.objectiveId);
        this.onTriggerZoneEntered(zone);
      }
    }
  }

  private onTriggerZoneEntered(zone: EscapeTriggerZone): void {
    Logger.getInstance().log(`[EscapeSequence] Trigger zone entered: ${zone.objectiveId}`);

    ObjectiveManager.getInstance().setObjective(zone.objectiveId, zone.objectiveText);

    this.scene.time.delayedCall(zone.collapseDelay, () => {
      this.collapseSection(zone);
    });

    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized() && this.scene.cache.audio.has("rumble")) {
        audioManager.getSFXPlayer().play("rumble", { volume: 0.3, rate: 1.2 });
      }
    } catch {}

    this.scene.cameras.main.shake(200, 0.005);
  }

  private collapseSection(zone: EscapeTriggerZone): void {
    Logger.getInstance().log(`[EscapeSequence] Collapsing section near (${zone.collapseX}, ${zone.collapseY})`);

    EffectsManager.getInstance().emitRockDebris(zone.collapseX, zone.collapseY, 20);

    this.scene.cameras.main.shake(400, 0.008);

    for (const wall of this.collapseWalls) {
      if (Math.abs(wall.x - zone.collapseX) < zone.collapseW && Math.abs(wall.y - zone.collapseY) < zone.collapseH) {
        CollisionManager.getInstance().getObjectGroup()?.remove(wall);
        wall.setVisible(true);
        wall.setFillStyle(0x4a4a3a, 0.8);

        this.scene.tweens.add({
          targets: wall,
          alpha: 0.3,
          duration: 2000,
          ease: "Power2",
        });
      }
    }

    for (const g of this.collapseGraphics) {
      if (Math.abs(g.x - zone.collapseX) < zone.collapseW || g.x === 0) {
        g.clear();
        g.fillStyle(0x3a3a2a, 0.6);
        g.fillRect(zone.collapseX - zone.collapseW / 2, zone.collapseY - zone.collapseH / 2, zone.collapseW, zone.collapseH);
        g.setDepth(4);
      }
    }

    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized() && this.scene.cache.audio.has("rumble")) {
        audioManager.getSFXPlayer().play("rumble", { volume: 0.5, rate: 0.8 });
      }
    } catch {}
  }

  private updateCollapseAnimations(_delta: number): void {
    const urgency = 1 - (this.escapeTimer / this.timeLimit);

    if (urgency > 0.5 && Math.random() < urgency * 0.02) {
      const player = this.playerRef as any;
      if (player) {
        const nearbyX = player.x + Phaser.Math.Between(-300, 300);
        const nearbyY = player.y + Phaser.Math.Between(-150, 150);
        EffectsManager.getInstance().emitRockDebris(nearbyX, nearbyY, 5);
      }
    }
  }

  private checkPlayerExit(): void {
    const player = this.playerRef as any;
    if (!player) return;

    if (player.x <= this.exitTriggerX) {
      this.onPlayerReachedExit();
    }
  }

  private onPlayerReachedExit(): void {
    if (this.phase === "complete") return;

    Logger.getInstance().log("[EscapeSequence] Player reached exit!");

    this.phase = "complete";
    this.timerUI.hide();

    GameStateManager.getInstance().setState(GameState.CUTSCENE);
    const scene = this.scene as any;
    if (scene.playerControlEnabled !== undefined) {
      scene.playerControlEnabled = false;
    }

    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized()) {
        audioManager.getMusicPlayer().stop(1000);
      }
    } catch {}

    this.cutsceneSequence.start(this.config.outroCutsceneSteps, () => {
      this.complete();
    });
  }

  private handleTimeUp(): void {
    Logger.getInstance().log("[EscapeSequence] Time is up!");

    this.phase = "complete";
    this.timerUI.show(0);

    GameStateManager.getInstance().setState(GameState.CUTSCENE);

    const scene = this.scene as any;
    if (scene.playerControlEnabled !== undefined) {
      scene.playerControlEnabled = false;
    }

    const player = this.playerRef as any;
    if (player && player.healthComponent) {
      player.healthComponent.takeDamage(9999);
    }

    this.scene.cameras.main.fadeOut(2000, 0, 0, 0);
  }

  private complete(): void {
    Logger.getInstance().log("[EscapeSequence] Escape complete!");

    ObjectiveManager.getInstance().completeObjective("escape_cave");
    ObjectiveManager.getInstance().setObjective("chapter_complete", "Chapter Complete");

    this.config.onEscapeComplete();

    this.scene.time.delayedCall(3000, () => {
      this.cleanup();
    });
  }

  private cleanup(): void {
    for (const boulder of this.fallingBoulders) {
      boulder.destroy();
    }
    this.fallingBoulders = [];

    for (const wall of this.collapseWalls) {
      CollisionManager.getInstance().getObjectGroup()?.remove(wall);
      wall.destroy();
    }
    this.collapseWalls = [];

    for (const g of this.collapseGraphics) {
      g.destroy();
    }
    this.collapseGraphics = [];

    this.timerUI.destroy();
    this.isActive = false;
    this.phase = "idle";

    Logger.getInstance().log("[EscapeSequence] Cleanup complete");
  }

  public isEscapeActive(): boolean {
    return this.isActive;
  }

  public getPhase(): EscapePhase {
    return this.phase;
  }

  public getEscapeTimer(): number {
    return this.escapeTimer;
  }

  public getTimeLimit(): number {
    return this.timeLimit;
  }

  public getBoulderCount(): number {
    return this.fallingBoulders.length;
  }

  public getTriggeredZoneCount(): number {
    return this.triggeredZones.size;
  }

  public destroy(): void {
    this.cleanup();
  }
}
