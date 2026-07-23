import Phaser from "phaser";
import { GAME_CONFIG, UI } from "../constants/GameConstants";
import { Logger } from "../core/Logger";
import { AssetManager } from "../core/AssetManager";
import { SceneTransitionManager } from "../core/SceneTransitionManager";
import { GameStateManager } from "../core/GameStateManager";
import { GameState } from "../core/GameStateManager";

export default class PreloadScene extends Phaser.Scene {
  private fill: Phaser.GameObjects.Graphics | null = null;
  private percentText: Phaser.GameObjects.Text | null = null;
  private transitionScheduled: boolean = false;

  constructor() {
    super({ key: "PreloadScene" });
  }

  preload(): void {
    const { width, height } = this.scale;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f0f23, 1);
    bg.fillRect(0, 0, width, height);

    const title = this.add.text(width / 2, height / 3, GAME_CONFIG.NAME, {
      fontSize: "36px",
      color: "#ffd700",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 4,
    });
    title.setOrigin(0.5);

    const barWidth = UI.LOADING.BAR_WIDTH;
    const barHeight = UI.LOADING.BAR_HEIGHT;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    const barBg = this.add.graphics();
    barBg.fillStyle(UI.LOADING.BG_COLOR, 1);
    barBg.fillRoundedRect(barX, barY, barWidth, barHeight, 8);

    this.fill = this.add.graphics();

    this.percentText = this.add.text(width / 2, barY - UI.LOADING.PERCENT_OFFSET_Y, "0%", {
      fontSize: UI.LOADING.FONT_SIZE,
      color: UI.LOADING.TEXT_COLOR,
    });
    this.percentText.setOrigin(0.5);

    const transitionManager = SceneTransitionManager.getInstance();
    transitionManager.initialize(this);

    this.load.on("progress", (value: number) => {
      this.updateProgress(value);
    });

    this.load.on("complete", () => {
      Logger.getInstance().log("All assets loaded successfully");
      this.scheduleTransition();
    });

    const assetManager = AssetManager.getInstance();
    assetManager.initialize(this);
    assetManager.loadAll();
  }

  create(): void {
    this.cameras.main.fadeIn(300, 0, 0, 0);
    GameStateManager.getInstance().setState(GameState.LOADING);

    if (this.load.totalToLoad === 0 && !this.transitionScheduled) {
      this.updateProgress(1);
      this.scheduleTransition();
    }
  }

  private scheduleTransition(): void {
    if (this.transitionScheduled) return;
    this.transitionScheduled = true;

    SceneTransitionManager.getInstance().transitionTo("MainMenuScene", {
      preDelay: 400,
      fadeDuration: 500,
    });
  }

  private updateProgress(value: number): void {
    if (!this.fill || !this.percentText) return;

    const { width } = this.scale;
    const barWidth = UI.LOADING.BAR_WIDTH;
    const barHeight = UI.LOADING.BAR_HEIGHT;
    const barX = width / 2 - barWidth / 2;
    const barY = this.scale.height / 2;

    this.fill.clear();
    this.fill.fillStyle(0x00c800, 1);
    this.fill.fillRoundedRect(
      barX + 2,
      barY + 2,
      (barWidth - 4) * value,
      barHeight - 4,
      6
    );

    const percent = Math.floor(value * 100);
    this.percentText.setText(`${percent}%`);
  }
}
