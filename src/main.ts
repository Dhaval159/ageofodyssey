import Phaser from "phaser";
import BootScene from "./scenes/BootScene";
import PreloadScene from "./scenes/PreloadScene";
import MainMenuScene from "./scenes/MainMenuScene";
import GameScene from "./scenes/GameScene";
import { GAME_CONFIG } from "./constants/GameConstants";
import { Logger } from "./core/Logger";

Logger.getInstance().log("Initializing game...");

const config: Phaser.Types.Core.GameConfig = {
    type: Phaser.AUTO,
    width: GAME_CONFIG.WIDTH,
    height: GAME_CONFIG.HEIGHT,
    parent: "game-container",
    backgroundColor: "#0f0f23",
    scale: {
        mode: Phaser.Scale.FIT,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    physics: {
        default: "arcade",
        arcade: {
            gravity: { x: 0, y: GAME_CONFIG.GRAVITY_FORCE },
            debug: GAME_CONFIG.DEBUG_MODE,
        },
    },
    scene: [BootScene, PreloadScene, MainMenuScene, GameScene],
};

new Phaser.Game(config);

Logger.getInstance().log("Game initialized successfully");

