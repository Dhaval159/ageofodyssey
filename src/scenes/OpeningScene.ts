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

const WORLD_W = 2400;
const WORLD_H = 1800;

const SHIP_X = 400;
const SHIP_Y = 950;
const PLAYER_SPAWN_X = 580;
const PLAYER_SPAWN_Y = 950;

export default class OpeningScene extends Phaser.Scene {
  private player: Player | null = null;
  private cameraManager: CameraManager | null = null;
  private debugOverlay: DebugOverlay | null = null;
  private collisionManager: CollisionManager | null = null;
  private interactionManager: InteractionManager | null = null;
  private dialogueManager: DialogueManager | null = null;
  private objectiveManager: ObjectiveManager | null = null;
  private checkpoints: CheckpointSystem | null = null;
  private crewNPCs: CrewNPC[] = [];
  private worldObjects: WorldObject[] = [];
  private terrainGraphics: Phaser.GameObjects.Graphics[] = [];
  private campfireGraphics: Phaser.GameObjects.Graphics | null = null;

  private cinematicActive: boolean = true;
  private playerControlEnabled: boolean = false;
  private campfireFlickerTimer: number = 0;

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

    this.collisionManager = CollisionManager.getInstance();
    this.collisionManager.initialize(this);

    this.buildTerrain();
    this.buildFeatures();
    this.spawnWorldObjects();

    this.setupPhysics();
    this.setupCamera();

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
    grassLayer.fillRect(550, 250, WORLD_W - 550, 1000);
    grassLayer.fillRect(500, 250, 60, 300);
    grassLayer.fillRect(820, 1250, WORLD_W - 820, 150);
    grassLayer.fillStyle(0x4a8a4a, 0.3);
    for (let i = 0; i < 60; i++) {
      const gx = Phaser.Math.Between(550, WORLD_W - 50);
      const gy = Phaser.Math.Between(300, 1300);
      grassLayer.fillCircle(gx, gy, Phaser.Math.Between(10, 30));
    }
    grassLayer.setDepth(-9);
    this.terrainGraphics.push(grassLayer);

    const cliffLayer = this.add.graphics();
    cliffLayer.fillStyle(0x5a4a3a, 1);
    cliffLayer.fillRect(0, 0, WORLD_W, 120);
    cliffLayer.fillRect(WORLD_W - 80, 0, 80, WORLD_H);
    cliffLayer.fillStyle(0x4a3a2a, 1);
    cliffLayer.fillRect(0, 0, WORLD_W, 40);
    for (let i = 0; i < 25; i++) {
      const cx = Phaser.Math.Between(0, WORLD_W - 80);
      const cy = Phaser.Math.Between(0, 100);
      cliffLayer.fillRect(cx, cy, Phaser.Math.Between(30, 80), Phaser.Math.Between(10, 30));
    }
    cliffLayer.setDepth(-8);
    this.terrainGraphics.push(cliffLayer);

    const pathGraphics = this.add.graphics();
    pathGraphics.lineStyle(20, 0x8a7a5a, 0.6);
    pathGraphics.beginPath();
    pathGraphics.moveTo(500, 1020);
    pathGraphics.lineTo(620, 980);
    pathGraphics.lineTo(780, 900);
    pathGraphics.lineTo(950, 800);
    pathGraphics.lineTo(1100, 720);
    pathGraphics.strokePath();
    pathGraphics.lineStyle(14, 0x9a8a6a, 0.4);
    pathGraphics.beginPath();
    pathGraphics.moveTo(500, 1020);
    pathGraphics.lineTo(620, 980);
    pathGraphics.lineTo(780, 900);
    pathGraphics.lineTo(950, 800);
    pathGraphics.lineTo(1100, 720);
    pathGraphics.strokePath();
    pathGraphics.setDepth(-8);
    this.terrainGraphics.push(pathGraphics);
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

  private spawnWorldObjects(): void {
    const treePositions = [
      { x: 720, y: 550 }, { x: 880, y: 480 }, { x: 1200, y: 550 },
      { x: 1400, y: 600 }, { x: 1600, y: 500 }, { x: 1100, y: 400 },
      { x: 1300, y: 350 }, { x: 1500, y: 400 }, { x: 1800, y: 550 },
      { x: 2000, y: 500 }, { x: 700, y: 450 }, { x: 1700, y: 700 },
      { x: 1250, y: 900 }, { x: 1450, y: 1000 }, { x: 1650, y: 900 },
      { x: 1900, y: 800 }, { x: 2100, y: 750 }, { x: 2200, y: 600 },
    ];
    const rockPositions = [
      { x: 380, y: 1000 }, { x: 420, y: 1080 }, { x: 360, y: 1150 },
      { x: 470, y: 1200 }, { x: 550, y: 1280 }, { x: 650, y: 1300 },
      { x: 700, y: 1280 }, { x: 450, y: 900 }, { x: 500, y: 870 },
      { x: 600, y: 450 }, { x: 900, y: 900 }, { x: 1100, y: 950 },
      { x: 1300, y: 800 }, { x: 1550, y: 850 }, { x: 1850, y: 700 },
    ];

    for (const pos of treePositions) {
      const tree = new WorldObject({
        scene: this,
        id: `tree_${pos.x}_${pos.y}`,
        type: "tree",
        x: pos.x,
        y: pos.y,
        width: Phaser.Math.Between(35, 55),
        height: Phaser.Math.Between(35, 55),
        color: 0x1b5e20,
        alpha: 1,
        isCollidable: true,
        strokeColor: 0x2e7d32,
        strokeWidth: 2,
      });
      tree.setDepth(3);
      this.worldObjects.push(tree);
      this.collisionManager?.addObject(tree);
    }

    for (const pos of rockPositions) {
      const size = Phaser.Math.Between(20, 45);
      const rock = new WorldObject({
        scene: this,
        id: `rock_${pos.x}_${pos.y}`,
        type: "rock",
        x: pos.x,
        y: pos.y,
        width: size,
        height: size,
        color: 0x5a5a6a,
        alpha: 1,
        isCollidable: true,
        strokeColor: 0x7a7a8a,
        strokeWidth: 1,
      });
      rock.setDepth(2);
      this.worldObjects.push(rock);
      this.collisionManager?.addObject(rock);
    }

    const cliffWallObjects = [
      { x: 1200, y: 60, w: WORLD_W, h: 30 },
      { x: WORLD_W - 40, y: 600, w: 30, h: WORLD_H },
    ];
    for (const w of cliffWallObjects) {
      const wall = new WorldObject({
        scene: this,
        id: `cliff_wall_${w.x}_${w.y}`,
        type: "wall",
        x: w.x,
        y: w.y,
        width: w.w,
        height: w.h,
        color: 0x5a4a3a,
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
        x: 480,
        y: 1020,
        color: 0xff6644,
        dialogueId: "eurylochus_beach",
        promptText: "[E] Talk",
      },
      {
        name: "Perimedes",
        x: 900,
        y: 720,
        color: 0x44aaff,
        dialogueId: "perimedes_campfire",
        promptText: "[E] Talk",
      },
      {
        name: "Elpenor",
        x: 550,
        y: 1150,
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
      const dialogueId = target.getDialogueId();
      this.startNPCDialogue(dialogueId);
    }
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

    this.dialogueManager?.start({
      lines: data.lines,
    });
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

    if (this.player && this.playerControlEnabled) {
      this.player.update(time, delta);
    }

    if (this.dialogueManager?.isActive()) {
      this.dialogueManager.update(delta);
    }

    if (this.cameraManager) {
      this.cameraManager.update(delta);
    }

    this.interactionManager?.update();

    for (const npc of this.crewNPCs) {
      npc.update(time, delta);
    }

    this.objectiveManager?.update(delta);
    this.updateCampfireFlicker(delta);

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
