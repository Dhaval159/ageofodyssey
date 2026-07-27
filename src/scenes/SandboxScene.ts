import Phaser from "phaser";
import { Logger } from "../core/Logger";
import { SceneTransitionManager } from "../core/SceneTransitionManager";
import { InputManager } from "../core/InputManager";
import { InputContext } from "../constants/InputContext";
import { GameStateManager, GameState } from "../core/GameStateManager";
import { Player } from "../entities/player/Player";
import { DEFAULT_PLAYER_CONFIG, IPlayerConfig } from "../entities/player/PlayerConfig";
import { CameraManager } from "../systems/camera/CameraManager";
import { WORLD_CONSTANTS } from "../constants/WorldConstants";
import { DebugOverlay } from "../systems/debug/DebugOverlay";
import { CombatManager } from "../systems/combat/CombatManager";
import { EnemyManager } from "../entities/enemies/framework/EnemyManager";
import { CollisionManager } from "../managers/CollisionManager";
import { WorldObject } from "../entities/world/WorldObject";
import { InteractionManager } from "../systems/interaction/InteractionManager";
import { DialogueManager } from "../systems/dialogue/DialogueManager";
import { ObjectiveManager } from "../systems/objectives/ObjectiveManager";
import { PuzzleEventBus, PuzzleEventType } from "../systems/interaction/PuzzleEvent";
import { Lever } from "../entities/interactables/Lever";
import { Door, DoorState } from "../entities/interactables/Door";
import { PressurePlate } from "../entities/interactables/PressurePlate";
import { MoveableCrate } from "../entities/interactables/MoveableCrate";
import { InteractableTorch } from "../entities/interactables/InteractableTorch";
import { InspectPoint } from "../entities/interactables/InspectPoint";
import { EnvironmentManager } from "../systems/environment/EnvironmentManager";

const WORLD_W = 1200;
const WORLD_H = 800;

const CENTER_X = WORLD_W / 2;
const CENTER_Y = WORLD_H / 2;

export default class SandboxScene extends Phaser.Scene {
  private player: Player | null = null;
  private cameraManager: CameraManager | null = null;
  private debugOverlay: DebugOverlay | null = null;
  private collisionManager: CollisionManager | null = null;
  private interactionManager: InteractionManager | null = null;
  private dialogueManager: DialogueManager | null = null;
  private objectiveManager: ObjectiveManager | null = null;
  private lever: Lever | null = null;
  private door: Door | null = null;
  private pressurePlate: PressurePlate | null = null;
  private crate: MoveableCrate | null = null;
  private torches: InteractableTorch[] = [];
  private inspectPoint: InspectPoint | null = null;
  private worldObjects: WorldObject[] = [];
  private environmentManager!: EnvironmentManager;

  constructor() {
    super({ key: "SandboxScene" });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(0x1a1a2e);
    this.cameras.main.fadeIn(500, 0, 0, 0);
    Logger.getInstance().log("SandboxScene started - Environmental Interaction Framework Test");

    GameStateManager.getInstance().setState(GameState.PLAYING);
    SceneTransitionManager.getInstance().initialize(this);

    InputManager.getInstance().initialize(this, {
      bindingsProfile: InputContext.createFilteredBindings(InputContext.GAMEPLAY),
    });

    CombatManager.getInstance().initialize();
    EnemyManager.getInstance().initialize();

    this.collisionManager = CollisionManager.getInstance();
    this.collisionManager.initialize(this);

    this.environmentManager = new EnvironmentManager(this, "sandbox");
    this.environmentManager.initialize(WORLD_W, WORLD_H);
    this.environmentManager.scatterDecorations(0.04);

    this.buildGround();
    this.buildBoundary();
    this.buildWorldObjects();
    this.buildInteractables();

    this.setupCamera();
    this.setupSystems();
    this.setupPuzzleConnections();

    this.objectiveManager?.setObjective("sandbox_test", "Test the environmental interaction framework");
  }

  private buildGround(): void {
    // Replaced by EnvironmentManager tilemap
  }

  private buildBoundary(): void {
    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
  }

  private buildWorldObjects(): void {
    const rocks = [
      { x: 150, y: 150 }, { x: 150, y: 650 },
      { x: 1050, y: 150 }, { x: 1050, y: 650 },
    ];
    for (const r of rocks) {
      const rock = new WorldObject({
        scene: this,
        id: `rock_${r.x}_${r.y}`,
        type: "rock",
        x: r.x, y: r.y,
        width: 40, height: 40,
        color: 0x3a3a5c,
        alpha: 1,
        isCollidable: true,
        strokeColor: 0x5a5a8c,
        strokeWidth: 2,
      });
      rock.setDepth(1);
      this.worldObjects.push(rock);
      this.collisionManager?.addObject(rock);
    }
    this.environmentManager.decorateWorldObjects(this.worldObjects);
  }

  private buildInteractables(): void {
    const layoutX = CENTER_X - 200;
    const layoutY = CENTER_Y;

    this.lever = new Lever(this, {
      id: "lever_1",
      x: layoutX,
      y: layoutY - 60,
      width: 20,
      height: 28,
      promptText: "[E] Pull lever",
      interactionRange: 55,
      depth: 6,
    });

    this.door = new Door(this, {
      id: "door_1",
      x: layoutX + 400,
      y: layoutY,
      width: 40,
      height: 80,
      initialState: DoorState.CLOSED,
      depth: 7,
      promptText: "",
    });

    this.pressurePlate = new PressurePlate(this, {
      id: "plate_1",
      x: layoutX,
      y: layoutY + 120,
      width: 48,
      height: 12,
      depth: 3,
      triggerOnStay: false,
    });

    this.crate = new MoveableCrate(this, {
      id: "crate_1",
      x: layoutX,
      y: layoutY + 170,
      width: 28,
      height: 28,
      pushRange: 55,
      promptText: "[E] Push crate",
      depth: 2,
    });

    this.torches = [
      new InteractableTorch(this, {
        id: "torch_1",
        x: layoutX + 180,
        y: layoutY - 80,
        width: 12,
        height: 28,
        promptText: "[E] Light torch",
        interactionRange: 50,
        depth: 6,
      }),
      new InteractableTorch(this, {
        id: "torch_2",
        x: layoutX + 230,
        y: layoutY - 80,
        width: 12,
        height: 28,
        promptText: "[E] Light torch",
        interactionRange: 50,
        depth: 6,
      }),
    ];

    this.inspectPoint = new InspectPoint(this, {
      id: "inspect_1",
      x: layoutX + 200,
      y: layoutY + 120,
      width: 24,
      height: 24,
      promptText: "[E] Examine plaque",
      interactionRange: 55,
      lines: [
        { speaker: "Odysseus", text: "A bronze plaque set into the stone. The inscription reads: 'Through interaction, the world responds.'" },
        { speaker: "Odysseus", text: "A reminder that every action has a consequence." },
      ],
      objectiveOnInspect: { id: "found_plaque", text: "Decipher the ancient plaque" },
      completeObjectiveOnInspect: "sandbox_test",
      depth: 5,
    });

    this.interactionManager?.register(this.lever);
    this.interactionManager?.register(this.door);
    this.interactionManager?.register(this.crate);
    for (const t of this.torches) {
      this.interactionManager?.register(t);
    }
    this.interactionManager?.register(this.inspectPoint);
  }

  private setupCamera(): void {
    const playerConfig: IPlayerConfig = {
      ...DEFAULT_PLAYER_CONFIG,
      camera: {
        lerpX: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_X,
        lerpY: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_Y,
        deadzoneWidth: WORLD_CONSTANTS.CAMERA.DEADZONE_WIDTH,
        deadzoneHeight: WORLD_CONSTANTS.CAMERA.DEADZONE_HEIGHT,
      },
    };

    this.player = new Player(this, CENTER_X - 300, CENTER_Y, playerConfig);

    if (!this.player) return;

    this.physics.world.setBounds(0, 0, WORLD_W, WORLD_H);
    this.collisionManager?.setPlayer(this.player);

    const body = this.player.body as Phaser.Physics.Arcade.Body;
    if (body) {
      body.setCollideWorldBounds(true);
    }

    this.cameraManager = new CameraManager(this.cameras.main, {
      lerpX: 0.08,
      lerpY: 0.08,
      worldBounds: { x: 0, y: 0, width: WORLD_W, height: WORLD_H },
      deadzoneWidth: 60,
      deadzoneHeight: 60,
      lookAheadFactor: 0.2,
      minZoom: 0.5,
      maxZoom: 1.5,
    });
    this.cameraManager.follow(this.player);

    this.cameraManager.setZoom(WORLD_CONSTANTS.CAMERA.DEFAULT_ZOOM);
  }

  private setupSystems(): void {
    this.interactionManager = InteractionManager.getInstance();
    this.dialogueManager = DialogueManager.getInstance();
    this.objectiveManager = ObjectiveManager.getInstance();

    this.interactionManager.initialize(this, this.player!);
    this.interactionManager.setOnInteractionCallback((target) => this.handleInteraction(target));
    this.dialogueManager.initialize(this);
    this.objectiveManager.initialize(this);

    if (this.cameraManager && this.player) {
      this.debugOverlay = new DebugOverlay(this);
      this.debugOverlay.setCameraManager(this.cameraManager);
      this.debugOverlay.setPlayer(this.player);
    }
  }

  private setupPuzzleConnections(): void {
    const bus = PuzzleEventBus.getInstance();

    if (this.lever && this.door) {
      bus.on(this.lever.getId(), PuzzleEventType.ACTIVATED, () => {
        Logger.getInstance().log(`[Sandbox] Lever activated → Opening door`);
        this.door?.open();
        this.objectiveManager?.completeObjective("open_door");
      });
      bus.on(this.lever.getId(), PuzzleEventType.DEACTIVATED, () => {
        Logger.getInstance().log(`[Sandbox] Lever deactivated → Closing door`);
        this.door?.close();
      });
    }

    if (this.pressurePlate && this.crate) {
      let plateTriggered = false;
      bus.on(this.pressurePlate.getId(), PuzzleEventType.TRIGGER_ENTER, (payload) => {
        Logger.getInstance().log(`[Sandbox] Pressure plate triggered by ${payload.data?.objectId}`);
        if (!plateTriggered) {
          plateTriggered = true;
          this.objectiveManager?.completeObjective("activate_plate");
          this.objectiveManager?.setObjective("light_torches", "Light both torches");
        }
      });

      bus.on(this.crate.getId(), PuzzleEventType.MOVED, () => {
        Logger.getInstance().log(`[Sandbox] Crate moved to (${this.crate?.x}, ${this.crate?.y})`);
      });
    }

    for (let i = 0; i < this.torches.length; i++) {
      const torch = this.torches[i];
      bus.on(torch.getId(), PuzzleEventType.LIT, () => {
        Logger.getInstance().log(`[Sandbox] Torch ${i + 1} lit`);
        const allLit = this.torches.every(t => t.isTorchLit());
        if (allLit) {
          this.objectiveManager?.completeObjective("light_torches");
          this.objectiveManager?.setObjective("find_exit", "Find the exit");
          this.showAllTorchesLitFeedback();
        }
      });
      bus.on(torch.getId(), PuzzleEventType.EXTINGUISHED, () => {
        Logger.getInstance().log(`[Sandbox] Torch ${i + 1} extinguished`);
      });
    }

    this.objectiveManager?.setObjective("open_door", "Pull the lever to open the door");
  }

  private showAllTorchesLitFeedback(): void {
    const flash = this.add.circle(CENTER_X + 200, CENTER_Y - 80, 60, 0xffaa00, 0.3);
    flash.setDepth(20);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      scale: 2,
      duration: 600,
      onComplete: () => flash.destroy(),
    });

    const text = this.add.text(CENTER_X + 200, CENTER_Y - 140, "All torches lit!", {
      fontSize: "18px",
      color: "#ffd700",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    });
    text.setOrigin(0.5);
    text.setDepth(20);
    text.setAlpha(0);
    this.tweens.add({
      targets: text,
      alpha: 1,
      y: text.y - 20,
      duration: 500,
      ease: "Power2",
      yoyo: true,
      hold: 1000,
      onComplete: () => text.destroy(),
    });
  }

  private handleInteraction(target: import("../systems/interaction/IInteractable").IInteractable): void {
    if (this.dialogueManager?.isActive()) return;

    if (target instanceof Lever) {
      target.interact();
    } else if (target instanceof MoveableCrate) {
      this.handleCratePush(target);
    } else if (target instanceof InteractableTorch) {
      target.interact();
    } else if (target instanceof InspectPoint) {
      target.interact();
    }
  }

  private handleCratePush(crate: MoveableCrate): void {
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

    crate.pushInDirection(dirX, dirY, (x, y) => this.checkCrateCollision(crate, x, y));
  }

  private checkCrateCollision(crate: MoveableCrate, x: number, y: number): boolean {
    const halfW = crate.getBodyWidth() / 2;
    const halfH = crate.getBodyHeight() / 2;
    for (const obj of this.worldObjects) {
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

    const bounds = this.physics.world.bounds;
    if (
      x - halfW < bounds.x ||
      x + halfW > bounds.x + bounds.width ||
      y - halfH < bounds.y ||
      y + halfH > bounds.y + bounds.height
    ) {
      return true;
    }

    return false;
  }

  update(time: number, delta: number): void {
    InputManager.getInstance().update();

    if (this.player) {
      this.player.update(time, delta);
    }

    if (this.cameraManager) {
      this.cameraManager.update(delta);
    }

    if (this.debugOverlay) {
      this.debugOverlay.update(time, delta);
    }

    if (this.pressurePlate && this.player && this.crate) {
      this.pressurePlate.checkOverlap([this.player, this.crate]);
    }

    for (const torch of this.torches) {
      torch.update(time, delta);
    }
  }
}
