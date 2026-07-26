import Phaser from "phaser";
import { Logger } from "../core/Logger";
import { SceneTransitionManager } from "../core/SceneTransitionManager";
import { GAME_CONFIG } from "../constants/GameConstants";
import { InputManager } from "../core/InputManager";
import { InputContext } from "../constants/InputContext";
import { GameStateManager, GameState } from "../core/GameStateManager";
import { Player } from "../entities/player/Player";
import { DEFAULT_PLAYER_CONFIG, IPlayerConfig } from "../entities/player/PlayerConfig";
import { CameraManager } from "../systems/camera/CameraManager";
import { WORLD_CONSTANTS } from "../constants/WorldConstants";
import { DebugOverlay } from "../systems/debug/DebugOverlay";
import { CombatManager } from "../systems/combat/CombatManager";
import { CollisionManager } from "../managers/CollisionManager";
import { WorldObject } from "../entities/world/WorldObject";
import { InteractionManager } from "../systems/interaction/InteractionManager";
import { DialogueManager } from "../systems/dialogue/DialogueManager";
import { ObjectiveManager } from "../systems/objectives/ObjectiveManager";
import { CheckpointSystem } from "../systems/save/CheckpointSystem";
import { IInteractable } from "../systems/interaction/IInteractable";
import { CrewNPC, CrewNPCConfig } from "../entities/npc/CrewNPC";
import { InteractableProp, InteractablePropConfig } from "../entities/props/InteractableProp";
import { Wolf } from "../entities/enemies/wolf/Wolf";
import { EnemyManager } from "../entities/enemies/framework/EnemyManager";
import { HUD } from "../systems/effects/HUD";

const WORLD_W = 5800;
const WORLD_H = 2200;

const SHIP_X = 400;
const SHIP_Y = 950;
const PLAYER_SPAWN_X = 580;
const PLAYER_SPAWN_Y = 950;

const FOREST_ENTRANCE_X = 2200;
const CLEARING_X = 3800;
const CANYON_ENTRANCE_X = 4100;
const BRIDGE_X = 5000;
const BRIDGE_Y = 800;
const CAVE_ENTRANCE_X = 5450;

const WOLF_1 = { x: 2650, y: 920 };
const WOLF_2 = { x: 3350, y: 780 };
const WOLF_3 = { x: 3460, y: 920 };

export default class OpeningScene extends Phaser.Scene {
  private player: Player | null = null;
  private cameraManager: CameraManager | null = null;
  private debugOverlay: DebugOverlay | null = null;
  private collisionManager: CollisionManager | null = null;
  private interactionManager: InteractionManager | null = null;
  private dialogueManager: DialogueManager | null = null;
  private objectiveManager: ObjectiveManager | null = null;
  private checkpoints: CheckpointSystem | null = null;
  private hud: HUD | null = null;
  private crewNPCs: CrewNPC[] = [];
  private forestProps: InteractableProp[] = [];
  private worldObjects: WorldObject[] = [];
  private terrainGraphics: Phaser.GameObjects.Graphics[] = [];
  private campfireGraphics: Phaser.GameObjects.Graphics | null = null;
  private enemyGroup: Phaser.Physics.Arcade.Group | null = null;

  private cinematicActive: boolean = true;
  private playerControlEnabled: boolean = false;
  private campfireFlickerTimer: number = 0;

  private hasEnteredForest: boolean = false;
  private wolvesCleared: boolean = false;
  private hasReachedClearing: boolean = false;
  private hasEnteredCanyon: boolean = false;
  private bridgeLowered: boolean = false;
  private hasReachedCave: boolean = false;

  private torchGraphics: Phaser.GameObjects.Graphics[] = [];
  private fogOverlay: Phaser.GameObjects.Graphics | null = null;
  private particleGraphics: Phaser.GameObjects.Graphics | null = null;
  private particleTimer: number = 0;
  private windTimer: number = 0;
  private windOffset: number = 0;
  private caveShakeTriggered: boolean = false;

  constructor() {
    super({ key: "OpeningScene" });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x0f0f23);
    this.cameras.main.fadeIn(500, 0, 0, 0);
    Logger.getInstance().log("OpeningScene started");

    GameStateManager.getInstance().setState(GameState.CUTSCENE);

    SceneTransitionManager.getInstance().initialize(this);

    InputManager.getInstance().initialize(this, {
      bindingsProfile: InputContext.createFilteredBindings(InputContext.GAMEPLAY),
    });

    CombatManager.getInstance().initialize();
    EnemyManager.getInstance().initialize();

    this.collisionManager = CollisionManager.getInstance();
    this.collisionManager.initialize(this);

    this.hud = new HUD(this);

    this.buildTerrain();
    this.buildFeatures();
    this.buildForestFeatures();
    this.buildCaveFeatures();
    this.spawnWorldObjects();
    this.buildCanyonCliffs();
    this.buildCaveWalls();
    this.buildBridgePuzzle();

    this.setupAtmosphericEffects();
    this.checkAudio();

    this.setupPhysics();
    this.setupCamera();
    this.setupEnemies();
    this.setupEnemyCollisions();

    this.interactionManager = InteractionManager.getInstance();
    this.dialogueManager = DialogueManager.getInstance();
    this.objectiveManager = ObjectiveManager.getInstance();
    this.checkpoints = CheckpointSystem.getInstance();

    this.interactionManager.initialize(this, this.player!);
    this.interactionManager.setOnInteractionCallback((target) => this.handleInteraction(target));
    this.dialogueManager.initialize(this);
    this.objectiveManager.initialize(this);
    this.checkpoints!.initialize(this);

    this.spawnNPCs();
    this.registerForestInteractions();
    this.registerCaveInteractions();
    this.setupCheckpoints();

    this.startCinematic();

    if (this.cameraManager && this.player) {
      this.debugOverlay = new DebugOverlay(this);
      this.debugOverlay.setCameraManager(this.cameraManager);
      this.debugOverlay.setPlayer(this.player);
    }
  }

  private buildTerrain(): void {
    const waterLayer = this.add.graphics();
    waterLayer.fillStyle(0x1a3a5c, 1);
    waterLayer.fillRect(0, 0, 400, WORLD_H);
    waterLayer.fillRect(400, WORLD_H - 400, WORLD_W - 400, 400);
    waterLayer.fillStyle(0x1a4a6c, 0.5);
    for (let i = 0; i < 20; i++) {
      const wx = Phaser.Math.Between(0, 380);
      const wy = Phaser.Math.Between(0, WORLD_H);
      waterLayer.fillEllipse(wx, wy, Phaser.Math.Between(30, 80), Phaser.Math.Between(10, 20));
    }
    waterLayer.setDepth(-10);
    this.terrainGraphics.push(waterLayer);

    const beachLayer = this.add.graphics();
    beachLayer.fillStyle(0xd4a76a, 1);
    beachLayer.fillRect(350, 750, 250, 700);
    beachLayer.fillRect(550, 1250, 300, 150);
    beachLayer.fillRect(300, 200, 200, 600);
    beachLayer.fillStyle(0xc99a5e, 1);
    beachLayer.fillRect(360, 760, 230, 680);
    beachLayer.setDepth(-9);
    this.terrainGraphics.push(beachLayer);

    const grassLayer = this.add.graphics();
    grassLayer.fillStyle(0x3a7a3a, 1);
    grassLayer.fillRect(550, 250, 1700, 1000);
    grassLayer.fillRect(500, 250, 60, 300);
    grassLayer.fillRect(820, 1250, WORLD_W - 820, 150);
    grassLayer.fillStyle(0x4a8a4a, 0.3);
    for (let i = 0; i < 60; i++) {
      const gx = Phaser.Math.Between(550, 2200);
      const gy = Phaser.Math.Between(300, 1300);
      grassLayer.fillCircle(gx, gy, Phaser.Math.Between(10, 30));
    }
    grassLayer.setDepth(-9);
    this.terrainGraphics.push(grassLayer);

    const forestFloor = this.add.graphics();
    forestFloor.fillStyle(0x2a5a2a, 1);
    forestFloor.fillRect(2100, 200, 2100, 1200);
    forestFloor.fillStyle(0x326632, 0.4);
    for (let i = 0; i < 80; i++) {
      const fx = Phaser.Math.Between(2150, WORLD_W - 50);
      const fy = Phaser.Math.Between(250, 1350);
      forestFloor.fillCircle(fx, fy, Phaser.Math.Between(15, 50));
    }
    forestFloor.fillStyle(0x3a4a2a, 0.3);
    for (let i = 0; i < 30; i++) {
      const fx = Phaser.Math.Between(2300, 4000);
      const fy = Phaser.Math.Between(300, 1300);
      forestFloor.fillCircle(fx, fy, Phaser.Math.Between(20, 60));
    }
    forestFloor.setDepth(-9);
    this.terrainGraphics.push(forestFloor);

    const canopy = this.add.graphics();
    canopy.fillStyle(0x1a3a1a, 0.35);
    canopy.fillRect(2200, 180, 1800, 1300);
    canopy.setDepth(-7);
    this.terrainGraphics.push(canopy);

    const cliffLayer = this.add.graphics();
    cliffLayer.fillStyle(0x5a4a3a, 1);
    cliffLayer.fillRect(0, 0, 4000, 120);
    cliffLayer.fillRect(3980, 0, 120, WORLD_H);
    cliffLayer.fillStyle(0x4a3a2a, 1);
    cliffLayer.fillRect(0, 0, 4000, 40);
    for (let i = 0; i < 30; i++) {
      const cx = Phaser.Math.Between(0, 3980);
      const cy = Phaser.Math.Between(0, 100);
      cliffLayer.fillRect(cx, cy, Phaser.Math.Between(30, 80), Phaser.Math.Between(10, 30));
    }
    cliffLayer.setDepth(-8);
    this.terrainGraphics.push(cliffLayer);

    const mountainFloor = this.add.graphics();
    mountainFloor.fillStyle(0x4a4a3a, 1);
    mountainFloor.fillRect(4000, 0, 1800, WORLD_H);
    mountainFloor.fillStyle(0x5a5a4a, 0.3);
    for (let i = 0; i < 50; i++) {
      const mx = Phaser.Math.Between(4050, WORLD_W - 50);
      const my = Phaser.Math.Between(50, WORLD_H - 50);
      mountainFloor.fillCircle(mx, my, Phaser.Math.Between(20, 80));
    }
    mountainFloor.fillStyle(0x555545, 0.2);
    for (let i = 0; i < 30; i++) {
      const mx = Phaser.Math.Between(4100, WORLD_W - 50);
      const my = Phaser.Math.Between(100, WORLD_H - 100);
      mountainFloor.fillRect(mx, my, Phaser.Math.Between(30, 120), Phaser.Math.Between(20, 60));
    }
    mountainFloor.setDepth(-9);
    this.terrainGraphics.push(mountainFloor);

    const pathGraphics = this.add.graphics();
    pathGraphics.lineStyle(20, 0x8a7a5a, 0.6);
    pathGraphics.beginPath();
    pathGraphics.moveTo(500, 1020);
    pathGraphics.lineTo(620, 980);
    pathGraphics.lineTo(780, 900);
    pathGraphics.lineTo(950, 800);
    pathGraphics.lineTo(1100, 720);
    pathGraphics.lineTo(1400, 700);
    pathGraphics.lineTo(1700, 720);
    pathGraphics.lineTo(2000, 740);
    pathGraphics.lineTo(2200, 770);
    pathGraphics.lineTo(2400, 830);
    pathGraphics.lineTo(2600, 900);
    pathGraphics.lineTo(2850, 850);
    pathGraphics.lineTo(3100, 790);
    pathGraphics.lineTo(3350, 760);
    pathGraphics.lineTo(3550, 790);
    pathGraphics.lineTo(3750, 810);
    pathGraphics.lineTo(3950, 820);
    pathGraphics.lineTo(4150, 840);
    pathGraphics.lineTo(4350, 810);
    pathGraphics.lineTo(4600, 800);
    pathGraphics.lineTo(4850, 810);
    pathGraphics.lineTo(5100, 800);
    pathGraphics.lineTo(5350, 810);
    pathGraphics.lineTo(5500, 800);
    pathGraphics.strokePath();
    pathGraphics.lineStyle(14, 0x9a8a6a, 0.4);
    pathGraphics.beginPath();
    pathGraphics.moveTo(500, 1020);
    pathGraphics.lineTo(620, 980);
    pathGraphics.lineTo(780, 900);
    pathGraphics.lineTo(950, 800);
    pathGraphics.lineTo(1100, 720);
    pathGraphics.lineTo(1400, 700);
    pathGraphics.lineTo(1700, 720);
    pathGraphics.lineTo(2000, 740);
    pathGraphics.lineTo(2200, 770);
    pathGraphics.lineTo(2400, 830);
    pathGraphics.lineTo(2600, 900);
    pathGraphics.lineTo(2850, 850);
    pathGraphics.lineTo(3100, 790);
    pathGraphics.lineTo(3350, 760);
    pathGraphics.lineTo(3550, 790);
    pathGraphics.lineTo(3750, 810);
    pathGraphics.lineTo(3950, 820);
    pathGraphics.lineTo(4150, 840);
    pathGraphics.lineTo(4350, 810);
    pathGraphics.lineTo(4600, 800);
    pathGraphics.lineTo(4850, 810);
    pathGraphics.lineTo(5100, 800);
    pathGraphics.lineTo(5350, 810);
    pathGraphics.lineTo(5500, 800);
    pathGraphics.strokePath();
    pathGraphics.setDepth(-8);
    this.terrainGraphics.push(pathGraphics);

    const hiddenPath = this.add.graphics();
    hiddenPath.lineStyle(12, 0x7a6a4a, 0.35);
    hiddenPath.beginPath();
    hiddenPath.moveTo(2700, 1040);
    hiddenPath.lineTo(2780, 1100);
    hiddenPath.lineTo(2850, 1180);
    hiddenPath.lineTo(2880, 1250);
    hiddenPath.strokePath();
    hiddenPath.lineStyle(8, 0x8a7a5a, 0.25);
    hiddenPath.beginPath();
    hiddenPath.moveTo(2700, 1040);
    hiddenPath.lineTo(2780, 1100);
    hiddenPath.lineTo(2850, 1180);
    hiddenPath.lineTo(2880, 1250);
    hiddenPath.strokePath();
    hiddenPath.setDepth(-8);
    this.terrainGraphics.push(hiddenPath);

    const streamRender = this.add.graphics();
    streamRender.lineStyle(10, 0x4a8aaa, 0.5);
    streamRender.beginPath();
    streamRender.moveTo(2950, 500);
    streamRender.lineTo(2970, 600);
    streamRender.lineTo(3000, 700);
    streamRender.lineTo(3020, 800);
    streamRender.lineTo(3050, 950);
    streamRender.lineTo(3080, 1050);
    streamRender.lineTo(3120, 1200);
    streamRender.strokePath();
    streamRender.lineStyle(6, 0x6aaacc, 0.3);
    streamRender.beginPath();
    streamRender.moveTo(2950, 500);
    streamRender.lineTo(2970, 600);
    streamRender.lineTo(3000, 700);
    streamRender.lineTo(3020, 800);
    streamRender.lineTo(3050, 950);
    streamRender.lineTo(3080, 1050);
    streamRender.lineTo(3120, 1200);
    streamRender.strokePath();
    streamRender.setDepth(-8);
    this.terrainGraphics.push(streamRender);
  }

  private buildFeatures(): void {
    this.buildShip();
    this.buildCampfire();
  }

  private buildShip(): void {
    const g = this.add.graphics();
    const sx = SHIP_X;
    const sy = SHIP_Y;

    g.fillStyle(0x5c3a1e, 1);
    g.beginPath();
    g.moveTo(sx - 50, sy + 30);
    g.lineTo(sx + 60, sy + 30);
    g.lineTo(sx + 80, sy - 10);
    g.lineTo(sx + 40, sy - 20);
    g.lineTo(sx - 60, sy - 10);
    g.closePath();
    g.fillPath();
    g.lineStyle(2, 0x3a2210, 1);
    g.strokePath();

    g.fillStyle(0x7a4a2a, 1);
    g.fillRect(sx - 20, sy - 80, 6, 70);
    g.fillRect(sx + 30, sy - 100, 6, 90);

    g.fillStyle(0xeeeedd, 0.9);
    g.beginPath();
    g.moveTo(sx + 30, sy - 100);
    g.lineTo(sx + 30, sy - 40);
    g.lineTo(sx + 70, sy - 70);
    g.closePath();
    g.fillPath();
    g.lineStyle(1, 0xccccbb, 0.8);
    g.strokePath();

    g.beginPath();
    g.moveTo(sx - 20, sy - 80);
    g.lineTo(sx - 20, sy - 20);
    g.lineTo(sx + 20, sy - 50);
    g.closePath();
    g.fillPath();
    g.strokePath();

    g.fillStyle(0x8a6030, 1);
    g.fillRect(sx - 40, sy - 5, 80, 4);

    g.setDepth(4);
  }

  private buildCampfire(): void {
    const g = this.add.graphics();
    const cx = 1050;
    const cy = 700;

    g.fillStyle(0x5a3a1a, 1);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const rx = cx + Math.cos(angle) * 8;
      const ry = cy + Math.sin(angle) * 8;
      g.fillRect(rx - 2, ry - 6, 4, 12);
    }

    g.fillStyle(0xff6600, 0.9);
    g.fillCircle(cx, cy - 4, 6);
    g.fillStyle(0xffaa00, 0.8);
    g.fillCircle(cx, cy - 5, 4);
    g.fillStyle(0xffdd44, 0.7);
    g.fillCircle(cx, cy - 6, 2.5);

    this.campfireGraphics = g;
    g.setDepth(6);
  }

  private buildForestFeatures(): void {
    this.buildBrokenCart();
    this.buildAncientStatue();
    this.buildHiddenCampfire();
  }

  private buildHiddenCampfire(): void {
    const g = this.add.graphics();
    const cx = 2850;
    const cy = 1080;

    g.fillStyle(0x4a2a1a, 1);
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + 0.5;
      const rx = cx + Math.cos(angle) * 6;
      const ry = cy + Math.sin(angle) * 6;
      g.fillRect(rx - 1.5, ry - 4, 3, 8);
    }

    g.fillStyle(0xff6600, 0.8);
    g.fillCircle(cx, cy - 3, 5);
    g.fillStyle(0xffaa00, 0.7);
    g.fillCircle(cx, cy - 4, 3);
    g.fillStyle(0xffdd44, 0.6);
    g.fillCircle(cx, cy - 5, 1.5);

    g.setDepth(6);
  }

  private buildBrokenCart(): void {
    const g = this.add.graphics();
    const cx = 2600;
    const cy = 920;

    g.fillStyle(0x6a4a2a, 1);
    g.fillRect(cx - 20, cy - 15, 40, 20);
    g.lineStyle(1, 0x4a2a1a, 0.8);
    g.strokeRect(cx - 20, cy - 15, 40, 20);

    g.fillStyle(0x5a3a1a, 1);
    g.fillCircle(cx - 12, cy + 10, 5);
    g.fillCircle(cx + 12, cy + 10, 5);
    g.lineStyle(1, 0x3a1a0a, 0.6);
    g.strokeCircle(cx - 12, cy + 10, 5);
    g.strokeCircle(cx + 12, cy + 10, 5);

    g.fillStyle(0x8a6a3a, 1);
    g.fillRect(cx - 25, cy - 18, 6, 12);
    g.fillRect(cx + 19, cy - 18, 6, 12);

    g.setDepth(4);
  }

  private buildAncientStatue(): void {
    const g = this.add.graphics();
    const sx = 3100;
    const sy = 700;

    g.fillStyle(0x9a9a8a, 1);
    g.fillCircle(sx, sy - 12, 6);
    g.fillRect(sx - 5, sy - 6, 10, 18);
    g.fillRect(sx - 7, sy + 12, 14, 14);
    g.fillRect(sx - 10, sy + 26, 5, 10);
    g.fillRect(sx + 5, sy + 26, 5, 10);

    g.lineStyle(1, 0x7a7a6a, 0.6);
    g.strokeCircle(sx, sy - 12, 6);
    g.strokeRect(sx - 5, sy - 6, 10, 18);
    g.strokeRect(sx - 7, sy + 12, 14, 14);

    g.fillStyle(0x8a8a7a, 0.8);
    g.fillRect(sx - 8, sy - 16, 16, 4);

    g.setDepth(4);
  }

  private buildCaveFeatures(): void {
    this.buildWaterfall();
    this.buildTorches();
    this.buildCaveEntrance();
    this.buildCaveArch();
    this.buildBrokenColumns();
    this.buildCaveDebris();
  }

  private buildWaterfall(): void {
    const g = this.add.graphics();
    const wx = 4400;
    const wy = 680;

    g.fillStyle(0x4a7a8a, 0.6);
    g.fillRect(wx - 4, wy, 8, 160);
    g.fillStyle(0x6aaacc, 0.3);
    g.fillRect(wx - 2, wy + 5, 4, 150);
    g.fillStyle(0x88ccdd, 0.2);
    for (let i = 0; i < 12; i++) {
      const dy = i * 13 + 5;
      g.fillEllipse(wx + Phaser.Math.Between(-3, 3), wy + dy, Phaser.Math.Between(3, 8), Phaser.Math.Between(2, 5));
    }

    g.fillStyle(0x3a5a6a, 0.5);
    g.fillRect(wx - 12, wy - 4, 24, 8);
    g.fillStyle(0x3a5a6a, 0.3);
    g.fillRect(wx - 8, wy + 155, 16, 20);

    g.setDepth(4);
  }

  private buildTorches(): void {
    const torchPositions = [
      { x: 4250, y: 780 }, { x: 4250, y: 960 },
      { x: 4500, y: 740 }, { x: 4500, y: 980 },
      { x: 4750, y: 760 }, { x: 4750, y: 960 },
      { x: 5000, y: 740 }, { x: 5000, y: 980 },
      { x: 5400, y: 780 },
    ];

    for (const pos of torchPositions) {
      const g = this.add.graphics();
      g.fillStyle(0x5a3a1a, 1);
      g.fillRect(pos.x - 1.5, pos.y - 10, 3, 18);
      g.fillStyle(0xff6600, 0.9);
      g.fillCircle(pos.x, pos.y - 12, 4);
      g.fillStyle(0xffaa00, 0.7);
      g.fillCircle(pos.x, pos.y - 13, 2.5);
      g.fillStyle(0xffdd44, 0.5);
      g.fillCircle(pos.x, pos.y - 14, 1.5);
      g.setDepth(6);
      this.torchGraphics.push(g);
    }
  }

  private buildCaveEntrance(): void {
    const g = this.add.graphics();
    const cx = CAVE_ENTRANCE_X;
    const cy = 800;

    g.fillStyle(0x2a2a2a, 1);
    g.beginPath();
    g.moveTo(cx - 70, cy - 40);
    g.lineTo(cx - 40, cy + 80);
    g.lineTo(cx + 40, cy + 80);
    g.lineTo(cx + 70, cy - 40);
    g.lineTo(cx + 50, cy - 60);
    g.lineTo(cx - 50, cy - 60);
    g.closePath();
    g.fillPath();

    g.fillStyle(0x1a1a1a, 1);
    g.beginPath();
    g.moveTo(cx - 55, cy - 35);
    g.lineTo(cx - 30, cy + 75);
    g.lineTo(cx + 30, cy + 75);
    g.lineTo(cx + 55, cy - 35);
    g.lineTo(cx + 40, cy - 50);
    g.lineTo(cx - 40, cy - 50);
    g.closePath();
    g.fillPath();

    g.lineStyle(3, 0x6a5a4a, 0.6);
    g.beginPath();
    g.moveTo(cx - 70, cy - 40);
    g.lineTo(cx - 40, cy + 80);
    g.lineTo(cx + 40, cy + 80);
    g.lineTo(cx + 70, cy - 40);
    g.strokePath();

    g.lineStyle(2, 0x5a4a3a, 0.4);
    g.beginPath();
    g.moveTo(cx - 50, cy - 55);
    g.lineTo(cx + 50, cy - 55);
    g.strokePath();

    g.fillStyle(0x5a4a3a, 1);
    g.fillRect(cx - 55, cy - 60, 110, 8);

    g.fillStyle(0x6a5a4a, 0.3);
    for (let i = 0; i < 6; i++) {
      const rx = cx + Phaser.Math.Between(-60, 60);
      const ry = cy + Phaser.Math.Between(-50, 75);
      g.fillRect(rx, ry, Phaser.Math.Between(3, 8), Phaser.Math.Between(2, 4));
    }

    g.setDepth(5);
  }

  private buildBrokenColumns(): void {
    const columnPositions = [
      { x: 4650, y: 750, fallen: false },
      { x: 4650, y: 900, fallen: false },
      { x: 4750, y: 800, fallen: true },
      { x: 4900, y: 760, fallen: true },
    ];

    for (const col of columnPositions) {
      const g = this.add.graphics();
      if (col.fallen) {
        g.fillStyle(0x8a8a7a, 1);
        g.fillRect(col.x - 20, col.y - 4, 40, 8);
        g.lineStyle(1, 0x6a6a5a, 0.6);
        g.strokeRect(col.x - 20, col.y - 4, 40, 8);
        g.fillStyle(0x9a9a8a, 1);
        g.fillCircle(col.x - 18, col.y, 4);
        g.fillCircle(col.x + 18, col.y, 4);
      } else {
        g.fillStyle(0x8a8a7a, 1);
        g.fillRect(col.x - 6, col.y - 18, 12, 36);
        g.lineStyle(1, 0x6a6a5a, 0.6);
        g.strokeRect(col.x - 6, col.y - 18, 12, 36);
        g.fillStyle(0x9a9a8a, 1);
        g.fillRect(col.x - 8, col.y - 20, 16, 5);
        g.fillRect(col.x - 8, col.y + 15, 16, 5);
      }
      g.setDepth(3);
    }
  }

  private buildCaveArch(): void {
    const g = this.add.graphics();
    const cx = CAVE_ENTRANCE_X;
    const cy = 740;

    g.fillStyle(0x7a7a6a, 1);
    g.fillRect(cx - 80, cy - 8, 160, 16);
    g.fillRect(cx - 80, cy - 8, 16, 90);
    g.fillRect(cx + 64, cy - 8, 16, 90);

    g.lineStyle(2, 0x5a5a4a, 0.5);
    g.strokeRect(cx - 80, cy - 8, 160, 16);
    g.strokeRect(cx - 80, cy - 8, 16, 90);
    g.strokeRect(cx + 64, cy - 8, 16, 90);

    g.fillStyle(0x8a8a7a, 0.4);
    for (let i = 0; i < 4; i++) {
      const rx = cx - 60 + i * 40;
      g.fillRect(rx, cy - 4, 20, 6);
    }

    g.setDepth(5);

    const debris = this.add.graphics();
    debris.fillStyle(0x7a6a5a, 1);
    for (let i = 0; i < 8; i++) {
      const rx = cx + Phaser.Math.Between(-85, 85);
      const ry = cy + 80 + Phaser.Math.Between(5, 20);
      debris.fillRect(rx, ry, Phaser.Math.Between(4, 12), Phaser.Math.Between(2, 5));
    }
    debris.setDepth(0);
  }

  private buildCaveDebris(): void {
    const g = this.add.graphics();
    const cx = CAVE_ENTRANCE_X;
    const cy = 800;

    g.fillStyle(0xccccbb, 0.7);
    for (let i = 0; i < 12; i++) {
      const rx = cx + Phaser.Math.Between(-90, -30);
      const ry = cy + Phaser.Math.Between(-30, 60);
      g.fillRect(rx, ry, Phaser.Math.Between(2, 4), Phaser.Math.Between(4, 8));
    }

    g.fillStyle(0x6a5a4a, 1);
    g.fillRect(cx - 35, cy + 65, 25, 6);
    g.fillRect(cx - 30, cy + 60, 4, 12);
    g.fillStyle(0x8a7a5a, 0.5);
    g.fillCircle(cx - 22, cy + 68, 4);

    g.fillStyle(0x6a4a2a, 1);
    for (let i = 0; i < 4; i++) {
      const rx = cx + Phaser.Math.Between(20, 60);
      const ry = cy + Phaser.Math.Between(50, 75);
      g.fillRect(rx, ry, Phaser.Math.Between(8, 16), Phaser.Math.Between(2, 4));
    }

    g.setDepth(3);

    const shield = this.add.graphics();
    shield.fillStyle(0x8a7a5a, 1);
    shield.fillCircle(cx + 45, cy + 55, 8);
    shield.lineStyle(2, 0x6a5a4a, 0.8);
    shield.strokeCircle(cx + 45, cy + 55, 8);
    shield.fillStyle(0x6a5a4a, 0.6);
    shield.fillCircle(cx + 45, cy + 55, 4);
    shield.setDepth(4);
  }

  private buildCaveWalls(): void {
    const canyonWalls = [
      { x: 4100, y: 600, w: 40, h: 40 },
      { x: 4100, y: 700, w: 30, h: 30 },
      { x: 4100, y: 1000, w: 40, h: 40 },
      { x: 4100, y: 1100, w: 30, h: 30 },
      { x: 4300, y: 580, w: 80, h: 20 },
      { x: 4300, y: 1120, w: 80, h: 20 },
      { x: 4550, y: 560, w: 60, h: 20 },
      { x: 4550, y: 1140, w: 60, h: 20 },
      { x: 4800, y: 550, w: 40, h: 20 },
      { x: 4800, y: 1150, w: 40, h: 20 },
    ];

    for (const w of canyonWalls) {
      const wall = new WorldObject({
        scene: this,
        id: `canyon_${w.x}_${w.y}`,
        type: "wall",
        x: w.x, y: w.y,
        width: w.w, height: w.h,
        color: 0x5a4a3a,
        alpha: 0,
        isCollidable: true,
      });
      wall.setDepth(0);
      this.worldObjects.push(wall);
      this.collisionManager?.addObject(wall);
    }

    const bridgeGapInvisible = new WorldObject({
      scene: this,
      id: "bridge_gap",
      type: "wall",
      x: BRIDGE_X, y: BRIDGE_Y + 50,
      width: 80, height: 160,
      color: 0x000000,
      alpha: 0,
      isCollidable: true,
    });
    bridgeGapInvisible.setDepth(0);
    this.bridgeGapObject = bridgeGapInvisible;
    this.worldObjects.push(bridgeGapInvisible);
    this.collisionManager?.addObject(bridgeGapInvisible);
  }

  private bridgeGapObject: WorldObject | null = null;
  private bridgeLoweredGraphics: Phaser.GameObjects.Graphics | null = null;

  private buildBridgePuzzle(): void {
    const g = this.add.graphics();
    g.fillStyle(0x7a6a4a, 1);
    g.fillRect(BRIDGE_X - 40, BRIDGE_Y - 6, 80, 12);
    g.lineStyle(1, 0x5a4a2a, 0.6);
    g.strokeRect(BRIDGE_X - 40, BRIDGE_Y - 6, 80, 12);
    g.fillStyle(0x8a7a5a, 0.5);
    g.fillRect(BRIDGE_X - 35, BRIDGE_Y - 4, 70, 8);
    g.setDepth(4);
    this.bridgeLoweredGraphics = g;
    g.setVisible(false);
  }

  private buildCanyonCliffs(): void {
    const cliffSides = this.add.graphics();
    const cliffColor = 0x5a4a3a;
    const cliffDark = 0x4a3a2a;
    const cliffHighlight = 0x6a5a4a;

    const drawCliffWall = (x1: number, y1: number, x2: number, _y2: number, side: "top" | "bottom") => {
      const yBase = y1;
      const dir = side === "top" ? -1 : 1;

      cliffSides.fillStyle(cliffColor, 1);
      cliffSides.fillRect(x1, yBase, x2 - x1, 80 * dir < 0 ? -80 : 80);

      cliffSides.fillStyle(cliffDark, 0.4);
      for (let i = 0; i < 20; i++) {
        const rx = Phaser.Math.Between(x1, x2);
        const ry = yBase + Phaser.Math.Between(0, 70) * dir;
        cliffSides.fillRect(rx, ry, Phaser.Math.Between(10, 40), Phaser.Math.Between(5, 15) * dir);
      }

      cliffSides.fillStyle(cliffHighlight, 0.2);
      for (let i = 0; i < 12; i++) {
        const rx = Phaser.Math.Between(x1, x2);
        const ry = yBase + Phaser.Math.Between(5, 65) * dir;
        cliffSides.fillRect(rx, ry, Phaser.Math.Between(5, 20), Phaser.Math.Between(3, 8) * dir);
      }
    };

    drawCliffWall(3900, 200, 5500, 200, "top");
    drawCliffWall(3900, 1350, 5500, 1350, "bottom");

    const cliffFaces = this.add.graphics();
    cliffFaces.fillStyle(0x6a5a4a, 0.3);
    for (let i = 0; i < 15; i++) {
      const rx = Phaser.Math.Between(3950, 5450);
      const ry = Phaser.Math.Between(220, 280);
      cliffFaces.fillTriangle(rx, ry, rx + 15, ry - 10, rx + 20, ry + 5);
    }
    for (let i = 0; i < 15; i++) {
      const rx = Phaser.Math.Between(3950, 5450);
      const ry = Phaser.Math.Between(1250, 1320);
      cliffFaces.fillTriangle(rx, ry, rx + 15, ry + 10, rx + 20, ry - 5);
    }
    cliffFaces.setDepth(-8);
    cliffSides.setDepth(-8);

    this.terrainGraphics.push(cliffSides);
    this.terrainGraphics.push(cliffFaces);
  }

  private spawnWorldObjects(): void {
    const treePositions = [
      { x: 720, y: 550 }, { x: 880, y: 480 }, { x: 1200, y: 550 },
      { x: 1400, y: 600 }, { x: 1600, y: 500 }, { x: 1100, y: 400 },
      { x: 1300, y: 350 }, { x: 1500, y: 400 }, { x: 1800, y: 550 },
      { x: 2000, y: 500 }, { x: 700, y: 450 }, { x: 1700, y: 700 },
      { x: 1250, y: 900 }, { x: 1450, y: 1000 }, { x: 1650, y: 900 },
      { x: 1900, y: 800 }, { x: 2100, y: 750 }, { x: 2200, y: 600 },
    ];
    const forestTreePositions = [
      { x: 2150, y: 400 }, { x: 2250, y: 500 }, { x: 2350, y: 350 },
      { x: 2400, y: 650 }, { x: 2450, y: 800 }, { x: 2500, y: 1000 },
      { x: 2550, y: 550 }, { x: 2700, y: 700 }, { x: 2750, y: 850 },
      { x: 2800, y: 500 }, { x: 2900, y: 650 }, { x: 2950, y: 900 },
      { x: 3050, y: 600 }, { x: 3150, y: 850 }, { x: 3200, y: 650 },
      { x: 3250, y: 500 }, { x: 3300, y: 900 }, { x: 3400, y: 650 },
      { x: 3450, y: 550 }, { x: 3500, y: 700 }, { x: 3600, y: 600 },
      { x: 3650, y: 850 }, { x: 3700, y: 700 }, { x: 3850, y: 650 },
      { x: 3900, y: 500 }, { x: 3950, y: 800 }, { x: 2300, y: 1100 },
      { x: 2500, y: 1150 }, { x: 2700, y: 1200 }, { x: 2900, y: 1100 },
      { x: 3100, y: 1150 }, { x: 3300, y: 1100 }, { x: 3500, y: 1000 },
    ];
    const rockPositions = [
      { x: 380, y: 1000 }, { x: 420, y: 1080 }, { x: 360, y: 1150 },
      { x: 470, y: 1200 }, { x: 550, y: 1280 }, { x: 650, y: 1300 },
      { x: 700, y: 1280 }, { x: 450, y: 900 }, { x: 500, y: 870 },
      { x: 600, y: 450 }, { x: 900, y: 900 }, { x: 1100, y: 950 },
      { x: 1300, y: 800 }, { x: 1550, y: 850 }, { x: 1850, y: 700 },
    ];
    const forestRockPositions = [
      { x: 2250, y: 800 }, { x: 2400, y: 500 }, { x: 2550, y: 1050 },
      { x: 2700, y: 600 }, { x: 2850, y: 750 }, { x: 3050, y: 950 },
      { x: 3200, y: 550 }, { x: 3350, y: 850 }, { x: 3500, y: 600 },
      { x: 3650, y: 750 }, { x: 3800, y: 550 }, { x: 3950, y: 700 },
    ];

    for (const pos of treePositions) {
      this.placeTree(pos.x, pos.y, Phaser.Math.Between(35, 55), 0x1b5e20);
    }
    for (const pos of forestTreePositions) {
      this.placeTree(pos.x, pos.y, Phaser.Math.Between(35, 65), 0x1a4a1a);
    }

    for (const pos of rockPositions) {
      this.placeRock(pos.x, pos.y, Phaser.Math.Between(20, 45), 0x5a5a6a);
    }
    for (const pos of forestRockPositions) {
      this.placeRock(pos.x, pos.y, Phaser.Math.Between(25, 55), 0x6a6a5a);
    }

    this.spawnCaveRocks();
    this.spawnBushes();
    this.spawnFallenLogs();
    this.spawnForestWalls();
    this.spawnStreamWalls();
  }

  private spawnCaveRocks(): void {
    const caveRockPositions = [
      { x: 4200, y: 680 }, { x: 4250, y: 1050 },
      { x: 4400, y: 850 }, { x: 4450, y: 700 },
      { x: 4550, y: 1000 }, { x: 4650, y: 820 },
      { x: 4750, y: 700 }, { x: 4850, y: 950 },
      { x: 4950, y: 780 }, { x: 5050, y: 920 },
      { x: 5150, y: 760 }, { x: 5250, y: 880 },
      { x: 5350, y: 740 }, { x: 5300, y: 950 },
    ];

    for (const pos of caveRockPositions) {
      this.placeRock(pos.x, pos.y, Phaser.Math.Between(20, 40), 0x6a6a5a);
    }
  }

  private placeTree(x: number, y: number, size: number, color: number): void {
    const tree = new WorldObject({
      scene: this,
      id: `tree_${x}_${y}`,
      type: "tree",
      x, y,
      width: size,
      height: size,
      color,
      alpha: 1,
      isCollidable: true,
      strokeColor: 0x2e7d32,
      strokeWidth: 2,
    });
    tree.setDepth(3);
    this.worldObjects.push(tree);
    this.collisionManager?.addObject(tree);
  }

  private placeRock(x: number, y: number, size: number, color: number): void {
    const rock = new WorldObject({
      scene: this,
      id: `rock_${x}_${y}`,
      type: "rock",
      x, y,
      width: size,
      height: size,
      color,
      alpha: 1,
      isCollidable: true,
      strokeColor: 0x7a7a8a,
      strokeWidth: 1,
    });
    rock.setDepth(2);
    this.worldObjects.push(rock);
    this.collisionManager?.addObject(rock);
  }

  private spawnBushes(): void {
    const bushPositions = [
      { x: 2300, y: 550 }, { x: 2450, y: 450 }, { x: 2600, y: 600 },
      { x: 2750, y: 950 }, { x: 2900, y: 550 }, { x: 3000, y: 700 },
      { x: 3150, y: 600 }, { x: 3300, y: 800 }, { x: 3450, y: 650 },
      { x: 3600, y: 900 }, { x: 3750, y: 600 }, { x: 3900, y: 750 },
      { x: 2350, y: 1050 }, { x: 2650, y: 1150 }, { x: 3050, y: 1100 },
    ];

    for (const pos of bushPositions) {
      const size = Phaser.Math.Between(15, 28);
      const bush = new WorldObject({
        scene: this,
        id: `bush_${pos.x}_${pos.y}`,
        type: "obstacle",
        x: pos.x, y: pos.y,
        width: size, height: size,
        color: 0x2a6a2a,
        alpha: 1,
        isCollidable: true,
        strokeColor: 0x3a8a3a,
        strokeWidth: 1,
      });
      bush.setDepth(2);
      this.worldObjects.push(bush);
      this.collisionManager?.addObject(bush);
    }
  }

  private spawnFallenLogs(): void {
    const logPositions = [
      { x: 2450, y: 880, angle: 15 },
      { x: 2800, y: 680, angle: -20 },
      { x: 3200, y: 950, angle: 10 },
      { x: 3550, y: 680, angle: -10 },
      { x: 3700, y: 900, angle: 25 },
      { x: 2850, y: 1150, angle: -30 },
    ];

    for (const pos of logPositions) {
      const w = Phaser.Math.Between(30, 55);
      const h = Phaser.Math.Between(8, 12);
      const log = new WorldObject({
        scene: this,
        id: `log_${pos.x}_${pos.y}`,
        type: "obstacle",
        x: pos.x, y: pos.y,
        width: w, height: h,
        color: 0x5a3a1a,
        alpha: 1,
        isCollidable: true,
        strokeColor: 0x4a2a0a,
        strokeWidth: 1,
      });
      log.gameObject.setAngle(pos.angle);
      log.setDepth(2);
      this.worldObjects.push(log);
      this.collisionManager?.addObject(log);
    }
  }

  private spawnForestWalls(): void {
    const walls = [
      { x: 2000, y: 55, w: 4000, h: 30 },
      { x: 2000, y: WORLD_H - 55, w: 4000, h: 30 },
      { x: 3980, y: 300, w: 30, h: 600 },
      { x: 3980, y: 1200, w: 30, h: 600 },
      { x: 4900, y: 55, w: 1800, h: 30 },
      { x: 4900, y: WORLD_H - 55, w: 1800, h: 30 },
      { x: 5780, y: WORLD_H / 2, w: 30, h: WORLD_H },
    ];
    for (const w of walls) {
      const wall = new WorldObject({
        scene: this,
        id: `border_${w.x}_${w.y}`,
        type: "wall",
        x: w.x, y: w.y,
        width: w.w, height: w.h,
        color: 0x5a4a3a,
        alpha: 0,
        isCollidable: true,
      });
      wall.setDepth(0);
      this.worldObjects.push(wall);
      this.collisionManager?.addObject(wall);
    }
  }

  private spawnStreamWalls(): void {
    const streamCollisions = [
      { x: 2970, y: 580, w: 40, h: 30 },
      { x: 2990, y: 680, w: 40, h: 30 },
      { x: 3010, y: 780, w: 40, h: 30 },
      { x: 3040, y: 900, w: 40, h: 40 },
      { x: 3070, y: 1020, w: 40, h: 30 },
    ];
    for (const s of streamCollisions) {
      const wall = new WorldObject({
        scene: this,
        id: `stream_${s.x}_${s.y}`,
        type: "wall",
        x: s.x, y: s.y,
        width: s.w, height: s.h,
        color: 0x4a6a7a,
        alpha: 0,
        isCollidable: true,
      });
      wall.setDepth(0);
      this.worldObjects.push(wall);
      this.collisionManager?.addObject(wall);
    }
  }

  private spawnPlayer(): void {
    const playerConfig: IPlayerConfig = {
      ...DEFAULT_PLAYER_CONFIG,
      camera: {
        lerpX: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_X,
        lerpY: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_Y,
        deadzoneWidth: WORLD_CONSTANTS.CAMERA.DEADZONE_WIDTH,
        deadzoneHeight: WORLD_CONSTANTS.CAMERA.DEADZONE_HEIGHT,
      },
    };

    this.player = new Player(this, PLAYER_SPAWN_X, PLAYER_SPAWN_Y, playerConfig);
  }

  private spawnNPCs(): void {
    const npcConfigs: CrewNPCConfig[] = [
      {
        name: "Eurylochus",
        x: 480, y: 1020,
        color: 0xff6644,
        dialogueId: "eurylochus_beach",
        promptText: "[E] Talk",
      },
      {
        name: "Perimedes",
        x: 900, y: 720,
        color: 0x44aaff,
        dialogueId: "perimedes_campfire",
        promptText: "[E] Talk",
      },
      {
        name: "Elpenor",
        x: 550, y: 1150,
        color: 0x44ff88,
        dialogueId: "elpenor_shore",
        promptText: "[E] Talk",
      },
    ];

    for (const cfg of npcConfigs) {
      const npc = new CrewNPC(this, cfg);
      this.crewNPCs.push(npc);
      this.interactionManager?.register(npc);
    }
  }

  private registerForestInteractions(): void {
    const cartConfig: InteractablePropConfig = {
      id: "broken_cart",
      x: 2600, y: 920,
      width: 50, height: 30,
      promptText: "[E] Examine cart",
      dialogueId: "broken_cart",
      drawFn: () => {},
      depth: 5,
    };
    const cart = new InteractableProp(this, cartConfig);
    this.forestProps.push(cart);
    this.interactionManager?.register(cart);

    const statueConfig: InteractablePropConfig = {
      id: "ancient_statue",
      x: 3100, y: 700,
      width: 30, height: 50,
      promptText: "[E] Examine statue",
      dialogueId: "ancient_statue",
      drawFn: () => {},
      depth: 5,
    };
    const statue = new InteractableProp(this, statueConfig);
    this.forestProps.push(statue);
    this.interactionManager?.register(statue);

    const forestCampfireConfig: InteractablePropConfig = {
      id: "forest_campfire",
      x: 2850, y: 1080,
      width: 30, height: 20,
      promptText: "[E] Rest",
      dialogueId: "forest_campfire",
      drawFn: () => {},
      depth: 5,
    };
    const forestCampfire = new InteractableProp(this, forestCampfireConfig);
    this.forestProps.push(forestCampfire);
    this.interactionManager?.register(forestCampfire);
  }

  private registerCaveInteractions(): void {
    const inspectableObjects: InteractablePropConfig[] = [
      {
        id: "ancient_carving",
        x: 4700, y: 800,
        width: 30, height: 30,
        promptText: "[E] Examine carving",
        dialogueId: "ancient_carving",
        drawFn: (g: Phaser.GameObjects.Graphics) => {
          g.fillStyle(0x7a7a6a, 1);
          g.fillRect(-15, -12, 30, 24);
          g.lineStyle(1, 0x5a5a4a, 0.6);
          g.strokeRect(-15, -12, 30, 24);
          g.fillStyle(0x6a6a5a, 1);
          g.fillCircle(-5, -4, 2);
          g.fillCircle(5, -4, 2);
          g.fillRect(-8, 2, 16, 3);
          g.fillRect(-6, 6, 12, 2);
        },
        depth: 5,
      },
      {
        id: "pile_of_bones",
        x: 4800, y: 850,
        width: 25, height: 20,
        promptText: "[E] Examine bones",
        dialogueId: "pile_of_bones",
        drawFn: (g: Phaser.GameObjects.Graphics) => {
          g.fillStyle(0xccccbb, 1);
          for (let i = 0; i < 5; i++) {
            const bx = Phaser.Math.Between(-10, 10);
            const by = Phaser.Math.Between(-8, 8);
            g.fillRect(bx - 1, by - 3, 2, 6);
          }
          g.fillStyle(0xbbbbaa, 1);
          g.fillCircle(0, 2, 3);
          g.fillCircle(4, -2, 2.5);
          g.lineStyle(1, 0x999988, 0.4);
          g.strokeCircle(0, 2, 3);
        },
        depth: 5,
      },
      {
        id: "broken_spear",
        x: 4850, y: 780,
        width: 20, height: 10,
        promptText: "[E] Examine spear",
        dialogueId: "broken_spear",
        drawFn: (g: Phaser.GameObjects.Graphics) => {
          g.fillStyle(0x6a4a2a, 1);
          g.fillRect(-10, -1.5, 20, 3);
          g.fillRect(-8, -0.5, 16, 1);
          g.fillStyle(0x888888, 1);
          g.fillTriangle(8, -3, 12, 0, 8, 3);
          g.lineStyle(1, 0x666666, 0.5);
          g.strokeTriangle(8, -3, 12, 0, 8, 3);
          g.fillStyle(0x5a3a1a, 1);
          g.fillRect(-10, -2, 3, 4);
        },
        depth: 5,
      },
      {
        id: "large_footprints",
        x: 4950, y: 820,
        width: 30, height: 20,
        promptText: "[E] Examine footprints",
        dialogueId: "large_footprints",
        drawFn: (g: Phaser.GameObjects.Graphics) => {
          g.fillStyle(0x3a3a2a, 0.5);
          g.fillEllipse(-6, 2, 10, 16);
          g.fillEllipse(6, 2, 10, 16);
          g.fillEllipse(-5, -6, 8, 12);
          g.fillEllipse(5, -6, 8, 12);
          g.lineStyle(1, 0x2a2a1a, 0.3);
          g.strokeEllipse(-6, 2, 10, 16);
          g.strokeEllipse(6, 2, 10, 16);
        },
        depth: 5,
      },
    ];

    for (const config of inspectableObjects) {
      const prop = new InteractableProp(this, config);
      this.forestProps.push(prop);
      this.interactionManager?.register(prop);
    }

    const leverConfig: InteractablePropConfig = {
      id: "stone_lever",
      x: 5080, y: 950,
      width: 20, height: 30,
      promptText: "[E] Pull lever",
      dialogueId: "stone_lever",
      drawFn: (g: Phaser.GameObjects.Graphics) => {
        g.fillStyle(0x7a5a3a, 1);
        g.fillRect(-2, -12, 4, 24);
        g.fillStyle(0xaa8833, 1);
        g.fillCircle(0, -14, 4);
        g.fillStyle(0xccaa44, 0.7);
        g.fillCircle(0, -14, 2);
        g.lineStyle(1, 0x5a3a1a, 0.6);
        g.strokeCircle(0, -14, 4);
        g.fillStyle(0x5a3a1a, 1);
        g.fillRect(-6, 10, 12, 4);
      },
      depth: 6,
    };
    const lever = new InteractableProp(this, leverConfig);
    this.forestProps.push(lever);
    this.interactionManager?.register(lever);
  }

  private setupAtmosphericEffects(): void {
    const fog = this.add.graphics();
    fog.fillStyle(0x1a1a1a, 0);
    fog.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    fog.setScrollFactor(0);
    fog.setDepth(950);
    this.fogOverlay = fog;
  }

  private setupPhysics(): void {
    this.spawnPlayer();
    if (!this.player) return;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.collisionManager?.setPlayer(this.player);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(true);
    }
  }

  private setupCamera(): void {
    if (!this.player) return;

    this.cameraManager = new CameraManager(this.cameras.main, {
      lerpX: 0.04,
      lerpY: 0.04,
      worldBounds: { x: 0, y: 0, width: WORLD_W, height: WORLD_H },
      deadzoneWidth: 60,
      deadzoneHeight: 60,
      lookAheadFactor: 0.2,
      minZoom: 0.5,
      maxZoom: 1.5,
    });
  }

  private setupEnemies(): void {
    this.enemyGroup = this.physics.add.group();

    const wolf1 = new Wolf(this, WOLF_1.x, WOLF_1.y, this.player!);
    this.enemyGroup.add(wolf1);

    const wolf2 = new Wolf(this, WOLF_2.x, WOLF_2.y, this.player!);
    this.enemyGroup.add(wolf2);

    const wolf3 = new Wolf(this, WOLF_3.x, WOLF_3.y, this.player!);
    this.enemyGroup.add(wolf3);

    Logger.getInstance().log("[OpeningScene] Forest wolves spawned");
  }

  private setupEnemyCollisions(): void {
    if (!this.player || !this.enemyGroup) return;

    const objectGroup = this.collisionManager?.getObjectGroup();
    if (objectGroup) {
      this.physics.add.collider(this.enemyGroup, objectGroup);
    }

    this.physics.add.collider(this.player, this.enemyGroup);
  }

  private setupCheckpoints(): void {
    this.checkpoints?.registerCheckpoint(
      "forest_clearing",
      "Forest Clearing",
      CLEARING_X - 100, 800
    );
    this.checkpoints?.registerCheckpoint(
      "cave_entrance",
      "Cave Entrance",
      CAVE_ENTRANCE_X - 100, 800
    );
  }

  private startCinematic(): void {
    if (!this.cameraManager || !this.player) return;

    this.cinematicActive = true;
    this.playerControlEnabled = false;

    const cam = this.cameras.main;

    const scenes: Array<{ x: number; y: number; zoom: number; duration: number }> = [
      { x: 350, y: 850, zoom: 0.8, duration: 2500 },
      { x: 500, y: 650, zoom: 0.7, duration: 2500 },
      { x: 850, y: 600, zoom: 0.65, duration: 2500 },
    ];

    this.cameraManager.setZoom(scenes[0].zoom);
    cam.centerOn(scenes[0].x, scenes[0].y);

    let delay = 800;
    for (let i = 0; i < scenes.length; i++) {
      const scene = scenes[i];
      this.time.delayedCall(delay, () => {
        this.tweens.add({
          targets: cam,
          scrollX: scene.x - GAME_CONFIG.WIDTH / 2 / scene.zoom,
          scrollY: scene.y - GAME_CONFIG.HEIGHT / 2 / scene.zoom,
          zoom: scene.zoom,
          duration: scene.duration,
          ease: "Sine.easeInOut",
        });
      });
      delay += scene.duration + 300;
    }

    const returnDelay = delay;
    this.time.delayedCall(returnDelay, () => {
      const p = this.player!;
      this.cameras.main.centerOn(p.x, p.y);
      this.cameraManager!.setZoom(1);
      this.cameraManager!.follow(p);

      this.playerControlEnabled = true;
      this.cinematicActive = false;

      GameStateManager.getInstance().setState(GameState.PLAYING);

      this.objectiveManager?.setObjective("explore_shore", "Explore the shoreline");

      this.showTutorialPrompt();
    });
  }

  private showTutorialPrompt(): void {
    const text = this.add.text(
      GAME_CONFIG.WIDTH / 2,
      GAME_CONFIG.HEIGHT - 60,
      "WASD: Move  |  E: Interact  |  Shift: Run",
      {
        fontSize: "14px",
        color: "#aaaaaa",
        stroke: "#000000",
        strokeThickness: 3,
      }
    );
    text.setOrigin(0.5);
    text.setScrollFactor(0);
    text.setDepth(1000);
    text.setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      duration: 500,
      delay: 500,
      ease: "Power2",
    });

    this.tweens.add({
      targets: text,
      alpha: 0,
      duration: 1000,
      delay: 6000,
      ease: "Power2",
      onComplete: () => text.destroy(),
    });
  }

  private handleInteraction(target: IInteractable): void {
    if (this.dialogueManager?.isActive()) return;

    if (target instanceof CrewNPC) {
      this.startNPCDialogue(target.getDialogueId());
    } else if (target instanceof InteractableProp) {
      const id = target.getDialogueId();
      if (id === "stone_lever") {
        this.handleLeverInteraction(target);
      } else {
        this.startPropDialogue(id);
      }
    }
  }

  private handleLeverInteraction(_leverProp: InteractableProp): void {
    if (this.bridgeLowered) {
      this.dialogueManager?.start({
        lines: [{ speaker: "Odysseus", text: "The bridge is already lowered." }],
      });
      return;
    }

    this.dialogueManager?.start({
      lines: [
        { speaker: "Odysseus", text: "A wooden lever, ancient but still sturdy. It might control the bridge." },
        { speaker: "Odysseus", text: "I'll try pulling it." },
      ],
      onEnd: () => {
        this.lowerBridge();
      },
    });
  }

  private lowerBridge(): void {
    this.bridgeLowered = true;

    if (this.bridgeGapObject) {
      const idx = this.worldObjects.indexOf(this.bridgeGapObject);
      if (idx !== -1) {
        this.worldObjects.splice(idx, 1);
      }
      this.collisionManager?.getObjectGroup()?.remove(this.bridgeGapObject.gameObject);
      this.bridgeGapObject.destroy();
      this.bridgeGapObject = null;
    }

    if (this.bridgeLoweredGraphics) {
      this.bridgeLoweredGraphics.setVisible(true);
    }

    this.cameras.main.shake(300, 0.005);

    this.objectiveManager?.completeObjective("cross_canyon");
    this.objectiveManager?.setObjective("enter_cave", "Enter the cave");

    Logger.getInstance().log("[OpeningScene] Bridge lowered");
  }

  private startNPCDialogue(dialogueId: string): void {
    const dialogues: Record<string, { lines: Array<{ speaker: string; text: string }> }> = {
      eurylochus_beach: {
        lines: [
          { speaker: "Eurylochus", text: "Captain! Good to see you're awake. The storm came out of nowhere..." },
          { speaker: "Eurylochus", text: "I've taken stock of supplies. We lost most of the provisions, but the ship is still seaworthy." },
          { speaker: "Eurylochus", text: "This island seems quiet... perhaps too quiet. I don't trust it." },
          { speaker: "Odysseus", text: "Stay alert. We'll need to explore before we make any decisions." },
        ],
      },
      perimedes_campfire: {
        lines: [
          { speaker: "Perimedes", text: "I've got a small fire going. Should keep the beasts away for now." },
          { speaker: "Perimedes", text: "The wood here is dry enough. Good for burning, at least." },
          { speaker: "Odysseus", text: "Good work. We'll rest here before pushing inland." },
        ],
      },
      elpenor_shore: {
        lines: [
          { speaker: "Elpenor", text: "The water's calm now, but I saw something moving in the cliffs earlier." },
          { speaker: "Elpenor", text: "Could have been a goat... or maybe not. Hard to tell from here." },
          { speaker: "Odysseus", text: "Keep your eyes open. We'll investigate at first light." },
        ],
      },
    };

    const data = dialogues[dialogueId];
    if (!data) return;

    this.dialogueManager?.start({ lines: data.lines });
  }

  private startPropDialogue(dialogueId: string): void {
    const dialogues: Record<string, { lines: Array<{ speaker: string; text: string }> }> = {
      broken_cart: {
        lines: [
          { speaker: "Odysseus", text: "An abandoned cart... the wood is rotted, wheels shattered." },
          { speaker: "Odysseus", text: "Whoever left this here has been gone for some time. The forest is reclaiming it." },
          { speaker: "Odysseus", text: "There might be others on this island. We should be careful." },
        ],
      },
      ancient_statue: {
        lines: [
          { speaker: "Odysseus", text: "A statue... worn by weather and age, but the craftsmanship is unmistakable." },
          { speaker: "Odysseus", text: "Greek work. How did it come to be on this island?" },
          { speaker: "Odysseus", text: "Perhaps this place was visited by our ancestors long ago. A temple, maybe?" },
        ],
      },
      forest_campfire: {
        lines: [
          { speaker: "Odysseus", text: "Someone else has been here recently. The ashes are still warm." },
          { speaker: "Odysseus", text: "We're not alone on this island." },
        ],
      },
      ancient_carving: {
        lines: [
          { speaker: "Odysseus", text: "Markings carved into the stone... Greek letters, but the dialect is ancient." },
          { speaker: "Odysseus", text: "It warns of a 'one-eyed giant' that dwells in the mountain. A temple to the gods once stood here." },
          { speaker: "Eurylochus", text: "Captain... if there's any truth to these carvings, we should turn back." },
        ],
      },
      pile_of_bones: {
        lines: [
          { speaker: "Odysseus", text: "Bones... some are animal, but these larger ones... I fear they're not." },
          { speaker: "Odysseus", text: "Whoever came here before us did not survive." },
        ],
      },
      broken_spear: {
        lines: [
          { speaker: "Odysseus", text: "A broken spear. Greek make. The shaft is snapped clean in half." },
          { speaker: "Odysseus", text: "Whatever broke this did so with immense force." },
        ],
      },
      large_footprints: {
        lines: [
          { speaker: "Odysseus", text: "These footprints... no ordinary man could make them. Each one is twice the length of my arm." },
          { speaker: "Eurylochus", text: "We should turn back, Captain. Nothing good awaits us in that cave." },
          { speaker: "Odysseus", text: "If a creature of this size truly dwells here, we must face it. Our men need supplies, and this island holds answers." },
        ],
      },
    };

    const data = dialogues[dialogueId];
    if (!data) return;

    this.dialogueManager?.start({ lines: data.lines });
  }

  private updateChapterObjectives(): void {
    if (!this.player || this.cinematicActive) return;

    const px = this.player.x;

    if (!this.hasEnteredForest && px > FOREST_ENTRANCE_X) {
      this.hasEnteredForest = true;
      this.objectiveManager?.completeObjective("explore_shore");
      this.objectiveManager?.setObjective("explore_forest", "Explore the dark forest");
    }

    if (!this.wolvesCleared) {
      const alive = EnemyManager.getInstance().getAllEnemies().filter((e) => e.isAlive());
      if (alive.length === 0) {
        this.wolvesCleared = true;
        if (this.hasEnteredForest) {
          this.objectiveManager?.completeObjective("explore_forest");
        }
        this.objectiveManager?.setObjective("find_path", "Find the old path through the forest");

        this.checkpoints?.activateCheckpoint("forest_clearing");
      }
    }

    if (!this.hasReachedClearing && px > CLEARING_X) {
      this.hasReachedClearing = true;
      if (this.wolvesCleared) {
        this.objectiveManager?.completeObjective("find_path");
      }
    }

    if (!this.hasEnteredCanyon && px > CANYON_ENTRANCE_X) {
      this.hasEnteredCanyon = true;
      this.objectiveManager?.setObjective("investigate_cave", "Investigate the cave entrance");
    }

    if (!this.bridgeLowered && px > BRIDGE_X + 20 && !this.bridgeLowered) {
      this.objectiveManager?.setObjective("cross_canyon", "Find a way across the canyon");
    }

    if (!this.hasReachedCave && px > CAVE_ENTRANCE_X) {
      this.hasReachedCave = true;
      this.objectiveManager?.completeObjective("enter_cave");
      this.checkpoints?.activateCheckpoint("cave_entrance");

      GameStateManager.getInstance().setState(GameState.CUTSCENE);
      this.playerControlEnabled = false;

      const caveText = this.add.text(
        GAME_CONFIG.WIDTH / 2,
        GAME_CONFIG.HEIGHT / 2 - 40,
        "The Mountain Pass",
        {
          fontSize: "28px",
          color: "#ccaa66",
          stroke: "#000000",
          strokeThickness: 4,
        }
      );
      caveText.setOrigin(0.5);
      caveText.setScrollFactor(0);
      caveText.setDepth(1000);
      caveText.setAlpha(0);

      this.tweens.add({
        targets: caveText,
        alpha: 1,
        duration: 1500,
        ease: "Power2",
      });
      this.tweens.add({
        targets: caveText,
        alpha: 0,
        duration: 1000,
        delay: 2500,
        ease: "Power2",
        onComplete: () => {
          caveText.destroy();
          SceneTransitionManager.getInstance().transitionTo("MountainPassScene", {
            fadeDuration: 800,
          });
        },
      });
    }

    if (this.player && px > CAVE_ENTRANCE_X - 200 && px < CAVE_ENTRANCE_X + 50 && !this.caveShakeTriggered) {
      this.caveShakeTriggered = true;
      this.cameraManager?.shake({ intensity: 6, duration: 600 });
    }
  }

  private updateAtmosphere(delta: number): void {
    if (!this.player || !this.fogOverlay) return;

    const px = this.player.x;

    let fogIntensity = 0;
    if (px > 4000) {
      fogIntensity = Math.min((px - 4000) / 1200, 0.45);
    }
    if (px > 5200) {
      fogIntensity = Math.min(0.45 + (px - 5200) / 600 * 0.1, 0.55);
    }

    this.fogOverlay.clear();
    if (fogIntensity > 0.01) {
      this.fogOverlay.fillStyle(0x1a1a1a, fogIntensity);
      this.fogOverlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
    }

    if (px > 4000) {
      this.particleTimer += delta;
      if (this.particleTimer > 80) {
        this.particleTimer = 0;
        if (!this.particleGraphics) {
          this.particleGraphics = this.add.graphics();
          this.particleGraphics.setScrollFactor(1);
          this.particleGraphics.setDepth(950);
        }
        this.particleGraphics.clear();
        const particleCount = px > 5200 ? 12 : 8;
        for (let i = 0; i < particleCount; i++) {
          const wx = px + Phaser.Math.Between(-400, 400);
          const wy = Phaser.Math.Between(0, GAME_CONFIG.HEIGHT);
          const worldPx = wx;
          const s = Phaser.Math.Between(1, 3);
          this.particleGraphics.fillStyle(0x888877, 0.1 + Math.random() * 0.15);
          this.particleGraphics.fillCircle(worldPx - this.cameras.main.scrollX, wy, s);
        }

        this.windTimer += delta;
        if (this.windTimer > 120) {
          this.windTimer = 0;
          this.windOffset = (this.windOffset + 1) % 100;
          for (let i = 0; i < 3; i++) {
            const wy2 = Phaser.Math.Between(100, GAME_CONFIG.HEIGHT - 100);
            const wx2 = Phaser.Math.Between(-50, GAME_CONFIG.WIDTH + 50);
            const len = Phaser.Math.Between(30, 80);
            this.particleGraphics.lineStyle(1, 0xaaaacc, 0.08 + Math.random() * 0.06);
            this.particleGraphics.beginPath();
            this.particleGraphics.moveTo(wx2 - len, wy2);
            this.particleGraphics.lineTo(wx2, wy2);
            this.particleGraphics.strokePath();
          }
        }
      }
    } else if (this.particleGraphics) {
      this.particleGraphics.clear();
    }

    const px2 = this.player.x;
    for (let i = 0; i < this.torchGraphics.length; i++) {
      if (px2 > 4000 && this.torchGraphics[i]) {
        const g = this.torchGraphics[i];
        const flicker = 0.8 + Math.random() * 0.2;
        g.setAlpha(flicker);
      }
    }
  }

  private checkAudio(): void {
    try {
      const audioCache = this.cache.audio;
      if (this.sound && audioCache && audioCache.getKeys().length === 0) {
        Logger.getInstance().log("[Audio] No audio assets loaded; ambient audio skipped.");
      }
    } catch {
      Logger.getInstance().log("[Audio] Audio check skipped (no audio system).");
    }
  }

  update(time: number, delta: number): void {
    InputManager.getInstance().update();

    if (this.cinematicActive) {
      this.updateCampfireFlicker(delta);
      for (const npc of this.crewNPCs) {
        npc.update(time, delta);
      }
      return;
    }

    const enemyMgr = EnemyManager.getInstance();
    enemyMgr.tickHitPause(delta);

    if (!enemyMgr.isHitPaused()) {
      if (this.player && this.playerControlEnabled) {
        this.player.update(time, delta);
      }

      enemyMgr.update(time, delta);
      enemyMgr.checkPlayerHitboxCollisions(this);
      if (this.player) {
        enemyMgr.checkEnemyHitboxCollisions(this.player);
      }
    }

    this.updateChapterObjectives();

    if (this.dialogueManager?.isActive()) {
      this.dialogueManager.update(delta);
    }

    if (this.cameraManager) {
      if (this.player) {
        const stateId = this.player.getController().getStateMachine().getCurrentStateId();
        const isCombat = stateId === "ATTACKING" || stateId === "HEAVY_ATTACKING";
        this.cameraManager.setCombatZoom(isCombat);
      }
      this.cameraManager.update(delta);
    }

    this.interactionManager?.update();

    for (const npc of this.crewNPCs) {
      npc.update(time, delta);
    }

    this.objectiveManager?.update(delta);
    this.hud?.update(this.player);
    this.updateCampfireFlicker(delta);
    this.updateAtmosphere(delta);

    if (this.debugOverlay) {
      this.debugOverlay.update(time, delta);
    }
  }

  private updateCampfireFlicker(delta: number): void {
    if (!this.campfireGraphics) return;
    this.campfireFlickerTimer += delta;

    if (this.campfireFlickerTimer > 100) {
      this.campfireFlickerTimer = 0;
      const g = this.campfireGraphics;
      const cx = 1050;
      const cy = 700;
      g.clear();
      g.fillStyle(0x5a3a1a, 1);
      for (let i = 0; i < 5; i++) {
        const angle = (i / 5) * Math.PI * 2;
        const rx = cx + Math.cos(angle) * 8;
        const ry = cy + Math.sin(angle) * 8;
        g.fillRect(rx - 2, ry - 6, 4, 12);
      }
      const flicker = Phaser.Math.Between(-1, 1);
      g.fillStyle(0xff6600, 0.8 + Math.random() * 0.2);
      g.fillCircle(cx + flicker, cy - 4 + flicker, 6 + Math.random());
      g.fillStyle(0xffaa00, 0.7 + Math.random() * 0.2);
      g.fillCircle(cx + flicker, cy - 5 + flicker, 4 + Math.random());
      g.fillStyle(0xffdd44, 0.6 + Math.random() * 0.2);
      g.fillCircle(cx + flicker, cy - 6 + flicker, 2 + Math.random());
      g.setDepth(6);
    }
  }
}
