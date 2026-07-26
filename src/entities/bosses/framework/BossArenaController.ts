import Phaser from "phaser";
import { WorldObject } from "../../world/WorldObject";
import { CollisionManager } from "../../../managers/CollisionManager";
import { BossTriggerVolume } from "./BossTriggerVolume";
import { Logger } from "../../../core/Logger";
import { AudioManager } from "../../../systems/audio/AudioManager";
import { EffectsManager } from "../../../systems/effects/EffectsManager";

export interface BossArenaConfig {
  centerX: number;
  centerY: number;
  radius?: number;
  playerSpawnX: number;
  playerSpawnY: number;
  bossSpawnX: number;
  bossSpawnY: number;
}

export class BossArenaController {
  private scene: Phaser.Scene;
  private config: BossArenaConfig;

  // physical & visual assets
  private terrainGraphics: Phaser.GameObjects.Graphics[] = [];
  private pillars: Phaser.GameObjects.Graphics[] = [];
  public pillarStates: Array<{
    id: string;
    x: number;
    y: number;
    fallen: boolean;
    graphics: Phaser.GameObjects.Graphics;
    physicsObject: WorldObject | null;
  }> = [];
  private props: Phaser.GameObjects.Graphics[] = [];
  private firePitGraphics: Phaser.GameObjects.Graphics | null = null;
  private exitBoulder: WorldObject | null = null;
  private exitBoulderVisual: Phaser.GameObjects.Graphics | null = null;
  private entranceGate: WorldObject | null = null;
  private sideGates: WorldObject[] = [];

  // Triggers
  private entryTrigger: BossTriggerVolume | null = null;
  private cutsceneTrigger: BossTriggerVolume | null = null;

  // Flickering/Dynamic Lighting parameters
  private firePitFlickerTimer: number = 0;

  constructor(scene: Phaser.Scene, config: BossArenaConfig) {
    this.scene = scene;
    this.config = config;
  }

  public buildArena(): void {
    const cx = this.config.centerX;
    const cy = this.config.centerY;
    const radius = this.config.radius ?? 280;

    Logger.getInstance().log(`[BossArenaController] Building arena at (${cx}, ${cy})`);

    // Circular floor graphic
    const arenaG = this.scene.add.graphics();
    arenaG.fillStyle(0x1a1a1a, 1);
    arenaG.fillCircle(cx, cy, radius);
    arenaG.fillStyle(0x222222, 0.3);
    arenaG.fillCircle(cx, cy, radius - 40);
    arenaG.setDepth(-8);
    this.terrainGraphics.push(arenaG);

    // Stone rim
    const ringG = this.scene.add.graphics();
    ringG.lineStyle(4, 0x3a3a3a, 0.6);
    ringG.strokeCircle(cx, cy, radius - 10);
    ringG.lineStyle(2, 0x4a4a3a, 0.3);
    ringG.strokeCircle(cx, cy, radius - 20);
    ringG.setDepth(-7);
    this.terrainGraphics.push(ringG);

    // Build Obstacles & Debris
    this.buildColumns();
    this.buildProps();
    this.buildFirePit();

    // Create Triggers using BossTriggerVolume
    // Entry Trigger: Player walks past the entrance threshold (x ~ cx - 220)
    this.entryTrigger = new BossTriggerVolume(this.scene, cx - 220, cy, 40, 300);
    
    // Cutscene Trigger: Player reaches the center of the arena (x ~ cx)
    this.cutsceneTrigger = new BossTriggerVolume(this.scene, cx, cy, 100, 300);

    // Build Gate Physics objects
    const collisionManager = CollisionManager.getInstance();

    // 1. Entrance gate (initially open/offscreen, moves down to close behind the player)
    this.entranceGate = new WorldObject({
      scene: this.scene,
      id: "boss_entrance_gate",
      type: "wall",
      x: cx - 250,
      y: -1000,
      width: 20,
      height: 120,
      color: 0x5a4a3a,
      alpha: 1,
      isCollidable: true
    });
    this.entranceGate.setDepth(4);
    collisionManager.addObject(this.entranceGate);

    // 2. Side & back blocking walls
    const sideGateWalls = [
      { x: cx + 140, y: cy, w: 20, h: 120 },
      { x: cx, y: cy + 140, w: 120, h: 20 },
      { x: cx, y: cy - 140, w: 120, h: 20 }
    ];
    for (const gw of sideGateWalls) {
      const w = new WorldObject({
        scene: this.scene,
        id: `boss_gate_${gw.x}_${gw.y}`,
        type: "wall",
        x: gw.x,
        y: gw.y,
        width: gw.w,
        height: gw.h,
        color: 0x5a4a3a,
        alpha: 0,
        isCollidable: true
      });
      w.setDepth(0);
      this.sideGates.push(w);
      collisionManager.addObject(w);
    }

    // 3. Exit boulder block (x ~ cx - 230, cy)
    // Wait, exit boulder is drawn as graphics in original, but let's make it a physical WorldObject exit boulder
    this.exitBoulder = new WorldObject({
      scene: this.scene,
      id: "boss_exit_boulder",
      type: "rock",
      x: cx - 230,
      y: cy,
      width: 60,
      height: 60,
      color: 0x6a6a5a,
      alpha: 0, // collision is enabled, graphics drawn manually or using drawFn
      isCollidable: true
    });
    collisionManager.addObject(this.exitBoulder);

    // Draw the exit boulder visual
    const boulderVis = this.scene.add.graphics();
    boulderVis.fillStyle(0x6a6a5a, 1);
    boulderVis.fillCircle(cx - 230, cy, 30);
    boulderVis.fillStyle(0x7a7a6a, 0.5);
    boulderVis.fillCircle(cx - 235, cy - 5, 12);
    boulderVis.fillCircle(cx - 220, cy + 5, 10);
    boulderVis.lineStyle(2, 0x5a5a4a, 0.4);
    boulderVis.strokeCircle(cx - 230, cy, 30);
    boulderVis.setDepth(4);
    this.exitBoulderVisual = boulderVis;
    this.terrainGraphics.push(boulderVis);
  }

  private buildColumns(): void {
    const cx = this.config.centerX;
    const cy = this.config.centerY;

    const columnData = [
      { x: cx - 180, y: cy - 120, fallen: false },
      { x: cx + 180, y: cy - 100, fallen: false },
      { x: cx - 150, y: cy + 120, fallen: true },
      { x: cx + 160, y: cy + 140, fallen: true },
      { x: cx - 80, y: cy - 190, fallen: false },
      { x: cx + 90, y: cy + 190, fallen: true }
    ];

    for (const col of columnData) {
      const g = this.scene.add.graphics();
      let phys: WorldObject | null = null;

      if (col.fallen) {
        g.fillStyle(0x8a8a7a, 1);
        g.fillRect(col.x - 16, col.y - 3, 32, 6);
        g.lineStyle(1, 0x6a6a5a, 0.6);
        g.strokeRect(col.x - 16, col.y - 3, 32, 6);
        g.fillStyle(0x9a9a8a, 1);
        g.fillCircle(col.x - 14, col.y, 3);
        g.fillCircle(col.x + 14, col.y, 3);
      } else {
        g.fillStyle(0x8a8a7a, 1);
        g.fillRect(col.x - 5, col.y - 14, 10, 28);
        g.lineStyle(1, 0x6a6a5a, 0.6);
        g.strokeRect(col.x - 5, col.y - 14, 10, 28);
        g.fillStyle(0x9a9a8a, 1);
        g.fillRect(col.x - 7, col.y - 16, 14, 4);
        g.fillRect(col.x - 7, col.y + 12, 14, 4);

        // Add physics static body backing the standing column
        phys = new WorldObject({
          scene: this.scene,
          id: `pillar_${col.x}_${col.y}`,
          type: "pillar",
          x: col.x,
          y: col.y,
          width: 24,
          height: 32,
          color: 0x8a8a7a,
          alpha: 0,
          isCollidable: true
        });
        CollisionManager.getInstance().addObject(phys);
      }

      g.setDepth(3);
      this.pillars.push(g);

      this.pillarStates.push({
        id: `pillar_${col.x}_${col.y}`,
        x: col.x,
        y: col.y,
        fallen: col.fallen,
        graphics: g,
        physicsObject: phys
      });
    }
  }

  private buildProps(): void {
    const cx = this.config.centerX;
    const cy = this.config.centerY;

    // Broken carts, chains, skull piles
    this.placeDebrisCart(cx - 140, cy - 100);
    this.placeDebrisCart(cx + 140, cy - 160);
    this.placeChains(cx - 180, cy - 60);
    this.placeChains(cx - 170, cy - 40);
    this.placeSkulls(cx - 80, cy - 150);

    // Collapsed ceiling rubble
    const ceilingRubble = this.scene.add.graphics();
    ceilingRubble.fillStyle(0x4a4a3a, 0.6);
    ceilingRubble.fillEllipse(cx - 60, cy - 80, 40, 20);
    ceilingRubble.fillEllipse(cx + 70, cy + 80, 30, 15);
    ceilingRubble.lineStyle(1, 0x3a3a2a, 0.4);
    ceilingRubble.strokeEllipse(cx - 60, cy - 80, 40, 20);
    ceilingRubble.strokeEllipse(cx + 70, cy + 80, 30, 15);
    ceilingRubble.setDepth(-5);
    this.props.push(ceilingRubble);

    // Broken cages
    const brokenCage = this.scene.add.graphics();
    brokenCage.lineStyle(2, 0x3a2a1a, 0.8);
    brokenCage.strokeRect(cx + 120, cy - 80, 24, 28);
    brokenCage.lineBetween(cx + 126, cy - 80, cx + 124, cy - 52);
    brokenCage.lineBetween(cx + 138, cy - 80, cx + 142, cy - 52);
    brokenCage.setDepth(3);
    this.props.push(brokenCage);
  }

  private placeDebrisCart(x: number, y: number): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x6a4a2a, 1);
    g.fillRect(x - 18, y - 12, 36, 18);
    g.lineStyle(1, 0x4a2a1a, 0.8);
    g.strokeRect(x - 18, y - 12, 36, 18);
    g.fillStyle(0x5a3a1a, 1);
    g.fillCircle(x - 10, y + 10, 4);
    g.fillCircle(x + 10, y + 10, 4);
    g.lineStyle(1, 0x3a1a0a, 0.6);
    g.strokeCircle(x - 10, y + 10, 4);
    g.strokeCircle(x + 10, y + 10, 4);
    g.fillStyle(0x8a6a3a, 1);
    g.fillRect(x - 22, y - 15, 5, 10);
    g.fillRect(x + 17, y - 15, 5, 10);
    g.setDepth(4);
    this.props.push(g);
  }

  private placeChains(x: number, y: number): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0x888888, 1);
    for (let i = 0; i < 3; i++) {
      g.fillCircle(x, y + i * 7, 2.5);
      g.fillRect(x - 0.5, y - 1 + i * 7, 3, 5);
    }
    g.lineStyle(1, 0x666666, 0.5);
    for (let i = 0; i < 3; i++) {
      g.strokeCircle(x, y + i * 7, 2.5);
    }
    g.fillStyle(0x666666, 1);
    g.fillRect(x - 1, y - 2, 3, 20);
    g.setDepth(4);
    this.props.push(g);
  }

  private placeSkulls(x: number, y: number): void {
    const g = this.scene.add.graphics();
    g.fillStyle(0xddddcc, 1);
    g.fillCircle(x, y, 5);
    g.fillStyle(0x222222, 1);
    g.fillCircle(x - 2, y - 1, 1);
    g.fillCircle(x + 2, y - 1, 1);
    g.fillRect(x - 1, y + 2, 2, 2);
    g.lineStyle(1, 0xbbbbaa, 0.5);
    g.strokeCircle(x, y, 5);
    g.setDepth(4);
    this.props.push(g);
  }

  private buildFirePit(): void {
    const cx = this.config.centerX;
    const cy = this.config.centerY;

    this.firePitGraphics = this.scene.add.graphics();
    this.drawFirePit(cx, cy + 160, 0);
    this.terrainGraphics.push(this.firePitGraphics);
  }

  private drawFirePit(x: number, y: number, flicker: number): void {
    if (!this.firePitGraphics) return;

    this.firePitGraphics.clear();
    this.firePitGraphics.fillStyle(0x5a3a1a, 1);
    for (let i = 0; i < 8; i++) {
      const angle = (i / 8) * Math.PI * 2;
      const rx = x + Math.cos(angle) * 18;
      const ry = y + Math.sin(angle) * 18;
      this.firePitGraphics.fillRect(rx - 3, ry - 10, 6, 20);
    }
    this.firePitGraphics.fillStyle(0xff6600, 0.85 + flicker);
    this.firePitGraphics.fillCircle(x, y - 6, 12);
    this.firePitGraphics.fillStyle(0xffaa00, 0.75 + flicker);
    this.firePitGraphics.fillCircle(x, y - 7, 8);
    this.firePitGraphics.fillStyle(0xffdd44, 0.65 + flicker);
    this.firePitGraphics.fillCircle(x, y - 8, 5);
  }

  public update(_time: number, delta: number): void {
    // Torch & Fire flicker logic
    this.firePitFlickerTimer += delta;
    if (this.firePitFlickerTimer > 100) {
      this.firePitFlickerTimer = 0;
      const flicker = (Math.random() - 0.5) * 0.15;
      this.drawFirePit(this.config.centerX, this.config.centerY + 160, flicker);
    }

    // Update triggers
    if (this.entryTrigger) this.entryTrigger.update();
    if (this.cutsceneTrigger) this.cutsceneTrigger.update();
  }

  public closeEntrance(): void {
    if (this.entranceGate) {
      this.entranceGate.gameObject.y = this.config.centerY;
      this.entranceGate.body?.updateFromGameObject();
      Logger.getInstance().log("[BossArenaController] Entrance gate closed");
    }
  }

  public openEntrance(): void {
    if (this.entranceGate) {
      this.entranceGate.gameObject.y = -1000;
      this.entranceGate.body?.updateFromGameObject();
      Logger.getInstance().log("[BossArenaController] Entrance gate opened");
    }
  }

  public setExitOpen(open: boolean): void {
    if (this.exitBoulder) {
      const collisionManager = CollisionManager.getInstance();
      if (open) {
        collisionManager.getObjectGroup()?.remove(this.exitBoulder.gameObject);
        this.exitBoulder.destroy();
        this.exitBoulder = null;
        if (this.exitBoulderVisual) {
          this.exitBoulderVisual.destroy();
          this.exitBoulderVisual = null;
        }
        Logger.getInstance().log("[BossArenaController] Exit boulder cleared");
      } else {
        if (!this.exitBoulder) {
          const cx = this.config.centerX;
          const cy = this.config.centerY;
          this.exitBoulder = new WorldObject({
            scene: this.scene,
            id: "boss_exit_boulder",
            type: "rock",
            x: cx - 230,
            y: cy,
            width: 60,
            height: 60,
            color: 0x6a6a5a,
            alpha: 0,
            isCollidable: true
          });
          collisionManager.addObject(this.exitBoulder);

          this.exitBoulderVisual = this.scene.add.graphics();
          this.exitBoulderVisual.fillStyle(0x6a6a5a, 1);
          this.exitBoulderVisual.fillCircle(cx - 230, cy, 30);
          this.exitBoulderVisual.fillStyle(0x7a7a6a, 0.5);
          this.exitBoulderVisual.fillCircle(cx - 235, cy - 5, 12);
          this.exitBoulderVisual.fillCircle(cx - 220, cy + 5, 10);
          this.exitBoulderVisual.lineStyle(2, 0x5a5a4a, 0.4);
          this.exitBoulderVisual.strokeCircle(cx - 230, cy, 30);
          this.exitBoulderVisual.setDepth(4);
        }
      }
    }
  }

  public getPlayerSpawn(): { x: number; y: number } {
    return { x: this.config.playerSpawnX, y: this.config.playerSpawnY };
  }

  public getBossSpawn(): { x: number; y: number } {
    return { x: this.config.bossSpawnX, y: this.config.bossSpawnY };
  }

  public getEntryTrigger(): BossTriggerVolume | null {
    return this.entryTrigger;
  }

  public getCutsceneTrigger(): BossTriggerVolume | null {
    return this.cutsceneTrigger;
  }

  public getPillarStates(): Array<{ id: string; x: number; y: number; fallen: boolean; graphics: Phaser.GameObjects.Graphics; physicsObject: WorldObject | null }> {
    return this.pillarStates;
  }

  public destroyPillar(id: string): void {
    const pillar = this.pillarStates.find(p => p.id === id);
    if (pillar && !pillar.fallen) {
      pillar.fallen = true;

      // Play crash SFX
      try {
        const audioManager = AudioManager.getInstance();
        if (audioManager.isInitialized() && this.scene.cache.audio.has("rumble")) {
          audioManager.getSFXPlayer().play("rumble", { volume: 0.5, rate: 1.5 });
        }
      } catch {}

      // Shake camera
      this.scene.cameras.main.shake(200, 0.007);

      // Emit debris particles
      EffectsManager.getInstance().emitRockDebris(pillar.x, pillar.y, 15);

      // Swap graphics to fallen visual
      const g = pillar.graphics;
      g.clear();
      g.fillStyle(0x8a8a7a, 1);
      g.fillRect(pillar.x - 16, pillar.y - 3, 32, 6);
      g.lineStyle(1, 0x6a6a5a, 0.6);
      g.strokeRect(pillar.x - 16, pillar.y - 3, 32, 6);
      g.fillStyle(0x9a9a8a, 1);
      g.fillCircle(pillar.x - 14, pillar.y, 3);
      g.fillCircle(pillar.x + 14, pillar.y, 3);

      // Remove physics collision
      if (pillar.physicsObject) {
        CollisionManager.getInstance().getObjectGroup()?.remove(pillar.physicsObject.gameObject);
        pillar.physicsObject.destroy();
        pillar.physicsObject = null;
      }

      Logger.getInstance().log(`[BossArenaController] Pillar ${id} destroyed`);
    }
  }

  public resetPillars(): void {
    for (const p of this.pillarStates) {
      if (p.graphics) p.graphics.destroy();
      if (p.physicsObject) {
        CollisionManager.getInstance().getObjectGroup()?.remove(p.physicsObject.gameObject);
        p.physicsObject.destroy();
      }
    }
    this.pillarStates = [];
    this.pillars = [];
    this.buildColumns();
  }

  public resetArena(): void {
    this.openEntrance();
    this.setExitOpen(false);
    this.resetPillars();
    if (this.entryTrigger) this.entryTrigger.setEnabled(true);
    if (this.cutsceneTrigger) this.cutsceneTrigger.setEnabled(true);
    Logger.getInstance().log("[BossArenaController] Arena reset to default");
  }

  public destroy(): void {
    this.terrainGraphics.forEach(g => g.destroy());
    this.pillars.forEach(g => g.destroy());
    for (const p of this.pillarStates) {
      if (p.graphics) p.graphics.destroy();
      if (p.physicsObject) {
        CollisionManager.getInstance().getObjectGroup()?.remove(p.physicsObject.gameObject);
        p.physicsObject.destroy();
      }
    }
    this.pillarStates = [];

    this.props.forEach(g => g.destroy());
    if (this.firePitGraphics) this.firePitGraphics.destroy();
    
    if (this.entryTrigger) this.entryTrigger.destroy();
    if (this.cutsceneTrigger) this.cutsceneTrigger.destroy();

    const collisionManager = CollisionManager.getInstance();
    if (this.entranceGate) {
      collisionManager.getObjectGroup()?.remove(this.entranceGate.gameObject);
      this.entranceGate.destroy();
    }
    if (this.exitBoulder) {
      collisionManager.getObjectGroup()?.remove(this.exitBoulder.gameObject);
      this.exitBoulder.destroy();
    }
    this.sideGates.forEach(wg => {
      collisionManager.getObjectGroup()?.remove(wg.gameObject);
      wg.destroy();
    });

    this.sideGates = [];
    Logger.getInstance().log("[BossArenaController] Arena destroyed");
  }
}
