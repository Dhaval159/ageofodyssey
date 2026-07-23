import Phaser from "phaser";
import { PlayerController } from "./PlayerController";
import { PlayerInputBridge } from "./PlayerInputBridge";
import { DEFAULT_PLAYER_CONFIG, IPlayerConfig } from "./PlayerConfig";

export class Player extends Phaser.GameObjects.Container {
  private controller: PlayerController;
  private inputBridge: PlayerInputBridge;
  private bodyRect: Phaser.GameObjects.Rectangle;
  private directionIndicator: Phaser.GameObjects.Arc;

  constructor(
    scene: Phaser.Scene,
    x: number,
    y: number,
    config: IPlayerConfig = DEFAULT_PLAYER_CONFIG
  ) {
    super(scene, x, y);

    // Initialize controller and input bridge
    this.controller = new PlayerController(config);
    this.controller.setPosition(x, y);
    this.inputBridge = new PlayerInputBridge();

    // Visual placeholder - Colored Rectangle
    this.bodyRect = scene.add.rectangle(
      0,
      0,
      config.size.width,
      config.size.height,
      config.color
    );
    this.bodyRect.setStrokeStyle(2, 0xffffff, 0.8);
    this.add(this.bodyRect);

    // Direction Indicator - Gold Circle
    this.directionIndicator = scene.add.circle(0, 16, 6, 0xffd700);
    this.add(this.directionIndicator);

    // Add to scene
    scene.add.existing(this);

    // Enable physics
    scene.physics.add.existing(this);
    const body = this.body as Phaser.Physics.Arcade.Body;
    body.setSize(config.size.width, config.size.height);
    body.setOffset(-config.size.width / 2, -config.size.height / 2);
    body.setCollideWorldBounds(true);
    body.setGravity(0, 0);
    body.setAllowGravity(false);
  }

  public getController(): PlayerController {
    return this.controller;
  }

  public update(_time: number, delta: number): void {
    const dt = delta / 1000;

    // Get input and update controller
    const input = this.inputBridge.getInput();
    this.controller.update(dt, input);

    // Sync visual body and indicator positions
    const body = this.body as Phaser.Physics.Arcade.Body;

    // Apply controller velocity to Phaser physics body
    const velocity = this.controller.getVelocity();
    body.setVelocity(velocity.x, velocity.y);

    // Sync controller logical position back from Phaser (since Phaser resolves physics/collisions)
    this.controller.setPosition(this.x, this.y);

    // Update direction indicator relative to facing direction
    const dir = this.controller.getFacingDirection();
    const distance = 16;
    this.directionIndicator.setPosition(dir.x * distance, dir.y * distance);
  }
}
