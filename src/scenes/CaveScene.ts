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
import { Sheep } from "../entities/world/Sheep";
import { Crate } from "../entities/world/Crate";
import { LightableTorch } from "../entities/world/LightableTorch";
import { StoneGate } from "../entities/world/StoneGate";

const CAVE_W = 4500;
const CAVE_H = 2200;

const ENTRANCE_CENTER = { x: 250, y: 200 };
const SHEEP_PEN_CENTER = { x: 600, y: 900 };
const STORAGE_CENTER = { x: 1200, y: 1000 };
const COLLAPSED_PASSAGE_CENTER = { x: 1800, y: 900 };
const BONE_CHAMBER_CENTER = { x: 2400, y: 800 };
const FIRE_PIT_CENTER = { x: 3000, y: 900 };
const SLEEPING_CHAMBER_CENTER = { x: 3600, y: 700 };
const BOSS_ARENA_CENTER = { x: 4100, y: 1000 };

export default class CaveScene extends Phaser.Scene {
    private player: Player | null = null;
    private cameraManager: CameraManager | null = null;
    private debugOverlay: DebugOverlay | null = null;
    private collisionManager: CollisionManager | null = null;
    private interactionManager: InteractionManager | null = null;
    private dialogueManager: DialogueManager | null = null;
    private objectiveManager: ObjectiveManager | null = null;
    private checkpoints: CheckpointSystem | null = null;
    private crewNPCs: CrewNPC[] = [];
    private caveProps: InteractableProp[] = [];
    private worldObjects: WorldObject[] = [];
    private terrainGraphics: Phaser.GameObjects.Graphics[] = [];
    private torchGraphics: Phaser.GameObjects.Graphics[] = [];
    private fogOverlay: Phaser.GameObjects.Graphics | null = null;
    private particleGraphics: Phaser.GameObjects.Graphics | null = null;
    private crateObjects: Crate[] = [];
    private lightableTorches: LightableTorch[] = [];
    private stoneGate: StoneGate | null = null;
    private collapsedBlockage: WorldObject[] = [];
    private frightenedCrew: CrewNPC | null = null;
    private sheepList: Sheep[] = [];
    private gameStarted: boolean = false;
    private crewFound: boolean = false;
    private crateMoved: boolean = false;
    private gateOpened: boolean = false;
    private bossArenaReached: boolean = false;
    private campfireG: Phaser.GameObjects.Graphics | null = null;
    private campfirePos: { x: number; y: number } = { x: 0, y: 0 };
    private campfireFlickerTimer: number = 0;
    private arenaGateObjs: WorldObject[] = [];
    private gateBlockingWalls: WorldObject[] = [];
    private rumblingTimer: number = 0;
    private reachableDeepChamber: boolean = false;
    private dustParticles: Array<{ x: number; y: number; vx: number; vy: number; alpha: number; size: number }> = [];
    private fallingPebbles: Array<{ x: number; y: number; vy: number; size: number; color: number }> = [];
    private pebbleGraphics: Phaser.GameObjects.Graphics | null = null;
    private pebbleTimer: number = 0;

    constructor() {
        super({ key: "CaveScene" });
    }

    create(): void {
        this.dustParticles = [];
        this.fallingPebbles = [];
        this.pebbleGraphics = null;
        this.pebbleTimer = 0;
        this.cameras.main.setBackgroundColor(0x0a0a0a);
        this.cameras.main.fadeIn(1000, 0, 0, 0);
        Logger.getInstance().log("CaveScene started");

        GameStateManager.getInstance().setState(GameState.CUTSCENE);
        SceneTransitionManager.getInstance().initialize(this);

        InputManager.getInstance().initialize(this, {
            bindingsProfile: InputContext.createFilteredBindings(InputContext.GAMEPLAY),
        });

        CombatManager.getInstance().initialize();

        this.collisionManager = CollisionManager.getInstance();
        this.collisionManager.initialize(this);

        this.buildCaveTerrain();
        this.buildChambers();
        this.buildWallsAndBoundaries();
        this.buildPuzzles();
        this.buildNPCsAndSheep();
        this.buildBossArena();
        this.buildCaveStoryProps();
        this.setupAtmosphere();
        this.setupPhysics();
        this.setupCamera();
        this.setupSystems();
        this.setupCheckpoints();
        this.openCaveEntrance();
    }

    private buildCaveTerrain(): void {
        const floor = this.add.graphics();
        floor.fillStyle(0x1a1a1a, 1);
        floor.fillRect(0, 0, CAVE_W, CAVE_H);
        floor.setDepth(-10);
        this.terrainGraphics.push(floor);

        const stoneTexture = this.add.graphics();
        stoneTexture.fillStyle(0x222222, 0.3);
        for (let i = 0; i < 120; i++) {
            const sx = Phaser.Math.Between(0, CAVE_W);
            const sy = Phaser.Math.Between(0, CAVE_H);
            stoneTexture.fillRect(sx, sy, Phaser.Math.Between(20, 60), Phaser.Math.Between(10, 30));
        }
        stoneTexture.setDepth(-9);
        this.terrainGraphics.push(stoneTexture);

        const dampPatches = this.add.graphics();
        dampPatches.fillStyle(0x1a2a2a, 0.2);
        for (let i = 0; i < 40; i++) {
            const dx = Phaser.Math.Between(0, CAVE_W);
            const dy = Phaser.Math.Between(0, CAVE_H);
            dampPatches.fillCircle(dx, dy, Phaser.Math.Between(15, 45));
        }
        dampPatches.setDepth(-9);
        this.terrainGraphics.push(dampPatches);
    }

    private buildChambers(): void {
        this.buildEntranceChamber();
        this.buildNarrowTunnel();
        this.buildSheepPen();
        this.buildStorageChamber();
        this.buildCollapsedPassage();
        this.buildBoneChamber();
        this.buildFirePit();
        this.buildSleepingChamber();
        this.buildConnectingTunnels();
    }

    private buildEntranceChamber(): void {
        const g = this.add.graphics();
        const cx = ENTRANCE_CENTER.x;
        const cy = ENTRANCE_CENTER.y;

        g.fillStyle(0x1e1e1e, 1);
        g.fillCircle(cx, cy, 200);
        g.fillStyle(0x222222, 0.5);
        g.fillCircle(cx, cy, 150);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const wallG = this.add.graphics();
        wallG.fillStyle(0x3a3a2a, 1);
        for (let i = 0; i < 12; i++) {
            const angle = (i / 12) * Math.PI * 2;
            const wx = cx + Math.cos(angle) * 200;
            const wy = cy + Math.sin(angle) * 200;
            wallG.fillRect(wx - 12, wy - 8, 24, 16);
        }
        wallG.setDepth(-7);
        this.terrainGraphics.push(wallG);

        const archG = this.add.graphics();
        archG.fillStyle(0x1a1a1a, 1);
        archG.beginPath();
        archG.moveTo(cx - 40, cy - 190);
        archG.lineTo(cx - 30, cy - 140);
        archG.lineTo(cx + 30, cy - 140);
        archG.lineTo(cx + 40, cy - 190);
        archG.closePath();
        archG.fillPath();
        archG.lineStyle(3, 0x5a4a3a, 0.8);
        archG.beginPath();
        archG.moveTo(cx - 42, cy - 192);
        archG.lineTo(cx - 32, cy - 140);
        archG.lineTo(cx + 32, cy - 140);
        archG.lineTo(cx + 42, cy - 192);
        archG.strokePath();
        archG.setDepth(-6);
        this.terrainGraphics.push(archG);

        const glow = this.add.graphics();
        glow.fillStyle(0x444466, 0.15);
        glow.fillCircle(cx, cy - 170, 40);
        glow.setDepth(-5);
        this.terrainGraphics.push(glow);

        this.placePillar(cx - 60, cy - 160, 12, 50);
        this.placePillar(cx + 60, cy - 160, 12, 50);
    }

    private buildNarrowTunnel(): void {
        const g = this.add.graphics();
        const startX = ENTRANCE_CENTER.x;
        const startY = ENTRANCE_CENTER.y + 150;

        g.fillStyle(0x1a1a1a, 1);
        g.beginPath();
        g.moveTo(startX - 50, startY);
        g.lineTo(startX + 50, startY);
        g.lineTo(startX + 60, startY + 100);
        g.lineTo(startX + 70, startY + 200);
        g.lineTo(startX + 80, startY + 300);
        g.lineTo(startX + 90, startY + 400);
        g.lineTo(startX + 150, startY + 500);
        g.lineTo(startX + 250, startY + 550);
        g.lineTo(startX + 350, startY + 570);
        g.lineTo(startX + 380, startY + 600);
        g.lineTo(startX + 360, startY + 680);
        g.lineTo(startX + 300, startY + 720);
        g.lineTo(startX + 200, startY + 730);
        g.lineTo(startX + 100, startY + 720);
        g.lineTo(startX + 50, startY + 700);
        g.lineTo(startX + 30, startY + 650);
        g.lineTo(startX - 20, startY + 620);
        g.lineTo(startX - 60, startY + 580);
        g.lineTo(startX - 50, startY + 500);
        g.lineTo(startX - 40, startY + 400);
        g.lineTo(startX - 30, startY + 300);
        g.lineTo(startX - 20, startY + 200);
        g.lineTo(startX - 10, startY + 100);
        g.closePath();
        g.fillPath();
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const tunnelWallsData = [
            { x: startX - 55, y: 350, w: 20, h: 500 },
            { x: startX + 55, y: 350, w: 20, h: 500 },
            { x: 250, y: 700, w: 200, h: 20 },
            { x: 150, y: 720, w: 120, h: 20 },
        ];
        for (const w of tunnelWallsData) {
            this.addWall(`tunnel_${w.x}_${w.y}`, w.x, w.y, w.w, w.h);
        }

        this.placeWallTorch(startX, 280);
        this.placeWallTorch(startX, 420);
        this.placeWallTorch(startX + 20, 560);
        this.placeWallTorch(150, 680);
    }

    private buildSheepPen(): void {
        const g = this.add.graphics();
        const cx = SHEEP_PEN_CENTER.x;
        const cy = SHEEP_PEN_CENTER.y;

        g.fillStyle(0x2a2a1e, 1);
        g.fillCircle(cx, cy, 150);
        g.fillStyle(0x222218, 1);
        g.fillRect(cx - 140, cy - 120, 280, 240);

        g.fillStyle(0x3a3a1a, 0.3);
        for (let i = 0; i < 20; i++) {
            const sx2 = cx + Phaser.Math.Between(-120, 120);
            const sy2 = cy + Phaser.Math.Between(-100, 100);
            g.fillRect(sx2, sy2, Phaser.Math.Between(6, 15), Phaser.Math.Between(2, 4));
        }
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const fenceG = this.add.graphics();
        fenceG.lineStyle(4, 0x5a4a3a, 1);
        const fenceRadius = 140;
        for (let i = 0; i < 20; i++) {
            const a1 = (i / 20) * Math.PI * 2;
            const a2 = ((i + 1) / 20) * Math.PI * 2;
            const fx1 = cx + Math.cos(a1) * fenceRadius;
            const fy1 = cy + Math.sin(a1) * fenceRadius;
            const fx2 = cx + Math.cos(a2) * fenceRadius;
            const fy2 = cy + Math.sin(a2) * fenceRadius;
            fenceG.lineBetween(fx1, fy1, fx2, fy2);
        }
        fenceG.lineStyle(3, 0x6a5a4a, 0.8);
        for (let i = 0; i < 10; i++) {
            const a = (i / 10) * Math.PI * 2;
            const px = cx + Math.cos(a) * fenceRadius;
            const py = cy + Math.sin(a) * fenceRadius;
            fenceG.fillRect(px - 2, py - 6, 4, 12);
        }
        fenceG.setDepth(-6);
        this.terrainGraphics.push(fenceG);

        const gateGap = this.add.graphics();
        gateGap.fillStyle(0x2a2a1e, 1);
        gateGap.fillRect(cx + 130, cy - 15, 30, 30);
        gateGap.setDepth(-7);
        this.terrainGraphics.push(gateGap);

        this.placePenTorch(cx - 100, cy - 80);
        this.placePenTorch(cx + 100, cy - 80);
        this.placePenTorch(cx - 100, cy + 80);
        this.placePenTorch(cx + 100, cy + 80);
    }

    private buildStorageChamber(): void {
        const g = this.add.graphics();
        const cx = STORAGE_CENTER.x;
        const cy = STORAGE_CENTER.y;

        g.fillStyle(0x1e1a1a, 1);
        g.fillRect(cx - 180, cy - 120, 360, 240);
        g.fillStyle(0x222222, 0.3);
        g.fillRect(cx - 170, cy - 110, 340, 220);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const wallG = this.add.graphics();
        wallG.fillStyle(0x3a3a2a, 1);
        wallG.fillRect(cx - 185, cy - 125, 370, 8);
        wallG.fillRect(cx - 185, cy + 117, 370, 8);
        wallG.fillRect(cx - 185, cy - 125, 8, 250);
        wallG.fillRect(cx + 177, cy - 125, 8, 250);
        wallG.setDepth(-7);
        this.terrainGraphics.push(wallG);

        this.placeBrokenCart(cx + 60, cy - 20);
        this.placeFoodBarrel(cx - 40, cy - 60);
        this.placeFoodBarrel(cx + 20, cy + 50);
        this.placeFoodBarrel(cx - 100, cy + 60);
        this.placeGreekWeapon(cx + 120, cy - 70);
        this.placeWallTorch(cx - 150, cy - 60);
        this.placeWallTorch(cx + 150, cy + 60);
    }

    private buildCollapsedPassage(): void {
        const g = this.add.graphics();
        const cx = COLLAPSED_PASSAGE_CENTER.x;
        const cy = COLLAPSED_PASSAGE_CENTER.y;

        g.fillStyle(0x1a1a1a, 1);
        g.fillRect(cx - 120, cy - 140, 240, 280);
        g.fillStyle(0x222222, 0.3);
        g.fillRect(cx - 110, cy - 130, 220, 260);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const rocksG = this.add.graphics();
        rocksG.fillStyle(0x4a4a3a, 1);
        for (let i = 0; i < 15; i++) {
            const rx = cx + Phaser.Math.Between(-40, 40);
            const ry = cy + Phaser.Math.Between(-20, 50);
            rocksG.fillRect(rx, ry, Phaser.Math.Between(12, 25), Phaser.Math.Between(8, 16));
        }
        rocksG.fillStyle(0x3a3a2a, 1);
        for (let i = 0; i < 8; i++) {
            const rx = cx + Phaser.Math.Between(-35, 35);
            const ry = cy + Phaser.Math.Between(-15, 45);
            rocksG.fillCircle(rx, ry, Phaser.Math.Between(5, 10));
        }
        rocksG.setDepth(4);
        this.terrainGraphics.push(rocksG);

        const crateX = cx - 70;
        const crateY = cy + 10;
        const crate = new Crate({
            scene: this,
            x: crateX,
            y: crateY,
            width: 28,
            height: 28,
            pushRange: 50,
        });
        this.crateObjects.push(crate);
        this.worldObjects.push(crate.worldObject);
        this.collisionManager?.addObject(crate.worldObject);

        const rubbleBlock = new WorldObject({
            scene: this,
            id: "rubble_block",
            type: "wall",
            x: cx + 30,
            y: cy,
            width: 50,
            height: 80,
            color: 0x4a4a3a,
            alpha: 0,
            isCollidable: true,
        });
        rubbleBlock.setDepth(0);
        this.collapsedBlockage.push(rubbleBlock);
        this.worldObjects.push(rubbleBlock);
        this.collisionManager?.addObject(rubbleBlock);

        this.placePillar(cx - 100, cy - 100, 10, 40);
        this.placePillar(cx + 100, cy + 100, 10, 40);
        this.placeWallTorch(cx - 100, cy - 50);
        this.placeWallTorch(cx + 100, cy + 50);
    }

    private buildBoneChamber(): void {
        const g = this.add.graphics();
        const cx = BONE_CHAMBER_CENTER.x;
        const cy = BONE_CHAMBER_CENTER.y;

        g.fillStyle(0x1e1a1a, 1);
        g.fillCircle(cx, cy, 160);
        g.fillStyle(0x222222, 0.4);
        g.fillCircle(cx, cy, 120);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const wallG = this.add.graphics();
        wallG.fillStyle(0x3a3a3a, 1);
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 + 0.2;
            const wx = cx + Math.cos(angle) * 155;
            const wy = cy + Math.sin(angle) * 155;
            wallG.fillRect(wx - 14, wy - 8, 28, 16);
        }
        wallG.setDepth(-7);
        this.terrainGraphics.push(wallG);

        this.placeBonePile(cx - 60, cy - 30);
        this.placeBonePile(cx + 50, cy + 20);
        this.placeSkullPile(cx + 10, cy - 50);
        this.placeLargeHandprint(cx - 80, cy - 90, false);
        this.placeLargeHandprint(cx + 70, cy - 80, true);
        this.placeChains(cx - 100, cy + 40);
        this.placeChains(cx + 90, cy + 60);
        this.placeDestroyedShield(cx - 30, cy + 70);
        this.placeDestroyedShield(cx + 100, cy - 40);

        this.placeWallTorch(cx - 130, cy - 60);
        this.placeWallTorch(cx + 130, cy + 60);
        this.placeWallTorch(cx - 100, cy + 90);
        this.placeWallTorch(cx + 100, cy - 90);

    }

    private buildFirePit(): void {
        const g = this.add.graphics();
        const cx = FIRE_PIT_CENTER.x;
        const cy = FIRE_PIT_CENTER.y;

        g.fillStyle(0x1a1a1a, 1);
        g.fillCircle(cx, cy, 160);
        g.fillStyle(0x1a1a12, 1);
        g.fillRect(cx - 155, cy - 140, 310, 280);
        g.fillStyle(0x222222, 0.3);
        g.fillCircle(cx, cy, 130);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const wallG = this.add.graphics();
        wallG.fillStyle(0x3a3a2a, 1);
        for (let i = 0; i < 10; i++) {
            const angle = (i / 10) * Math.PI * 2 + 0.15;
            const wx = cx + Math.cos(angle) * 155;
            const wy = cy + Math.sin(angle) * 155;
            wallG.fillRect(wx - 14, wy - 8, 28, 16);
        }
        wallG.setDepth(-7);
        this.terrainGraphics.push(wallG);

        this.buildCampfireInChamber(cx, cy + 20);

        this.placeFoodBarrel(cx - 80, cy + 90);
        this.placeFoodBarrel(cx + 70, cy - 100);
        this.placeGreekWeapon(cx + 90, cy + 80);
        this.placeDestroyedShield(cx - 90, cy - 80);
        this.placeChains(cx - 130, cy - 40);
        this.placeChains(cx + 120, cy + 30);

        this.placeWallTorch(cx - 140, cy - 80);
        this.placeWallTorch(cx + 140, cy + 80);
        this.placeWallTorch(cx - 120, cy + 90);
        this.placeWallTorch(cx + 120, cy - 90);

        const torch1 = new LightableTorch(this, "torch_puzzle_1", cx - 70, cy - 130);
        const torch2 = new LightableTorch(this, "torch_puzzle_2", cx + 70, cy - 130);
        this.lightableTorches.push(torch1, torch2);

        const gateX = cx + 155;
        const gateY = cy;
        this.stoneGate = new StoneGate(this, "stone_gate_firepit", gateX, gateY, 80, 120, ["torch_puzzle_1", "torch_puzzle_2"]);

        const gateWallL = new WorldObject({
            scene: this,
            id: "gate_block_l",
            type: "wall",
            x: gateX - 20,
            y: gateY,
            width: 40,
            height: 110,
            color: 0x3a3a2a,
            alpha: 0,
            isCollidable: true,
        });
        gateWallL.setDepth(0);
        this.gateBlockingWalls.push(gateWallL);
        this.worldObjects.push(gateWallL);
        this.collisionManager?.addObject(gateWallL);

        const gateWallR = new WorldObject({
            scene: this,
            id: "gate_block_r",
            type: "wall",
            x: gateX + 20,
            y: gateY,
            width: 40,
            height: 110,
            color: 0x3a3a2a,
            alpha: 0,
            isCollidable: true,
        });
        gateWallR.setDepth(0);
        this.gateBlockingWalls.push(gateWallR);
        this.worldObjects.push(gateWallR);
        this.collisionManager?.addObject(gateWallR);

        torch1.setOnLitCallback((torchId) => {
            this.stoneGate?.checkTorchLit(torchId, true);
            this.checkTorchPuzzle();
        });
        torch2.setOnLitCallback((torchId) => {
            this.stoneGate?.checkTorchLit(torchId, true);
            this.checkTorchPuzzle();
        });
    }

    private buildCampfireInChamber(cx: number, cy: number): void {
        this.campfirePos = { x: cx, y: cy };
        const g = this.add.graphics();
        g.fillStyle(0x5a3a1a, 1);
        for (let i = 0; i < 6; i++) {
            const angle = (i / 6) * Math.PI * 2;
            const rx = cx + Math.cos(angle) * 10;
            const ry = cy + Math.sin(angle) * 10;
            g.fillRect(rx - 2, ry - 8, 4, 16);
        }
        g.fillStyle(0xff6600, 0.9);
        g.fillCircle(cx, cy - 5, 8);
        g.fillStyle(0xffaa00, 0.8);
        g.fillCircle(cx, cy - 6, 5);
        g.fillStyle(0xffdd44, 0.7);
        g.fillCircle(cx, cy - 7, 3);
        this.campfireG = g;
        g.setDepth(6);
    }

    private buildSleepingChamber(): void {
        const g = this.add.graphics();
        const cx = SLEEPING_CHAMBER_CENTER.x;
        const cy = SLEEPING_CHAMBER_CENTER.y;

        g.fillStyle(0x1e1a1e, 1);
        g.fillCircle(cx, cy, 140);
        g.fillStyle(0x222222, 0.3);
        g.fillCircle(cx, cy, 110);
        g.setDepth(-8);
        this.terrainGraphics.push(g);

        const wallG = this.add.graphics();
        wallG.fillStyle(0x3a2a3a, 1);
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2 + 0.3;
            const wx = cx + Math.cos(angle) * 135;
            const wy = cy + Math.sin(angle) * 135;
            wallG.fillRect(wx - 14, wy - 8, 28, 16);
        }
        wallG.setDepth(-7);
        this.terrainGraphics.push(wallG);

        for (let i = 0; i < 4; i++) {
            const sx = cx + Phaser.Math.Between(-80, 80);
            const sy = cy + Phaser.Math.Between(-60, 60);
            this.placeSleepingMat(sx, sy);
        }

        this.placeWallTorch(cx - 110, cy - 60);
        this.placeWallTorch(cx + 110, cy + 60);
        this.placePillar(cx - 60, cy - 80, 8, 30);
        this.placePillar(cx + 60, cy + 80, 8, 30);
    }

    private buildConnectingTunnels(): void {
        const tunnelG = this.add.graphics();
        tunnelG.fillStyle(0x1a1a1a, 1);

        const paths = [
            { x1: 250, y1: 380, x2: 450, y2: 800, w: 80 },
            { x1: 450, y1: 800, x2: 600, y2: 900, w: 80 },
            { x1: 750, y1: 900, x2: 1100, y2: 1000, w: 100 },
            { x1: 1350, y1: 1000, x2: 1700, y2: 900, w: 90 },
            { x1: 2000, y1: 900, x2: 2250, y2: 800, w: 90 },
            { x1: 2550, y1: 800, x2: 2850, y2: 900, w: 100 },
            { x1: 3150, y1: 900, x2: 3450, y2: 700, w: 90 },
            { x1: 3750, y1: 700, x2: 3950, y2: 1000, w: 100 },
        ];

        for (const p of paths) {
            tunnelG.fillRect(
                Math.min(p.x1, p.x2) - p.w / 2,
                Math.min(p.y1, p.y2) - p.w / 2,
                Math.abs(p.x2 - p.x1) + p.w,
                Math.abs(p.y2 - p.y1) + p.w
            );
        }
        tunnelG.setDepth(-8);
        this.terrainGraphics.push(tunnelG);

        const tunnelWalls = [
            { x: 450, y: 580, w: 20, h: 450 },
            { x: 750, y: 850, w: 20, h: 120 },
            { x: 1100, y: 950, w: 100, h: 20 },
            { x: 1350, y: 1050, w: 200, h: 20 },
            { x: 1700, y: 980, w: 20, h: 100 },
            { x: 2000, y: 850, w: 20, h: 100 },
            { x: 2250, y: 750, w: 100, h: 20 },
            { x: 2550, y: 750, w: 20, h: 100 },
            { x: 2850, y: 950, w: 100, h: 20 },
            { x: 3150, y: 950, w: 20, h: 100 },
            { x: 3450, y: 650, w: 100, h: 20 },
            { x: 3750, y: 750, w: 20, h: 100 },
        ];
        for (const w of tunnelWalls) {
            this.addWall(`tunnel_conn_${w.x}_${w.y}`, w.x, w.y, w.w, w.h);
        }
    }

    private buildWallsAndBoundaries(): void {
        const boundaries = [
            { x: CAVE_W / 2, y: 10, w: CAVE_W, h: 20 },
            { x: CAVE_W / 2, y: CAVE_H - 10, w: CAVE_W, h: 20 },
            { x: 10, y: CAVE_H / 2, w: 20, h: CAVE_H },
            { x: CAVE_W - 10, y: CAVE_H / 2, w: 20, h: CAVE_H },
        ];
        for (const b of boundaries) {
            this.addWall(`boundary_${b.x}_${b.y}`, b.x, b.y, b.w, b.h);
        }

        const chamberWalls = [
            { x: 400, y: 200, w: 200, h: 20, comment: "above entrance" },
            { x: 400, y: 220, w: 20, h: 200 },
            { x: 100, y: 400, w: 20, h: 200 },
            { x: 200, y: 500, w: 100, h: 20 },
            { x: 350, y: 600, w: 20, h: 100 },
            { x: 500, y: 700, w: 100, h: 20 },
            { x: 600, y: 1050, w: 200, h: 20, comment: "below sheep pen" },
            { x: 400, y: 1050, w: 200, h: 20 },
            { x: 1300, y: 1120, w: 300, h: 20, comment: "below storage" },
            { x: 1100, y: 1120, w: 200, h: 20 },
            { x: 1900, y: 1000, w: 200, h: 20, comment: "below collapsed" },
            { x: 2300, y: 700, w: 20, h: 100, comment: "bone chamber walls" },
            { x: 2500, y: 700, w: 20, h: 100 },
            { x: 2300, y: 950, w: 200, h: 20 },
            { x: 2900, y: 750, w: 20, h: 200, comment: "fire pit walls" },
            { x: 3100, y: 750, w: 20, h: 200 },
            { x: 3000, y: 1060, w: 200, h: 20 },
            { x: 3500, y: 600, w: 20, h: 100, comment: "sleeping chamber walls" },
            { x: 3700, y: 600, w: 20, h: 100 },
            { x: 3600, y: 850, w: 200, h: 20 },
        ];
        for (const w of chamberWalls) {
            this.addWall(`chamber_${w.x}_${w.y}`, w.x, w.y, w.w, w.h);
        }
    }

    private buildPuzzles(): void {
    }

    private buildNPCsAndSheep(): void {
        const sheepBounds = {
            minX: SHEEP_PEN_CENTER.x - 110,
            maxX: SHEEP_PEN_CENTER.x + 110,
            minY: SHEEP_PEN_CENTER.y - 90,
            maxY: SHEEP_PEN_CENTER.y + 90,
        };
        for (let i = 0; i < 4; i++) {
            const sx = sheepBounds.minX + Phaser.Math.Between(20, 200);
            const sy = sheepBounds.minY + Phaser.Math.Between(20, 160);
            const sheep = new Sheep(this, sx, sy, sheepBounds);
            this.sheepList.push(sheep);
        }

        const crewConfig: CrewNPCConfig = {
            name: "Polites",
            x: FIRE_PIT_CENTER.x - 50,
            y: FIRE_PIT_CENTER.y + 60,
            color: 0xff8844,
            dialogueId: "frightened_crew",
            promptText: "[E] Talk",
        };
        this.frightenedCrew = new CrewNPC(this, crewConfig);
        this.crewNPCs.push(this.frightenedCrew);
    }

    private buildBossArena(): void {
        const cx = BOSS_ARENA_CENTER.x;
        const cy = BOSS_ARENA_CENTER.y;

        const arenaG = this.add.graphics();
        arenaG.fillStyle(0x1a1a1a, 1);
        arenaG.fillCircle(cx, cy, 280);
        arenaG.fillStyle(0x222222, 0.3);
        arenaG.fillCircle(cx, cy, 240);
        arenaG.setDepth(-8);
        this.terrainGraphics.push(arenaG);

        const ringG = this.add.graphics();
        ringG.lineStyle(4, 0x3a3a3a, 0.6);
        ringG.strokeCircle(cx, cy, 270);
        ringG.lineStyle(2, 0x4a4a3a, 0.3);
        ringG.strokeCircle(cx, cy, 260);
        ringG.setDepth(-7);
        this.terrainGraphics.push(ringG);

        const brokenColumns = [
            { x: cx - 180, y: cy - 120, fallen: false },
            { x: cx + 180, y: cy - 100, fallen: false },
            { x: cx - 150, y: cy + 120, fallen: true },
            { x: cx + 160, y: cy + 140, fallen: true },
            { x: cx - 80, y: cy - 190, fallen: false },
            { x: cx + 90, y: cy + 190, fallen: true },
        ];
        for (const col of brokenColumns) {
            this.placeBrokenColumn(col.x, col.y, col.fallen);
        }



        const arenaFire = this.add.graphics();
        const fx = cx;
        const fy = cy + 160;
        arenaFire.fillStyle(0x5a3a1a, 1);
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * Math.PI * 2;
            const rx = fx + Math.cos(angle) * 18;
            const ry = fy + Math.sin(angle) * 18;
            arenaFire.fillRect(rx - 3, ry - 10, 6, 20);
        }
        arenaFire.fillStyle(0xff6600, 0.9);
        arenaFire.fillCircle(fx, fy - 6, 12);
        arenaFire.fillStyle(0xffaa00, 0.8);
        arenaFire.fillCircle(fx, fy - 7, 8);
        arenaFire.fillStyle(0xffdd44, 0.7);
        arenaFire.fillCircle(fx, fy - 8, 5);
        this.terrainGraphics.push(arenaFire);

        const exitBoulderG = this.add.graphics();
        exitBoulderG.fillStyle(0x6a6a5a, 1);
        exitBoulderG.fillCircle(cx - 230, cy, 30);
        exitBoulderG.fillStyle(0x7a7a6a, 0.5);
        exitBoulderG.fillCircle(cx - 235, cy - 5, 12);
        exitBoulderG.fillCircle(cx - 220, cy + 5, 10);
        exitBoulderG.lineStyle(2, 0x5a5a4a, 0.4);
        exitBoulderG.strokeCircle(cx - 230, cy, 30);
        exitBoulderG.setDepth(4);

        this.arenaGateObjs = [];
        const gateWalls = [
            { x: cx + 140, y: cy, w: 20, h: 120 },
            { x: cx, y: cy + 140, w: 120, h: 20 },
            { x: cx, y: cy - 140, w: 120, h: 20 },
        ];
        for (const gw of gateWalls) {
            const w = new WorldObject({
                scene: this,
                id: `arena_gate_${gw.x}_${gw.y}`,
                type: "wall",
                x: gw.x,
                y: gw.y,
                width: gw.w,
                height: gw.h,
                color: 0x5a4a3a,
                alpha: 0,
                isCollidable: true,
            });
            w.setDepth(0);
            this.arenaGateObjs.push(w);
            this.worldObjects.push(w);
            this.collisionManager?.addObject(w);
        }

        const bossTriggerZone = this.add.zone(cx + 260, cy, 80, 160);
        bossTriggerZone.setDepth(10);
        this.physics.add.existing(bossTriggerZone, true);
    }

    private buildCaveStoryProps(): void {
        const propConfigs: InteractablePropConfig[] = [
            {
                id: "bones_small",
                x: BONE_CHAMBER_CENTER.x + 40,
                y: BONE_CHAMBER_CENTER.y + 20,
                width: 24,
                height: 18,
                promptText: "[E] Examine bones",
                dialogueId: "cave_bones",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0xccccbb, 1);
                    g.fillRect(-6, -4, 12, 8);
                    g.fillRect(-8, -2, 16, 4);
                    g.fillStyle(0xbbbbaa, 1);
                    g.fillCircle(0, 4, 3);
                    g.fillCircle(-4, -2, 2);
                    g.fillCircle(4, -2, 2);
                },
                depth: 5,
            },
            {
                id: "skulls",
                x: BONE_CHAMBER_CENTER.x - 30,
                y: BONE_CHAMBER_CENTER.y - 40,
                width: 20,
                height: 16,
                promptText: "[E] Examine skulls",
                dialogueId: "cave_skulls",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0xddddcc, 1);
                    g.fillCircle(0, 0, 7);
                    g.fillStyle(0x222222, 1);
                    g.fillCircle(-3, -2, 1.5);
                    g.fillCircle(3, -2, 1.5);
                    g.fillRect(-2, 2, 4, 3);
                    g.lineStyle(1, 0xbbbbaa, 0.5);
                    g.strokeCircle(0, 0, 7);
                },
                depth: 5,
            },
            {
                id: "large_handprints",
                x: BONE_CHAMBER_CENTER.x - 70,
                y: BONE_CHAMBER_CENTER.y - 90,
                width: 30,
                height: 24,
                promptText: "[E] Examine handprints",
                dialogueId: "cave_handprints",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x3a3a2a, 0.5);
                    g.fillCircle(0, -4, 6);
                    g.fillRect(-2, 2, 4, 8);
                    g.fillRect(-5, 6, 3, 6);
                    g.fillRect(2, 6, 3, 6);
                    g.lineStyle(1, 0x2a2a1a, 0.3);
                    g.strokeCircle(0, -4, 6);
                },
                depth: 5,
            },
            {
                id: "broken_chains",
                x: FIRE_PIT_CENTER.x - 120,
                y: FIRE_PIT_CENTER.y - 50,
                width: 20,
                height: 30,
                promptText: "[E] Examine chains",
                dialogueId: "cave_chains",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x888888, 1);
                    for (let i = 0; i < 4; i++) {
                        g.fillCircle(0, -12 + i * 8, 3);
                        g.fillRect(-0.5, -10 + i * 8, 4, 6);
                    }
                    g.lineStyle(1, 0x666666, 0.5);
                    g.strokeCircle(0, -12, 3);
                    g.strokeCircle(0, -4, 3);
                    g.strokeCircle(0, 4, 3);
                    g.strokeCircle(0, 12, 3);
                    g.fillStyle(0x666666, 1);
                    g.fillRect(-1, -12, 3, 24);
                },
                depth: 5,
            },
            {
                id: "destroyed_shield_prop",
                x: BONE_CHAMBER_CENTER.x + 90,
                y: BONE_CHAMBER_CENTER.y - 50,
                width: 22,
                height: 22,
                promptText: "[E] Examine shield",
                dialogueId: "cave_shield",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x8a7a5a, 1);
                    g.fillCircle(0, 0, 9);
                    g.lineStyle(2, 0x6a5a4a, 0.8);
                    g.strokeCircle(0, 0, 9);
                    g.fillStyle(0x6a5a4a, 0.6);
                    g.fillCircle(0, 0, 5);
                    g.fillStyle(0x8a7a5a, 0.5);
                    g.fillRect(-3, -10, 6, 20);
                    g.fillStyle(0x6a5a4a, 0.4);
                    g.fillRect(-5, -9, 2, 18);
                },
                depth: 5,
            },
            {
                id: "food_barrel_prop",
                x: STORAGE_CENTER.x - 30,
                y: STORAGE_CENTER.y - 60,
                width: 18,
                height: 22,
                promptText: "[E] Examine barrel",
                dialogueId: "cave_barrel",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x6a4a2a, 1);
                    g.fillRect(-8, -10, 16, 20);
                    g.lineStyle(1, 0x5a3a1a, 0.8);
                    g.strokeRect(-8, -10, 16, 20);
                    g.lineStyle(1, 0x5a3a1a, 0.6);
                    g.lineBetween(-8, -5, 8, -5);
                    g.lineBetween(-8, 5, 8, 5);
                    g.fillStyle(0x7a5a3a, 0.5);
                    g.fillCircle(0, 0, 3);
                    g.fillStyle(0x4a3a2a, 1);
                    g.fillRect(-6, -4, 12, 2);
                },
                depth: 5,
            },
            {
                id: "greek_weapon_prop",
                x: STORAGE_CENTER.x + 110,
                y: STORAGE_CENTER.y - 60,
                width: 20,
                height: 8,
                promptText: "[E] Examine weapon",
                dialogueId: "cave_weapon",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x6a4a2a, 1);
                    g.fillRect(-10, -1.5, 20, 3);
                    g.fillStyle(0x888888, 1);
                    g.fillTriangle(8, -3, 14, 0, 8, 3);
                    g.lineStyle(1, 0x666666, 0.5);
                    g.strokeTriangle(8, -3, 14, 0, 8, 3);
                    g.fillStyle(0x5a3a1a, 1);
                    g.fillRect(-10, -2, 3, 4);
                },
                depth: 5,
            },
            {
                id: "large_footprints",
                x: BONE_CHAMBER_CENTER.x + 30,
                y: BONE_CHAMBER_CENTER.y + 80,
                width: 40,
                height: 60,
                promptText: "[E] Examine footprint",
                dialogueId: "cave_footprint",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x3a3a2a, 0.4);
                    g.fillEllipse(-10, -10, 9, 15);
                    g.fillEllipse(10, -5, 9, 15);
                    g.fillEllipse(0, 20, 7.5, 12);
                    g.fillEllipse(18, 16, 7.5, 12);
                },
                depth: 5,
            },
            {
                id: "bent_spear",
                x: STORAGE_CENTER.x + 60,
                y: STORAGE_CENTER.y + 50,
                width: 24,
                height: 24,
                promptText: "[E] Examine bent spear",
                dialogueId: "cave_spear",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x6a4a2a, 1);
                    g.fillRect(-10, -2, 10, 3);
                    g.fillRect(-2, -8, 3, 10);
                    g.fillStyle(0x888888, 1);
                    g.fillTriangle(-2, -8, 2, -14, 4, -8);
                },
                depth: 5,
            },
            {
                id: "broken_amphorae",
                x: STORAGE_CENTER.x - 90,
                y: STORAGE_CENTER.y + 70,
                width: 24,
                height: 20,
                promptText: "[E] Examine shards",
                dialogueId: "cave_amphorae",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0xa0522d, 1);
                    g.fillTriangle(-8, -4, -2, -10, -4, 2);
                    g.fillTriangle(2, -6, 8, -2, 4, 4);
                    g.fillRect(-3, 2, 6, 4);
                    g.lineStyle(1, 0x8b4513, 0.5);
                    g.strokeTriangle(-8, -4, -2, -10, -4, 2);
                    g.strokeTriangle(2, -6, 8, -2, 4, 4);
                },
                depth: 5,
            },
            {
                id: "sheep_bones",
                x: SHEEP_PEN_CENTER.x + 100,
                y: SHEEP_PEN_CENTER.y + 30,
                width: 24,
                height: 20,
                promptText: "[E] Examine remains",
                dialogueId: "cave_sheep_bones",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0xeeeeee, 1);
                    g.fillRect(-10, -2, 20, 2);
                    for (let i = -8; i <= 8; i += 4) {
                        g.fillRect(i, -8, 2, 14);
                    }
                    g.fillStyle(0xdddddd, 1);
                    g.fillCircle(-11, -1, 3);
                    g.fillCircle(11, -1, 3);
                },
                depth: 5,
            },
            {
                id: "half_eaten_food",
                x: FIRE_PIT_CENTER.x - 70,
                y: FIRE_PIT_CENTER.y + 90,
                width: 26,
                height: 20,
                promptText: "[E] Examine carcass",
                dialogueId: "cave_food",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x8b0000, 1);
                    g.fillCircle(-2, 0, 8);
                    g.fillStyle(0xa0522d, 1);
                    g.fillCircle(-2, 0, 6);
                    g.fillStyle(0xffffff, 1);
                    g.fillRect(4, -2, 8, 4);
                    g.fillCircle(12, -2, 2.5);
                    g.fillCircle(12, 2, 2.5);
                },
                depth: 5,
            },
            {
                id: "giant_table",
                x: BOSS_ARENA_CENTER.x,
                y: BOSS_ARENA_CENTER.y - 120,
                width: 100,
                height: 40,
                promptText: "[E] Examine table",
                dialogueId: "cave_table",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x5a5a4a, 1);
                    g.fillRect(-50, -8, 100, 16);
                    g.fillStyle(0x4a4a3a, 1);
                    g.fillRect(-45, 8, 8, 30);
                    g.fillRect(37, 8, 8, 30);
                    g.lineStyle(2, 0x3a3a2a, 0.5);
                    g.strokeRect(-50, -8, 100, 16);
                },
                depth: 5,
            },
            {
                id: "huge_chair",
                x: BOSS_ARENA_CENTER.x - 80,
                y: BOSS_ARENA_CENTER.y - 130,
                width: 32,
                height: 32,
                promptText: "[E] Examine chair",
                dialogueId: "cave_chair",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x4a3a2a, 1);
                    g.fillRect(-12, -24, 24, 16);
                    g.fillRect(-12, -8, 24, 6);
                    g.fillRect(-10, -2, 4, 16);
                    g.fillRect(6, -2, 4, 16);
                    g.lineStyle(1, 0x3a2a1a, 0.6);
                    g.strokeRect(-12, -8, 24, 6);
                },
                depth: 5,
            },
            {
                id: "cooking_pot",
                x: FIRE_PIT_CENTER.x + 60,
                y: FIRE_PIT_CENTER.y - 60,
                width: 28,
                height: 28,
                promptText: "[E] Examine cauldron",
                dialogueId: "cave_pot",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x1e1e1e, 1);
                    g.fillCircle(0, 0, 12);
                    g.fillRect(-14, -8, 28, 4);
                    g.lineStyle(2, 0x333333, 1);
                    g.strokeCircle(-12, 0, 4);
                    g.strokeCircle(12, 0, 4);
                    g.fillStyle(0x000000, 1);
                    g.fillCircle(0, 0, 9);
                },
                depth: 5,
            },
            {
                id: "torn_cloth",
                x: SLEEPING_CHAMBER_CENTER.x - 40,
                y: SLEEPING_CHAMBER_CENTER.y + 40,
                width: 30,
                height: 20,
                promptText: "[E] Examine cloth",
                dialogueId: "cave_cloth",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x5a4a3a, 0.6);
                    g.fillEllipse(0, 0, 15, 8);
                    g.fillStyle(0x4a3a2a, 0.8);
                    g.fillTriangle(-12, 2, -6, -4, -2, 6);
                    g.fillTriangle(4, -4, 12, 4, 2, 6);
                },
                depth: 5,
            },
            {
                id: "blood_stains",
                x: BONE_CHAMBER_CENTER.x - 40,
                y: BONE_CHAMBER_CENTER.y + 60,
                width: 32,
                height: 24,
                promptText: "[E] Inspect stains",
                dialogueId: "cave_blood",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x500000, 0.6);
                    g.fillCircle(-6, -2, 5);
                    g.fillCircle(4, 4, 7);
                    g.fillCircle(8, -4, 3);
                    g.fillRect(-10, 2, 14, 2);
                },
                depth: 4,
            },
            {
                id: "burned_campfire",
                x: FIRE_PIT_CENTER.x,
                y: FIRE_PIT_CENTER.y + 20,
                width: 30,
                height: 30,
                promptText: "[E] Inspect fire pit",
                dialogueId: "cave_campfire",
                drawFn: () => {
                },
                depth: 7,
            },
            {
                id: "empty_cages",
                x: STORAGE_CENTER.x - 140,
                y: STORAGE_CENTER.y - 40,
                width: 36,
                height: 40,
                promptText: "[E] Examine cage",
                dialogueId: "cave_cages",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.lineStyle(3, 0x4a3a2a, 1);
                    g.strokeRect(-16, -20, 32, 40);
                    g.lineStyle(2, 0x3a2a1a, 0.8);
                    for (let i = -12; i <= 12; i += 6) {
                        if (i === 0) continue;
                        g.lineBetween(i, -20, i, 20);
                    }
                    g.lineStyle(2, 0x3a2a1a, 0.5);
                    g.lineBetween(-6, -10, -2, 5);
                },
                depth: 5,
            },
            {
                id: "crushed_cart",
                x: STORAGE_CENTER.x - 80,
                y: STORAGE_CENTER.y + 30,
                width: 44,
                height: 30,
                promptText: "[E] Examine wreckage",
                dialogueId: "cave_cart",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x6a4a2a, 1);
                    g.fillRect(-18, -12, 36, 18);
                    g.lineStyle(1, 0x4a2a1a, 0.8);
                    g.strokeRect(-18, -12, 36, 18);
                    g.fillStyle(0x5a3a1a, 1);
                    g.fillCircle(-10, 10, 4);
                    g.fillCircle(10, 10, 4);
                    g.lineStyle(1, 0x3a1a0a, 0.6);
                    g.strokeCircle(-10, 10, 4);
                    g.strokeCircle(10, 10, 4);
                    g.fillStyle(0x8a6a3a, 1);
                    g.fillRect(-22, -15, 5, 10);
                    g.fillRect(17, -15, 5, 10);
                },
                depth: 4,
            },
            {
                id: "destroyed_shield_entrance",
                x: ENTRANCE_CENTER.x + 80,
                y: ENTRANCE_CENTER.y + 100,
                width: 22,
                height: 22,
                promptText: "[E] Examine shield",
                dialogueId: "cave_shield",
                drawFn: (g: Phaser.GameObjects.Graphics) => {
                    g.fillStyle(0x8a7a5a, 1);
                    g.fillCircle(0, 0, 8);
                    g.lineStyle(2, 0x6a5a4a, 0.8);
                    g.strokeCircle(0, 0, 8);
                    g.fillStyle(0x6a5a4a, 0.6);
                    g.fillCircle(0, 0, 4);
                    g.fillStyle(0x8a7a5a, 0.5);
                    g.fillRect(-2, -9, 4, 18);
                },
                depth: 5,
            },
        ];

        for (const config of propConfigs) {
            const prop = new InteractableProp(this, config);
            this.caveProps.push(prop);
        }
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

        this.player = new Player(this, ENTRANCE_CENTER.x, ENTRANCE_CENTER.y + 40, playerConfig);

        if (!this.player) return;

        this.physics.world.setBounds(0, 0, CAVE_W, CAVE_H);
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
            worldBounds: { x: 0, y: 0, width: CAVE_W, height: CAVE_H },
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

        for (const npc of this.crewNPCs) {
            this.interactionManager.register(npc);
        }
        for (const prop of this.caveProps) {
            this.interactionManager.register(prop);
        }
        for (const sheep of this.sheepList) {
            this.interactionManager.register(sheep);
        }
        for (const crate of this.crateObjects) {
            this.interactionManager.register(crate);
        }
        for (const torch of this.lightableTorches) {
            this.interactionManager.register(torch);
        }
        if (this.stoneGate) {
            this.interactionManager.register(this.stoneGate);
        }

        if (this.cameraManager && this.player) {
            this.debugOverlay = new DebugOverlay(this);
            this.debugOverlay.setCameraManager(this.cameraManager);
            this.debugOverlay.setPlayer(this.player);
        }
    }

    private setupCheckpoints(): void {
        this.checkpoints?.registerCheckpoint(
            "deep_cave",
            "Deep Cave",
            FIRE_PIT_CENTER.x - 100,
            FIRE_PIT_CENTER.y
        );
        this.checkpoints?.registerCheckpoint(
            "before_boss",
            "The Cyclops' Lair",
            SLEEPING_CHAMBER_CENTER.x + 100,
            SLEEPING_CHAMBER_CENTER.y
        );
    }

    private openCaveEntrance(): void {
        if (!this.player || !this.cameraManager) return;

        GameStateManager.getInstance().setState(GameState.CUTSCENE);

        this.cameraManager.setZoom(0.8);
        const cam = this.cameras.main;
        cam.centerOn(ENTRANCE_CENTER.x, ENTRANCE_CENTER.y);

        const introText = this.add.text(
            GAME_CONFIG.WIDTH / 2,
            GAME_CONFIG.HEIGHT / 2 - 40,
            "The Cave of the Cyclops",
            {
                fontSize: "24px",
                color: "#ccaa66",
                stroke: "#000000",
                strokeThickness: 4,
            }
        );
        introText.setOrigin(0.5);
        introText.setScrollFactor(0);
        introText.setDepth(1000);
        introText.setAlpha(0);

        this.tweens.add({
            targets: introText,
            alpha: 1,
            duration: 1000,
            ease: "Power2",
        });

        this.time.delayedCall(2000, () => {
            this.tweens.add({
                targets: introText,
                alpha: 0,
                duration: 800,
                ease: "Power2",
                onComplete: () => {
                    introText.destroy();
                    this.startGameplay();
                },
            });
        });
    }

    private startGameplay(): void {
        if (!this.player || !this.cameraManager) return;

        this.cameraManager.setZoom(1);
        this.cameraManager.follow(this.player);
        this.playerControlEnabled = true;
        this.gameStarted = true;

        GameStateManager.getInstance().setState(GameState.PLAYING);
        this.objectiveManager?.setObjective("investigate_cave", "Investigate the strange remains");
    }

    private playerControlEnabled: boolean = false;

    private handleInteraction(target: IInteractable): void {
        if (this.dialogueManager?.isActive()) return;

        if (target instanceof CrewNPC) {
            this.startNPCDialogue(target.getDialogueId());
        } else if (target instanceof InteractableProp) {
            this.startPropDialogue(target.getDialogueId());
        } else if (target instanceof Crate) {
            this.handleCrateInteraction(target);
        } else if (target instanceof LightableTorch) {
            target.interact();
        }
    }

    private handleCrateInteraction(crate: Crate): void {
        if (!this.player) return;

        const px = this.player.x;
        const py = this.player.y;
        const cratePos = crate.getPosition();

        const dx = cratePos.x - px;
        const dy = cratePos.y - py;
        const absX = Math.abs(dx);
        const absY = Math.abs(dy);

        let dirX = 0;
        let dirY = 0;
        if (absX > absY) {
            dirX = dx > 0 ? 1 : -1;
        } else {
            dirY = dy > 0 ? 1 : -1;
        }

        const moved = crate.pushInDirection(dirX, dirY, (x, y) => this.checkCrateCollision(crate, x, y));
        if (moved && !this.crateMoved) {
            this.crateMoved = true;
            this.onCratePuzzleSolved();
        }
    }

    private checkCrateCollision(crate: Crate, x: number, y: number): boolean {
        const halfW = crate.worldObject.width / 2;
        const halfH = crate.worldObject.height / 2;
        for (const obj of this.worldObjects) {
            if (obj.id === crate.worldObject.id) continue;
            if (!obj.isCollidable) continue;
            const oLeft = obj.x - obj.width / 2;
            const oRight = obj.x + obj.width / 2;
            const oTop = obj.y - obj.height / 2;
            const oBottom = obj.y + obj.height / 2;
            if (
                x + halfW > oLeft &&
                x - halfW < oRight &&
                y + halfH > oTop &&
                y - halfH < oBottom
            ) {
                return true;
            }
        }
        return false;
    }

    private onCratePuzzleSolved(): void {
        for (const rubble of this.collapsedBlockage) {
            const idx = this.worldObjects.indexOf(rubble);
            if (idx !== -1) {
                this.worldObjects.splice(idx, 1);
            }
            this.collisionManager?.getObjectGroup()?.remove(rubble.gameObject);
            rubble.destroy();
        }
        this.collapsedBlockage = [];

        this.cameras.main.shake(400, 0.008);
        this.objectiveManager?.completeObjective("clear_passage");
        this.objectiveManager?.setObjective("light_torches", "Light the torches to open the stone gate");

        if (this.dialogueManager) {
            this.dialogueManager.start({
                lines: [
                    { speaker: "Odysseus", text: "The rocks are shifting... the passage is clearing!" },
                ],
            });
        }
    }

    private checkTorchPuzzle(): void {
        if (this.gateOpened) return;
        if (!this.stoneGate?.isGateOpen()) return;

        this.gateOpened = true;
        this.onGateOpened();
    }

    private onGateOpened(): void {
        this.cameras.main.shake(600, 0.005);

        for (const wall of this.gateBlockingWalls) {
            const idx = this.worldObjects.indexOf(wall);
            if (idx !== -1) {
                this.worldObjects.splice(idx, 1);
            }
            this.collisionManager?.getObjectGroup()?.remove(wall.gameObject);
            wall.destroy();
        }
        this.gateBlockingWalls = [];

        this.objectiveManager?.completeObjective("light_torches");
        this.objectiveManager?.setObjective("reach_deepest", "Reach the deepest chamber");

        this.checkpoints?.activateCheckpoint("deep_cave");

        if (this.dialogueManager) {
            this.dialogueManager.start({
                lines: [
                    { speaker: "Odysseus", text: "The stone gate opens... the path ahead is clear." },
                ],
            });
        }
    }

    private startNPCDialogue(dialogueId: string): void {
        const dialogues: Record<string, { lines: Array<{ speaker: string; text: string }> }> = {
            frightened_crew: {
                lines: [
                    { speaker: "Polites", text: "Captain! You made it... I thought I was the last one." },
                    { speaker: "Polites", text: "He comes back every night... the ground shakes, and we just hide in the darkness." },
                    { speaker: "Polites", text: "The others... he took them. One by one. There's nothing we could do." },
                    { speaker: "Polites", text: "There's a deeper chamber past the fire pit. A stone gate blocks the way. I couldn't open it." },
                    { speaker: "Polites", text: "Be careful, Captain. Something ancient lives in these caves." },
                    { speaker: "Odysseus", text: "Rest here. I'll find a way through." },
                ],
            },
        };

        const data = dialogues[dialogueId];
        if (!data) return;

        if (!this.crewFound) {
            this.crewFound = true;
            this.objectiveManager?.completeObjective("find_survivors");
            if (!this.crateMoved) {
                this.objectiveManager?.setObjective("clear_passage", "Find another route through the cave");
            }
        }

        this.dialogueManager?.start({ lines: data.lines });
    }

    private startPropDialogue(dialogueId: string): void {
        const dialogues: Record<string, { lines: Array<{ speaker: string; text: string }> }> = {
            cave_bones: {
                lines: [
                    { speaker: "Odysseus", text: "Bones scattered across the floor... some are animal, some are not." },
                    { speaker: "Odysseus", text: "The larger ones have been cracked open. Whatever did this was incredibly strong." },
                ],
            },
            cave_skulls: {
                lines: [
                    { speaker: "Odysseus", text: "Skulls... arranged almost deliberately. A warning, perhaps." },
                    { speaker: "Odysseus", text: "These men were armed. It didn't save them." },
                ],
            },
            cave_handprints: {
                lines: [
                    { speaker: "Odysseus", text: "Handprints pressed into the stone... each finger is as wide as my wrist." },
                    { speaker: "Eurylochus", text: "Nothing human made those marks, Captain." },
                ],
            },
            cave_chains: {
                lines: [
                    { speaker: "Odysseus", text: "Heavy chains bolted to the wall. The links have been snapped." },
                    { speaker: "Odysseus", text: "Whatever was chained here broke free with ease." },
                ],
            },
            cave_shield: {
                lines: [
                    { speaker: "Odysseus", text: "A Greek shield... dented and broken. The metal is torn, not cut." },
                    { speaker: "Odysseus", text: "This belonged to one of our own. Or someone like us, from long ago." },
                ],
            },
            cave_barrel: {
                lines: [
                    { speaker: "Odysseus", text: "A storage barrel, half-eaten. Something has been feeding on our supplies." },
                    { speaker: "Odysseus", text: "The bite marks are enormous." },
                ],
            },
            cave_weapon: {
                lines: [
                    { speaker: "Odysseus", text: "A Greek sword, broken at the hilt. The blade is snapped clean off." },
                    { speaker: "Odysseus", text: "I've never seen a weapon broken like this. The force required..." },
                ],
            },
            cave_footprint: {
                lines: [
                    { speaker: "Odysseus", text: "A massive footprint pressed deep into the solid earth." },
                    { speaker: "Odysseus", text: "It's three times the size of my own foot. No man could be this large." },
                ],
            },
            cave_spear: {
                lines: [
                    { speaker: "Odysseus", text: "A bronze spear, bent completely out of shape." },
                    { speaker: "Odysseus", text: "It would take the strength of a team of oxen to buckle metal this thick." },
                ],
            },
            cave_amphorae: {
                lines: [
                    { speaker: "Odysseus", text: "Terracotta jars, smashed to pieces. The contents have dried up." },
                    { speaker: "Odysseus", text: "They look like they were crushed underfoot, like dry clay." },
                ],
            },
            cave_sheep_bones: {
                lines: [
                    { speaker: "Odysseus", text: "The carcass of a sheep... or what remains of it." },
                    { speaker: "Odysseus", text: "The bones have been gnawed and snapped to get to the marrow." },
                ],
            },
            cave_food: {
                lines: [
                    { speaker: "Odysseus", text: "A huge chunk of roasted meat, half-devoured and left to rot." },
                    { speaker: "Odysseus", text: "This looks like an entire sheep's hind leg... eaten in a few bites." },
                ],
            },
            cave_table: {
                lines: [
                    { speaker: "Odysseus", text: "A colossal wooden table, crude but incredibly heavy." },
                    { speaker: "Odysseus", text: "No ordinary mortal could sit and dine at a table this high." },
                ],
            },
            cave_chair: {
                lines: [
                    { speaker: "Odysseus", text: "A chair carved from a massive tree trunk." },
                    { speaker: "Odysseus", text: "The scale of it... whoever sits here must be ten cubits tall." },
                ],
            },
            cave_pot: {
                lines: [
                    { speaker: "Odysseus", text: "A massive bronze cauldron, large enough to bathe three men." },
                    { speaker: "Odysseus", text: "The inside is coated in ash and grease. It is regularly used." },
                ],
            },
            cave_cloth: {
                lines: [
                    { speaker: "Odysseus", text: "A pile of coarse, woven fabric, smelling of sweat and wild animals." },
                    { speaker: "Odysseus", text: "It looks like a giant's simple tunic or blanket." },
                ],
            },
            cave_blood: {
                lines: [
                    { speaker: "Odysseus", text: "Dried blood stains, dark and thick, covering the stone floor." },
                    { speaker: "Odysseus", text: "This blood did not come from sheep. We must be extremely cautious." },
                ],
            },
            cave_campfire: {
                lines: [
                    { speaker: "Odysseus", text: "A massive fire pit. The embers are hot and crackling." },
                    { speaker: "Odysseus", text: "Whoever lit this campfire cannot have gone far." },
                ],
            },
            cave_cages: {
                lines: [
                    { speaker: "Odysseus", text: "A crude cage made of thick pine branches. The door is broken." },
                    { speaker: "Odysseus", text: "The space inside is large enough to hold several sheep... or men." },
                ],
            },
            cave_cart: {
                lines: [
                    { speaker: "Odysseus", text: "A wooden cart, crushed flat as if someone stepped on it." },
                    { speaker: "Odysseus", text: "The heavy axle is snapped like a twig." },
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

        if (!this.reachableDeepChamber && px > SHEEP_PEN_CENTER.x - 50) {
            this.reachableDeepChamber = true;
            this.objectiveManager?.completeObjective("investigate_cave");
            this.objectiveManager?.setObjective("find_survivors", "Search for signs of survivors");
        }

        if (this.crewFound && !this.crateMoved && !this.objectiveManager?.hasObjective("clear_passage") && !this.objectiveManager?.getCurrentObjective()) {
            this.objectiveManager?.setObjective("clear_passage", "Clear the blocked passage");
        }

        if (!this.bossArenaReached && this.gateOpened && px > SLEEPING_CHAMBER_CENTER.x) {
            this.bossArenaReached = true;
            this.objectiveManager?.completeObjective("reach_deepest");
            this.checkpoints?.activateCheckpoint("before_boss");

            const arenaText = this.add.text(
                GAME_CONFIG.WIDTH / 2,
                GAME_CONFIG.HEIGHT / 2 - 40,
                "The Cyclops' Lair",
                {
                    fontSize: "28px",
                    color: "#cc4444",
                    stroke: "#000000",
                    strokeThickness: 4,
                }
            );
            arenaText.setOrigin(0.5);
            arenaText.setScrollFactor(0);
            arenaText.setDepth(1000);
            arenaText.setAlpha(0);

            this.tweens.add({
                targets: arenaText,
                alpha: 1,
                duration: 1500,
                ease: "Power2",
            });
            this.tweens.add({
                targets: arenaText,
                alpha: 0,
                duration: 1000,
                delay: 2500,
                ease: "Power2",
                onComplete: () => arenaText.destroy(),
            });
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

    private placePillar(x: number, y: number, w: number, h: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x5a5a4a, 1);
        g.fillRect(x - w / 2, y - h / 2, w, h);
        g.lineStyle(1, 0x4a4a3a, 0.6);
        g.strokeRect(x - w / 2, y - h / 2, w, h);
        g.fillStyle(0x6a6a5a, 0.3);
        g.fillRect(x - w / 2, y - h / 4, w, h / 2);
        g.setDepth(3);
        this.terrainGraphics.push(g);
    }

    private placeWallTorch(x: number, y: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x5a3a1a, 1);
        g.fillRect(x - 1.5, y - 10, 3, 20);
        g.fillStyle(0xff6600, 0.9);
        g.fillCircle(x, y - 12, 4);
        g.fillStyle(0xffaa00, 0.7);
        g.fillCircle(x, y - 13, 2.5);
        g.fillStyle(0xffdd44, 0.5);
        g.fillCircle(x, y - 14, 1.5);
        g.setDepth(6);
        this.torchGraphics.push(g);
    }

    private placePenTorch(x: number, y: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x5a3a1a, 1);
        g.fillRect(x - 2, y - 8, 4, 16);
        g.fillStyle(0xff6600, 0.8);
        g.fillCircle(x, y - 10, 3.5);
        g.fillStyle(0xffaa00, 0.6);
        g.fillCircle(x, y - 11, 2);
        g.setDepth(6);
        this.torchGraphics.push(g);
    }

    private placeBrokenCart(cx: number, cy: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x6a4a2a, 1);
        g.fillRect(cx - 18, cy - 12, 36, 18);
        g.lineStyle(1, 0x4a2a1a, 0.8);
        g.strokeRect(cx - 18, cy - 12, 36, 18);
        g.fillStyle(0x5a3a1a, 1);
        g.fillCircle(cx - 10, cy + 10, 4);
        g.fillCircle(cx + 10, cy + 10, 4);
        g.lineStyle(1, 0x3a1a0a, 0.6);
        g.strokeCircle(cx - 10, cy + 10, 4);
        g.strokeCircle(cx + 10, cy + 10, 4);
        g.fillStyle(0x8a6a3a, 1);
        g.fillRect(cx - 22, cy - 15, 5, 10);
        g.fillRect(cx + 17, cy - 15, 5, 10);
        g.setDepth(4);
        this.terrainGraphics.push(g);
    }

    private placeFoodBarrel(cx: number, cy: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x6a4a2a, 1);
        g.fillRect(cx - 8, cy - 10, 16, 20);
        g.lineStyle(1, 0x5a3a1a, 0.8);
        g.strokeRect(cx - 8, cy - 10, 16, 20);
        g.fillStyle(0x7a5a3a, 0.5);
        g.fillCircle(cx, cy, 3);
        g.lineStyle(1, 0x5a3a1a, 0.6);
        g.lineBetween(cx - 8, cy - 4, cx + 8, cy - 4);
        g.lineBetween(cx - 8, cy + 4, cx + 8, cy + 4);
        g.setDepth(4);
        this.terrainGraphics.push(g);
    }

    private placeGreekWeapon(cx: number, cy: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x6a4a2a, 1);
        g.fillRect(cx - 10, cy - 1.5, 20, 3);
        g.fillStyle(0x888888, 1);
        g.fillTriangle(8, -3, 14, 0, 8, 3);
        g.lineStyle(1, 0x666666, 0.5);
        g.strokeTriangle(8, -3, 14, 0, 8, 3);
        g.fillStyle(0x5a3a1a, 1);
        g.fillRect(cx - 10, cy - 2, 3, 4);
        g.setDepth(4);
        this.terrainGraphics.push(g);
    }

    private placeDestroyedShield(cx: number, cy: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x8a7a5a, 1);
        g.fillCircle(cx, cy, 8);
        g.lineStyle(2, 0x6a5a4a, 0.8);
        g.strokeCircle(cx, cy, 8);
        g.fillStyle(0x6a5a4a, 0.6);
        g.fillCircle(cx, cy, 4);
        g.fillStyle(0x8a7a5a, 0.5);
        g.fillRect(cx - 2, cy - 9, 4, 18);
        g.setDepth(4);
        this.terrainGraphics.push(g);
    }

    private placeBonePile(cx: number, cy: number): void {
        const g = this.add.graphics();
        g.fillStyle(0xccccbb, 1);
        for (let i = 0; i < 5; i++) {
            const bx = cx + Phaser.Math.Between(-6, 6);
            const by = cy + Phaser.Math.Between(-4, 4);
            g.fillRect(bx - 1, by - 3, 2, 6);
        }
        g.fillStyle(0xbbbbaa, 1);
        g.fillCircle(cx, cy + 2, 2.5);
        g.lineStyle(1, 0x999988, 0.4);
        g.strokeCircle(cx, cy + 2, 2.5);
        g.setDepth(4);
        this.terrainGraphics.push(g);
    }

    private placeSkullPile(cx: number, cy: number): void {
        const g = this.add.graphics();
        g.fillStyle(0xddddcc, 1);
        g.fillCircle(cx, cy, 5);
        g.fillStyle(0x222222, 1);
        g.fillCircle(cx - 2, cy - 1, 1);
        g.fillCircle(cx + 2, cy - 1, 1);
        g.fillRect(cx - 1, cy + 2, 2, 2);
        g.lineStyle(1, 0xbbbbaa, 0.5);
        g.strokeCircle(cx, cy, 5);
        g.setDepth(4);
        this.terrainGraphics.push(g);
    }

    private placeLargeHandprint(cx: number, cy: number, mirror: boolean): void {
        const g = this.add.graphics();
        const dir = mirror ? -1 : 1;
        g.fillStyle(0x3a3a2a, 0.4);
        g.fillCircle(cx + dir * 0, cy - 4, 5);
        g.fillRect(cx + dir * (-1), cy + 2, 3, 7);
        g.fillRect(cx + dir * (-4), cy + 5, 3, 5);
        g.fillRect(cx + dir * 2, cy + 5, 3, 5);
        g.setDepth(4);
        this.terrainGraphics.push(g);
    }

    private placeChains(cx: number, cy: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x888888, 1);
        for (let i = 0; i < 3; i++) {
            g.fillCircle(cx, cy + i * 7, 2.5);
            g.fillRect(cx - 0.5, cy - 1 + i * 7, 3, 5);
        }
        g.lineStyle(1, 0x666666, 0.5);
        for (let i = 0; i < 3; i++) {
            g.strokeCircle(cx, cy + i * 7, 2.5);
        }
        g.fillStyle(0x666666, 1);
        g.fillRect(cx - 1, cy - 2, 3, 20);
        g.setDepth(4);
        this.terrainGraphics.push(g);
    }

    private placeSleepingMat(cx: number, cy: number): void {
        const g = this.add.graphics();
        g.fillStyle(0x4a3a2a, 1);
        g.fillRect(cx - 12, cy - 6, 24, 12);
        g.fillStyle(0x5a4a3a, 0.5);
        g.fillRect(cx - 10, cy - 4, 20, 8);
        g.lineStyle(1, 0x3a2a1a, 0.4);
        g.strokeRect(cx - 12, cy - 6, 24, 12);
        g.setDepth(3);
        this.terrainGraphics.push(g);
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

    private updateAtmosphere(delta: number): void {
        if (!this.player || !this.fogOverlay) return;

        const px = this.player.x;

        // 1. Soft cave fog scaling with depth
        let fogIntensity = 0.25;
        if (px > 1000) {
            fogIntensity = 0.25 + Math.min(((px - 1000) / 3000) * 0.3, 0.3);
        }
        this.fogOverlay.clear();
        this.fogOverlay.fillStyle(0x05050a, fogIntensity);
        this.fogOverlay.fillRect(0, 0, GAME_CONFIG.WIDTH, GAME_CONFIG.HEIGHT);

        // 2. Dust particles system using screen coordinates space
        if (!this.particleGraphics) {
            this.particleGraphics = this.add.graphics();
            this.particleGraphics.setScrollFactor(0);
            this.particleGraphics.setDepth(951);
        }
        if (this.dustParticles.length === 0) {
            for (let i = 0; i < 40; i++) {
                this.dustParticles.push({
                    x: Phaser.Math.Between(0, GAME_CONFIG.WIDTH),
                    y: Phaser.Math.Between(0, GAME_CONFIG.HEIGHT),
                    vx: Phaser.Math.Between(-15, 15),
                    vy: Phaser.Math.Between(10, 25),
                    alpha: Phaser.Math.FloatBetween(0.1, 0.25),
                    size: Phaser.Math.FloatBetween(1, 3.5),
                });
            }
        }
        this.particleGraphics.clear();
        for (const p of this.dustParticles) {
            p.x += p.vx * (delta / 1000);
            p.y += p.vy * (delta / 1000);

            if (p.y > GAME_CONFIG.HEIGHT) {
                p.y = 0;
                p.x = Phaser.Math.Between(0, GAME_CONFIG.WIDTH);
            }
            if (p.x < 0 || p.x > GAME_CONFIG.WIDTH) {
                p.x = p.x < 0 ? GAME_CONFIG.WIDTH : 0;
            }

            this.particleGraphics.fillStyle(0xccccaa, p.alpha);
            this.particleGraphics.fillCircle(p.x, p.y, p.size);
        }

        // 3. Falling Pebbles effect
        this.pebbleTimer += delta;
        if (this.pebbleTimer > 12000) {
            this.pebbleTimer = 0;
            const spawnX = px + Phaser.Math.Between(-300, 300);
            for (let i = 0; i < Phaser.Math.Between(3, 7); i++) {
                this.fallingPebbles.push({
                    x: spawnX + Phaser.Math.Between(-30, 30),
                    y: Phaser.Math.Between(-50, 0),
                    vy: Phaser.Math.Between(200, 350),
                    size: Phaser.Math.FloatBetween(1.5, 3),
                    color: 0x5a5a4a,
                });
            }
        }

        if (this.fallingPebbles.length > 0) {
            if (!this.pebbleGraphics) {
                this.pebbleGraphics = this.add.graphics();
                this.pebbleGraphics.setScrollFactor(1);
                this.pebbleGraphics.setDepth(940);
            }
            this.pebbleGraphics.clear();

            for (let i = this.fallingPebbles.length - 1; i >= 0; i--) {
                const pebble = this.fallingPebbles[i];
                pebble.y += pebble.vy * (delta / 1000);

                this.pebbleGraphics.fillStyle(pebble.color, 0.7);
                this.pebbleGraphics.fillCircle(pebble.x, pebble.y, pebble.size);

                if (pebble.y > CAVE_H) {
                    this.fallingPebbles.splice(i, 1);
                }
            }
        }

        // 4. Subtle camera shakes and rumble tremors synced with falling pebbles clusters
        this.rumblingTimer += delta;
        if (this.rumblingTimer > 25000 && this.gameStarted) {
            this.rumblingTimer = 0;
            this.cameras.main.shake(500, 0.003);

            const spawnX = px + Phaser.Math.Between(-200, 200);
            for (let i = 0; i < Phaser.Math.Between(5, 10); i++) {
                this.fallingPebbles.push({
                    x: spawnX + Phaser.Math.Between(-50, 50),
                    y: Phaser.Math.Between(-50, 0),
                    vy: Phaser.Math.Between(180, 320),
                    size: Phaser.Math.FloatBetween(1.5, 3.5),
                    color: 0x5a5a4a,
                });
            }

            if (Math.random() < 0.3) {
                try {
                    const audioCache = this.cache.audio;
                    if (audioCache && audioCache.getKeys().length > 0 && this.sound) {
                        this.sound.play("rumble", { volume: 0.15 });
                    }
                } catch {
                }
            }
        }

        // 5. Smooth flame flicker
        for (let i = 0; i < this.torchGraphics.length; i++) {
            const g = this.torchGraphics[i];
            if (g) {
                const flicker = 0.85 + Math.random() * 0.15;
                g.setAlpha(flicker);
            }
        }
    }

    private updateCampfireFlicker(delta: number): void {
        if (!this.campfireG) return;
        const cx = this.campfirePos.x;
        const cy = this.campfirePos.y;
        this.campfireFlickerTimer += delta;
        if (this.campfireFlickerTimer > 120) {
            this.campfireFlickerTimer = 0;
            const g = this.campfireG;
            g.clear();
            g.fillStyle(0x5a3a1a, 1);
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const rx = cx + Math.cos(angle) * 10;
                const ry = cy + Math.sin(angle) * 10;
                g.fillRect(rx - 2, ry - 8, 4, 16);
            }
            const flicker = Phaser.Math.Between(-2, 2);
            g.fillStyle(0xff6600, 0.8 + Math.random() * 0.2);
            g.fillCircle(cx + flicker, cy - 5 + flicker, 8 + Math.random());
            g.fillStyle(0xffaa00, 0.7 + Math.random() * 0.2);
            g.fillCircle(cx + flicker, cy - 6 + flicker, 5 + Math.random());
            g.fillStyle(0xffdd44, 0.6 + Math.random() * 0.2);
            g.fillCircle(cx + flicker, cy - 7 + flicker, 3 + Math.random());
            g.setDepth(6);
        }
    }

    update(time: number, delta: number): void {
        InputManager.getInstance().update();

        if (!this.gameStarted) {
            for (const npc of this.crewNPCs) {
                npc.update(time, delta);
            }
            for (const sheep of this.sheepList) {
                sheep.update(time, delta);
            }
            return;
        }

        if (this.player && this.playerControlEnabled) {
            this.player.update(time, delta);
        }

        for (const npc of this.crewNPCs) {
            npc.update(time, delta);
        }
        for (const sheep of this.sheepList) {
            sheep.update(time, delta);
        }
        for (const torch of this.lightableTorches) {
            torch.update(time, delta);
        }

        this.updateObjectives();

        if (this.dialogueManager?.isActive()) {
            this.dialogueManager.update(delta);
        }

        if (this.cameraManager) {
            this.cameraManager.update(delta);
        }

        this.interactionManager?.update();
        this.objectiveManager?.update(delta);
        this.updateAtmosphere(delta);
        this.updateCampfireFlicker(delta);

        if (this.debugOverlay) {
            this.debugOverlay.update(time, delta);
        }
    }
}
