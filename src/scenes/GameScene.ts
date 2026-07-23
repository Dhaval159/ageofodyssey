import Phaser from "phaser";
import { Logger } from "../core/Logger";
import { SceneTransitionManager } from "../core/SceneTransitionManager";
import { GAME_CONFIG } from "../constants/GameConstants";

/**
 * GameScene - The main gameplay scene where the game world is rendered
 * and game logic is executed.
 */
export default class GameScene extends Phaser.Scene {
    constructor() {
        super({ key: "GameScene" });
    }

    create(): void {
        const { width, height } = this.scale;

        this.cameras.main.setBackgroundColor(GAME_CONFIG.BACKGROUND_COLOR);
        Logger.getInstance().log("GameScene started");

        const transitionManager = SceneTransitionManager.getInstance();
        transitionManager.initialize(this);

        const text = this.add.text(width / 2, height / 2, "Game World", {
            fontSize: "36px",
            color: "#ffffff",
        });
        text.setOrigin(0.5);

        const backText = this.add.text(width / 2, height / 2 + 60, "Back to Menu", {
            fontSize: "20px",
            color: "#aaaaaa",
        });
        backText.setOrigin(0.5);
        backText.setInteractive({ useHandCursor: true });

        backText.on("pointerover", () => backText.setColor("#ff4444"));
        backText.on("pointerout", () => backText.setColor("#aaaaaa"));
        backText.on("pointerdown", () => {
            transitionManager.transitionTo("MainMenuScene", { fadeDuration: 500 });
        });
    }
}
