import Phaser from "phaser";
import { GAME_CONFIG, UI } from "../constants/GameConstants";
import { AssetKeys } from "../constants/AssetKeys";
import { Logger } from "../core/Logger";
import { SceneTransitionManager } from "../core/SceneTransitionManager";
import { SceneManager } from "../core/SceneManager";
import { GameStateManager } from "../core/GameStateManager";
import { GameState } from "../core/GameStateManager";

export default class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: "BootScene" });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(GAME_CONFIG.BACKGROUND_COLOR);
    GameStateManager.getInstance().setState(GameState.BOOTING);
    Logger.getInstance().log("BootScene started");

    const sceneManager = SceneManager.getInstance();
    sceneManager.register(this);
    sceneManager.setCurrentScene(this.scene.key);

    const transitionManager = SceneTransitionManager.getInstance();
    transitionManager.initialize(this);

    this.generateTextures();
    Logger.getInstance().log("Core textures generated");

    Logger.getInstance().log(
      `Boot initialization complete -> transitioning to PreloadScene`
    );

    transitionManager.transitionTo("PreloadScene", { fadeDuration: 300 });
  }

  private generateTextures(): void {
    const createRoundedRectTexture = (
      key: string,
      w: number,
      h: number,
      radius: number,
      color: number
    ): void => {
      const graphics = this.make.graphics();
      graphics.fillStyle(color, 1);
      graphics.fillRoundedRect(0, 0, w, h, radius);
      graphics.generateTexture(key, w, h);
      graphics.destroy();
    };

    createRoundedRectTexture(
      AssetKeys.UI_BUTTON_NORMAL,
      UI.BUTTON.WIDTH,
      UI.BUTTON.HEIGHT,
      UI.BUTTON.BORDER_RADIUS,
      0x323250
    );
    createRoundedRectTexture(
      AssetKeys.UI_BUTTON_HOVER,
      UI.BUTTON.WIDTH,
      UI.BUTTON.HEIGHT,
      UI.BUTTON.BORDER_RADIUS,
      0x505078
    );
    createRoundedRectTexture(
      AssetKeys.UI_BUTTON_ACTIVE,
      UI.BUTTON.WIDTH,
      UI.BUTTON.HEIGHT,
      UI.BUTTON.BORDER_RADIUS,
      0x7878a0
    );
  }
}
