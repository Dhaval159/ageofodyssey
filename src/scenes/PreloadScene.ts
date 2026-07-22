import Phaser from "phaser";
import { Logger } from "../core/Logger";

/**
 * PreloadScene - Displays a loading bar while all game assets are loaded,
 * then transitions to MainMenuScene.
 */
export default class PreloadScene extends Phaser.Scene {
    constructor() {
        super({ key: "PreloadScene" });
    }

    preload(): void {
        // Display loading progress
        const { width, height } = this.scale;

        // Loading bar background
        const barBg = this.add.graphics();
        barBg.fillStyle(0x222222, 1);
        barBg.fillRect(width / 2 - 160, height / 2 - 15, 320, 30);

        // Loading bar fill
        const bar = this.add.graphics();

        // Progress text
        const loadingText = this.add.text(width / 2, height / 2 - 40, "Loading...", {
            fontSize: "20px",
            color: "#ffffff",
        });
        loadingText.setOrigin(0.5);

        // Track loading progress
        this.load.on("progress", (value: number) => {
            bar.clear();
            bar.fillStyle(0x00ff00, 1);
            bar.fillRect(width / 2 - 158, height / 2 - 13, 316 * value, 26);
        });

        this.load.on("complete", () => {
            Logger.getInstance().log("All assets loaded successfully");
        });

        // TODO: Load actual game assets here (sprites, audio, etc.)
        // For now we just load a placeholder
        // this.load.image("logo", "assets/images/logo.png");
    }

    create(): void {
        // Brief delay before transitioning to main menu
        this.time.delayedCall(500, () => {
            this.scene.start("MainMenuScene");
        });
    }
}

