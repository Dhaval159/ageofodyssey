import Phaser from "phaser";
import { GAME_CONFIG } from "../constants/GameConstants";
import { Logger } from "../core/Logger";

/**
 * MainMenuScene - Displays the game title and menu options.
 * Player can start a new game or view other options.
 */
export default class MainMenuScene extends Phaser.Scene {
    constructor() {
        super({ key: "MainMenuScene" });
    }

    create(): void {
        const { width, height } = this.scale;

        // Title text
        const title = this.add.text(width / 2, height / 3, GAME_CONFIG.NAME, {
            fontSize: "48px",
            color: "#ffd700",
            fontStyle: "bold",
            stroke: "#000000",
            strokeThickness: 6,
        });
        title.setOrigin(0.5);

        // Start button
        const startText = this.add.text(width / 2, height / 2, "Start Game", {
            fontSize: "28px",
            color: "#ffffff",
        });
        startText.setOrigin(0.5);
        startText.setInteractive({ useHandCursor: true });

        startText.on("pointerover", () => {
            startText.setColor("#00ff00");
        });

        startText.on("pointerout", () => {
            startText.setColor("#ffffff");
        });

        startText.on("pointerdown", () => {
            Logger.getInstance().log("Starting game...");
            this.scene.start("GameScene");
        });

        // Version text
        const versionText = this.add.text(width - 10, height - 10, `v${GAME_CONFIG.VERSION}`, {
            fontSize: "14px",
            color: "#888888",
        });
        versionText.setOrigin(1, 1);

        Logger.getInstance().log("MainMenuScene displayed");
    }
}

