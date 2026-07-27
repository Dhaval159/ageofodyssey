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
import { InteractableProp, InteractablePropConfig } from "../entities/props/InteractableProp";
import { HUD } from "../systems/effects/HUD";
import { EnvironmentManager } from "../systems/environment/EnvironmentManager";

const MAP_W = 6200;
const MAP_H = 1600;

const FOREST_CLEARING = { x: 700, y: 800 };
const MOUNTAIN_TRAIL_START = { x: 1500, y: 800 };
const RUINS_CENTER = { x: 2700, y: 750 };
const SHRINE_CENTER = { x: 3500, y: 700 };
const CANYON_CENTER = { x: 4200, y: 750 };
const BRIDGE_X = 4900;
const BRIDGE_Y = 750;
const CAVE_ENTRANCE = { x: 5600, y: 700 };

const PLAYER_SPAWN = { x: 400, y: 800 };

export default class MountainPassScene extends Phaser.Scene {
    private player: Player | null = null;
    private cameraManager: CameraManager | null = null;
    private debugOverlay: DebugOverlay | null = null;
    private collisionManager: CollisionManager | null = null;
    private interactionManager: InteractionManager | null = null;
    private dialogueManager: DialogueManager | null = null;
    private objectiveManager: ObjectiveManager | null = null;
    private checkpoints: CheckpointSystem | null = null;
    private worldObjects: WorldObject[] = [];
    private terrainGraphics: Phaser.GameObjects.Graphics[] = [];
    private torchGraphics: Phaser.GameObjects.Graphics[] = [];
    private fogOverlay: Phaser.GameObjects.Graphics | null = null;
    private particleGraphics: Phaser.GameObjects.Graphics | null = null;
    private particleTimer: number = 0;
    private windTimer: number = 0;
    private mountainProps: InteractableProp[] = [];
    private bridgeGapObject: WorldObject | null = null;
    private bridgeLoweredGraphics: Phaser.GameObjects.Graphics | null = null;
    private hud: HUD | null = null;
    private campfireGraphics: Phaser.GameObjects.Graphics | null = null;
    private campfirePos: { x: number; y: number } = { x: 0, y: 0 };
    private campfireFlickerTimer: number = 0;
    private waterfallGfx: Phaser.GameObjects.Graphics | null = null;
    private waterfallTimer: number = 0;
    private environmentManager!: EnvironmentManager;

    private cinematicActive: boolean = true;
    private playerControlEnabled: boolean = false;
    private gameStarted: boolean = false;

    private hasLeftForest: boolean = false;
    private hasReachedRuins: boolean = false;
    private hasReachedShrine: boolean = false;
    private hasReachedCanyon: boolean = false;
    private bridgeLowered: boolean = false;
    private hasReachedCave: boolean = false;


    constructor() {
        super({ key: "MountainPassScene" });
    }

    create(): void {
        this.cameras.main.setBackgroundColor(0x0f1a0f);
        this.cameras.main.fadeIn(800, 0, 0, 0);
        Logger.getInstance().log("MountainPassScene started");

        GameStateManager.getInstance().setState(GameState.CUTSCENE);
        SceneTransitionManager.getInstance().initialize(this);

        InputManager.getInstance().initialize(this, {
            bindingsProfile: InputContext.createFilteredBindings(InputContext.GAMEPLAY),
        });

        CombatManager.getInstance().initialize();

    this.collisionManager = CollisionManager.getInstance();
    this.collisionManager.initialize(this);

    this.hud = new HUD(this);

    this.buildTerrain();
        this.buildForestClearing();
        this.buildMountainTrail();
        this.buildCollapsedRuins();
        this.buildOldShrine();
        this.buildNarrowCanyon();
        this.buildBrokenBridge();
        this.buildCaveEntranceArea();
        this.buildWallsAndBoundaries();
        this.buildStoryProps();
        this.buildTorchProps();
        this.buildCampfire();

        this.setupAtmosphere();
        this.setupPhysics();
        this.setupCamera();
        this.setupSystems();
        this.setupCheckpoints();
        this.registerInteractables();

        this.environmentManager.decorateWorldObjects(this.worldObjects);
        this.environmentManager.scatterDecorations(0.03, this.player?.x, this.player?.y);

        this.startCinematic();
    }

    private buildTerrain(): void {
        this.environmentManager = new EnvironmentManager(this, "forest");
        this.environmentManager.initialize(MAP_W, MAP_H);

        // Fill forest ground section with grass tiles (Tile 0)
        this.environmentManager.fillGroundRegion(0, 0, 1800, MAP_H, 0);

        // Fill mountain section with rocky soil/mossy stone floor (Tile 9)
        this.environmentManager.fillGroundRegion(1600, 0, MAP_W - 1600, MAP_H, 9);

        // Draw top and bottom boundary cliffs
        this.environmentManager.drawCliff(0, 0, MAP_W, 80);
        this.environmentManager.drawCliff(0, MAP_H - 80, MAP_W, 80);

        // Draw main path (Tile 3)
        const pathPoints = [
            PLAYER_SPAWN,
            { x: 600, y: 780 },
            { x: 900, y: 750 },
            { x: 1200, y: 780 },
            { x: 1500, y: 800 },
            { x: 1700, y: 820 },
            { x: 1900, y: 800 },
            { x: 2100, y: 780 },
            { x: 2300, y: 770 },
            { x: 2500, y: 760 },
            { x: 2700, y: 750 },
            { x: 2900, y: 730 },
            { x: 3100, y: 720 },
            { x: 3300, y: 710 },
            { x: 3500, y: 700 },
            { x: 3700, y: 720 },
            { x: 3900, y: 740 },
            { x: 4100, y: 760 },
            { x: 4300, y: 750 },
            { x: 4500, y: 740 },
            { x: 4700, y: 750 },
            { x: 4900, y: 750 },
            { x: 5100, y: 740 },
            { x: 5300, y: 720 },
            { x: 5500, y: 710 },
            CAVE_ENTRANCE
        ];
        this.environmentManager.drawPath(pathPoints, 128);
    }

    private buildForestClearing(): void {
        const g = this.add.graphics();
        g.fillStyle(0x2a6a2a, 0.4);
        g.fillCircle(FOREST_CLEARING.x, FOREST_CLEARING.y, 250);
        g.fillStyle(0x327732, 0.3);
        g.fillCircle(FOREST_CLEARING.x, FOREST_CLEARING.y, 180);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const treePositions = [
            { x: 300, y: 600 }, { x: 500, y: 500 }, { x: 200, y: 700 },
            { x: 600, y: 450 }, { x: 400, y: 350 }, { x: 150, y: 850 },
            { x: 350, y: 1000 }, { x: 550, y: 1050 }, { x: 700, y: 1100 },
            { x: 900, y: 500 }, { x: 1050, y: 600 }, { x: 1100, y: 900 },
            { x: 1200, y: 1000 }, { x: 1350, y: 500 }, { x: 1450, y: 1050 },
        ];

        for (const pos of treePositions) {
            this.placeTree(pos.x, pos.y, Phaser.Math.Between(35, 60), 0x1a4a1a);
        }

        const rockPositions = [
            { x: 450, y: 650 }, { x: 800, y: 500 }, { x: 1000, y: 950 },
            { x: 1300, y: 600 }, { x: 600, y: 1000 },
        ];
        for (const pos of rockPositions) {
            this.placeRock(pos.x, pos.y, Phaser.Math.Between(20, 40), 0x5a5a6a);
        }
    }

    private buildMountainTrail(): void {
        const g = this.add.graphics();
        g.fillStyle(0x4a4a3a, 0.4);
        g.fillRect(MOUNTAIN_TRAIL_START.x - 100, 200, 800, 1200);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const trailRocks = [
            { x: 1700, y: 400 }, { x: 1850, y: 1000 }, { x: 2000, y: 350 },
            { x: 2100, y: 1100 }, { x: 2200, y: 500 }, { x: 2350, y: 900 },
        ];
        for (const pos of trailRocks) {
            this.placeRock(pos.x, pos.y, Phaser.Math.Between(25, 50), 0x6a6a5a);
        }

        const brokenTreeG = this.add.graphics();
        brokenTreeG.fillStyle(0x5a3a1a, 1);
        brokenTreeG.fillRect(1900, 680, 60, 8);
        brokenTreeG.fillStyle(0x4a8a4a, 0.6);
        brokenTreeG.fillCircle(1960, 676, 20);
        brokenTreeG.fillCircle(1940, 668, 15);
        brokenTreeG.setDepth(3);
        this.terrainGraphics.push(brokenTreeG);

        const trailStones = this.add.graphics();
        trailStones.fillStyle(0x7a7a6a, 0.3);
        for (let i = 0; i < 15; i++) {
            const sx = Phaser.Math.Between(1500, 2400);
            const sy = Phaser.Math.Between(400, 1100);
            trailStones.fillRect(sx, sy, Phaser.Math.Between(10, 30), Phaser.Math.Between(6, 15));
        }
        trailStones.setDepth(-7);
        this.terrainGraphics.push(trailStones);
    }

    private buildCollapsedRuins(): void {
        const g = this.add.graphics();
        g.fillStyle(0x4a4a3a, 0.3);
        g.fillCircle(RUINS_CENTER.x, RUINS_CENTER.y, 200);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const ruinWalls = this.add.graphics();
        ruinWalls.fillStyle(0x7a7a6a, 1);
        ruinWalls.fillRect(RUINS_CENTER.x - 150, RUINS_CENTER.y - 80, 20, 60);
        ruinWalls.fillRect(RUINS_CENTER.x + 120, RUINS_CENTER.y - 60, 20, 50);
        ruinWalls.fillRect(RUINS_CENTER.x - 100, RUINS_CENTER.y + 60, 15, 40);
        ruinWalls.fillRect(RUINS_CENTER.x + 80, RUINS_CENTER.y + 70, 18, 35);
        ruinWalls.setDepth(3);
        this.terrainGraphics.push(ruinWalls);

        this.placeBrokenColumn(RUINS_CENTER.x - 100, RUINS_CENTER.y - 30, false);
        this.placeBrokenColumn(RUINS_CENTER.x + 90, RUINS_CENTER.y - 20, true);
        this.placeBrokenColumn(RUINS_CENTER.x - 40, RUINS_CENTER.y + 50, true);
        this.placeBrokenColumn(RUINS_CENTER.x + 50, RUINS_CENTER.y + 40, false);

        const archG = this.add.graphics();
        archG.fillStyle(0x8a8a7a, 1);
        archG.fillRect(RUINS_CENTER.x - 60, RUINS_CENTER.y - 100, 120, 12);
        archG.fillRect(RUINS_CENTER.x - 60, RUINS_CENTER.y - 100, 12, 70);
        archG.fillRect(RUINS_CENTER.x + 48, RUINS_CENTER.y - 100, 12, 70);
        archG.lineStyle(2, 0x6a6a5a, 0.6);
        archG.strokeRect(RUINS_CENTER.x - 60, RUINS_CENTER.y - 100, 120, 12);
        archG.strokeRect(RUINS_CENTER.x - 60, RUINS_CENTER.y - 100, 12, 70);
        archG.strokeRect(RUINS_CENTER.x + 48, RUINS_CENTER.y - 100, 12, 70);
        archG.setDepth(4);
        this.terrainGraphics.push(archG);

        const rubbleG = this.add.graphics();
        rubbleG.fillStyle(0x6a6a5a, 0.6);
        for (let i = 0; i < 20; i++) {
            const rx = RUINS_CENTER.x + Phaser.Math.Between(-120, 120);
            const ry = RUINS_CENTER.y + Phaser.Math.Between(-60, 80);
            rubbleG.fillRect(rx, ry, Phaser.Math.Between(5, 18), Phaser.Math.Between(3, 10));
        }
        rubbleG.setDepth(2);
        this.terrainGraphics.push(rubbleG);
    }

    private buildOldShrine(): void {
        const g = this.add.graphics();
        g.fillStyle(0x4a4a3a, 0.3);
        g.fillCircle(SHRINE_CENTER.x, SHRINE_CENTER.y, 180);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const platformG = this.add.graphics();
        platformG.fillStyle(0x7a7a6a, 1);
        platformG.fillRect(SHRINE_CENTER.x - 40, SHRINE_CENTER.y - 10, 80, 20);
        platformG.fillStyle(0x8a8a7a, 1);
        platformG.fillRect(SHRINE_CENTER.x - 35, SHRINE_CENTER.y - 8, 70, 16);
        platformG.lineStyle(2, 0x6a6a5a, 0.7);
        platformG.strokeRect(SHRINE_CENTER.x - 40, SHRINE_CENTER.y - 10, 80, 20);
        platformG.setDepth(4);
        this.terrainGraphics.push(platformG);

        const statueG = this.add.graphics();
        statueG.fillStyle(0x9a9a8a, 1);
        statueG.fillCircle(SHRINE_CENTER.x, SHRINE_CENTER.y - 22, 7);
        statueG.fillRect(SHRINE_CENTER.x - 5, SHRINE_CENTER.y - 15, 10, 12);
        statueG.fillRect(SHRINE_CENTER.x - 7, SHRINE_CENTER.y - 3, 14, 10);
        statueG.fillRect(SHRINE_CENTER.x - 9, SHRINE_CENTER.y + 7, 6, 8);
        statueG.fillRect(SHRINE_CENTER.x + 3, SHRINE_CENTER.y + 7, 6, 8);
        statueG.lineStyle(1, 0x7a7a6a, 0.6);
        statueG.strokeCircle(SHRINE_CENTER.x, SHRINE_CENTER.y - 22, 7);
        statueG.strokeRect(SHRINE_CENTER.x - 5, SHRINE_CENTER.y - 15, 10, 12);
        statueG.fillStyle(0x8a8a7a, 0.8);
        statueG.fillRect(SHRINE_CENTER.x - 8, SHRINE_CENTER.y - 26, 16, 4);
        statueG.setDepth(5);
        this.terrainGraphics.push(statueG);

        const offeringG = this.add.graphics();
        offeringG.fillStyle(0xccaa44, 0.6);
        offeringG.fillCircle(SHRINE_CENTER.x - 15, SHRINE_CENTER.y + 2, 3);
        offeringG.fillCircle(SHRINE_CENTER.x + 15, SHRINE_CENTER.y + 2, 3);
        offeringG.fillStyle(0x886633, 0.5);
        offeringG.fillRect(SHRINE_CENTER.x - 20, SHRINE_CENTER.y + 4, 6, 3);
        offeringG.fillRect(SHRINE_CENTER.x + 14, SHRINE_CENTER.y + 4, 6, 3);
        offeringG.setDepth(5);
        this.terrainGraphics.push(offeringG);

        const shrineRocks = [
            { x: SHRINE_CENTER.x - 130, y: SHRINE_CENTER.y + 40 },
            { x: SHRINE_CENTER.x + 120, y: SHRINE_CENTER.y - 30 },
            { x: SHRINE_CENTER.x - 80, y: SHRINE_CENTER.y + 90 },
        ];
        for (const pos of shrineRocks) {
            this.placeRock(pos.x, pos.y, Phaser.Math.Between(15, 30), 0x6a6a5a);
        }
    }

    private buildNarrowCanyon(): void {
        const canyonG = this.add.graphics();
        canyonG.fillStyle(0x3a3a2a, 1);
        canyonG.fillRect(CANYON_CENTER.x - 120, 150, 30, MAP_H - 300);
        canyonG.fillRect(CANYON_CENTER.x + 120, 150, 30, MAP_H - 300);
        canyonG.fillStyle(0x4a4a3a, 0.5);
        for (let i = 0; i < 30; i++) {
            const cx = CANYON_CENTER.x - 125 + Phaser.Math.Between(-5, 5);
            const cy = Phaser.Math.Between(180, MAP_H - 180);
            canyonG.fillRect(cx, cy, Phaser.Math.Between(8, 25), Phaser.Math.Between(5, 15));
        }
        for (let i = 0; i < 30; i++) {
            const cx = CANYON_CENTER.x + 125 + Phaser.Math.Between(-5, 5);
            const cy = Phaser.Math.Between(180, MAP_H - 180);
            canyonG.fillRect(cx, cy, Phaser.Math.Between(8, 25), Phaser.Math.Between(5, 15));
        }
        canyonG.setDepth(-7);
        this.terrainGraphics.push(canyonG);

        const canyonFloor = this.add.graphics();
        canyonFloor.fillStyle(0x5a5a4a, 0.4);
        canyonFloor.fillRect(CANYON_CENTER.x - 110, 160, 220, MAP_H - 320);
        canyonFloor.setDepth(-8);
        this.terrainGraphics.push(canyonFloor);

        const canyonWalls = [
            { x: CANYON_CENTER.x - 130, y: 400, w: 30, h: 200 },
            { x: CANYON_CENTER.x - 130, y: 1000, w: 30, h: 200 },
            { x: CANYON_CENTER.x + 130, y: 400, w: 30, h: 200 },
            { x: CANYON_CENTER.x + 130, y: 1000, w: 30, h: 200 },
            { x: CANYON_CENTER.x - 130, y: 150, w: 30, h: 80 },
            { x: CANYON_CENTER.x + 130, y: 150, w: 30, h: 80 },
            { x: CANYON_CENTER.x - 130, y: MAP_H - 150, w: 30, h: 80 },
            { x: CANYON_CENTER.x + 130, y: MAP_H - 150, w: 30, h: 80 },
        ];
        for (const w of canyonWalls) {
            this.addWall(`canyon_${w.x}_${w.y}`, w.x, w.y, w.w, w.h);
        }
    }

    private buildBrokenBridge(): void {
        const bridgeGapG = this.add.graphics();
        bridgeGapG.fillStyle(0x1a1a1a, 1);
        bridgeGapG.fillRect(BRIDGE_X - 40, BRIDGE_Y - 60, 80, 120);
        bridgeGapG.fillStyle(0x2a1a0a, 0.5);
        bridgeGapG.fillRect(BRIDGE_X - 35, BRIDGE_Y - 55, 70, 110);
        bridgeGapG.setDepth(-7);
        this.terrainGraphics.push(bridgeGapG);

        const bridgeSides = this.add.graphics();
        bridgeSides.fillStyle(0x5a4a3a, 1);
        bridgeSides.fillRect(BRIDGE_X - 45, BRIDGE_Y - 70, 10, 140);
        bridgeSides.fillRect(BRIDGE_X + 35, BRIDGE_Y - 70, 10, 140);
        bridgeSides.lineStyle(2, 0x4a3a2a, 0.6);
        bridgeSides.strokeRect(BRIDGE_X - 45, BRIDGE_Y - 70, 10, 140);
        bridgeSides.strokeRect(BRIDGE_X + 35, BRIDGE_Y - 70, 10, 140);
        bridgeSides.setDepth(3);
        this.terrainGraphics.push(bridgeSides);

        const brokenPlanks = this.add.graphics();
        brokenPlanks.fillStyle(0x6a5a3a, 0.7);
        brokenPlanks.fillRect(BRIDGE_X - 30, BRIDGE_Y - 50, 25, 6);
        brokenPlanks.fillRect(BRIDGE_X + 10, BRIDGE_Y + 20, 20, 5);
        brokenPlanks.fillRect(BRIDGE_X - 20, BRIDGE_Y + 40, 15, 4);
        brokenPlanks.setDepth(2);
        this.terrainGraphics.push(brokenPlanks);

        const gapWall = new WorldObject({
            scene: this,
            id: "bridge_gap",
            type: "wall",
            x: BRIDGE_X,
            y: BRIDGE_Y,
            width: 70,
            height: 110,
            color: 0x000000,
            alpha: 0,
            isCollidable: true,
        });
        gapWall.setDepth(0);
        this.bridgeGapObject = gapWall;
        this.worldObjects.push(gapWall);
        this.collisionManager?.addObject(gapWall);

        const bridgePlanksG = this.add.graphics();
        bridgePlanksG.fillStyle(0x7a6a4a, 1);
        bridgePlanksG.fillRect(BRIDGE_X - 35, BRIDGE_Y - 5, 70, 10);
        bridgePlanksG.lineStyle(1, 0x5a4a2a, 0.6);
        bridgePlanksG.strokeRect(BRIDGE_X - 35, BRIDGE_Y - 5, 70, 10);
        bridgePlanksG.fillStyle(0x8a7a5a, 0.5);
        bridgePlanksG.fillRect(BRIDGE_X - 30, BRIDGE_Y - 3, 60, 6);
        bridgePlanksG.setDepth(4);
        this.bridgeLoweredGraphics = bridgePlanksG;
        bridgePlanksG.setVisible(false);
    }

    private buildCaveEntranceArea(): void {
        const g = this.add.graphics();
        g.fillStyle(0x2a2a2a, 1);
        g.beginPath();
        g.moveTo(CAVE_ENTRANCE.x - 80, CAVE_ENTRANCE.y - 50);
        g.lineTo(CAVE_ENTRANCE.x - 50, CAVE_ENTRANCE.y + 80);
        g.lineTo(CAVE_ENTRANCE.x + 50, CAVE_ENTRANCE.y + 80);
        g.lineTo(CAVE_ENTRANCE.x + 80, CAVE_ENTRANCE.y - 50);
        g.lineTo(CAVE_ENTRANCE.x + 60, CAVE_ENTRANCE.y - 70);
        g.lineTo(CAVE_ENTRANCE.x - 60, CAVE_ENTRANCE.y - 70);
        g.closePath();
        g.fillPath();

        g.fillStyle(0x0a0a0a, 1);
        g.beginPath();
        g.moveTo(CAVE_ENTRANCE.x - 65, CAVE_ENTRANCE.y - 42);
        g.lineTo(CAVE_ENTRANCE.x - 40, CAVE_ENTRANCE.y + 72);
        g.lineTo(CAVE_ENTRANCE.x + 40, CAVE_ENTRANCE.y + 72);
        g.lineTo(CAVE_ENTRANCE.x + 65, CAVE_ENTRANCE.y - 42);
        g.lineTo(CAVE_ENTRANCE.x + 50, CAVE_ENTRANCE.y - 58);
        g.lineTo(CAVE_ENTRANCE.x - 50, CAVE_ENTRANCE.y - 58);
        g.closePath();
        g.fillPath();

        g.lineStyle(3, 0x6a5a4a, 0.6);
        g.beginPath();
        g.moveTo(CAVE_ENTRANCE.x - 80, CAVE_ENTRANCE.y - 50);
        g.lineTo(CAVE_ENTRANCE.x - 50, CAVE_ENTRANCE.y + 80);
        g.lineTo(CAVE_ENTRANCE.x + 50, CAVE_ENTRANCE.y + 80);
        g.lineTo(CAVE_ENTRANCE.x + 80, CAVE_ENTRANCE.y - 50);
        g.strokePath();

        g.fillStyle(0x5a4a3a, 1);
        g.fillRect(CAVE_ENTRANCE.x - 65, CAVE_ENTRANCE.y - 70, 130, 8);

        g.fillStyle(0x6a5a4a, 0.3);
        for (let i = 0; i < 8; i++) {
            const rx = CAVE_ENTRANCE.x + Phaser.Math.Between(-70, 70);
            const ry = CAVE_ENTRANCE.y + Phaser.Math.Between(-60, 70);
            g.fillRect(rx, ry, Phaser.Math.Between(3, 10), Phaser.Math.Between(2, 5));
        }
        g.setDepth(5);

        const archTop = this.add.graphics();
        archTop.fillStyle(0x7a7a6a, 1);
        archTop.fillRect(CAVE_ENTRANCE.x - 85, CAVE_ENTRANCE.y - 75, 170, 14);
        archTop.fillRect(CAVE_ENTRANCE.x - 85, CAVE_ENTRANCE.y - 75, 14, 80);
        archTop.fillRect(CAVE_ENTRANCE.x + 71, CAVE_ENTRANCE.y - 75, 14, 80);
        archTop.lineStyle(2, 0x5a5a4a, 0.5);
        archTop.strokeRect(CAVE_ENTRANCE.x - 85, CAVE_ENTRANCE.y - 75, 170, 14);
        archTop.setDepth(5);

        this.buildWaterfall(CAVE_ENTRANCE.x - 90, CAVE_ENTRANCE.y - 40);

        const caveRocks = [
            { x: CAVE_ENTRANCE.x - 100, y: CAVE_ENTRANCE.y + 50 },
            { x: CAVE_ENTRANCE.x + 100, y: CAVE_ENTRANCE.y + 40 },
            { x: CAVE_ENTRANCE.x - 70, y: CAVE_ENTRANCE.y + 90 },
            { x: CAVE_ENTRANCE.x + 80, y: CAVE_ENTRANCE.y + 85 },
        ];
        for (const pos of caveRocks) {
            this.placeRock(pos.x, pos.y, Phaser.Math.Between(18, 35), 0x6a6a5a);
        }

        const bonesG = this.add.graphics();
        bonesG.fillStyle(0xccccbb, 0.7);
        for (let i = 0; i < 6; i++) {
            const bx = CAVE_ENTRANCE.x + 60 + Phaser.Math.Between(-10, 10);
            const by = CAVE_ENTRANCE.y + 60 + Phaser.Math.Between(-8, 8);
            bonesG.fillRect(bx - 1, by - 3, 2, 6);
        }
        bonesG.fillStyle(0xbbbbaa, 0.7);
        bonesG.fillCircle(CAVE_ENTRANCE.x + 62, CAVE_ENTRANCE.y + 64, 3);
        bonesG.setDepth(4);
    }

    private buildWaterfall(wx: number, wy: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x4a7a8a, 0.5);
        g.fillRect(wx - 3, wy, 6, 120);
        g.fillStyle(0x6aaacc, 0.3);
        g.fillRect(wx - 1, wy + 5, 2, 110);
        g.fillStyle(0x88ccdd, 0.2);
        for (let i = 0; i < 10; i++) {
            const dy = i * 12 + 5;
            g.fillEllipse(wx + Phaser.Math.Between(-2, 2), wy + dy, Phaser.Math.Between(2, 6), Phaser.Math.Between(2, 4));
        }
        g.fillStyle(0x3a5a6a, 0.4);
        g.fillRect(wx - 8, wy - 3, 16, 6);
        g.fillStyle(0x3a5a6a, 0.3);
        g.fillRect(wx - 6, wy + 115, 12, 15);
        g.setDepth(4);
        this.waterfallGfx = g;
    }

    private buildWallsAndBoundaries(): void {
        const boundaries = [
            { x: MAP_W / 2, y: 5, w: MAP_W, h: 10 },
            { x: MAP_W / 2, y: MAP_H - 5, w: MAP_W, h: 10 },
            { x: 5, y: MAP_H / 2, w: 10, h: MAP_H },
            { x: MAP_W - 5, y: MAP_H / 2, w: 10, h: MAP_H },
        ];
        for (const b of boundaries) {
            this.addWall(`boundary_${b.x}_${b.y}`, b.x, b.y, b.w, b.h);
        }

        const innerWalls = [
            { x: 1500, y: 300, w: 100, h: 20 },
            { x: 1500, y: 1300, w: 100, h: 20 },
            { x: 2400, y: 250, w: 200, h: 20 },
            { x: 2400, y: 1250, w: 200, h: 20 },
            { x: 3200, y: 300, w: 150, h: 20 },
            { x: 3200, y: 1200, w: 150, h: 20 },
            { x: 3800, y: 280, w: 200, h: 20 },
            { x: 3800, y: 1220, w: 200, h: 20 },
            { x: 4600, y: 300, w: 200, h: 20 },
            { x: 4600, y: 1200, w: 200, h: 20 },
            { x: 5200, y: 280, w: 150, h: 20 },
            { x: 5200, y: 1220, w: 150, h: 20 },
        ];
        for (const w of innerWalls) {
            this.addWall(`inner_${w.x}_${w.y}`, w.x, w.y, w.w, w.h);
        }
    }

    private buildStoryProps(): void {
        const propConfigs: InteractablePropConfig[] = [
            {
                id: "huge_footprint",
                x: 2100, y: 850,
                width: 35, height: 25,
                promptText: "[E] Examine footprint",
                dialogueId: "huge_footprint",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x3a3a2a, 0.5);
                    g.fillEllipse(0, 4, 14, 24);
                    g.fillEllipse(12, 4, 14, 24);
                    g.fillEllipse(0, -8, 10, 16);
                    g.fillEllipse(12, -8, 10, 16);
                    g.lineStyle(1, 0x2a2a1a, 0.3);
                    g.strokeEllipse(0, 4, 14, 24);
                    g.strokeEllipse(12, 4, 14, 24);
                },
                depth: 5,
            },
            {
                id: "broken_helmet",
                x: 2500, y: 780,
                width: 22, height: 18,
                promptText: "[E] Examine helmet",
                dialogueId: "broken_helmet",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x8a7a5a, 1);
                    g.fillCircle(0, 0, 8);
                    g.lineStyle(2, 0x6a5a4a, 0.8);
                    g.strokeCircle(0, 0, 8);
                    g.fillStyle(0x7a6a4a, 0.5);
                    g.fillRect(-3, 4, 6, 6);
                    g.lineStyle(1, 0x5a4a3a, 0.4);
                    g.strokeRect(-3, 4, 6, 6);
                },
                depth: 5,
            },
            {
                id: "warning_tablet",
                x: 3400, y: 660,
                width: 30, height: 24,
                promptText: "[E] Read tablet",
                dialogueId: "warning_tablet",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x7a7a6a, 1);
                    g.fillRect(-14, -11, 28, 22);
                    g.lineStyle(1, 0x5a5a4a, 0.7);
                    g.strokeRect(-14, -11, 28, 22);
                    g.fillStyle(0x6a6a5a, 0.8);
                    g.fillRect(-10, -7, 20, 2);
                    g.fillRect(-10, -3, 16, 2);
                    g.fillRect(-10, 1, 20, 2);
                    g.fillRect(-10, 5, 12, 2);
                },
                depth: 5,
            },
            {
                id: "dead_campfire",
                x: 3900, y: 790,
                width: 25, height: 20,
                promptText: "[E] Examine campfire",
                dialogueId: "dead_campfire",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x4a3a2a, 1);
                    for (let i = 0; i < 4; i++) {
                        const angle = (i / 4) * Math.PI * 2 + 0.3;
                        const rx = Math.cos(angle) * 7;
                        const ry = Math.sin(angle) * 7;
                        g.fillRect(rx - 1.5, ry - 4, 3, 8);
                    }
                    g.fillStyle(0x333333, 0.6);
                    g.fillCircle(0, 0, 4);
                    g.fillStyle(0x444444, 0.4);
                    g.fillCircle(-2, 1, 2);
                    g.fillCircle(2, -1, 1.5);
                },
                depth: 5,
            },
            {
                id: "destroyed_wagon",
                x: 4300, y: 820,
                width: 40, height: 28,
                promptText: "[E] Examine wagon",
                dialogueId: "destroyed_wagon",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x6a4a2a, 1);
                    g.fillRect(-18, -10, 36, 16);
                    g.lineStyle(1, 0x4a2a1a, 0.8);
                    g.strokeRect(-18, -10, 36, 16);
                    g.fillStyle(0x5a3a1a, 1);
                    g.fillCircle(-10, 10, 4);
                    g.fillCircle(10, 10, 4);
                    g.lineStyle(1, 0x3a1a0a, 0.6);
                    g.strokeCircle(-10, 10, 4);
                    g.strokeCircle(10, 10, 4);
                    g.fillStyle(0x8a6a3a, 1);
                    g.fillRect(-22, -14, 6, 10);
                    g.fillRect(16, -14, 6, 10);
                    g.fillStyle(0x7a5a3a, 0.5);
                    g.fillRect(-14, -8, 28, 2);
                },
                depth: 5,
            },
            {
                id: "claw_marks",
                x: 4600, y: 700,
                width: 30, height: 25,
                promptText: "[E] Examine marks",
                dialogueId: "claw_marks",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.lineStyle(2, 0x3a3a2a, 0.5);
                    g.lineBetween(-8, -10, -6, 10);
                    g.lineBetween(-2, -10, 0, 10);
                    g.lineBetween(4, -10, 6, 10);
                    g.lineStyle(1, 0x2a2a1a, 0.3);
                    g.lineBetween(-9, -11, -7, 11);
                    g.lineBetween(-3, -11, -1, 11);
                    g.lineBetween(3, -11, 5, 11);
                },
                depth: 5,
            },
            {
                id: "massive_handprint",
                x: 5200, y: 680,
                width: 35, height: 28,
                promptText: "[E] Examine handprint",
                dialogueId: "massive_handprint",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x3a3a2a, 0.45);
                    g.fillCircle(0, -5, 8);
                    g.fillRect(-3, 3, 6, 10);
                    g.fillRect(-7, 7, 4, 7);
                    g.fillRect(3, 7, 4, 7);
                    g.lineStyle(1, 0x2a2a1a, 0.3);
                    g.strokeCircle(0, -5, 8);
                },
                depth: 5,
            },
            {
                id: "half_eaten_supplies",
                x: 5400, y: 770,
                width: 28, height: 22,
                promptText: "[E] Examine supplies",
                dialogueId: "half_eaten_supplies",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x6a4a2a, 1);
                    g.fillRect(-10, -8, 20, 16);
                    g.lineStyle(1, 0x5a3a1a, 0.7);
                    g.strokeRect(-10, -8, 20, 16);
                    g.fillStyle(0x4a3a2a, 0.6);
                    g.fillRect(-6, -4, 8, 8);
                    g.fillStyle(0x7a6a4a, 0.5);
                    g.fillCircle(4, 0, 3);
                    g.lineStyle(1, 0x3a2a1a, 0.4);
                    g.beginPath();
                    g.moveTo(-2, -6);
                    g.lineTo(2, -2);
                    g.lineTo(-1, 2);
                    g.strokePath();
                },
                depth: 5,
            },
        ];

        for (const config of propConfigs) {
            const prop = new InteractableProp(this, config);
            this.mountainProps.push(prop);
        }
    }

    private buildTorchProps(): void {
        const torchPositions = [
            { x: 3300, y: 650 }, { x: 3700, y: 650 },
            { x: 4100, y: 680 }, { x: 4500, y: 690 },
            { x: 5000, y: 680 }, { x: 5300, y: 660 },
            { x: 5550, y: 650 },
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

    private buildCampfire(): void {
        const cx = 1000;
        const cy = 750;
        this.campfirePos = { x: cx, y: cy };

        const g = this.add.graphics();
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

    private setupAtmosphere(): void {
        const fog = this.add.graphics();
        fog.fillStyle(0x0a0a0a, 0);
        fog.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        fog.setScrollFactor(0);
        fog.setDepth(950);
        this.fogOverlay = fog;
    }

    private setupPhysics(): void {
        const playerConfig: IPlayerConfig = {
            ...DEFAULT_PLAYER_CONFIG,
            camera: {
                lerpX: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_X,
                lerpY: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_Y,
                deadzoneWidth: WORLD_CONSTANTS.CAMERA.DEADZONE_WIDTH,
                deadzoneHeight: WORLD_CONSTANTS.CAMERA.DEADZONE_HEIGHT,
            },
        };

        this.player = new Player(this, PLAYER_SPAWN.x, PLAYER_SPAWN.y, playerConfig);
        if (!this.player) return;

        this.physics.world.setBounds(0, 0, MAP_W, MAP_H);
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
            worldBounds: { x: 0, y: 0, width: MAP_W, height: MAP_H },
            deadzoneWidth: 60,
            deadzoneHeight: 60,
            lookAheadFactor: 0.2,
            minZoom: 0.5,
            maxZoom: 1.5,
        });
    }

    private setupSystems(): void {
        this.interactionManager = InteractionManager.getInstance();
        this.dialogueManager = DialogueManager.getInstance();
        this.objectiveManager = ObjectiveManager.getInstance();
        this.checkpoints = CheckpointSystem.getInstance();

        this.interactionManager.initialize(this, this.player!);
        this.interactionManager.setOnInteractionCallback((target) => this.handleInteraction(target));
        this.dialogueManager.initialize(this);
        this.objectiveManager.initialize(this);
        this.checkpoints!.initialize(this);

        if (this.cameraManager && this.player) {
            this.debugOverlay = new DebugOverlay(this);
            this.debugOverlay.setCameraManager(this.cameraManager);
            this.debugOverlay.setPlayer(this.player);
        }
    }

    private setupCheckpoints(): void {
        this.checkpoints?.registerCheckpoint(
            "mountain_pass_cave",
            "Cave Entrance",
            CAVE_ENTRANCE.x - 100,
            CAVE_ENTRANCE.y
        );
    }

    private registerInteractables(): void {
        for (const prop of this.mountainProps) {
            this.interactionManager?.register(prop);
        }

        const leverConfig: InteractablePropConfig = {
            id: "bridge_lever",
            x: 4780, y: 800,
            width: 20, height: 30,
            promptText: "[E] Pull lever",
            dialogueId: "bridge_lever",
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
        this.mountainProps.push(lever);
        this.interactionManager?.register(lever);
    }

    private startCinematic(): void {
        if (!this.cameraManager || !this.player) return;

        this.cinematicActive = true;
        this.playerControlEnabled = false;

        const cam = this.cameras.main;

        this.cameraManager.setZoom(0.7);
        cam.centerOn(FOREST_CLEARING.x, FOREST_CLEARING.y);

        const titleText = this.add.text(
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
        titleText.setOrigin(0.5);
        titleText.setScrollFactor(0);
        titleText.setDepth(1000);
        titleText.setAlpha(0);

        this.tweens.add({
            targets: titleText,
            alpha: 1,
            duration: 1000,
            ease: "Power2",
        });

        this.tweens.add({
            targets: titleText,
            alpha: 0,
            duration: 800,
            delay: 2500,
            ease: "Power2",
            onComplete: () => {
                titleText.destroy();
                this.endCinematic();
            },
        });
    }

    private endCinematic(): void {
        if (!this.cameraManager || !this.player) return;

        this.cameraManager.setZoom(WORLD_CONSTANTS.CAMERA.DEFAULT_ZOOM);
        this.cameraManager.follow(this.player);
        this.playerControlEnabled = true;
        this.cinematicActive = false;
        this.gameStarted = true;

        GameStateManager.getInstance().setState(GameState.PLAYING);
        this.objectiveManager?.setObjective("leave_forest", "Leave the forest clearing");
    }

    private handleInteraction(target: IInteractable): void {
        if (this.dialogueManager?.isActive()) return;

        if (target instanceof InteractableProp) {
            const id = target.getDialogueId();
            if (id === "bridge_lever") {
                this.handleLeverInteraction();
            } else {
                this.startPropDialogue(id);
            }
        }
    }

    private handleLeverInteraction(): void {
        if (this.bridgeLowered) {
            this.dialogueManager?.start({
                lines: [{ speaker: "Odysseus", text: "The bridge is already lowered." }],
            });
            return;
        }

        this.dialogueManager?.start({
            lines: [
                { speaker: "Odysseus", text: "An ancient lever mechanism. Still functional after all these years." },
                { speaker: "Odysseus", text: "It controls the bridge. I'll pull it." },
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

        this.cameras.main.shake(400, 0.006);

        this.objectiveManager?.completeObjective("cross_canyon");
        this.objectiveManager?.setObjective("reach_cave", "Reach the cave entrance");

        Logger.getInstance().log("[MountainPassScene] Bridge lowered");
    }

    private startPropDialogue(dialogueId: string): void {
        const dialogues: Record<string, { lines: Array<{ speaker: string; text: string }> }> = {
            huge_footprint: {
                lines: [
                    { speaker: "Odysseus", text: "A footprint... massive. Each toe is the size of my fist." },
                    { speaker: "Odysseus", text: "Whatever made this is enormous. And recent." },
                ],
            },
            broken_helmet: {
                lines: [
                    { speaker: "Odysseus", text: "A Greek helmet... crushed. The metal is folded like parchment." },
                    { speaker: "Odysseus", text: "The warrior wearing this didn't stand a chance." },
                ],
            },
            warning_tablet: {
                lines: [
                    { speaker: "Odysseus", text: "Ancient Greek script carved into stone... 'Beware the One-Eyed One.'" },
                    { speaker: "Odysseus", text: "'He devours all who cross his path. Flee while you still can.'" },
                    { speaker: "Odysseus", text: "A warning from those who came before us. Perhaps we should heed it." },
                ],
            },
            dead_campfire: {
                lines: [
                    { speaker: "Odysseus", text: "The ashes are cold. This fire has been dead for days." },
                    { speaker: "Odysseus", text: "Someone camped here... and left in a hurry. Scattered supplies." },
                ],
            },
            destroyed_wagon: {
                lines: [
                    { speaker: "Odysseus", text: "A supply wagon... torn apart. Not by teeth, but by hands. Huge hands." },
                    { speaker: "Odysseus", text: "The wood is splintered inward. Something ripped the sides apart to get inside." },
                ],
            },
            claw_marks: {
                lines: [
                    { speaker: "Odysseus", text: "Deep gouges in the stone. Three parallel lines, each as deep as my palm." },
                    { speaker: "Odysseus", text: "Claw marks. Whatever made these could tear through iron." },
                ],
            },
            massive_handprint: {
                lines: [
                    { speaker: "Odysseus", text: "A handprint pressed into the rock... each finger wider than my arm." },
                    { speaker: "Odysseus", text: "The stone itself is deformed. This creature is unlike anything I've faced." },
                ],
            },
            half_eaten_supplies: {
                lines: [
                    { speaker: "Odysseus", text: "Provisions, half-consumed. Bread and dried meat, scattered." },
                    { speaker: "Odysseus", text: "The bite marks are enormous. It eats... like a man. But far larger." },
                ],
            },
        };

        const data = dialogues[dialogueId];
        if (!data) return;

        this.dialogueManager?.start({ lines: data.lines });
    }

    private updateObjectives(): void {
        if (!this.player || !this.gameStarted) return;

        const px = this.player.x;

        if (!this.hasLeftForest && px > MOUNTAIN_TRAIL_START.x - 100) {
            this.hasLeftForest = true;
            this.objectiveManager?.completeObjective("leave_forest");
            this.objectiveManager?.setObjective("follow_trail", "Follow the mountain trail");
        }

        if (this.hasLeftForest && !this.hasReachedRuins && px > RUINS_CENTER.x - 150) {
            this.hasReachedRuins = true;
            this.objectiveManager?.completeObjective("follow_trail");
            this.objectiveManager?.setObjective("investigate_ruins", "Investigate the strange ruins");
        }

        if (this.hasReachedRuins && !this.hasReachedShrine && px > SHRINE_CENTER.x - 150) {
            this.hasReachedShrine = true;
            this.objectiveManager?.completeObjective("investigate_ruins");
            this.objectiveManager?.setObjective("continue_path", "Continue along the path");
        }

        if (this.hasReachedShrine && !this.hasReachedCanyon && px > CANYON_CENTER.x - 150) {
            this.hasReachedCanyon = true;
            this.objectiveManager?.completeObjective("continue_path");
            if (!this.bridgeLowered) {
                this.objectiveManager?.setObjective("cross_canyon", "Find a way across the canyon");
            }
        }

        if (!this.hasReachedCave && px > CAVE_ENTRANCE.x - 100) {
            this.hasReachedCave = true;
            this.objectiveManager?.completeObjective("reach_cave");
            this.checkpoints?.activateCheckpoint("mountain_pass_cave");

            GameStateManager.getInstance().setState(GameState.CUTSCENE);
            this.playerControlEnabled = false;

            const caveText = this.add.text(
                GAME_CONFIG.WIDTH / 2,
                GAME_CONFIG.HEIGHT / 2 - 40,
                "The Cave of the Cyclops",
                {
                    fontSize: "28px",
                    color: "#cc4444",
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
                    SceneTransitionManager.getInstance().transitionTo("CaveScene", {
                        fadeDuration: 800,
                    });
                },
            });
        }
    }

    private updateAtmosphere(delta: number): void {
        if (!this.player || !this.fogOverlay) return;

        const px = this.player.x;

        let fogIntensity = 0;
        if (px > 4500) {
            fogIntensity = Math.min((px - 4500) / 1200, 0.4);
        }
        if (px > 5400) {
            fogIntensity = Math.min(0.4 + (px - 5400) / 400 * 0.15, 0.55);
        }

        this.fogOverlay.clear();
        if (fogIntensity > 0.01) {
            this.fogOverlay.fillStyle(0x0a0a0a, fogIntensity);
            this.fogOverlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);
        }

        if (px > 3500) {
            this.particleTimer += delta;
            if (this.particleTimer > 100) {
                this.particleTimer = 0;
                if (!this.particleGraphics) {
                    this.particleGraphics = this.add.graphics();
                    this.particleGraphics.setScrollFactor(1);
                    this.particleGraphics.setDepth(951);
                }
                this.particleGraphics.clear();
                const particleCount = px > 5200 ? 12 : 8;
                for (let i = 0; i < particleCount; i++) {
                    const wx = px + Phaser.Math.Between(-400, 400);
                    const wy = Phaser.Math.Between(0, GAME_CONFIG.HEIGHT);
                    const worldPx = wx;
                    const s = Phaser.Math.Between(1, 3);
                    this.particleGraphics.fillStyle(0x888877, 0.08 + Math.random() * 0.12);
                    this.particleGraphics.fillCircle(worldPx - this.cameras.main.scrollX, wy, s);
                }

                this.windTimer += delta;
                if (this.windTimer > 150) {
                    this.windTimer = 0;
                    for (let i = 0; i < 2; i++) {
                        const wy2 = Phaser.Math.Between(100, GAME_CONFIG.HEIGHT - 100);
                        const wx2 = Phaser.Math.Between(-50, GAME_CONFIG.WIDTH + 50);
                        const len = Phaser.Math.Between(25, 60);
                        this.particleGraphics.lineStyle(1, 0xaaaacc, 0.06 + Math.random() * 0.05);
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

        for (let i = 0; i < this.torchGraphics.length; i++) {
            const g = this.torchGraphics[i];
            if (g) {
                const flicker = 0.8 + Math.random() * 0.2;
                g.setAlpha(flicker);
            }
        }

        if (this.waterfallGfx) {
            this.waterfallTimer += delta;
            if (this.waterfallTimer > 200) {
                this.waterfallTimer = 0;
                const wx = CAVE_ENTRANCE.x - 90;
                const wy = CAVE_ENTRANCE.y - 40;
                this.waterfallGfx.clear();
                this.waterfallGfx.fillStyle(0x4a7a8a, 0.5);
                this.waterfallGfx.fillRect(wx - 3, wy, 6, 120);
                this.waterfallGfx.fillStyle(0x6aaacc, 0.3);
                this.waterfallGfx.fillRect(wx - 1, wy + 5, 2, 110);
                for (let i = 0; i < 8; i++) {
                    const dy = i * 15 + Phaser.Math.Between(0, 5);
                    this.waterfallGfx.fillStyle(0x88ccdd, 0.15 + Math.random() * 0.15);
                    this.waterfallGfx.fillEllipse(
                        wx + Phaser.Math.Between(-3, 3),
                        wy + dy,
                        Phaser.Math.Between(2, 5),
                        Phaser.Math.Between(2, 4)
                    );
                }
                this.waterfallGfx.fillStyle(0x3a5a6a, 0.4);
                this.waterfallGfx.fillRect(wx - 8, wy - 3, 16, 6);
                this.waterfallGfx.fillStyle(0x3a5a6a, 0.3);
                this.waterfallGfx.fillRect(wx - 6, wy + 115, 12, 15);
                this.waterfallGfx.setDepth(4);
            }
        }
    }

    private updateCampfireFlicker(delta: number): void {
        if (!this.campfireGraphics) return;
        const cx = this.campfirePos.x;
        const cy = this.campfirePos.y;
        this.campfireFlickerTimer += delta;
        if (this.campfireFlickerTimer > 120) {
            this.campfireFlickerTimer = 0;
            const g = this.campfireGraphics;
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

    private addWall(id: string, x: number, y: number, w: number, h: number): void {
        const wall = new WorldObject({
            scene: this,
            id,
            type: "wall",
            x,
            y,
            width: w,
            height: h,
            color: 0x3a3a2a,
            alpha: 0,
            isCollidable: true,
        });
        wall.setDepth(0);
        this.worldObjects.push(wall);
        this.collisionManager?.addObject(wall);
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

    private placeBrokenColumn(cx: number, cy: number, fallen: boolean): void {
        const g = this.add.graphics();
        if (fallen) {
            g.fillStyle(0x8a8a7a, 1);
            g.fillRect(cx - 16, cy - 3, 32, 6);
            g.lineStyle(1, 0x6a6a5a, 0.6);
            g.strokeRect(cx - 16, cy - 3, 32, 6);
            g.fillStyle(0x9a9a8a, 1);
            g.fillCircle(cx - 14, cy, 3);
            g.fillCircle(cx + 14, cy, 3);
        } else {
            g.fillStyle(0x8a8a7a, 1);
            g.fillRect(cx - 5, cy - 14, 10, 28);
            g.lineStyle(1, 0x6a6a5a, 0.6);
            g.strokeRect(cx - 5, cy - 14, 10, 28);
            g.fillStyle(0x9a9a8a, 1);
            g.fillRect(cx - 7, cy - 16, 14, 4);
            g.fillRect(cx - 7, cy + 12, 14, 4);
        }
        g.setDepth(3);
        this.terrainGraphics.push(g);
    }

    update(time: number, delta: number): void {
        InputManager.getInstance().update();

        if (this.cinematicActive) {
            return;
        }

        if (this.player && this.playerControlEnabled) {
            this.player.update(time, delta);
        }

        this.updateObjectives();

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
        this.objectiveManager?.update(delta);
        this.hud?.update(this.player);
        this.updateAtmosphere(delta);
        this.updateCampfireFlicker(delta);

        if (this.debugOverlay) {
            this.debugOverlay.update(time, delta);
        }
    }
}
