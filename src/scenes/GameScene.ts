import Phaser from "phaser";
import { Logger } from "../core/Logger";
import { SceneTransitionManager } from "../core/SceneTransitionManager";
import { GAME_CONFIG } from "../constants/GameConstants";
import { Player } from "../entities/player/Player";
import { InputManager } from "../core/InputManager";
import { InputContext } from "../constants/InputContext";
import { CameraController } from "../systems/camera/CameraController";

/**
 * GameScene - The main gameplay scene where the game world is rendered
 * and game logic is executed.
 */
export default class GameScene extends Phaser.Scene {
    private player: Player | null = null;
    private cameraController: CameraController | null = null;

    constructor() {
        super({ key: "GameScene" });
    }

    create(): void {
        const { width, height } = this.scale;
        const worldWidth = 2000;
        const worldHeight = 2000;

        this.cameras.main.setBackgroundColor(GAME_CONFIG.BACKGROUND_COLOR);
        Logger.getInstance().log("GameScene started");

        // Set up physics world bounds
        this.physics.world.setBounds(0, 0, worldWidth, worldHeight);

        // Initialize transition manager
        const transitionManager = SceneTransitionManager.getInstance();
        transitionManager.initialize(this);

        // Initialize input context for gameplay
        InputManager.getInstance().initialize(this, {
            bindingsProfile: InputContext.createFilteredBindings(InputContext.GAMEPLAY),
        });

        // Spawn player at center of the game world
        const spawnX = worldWidth / 2;
        const spawnY = worldHeight / 2;
        this.player = new Player(this, spawnX, spawnY);

        // Create background grid and static obstacle blocks
        this.createWorldObjects(worldWidth, worldHeight);

        // Setup camera controller
        const playerConfig = this.player.getController().getConfig();
        this.cameraController = new CameraController(this.cameras.main, {
            lerpX: playerConfig.camera.lerpX,
            lerpY: playerConfig.camera.lerpY,
            deadzoneWidth: playerConfig.camera.deadzoneWidth,
            deadzoneHeight: playerConfig.camera.deadzoneHeight,
            bounds: { x: 0, y: 0, width: worldWidth, height: worldHeight },
        });
        this.cameraController.follow(this.player);

        // Add visual text overlay instructions
        const instructions = this.add.text(16, 16, "Move: WASD/Arrows | Run: Hold Shift\nBack to Menu: Click text below", {
            fontSize: "16px",
            color: "#88aaff",
            backgroundColor: "#00000088",
            padding: { x: 8, y: 8 },
        });
        instructions.setScrollFactor(0); // Fix to screen

        const backText = this.add.text(width / 2, height - 40, "Back to Menu", {
            fontSize: "20px",
            color: "#aaaaaa",
            backgroundColor: "#000000aa",
            padding: { x: 12, y: 6 },
        });
        backText.setOrigin(0.5);
        backText.setInteractive({ useHandCursor: true });
        backText.setScrollFactor(0); // Fix to screen

        backText.on("pointerover", () => backText.setColor("#ff4444"));
        backText.on("pointerout", () => backText.setColor("#aaaaaa"));
        backText.on("pointerdown", () => {
            transitionManager.transitionTo("MainMenuScene", { fadeDuration: 500 });
        });
    }

    update(time: number, delta: number): void {
        // Evaluate input events for this frame
        InputManager.getInstance().update();

        // Update player logic and position
        if (this.player) {
            this.player.update(time, delta);
        }

        // Update camera system
        if (this.cameraController) {
            this.cameraController.update();
        }
    }

    private createWorldObjects(worldWidth: number, worldHeight: number): void {
        // Draw grid lines
        const grid = this.add.graphics();
        grid.lineStyle(1, 0x2e2e4f, 0.5);
        for (let x = 0; x < worldWidth; x += 80) {
            grid.lineBetween(x, 0, x, worldHeight);
        }
        for (let y = 0; y < worldHeight; y += 80) {
            grid.lineBetween(0, y, worldWidth, y);
        }

        // Draw boundary border
        const boundary = this.add.graphics();
        boundary.lineStyle(6, 0xff5555, 0.4);
        boundary.strokeRect(0, 0, worldWidth, worldHeight);

        // Spawn some obstacles (pillars/blocks)
        for (let i = 0; i < 20; i++) {
            const px = Phaser.Math.Between(100, worldWidth - 100);
            const py = Phaser.Math.Between(100, worldHeight - 100);
            const size = Phaser.Math.Between(50, 90);

            // Avoid spawning on player position
            if (Phaser.Math.Distance.Between(px, py, worldWidth / 2, worldHeight / 2) > 150) {
                const block = this.add.rectangle(px, py, size, size, 0x22223b);
                block.setStrokeStyle(2, 0x4a4e69);
                this.physics.add.existing(block, true); // static physics body
                
                // Add collision between player and block
                if (this.player) {
                    this.physics.add.collider(this.player, block);
                }
            }
        }
    }
}

