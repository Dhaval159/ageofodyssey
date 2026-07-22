import Phaser from "phaser";

/**
 * BootScene - Handles initial game boot, loading essential assets,
 * and transitioning to PreloadScene.
 */
export default class BootScene extends Phaser.Scene {
    constructor() {
        super({ key: "BootScene" });
    }

    preload(): void {
        // Load any essential assets needed for the preload screen
        // For now, we just prepare the loader bar assets if needed
    }

    create(): void {
        this.scene.start("PreloadScene");
    }
}

