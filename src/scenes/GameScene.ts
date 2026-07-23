import Phaser from "phaser";
import { Logger } from "../core/Logger";
import { SceneTransitionManager } from "../core/SceneTransitionManager";
import { GAME_CONFIG } from "../constants/GameConstants";
import { InputManager } from "../core/InputManager";
import { InputContext } from "../constants/InputContext";
import { Player } from "../entities/player/Player";
import { DEFAULT_PLAYER_CONFIG, IPlayerConfig } from "../entities/player/PlayerConfig";

import { WorldManager } from "../managers/WorldManager";
import { CameraManager } from "../systems/camera/CameraManager";
import { WORLD_CONSTANTS } from "../constants/WorldConstants";
import { DebugOverlay } from "../systems/debug/DebugOverlay";

export default class GameScene extends Phaser.Scene {
  private worldManager: WorldManager | null = null;
  private cameraManager: CameraManager | null = null;
  private player: Player | null = null;
  private debugOverlay: DebugOverlay | null = null;

  constructor() {
    super({ key: "GameScene" });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(GAME_CONFIG.BACKGROUND_COLOR);
    Logger.getInstance().log("GameScene started");

    const transitionManager = SceneTransitionManager.getInstance();
    transitionManager.initialize(this);

    InputManager.getInstance().initialize(this, {
      bindingsProfile: InputContext.createFilteredBindings(InputContext.GAMEPLAY),
    });

    this.worldManager = WorldManager.initialize(this);

    const wb = this.worldManager.getWorldBounds();
    this.physics.world.setBounds(wb.x, wb.y, wb.width, wb.height);

    const spawnX = wb.width / 2;
    const spawnY = wb.height / 2;

    const playerConfig: IPlayerConfig = {
      ...DEFAULT_PLAYER_CONFIG,
      camera: {
        lerpX: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_X,
        lerpY: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_Y,
        deadzoneWidth: WORLD_CONSTANTS.CAMERA.DEADZONE_WIDTH,
        deadzoneHeight: WORLD_CONSTANTS.CAMERA.DEADZONE_HEIGHT,
      },
    };

    this.player = new Player(this, spawnX, spawnY, playerConfig);
    this.worldManager.setPlayer(this.player);

    this.cameraManager = new CameraManager(this.cameras.main, {
      lerpX: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_X,
      lerpY: WORLD_CONSTANTS.CAMERA.FOLLOW_LERP_Y,
      worldBounds: {
        x: wb.x,
        y: wb.y,
        width: wb.width,
        height: wb.height,
      },
      deadzoneWidth: WORLD_CONSTANTS.CAMERA.DEADZONE_WIDTH,
      deadzoneHeight: WORLD_CONSTANTS.CAMERA.DEADZONE_HEIGHT,
      lookAheadFactor: WORLD_CONSTANTS.CAMERA.LOOK_AHEAD_FACTOR,
      minZoom: WORLD_CONSTANTS.CAMERA.MIN_ZOOM,
      maxZoom: WORLD_CONSTANTS.CAMERA.MAX_ZOOM,
    });
    this.cameraManager.follow(this.player);

    this.debugOverlay = new DebugOverlay(this);
    this.debugOverlay.setCameraManager(this.cameraManager);
    this.debugOverlay.setPlayer(this.player);

    this.createInstructions();
  }

  private createInstructions(): void {
    const { width, height } = this.scale;
    const instructions = this.add.text(16, 16, "Move: WASD/Arrows | Run: Hold Shift\nF3: Debug | Back to Menu: Click text below", {
      fontSize: "16px",
      color: "#88aaff",
      backgroundColor: "#00000088",
      padding: { x: 8, y: 8 },
    });
    instructions.setScrollFactor(0);

    const backText = this.add.text(width / 2, height - 40, "Back to Menu", {
      fontSize: "20px",
      color: "#aaaaaa",
      backgroundColor: "#000000aa",
      padding: { x: 12, y: 6 },
    });
    backText.setOrigin(0.5);
    backText.setInteractive({ useHandCursor: true });
    backText.setScrollFactor(0);

    backText.on("pointerover", () => backText.setColor("#ff4444"));
    backText.on("pointerout", () => backText.setColor("#aaaaaa"));
    backText.on("pointerdown", () => {
      SceneTransitionManager.getInstance().transitionTo("MainMenuScene", { fadeDuration: 500 });
    });
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
  }
}
