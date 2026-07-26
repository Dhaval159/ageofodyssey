import Phaser from "phaser";

export class InteractionPrompt {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private keyHint: Phaser.GameObjects.Text;
  private visible: boolean = false;
  private targetX: number = 0;
  private targetY: number = 0;
  private currentAlpha: number = 0;
  private fadeSpeed: number = 0.1;

  constructor(scene: Phaser.Scene) {
    this.keyHint = scene.add.text(0, 0, "[E]", {
      fontSize: "15px",
      color: "#ffcc00",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    });
    this.keyHint.setOrigin(0, 0.5);

    this.label = scene.add.text(0, 0, "", {
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 3,
    });
    this.label.setOrigin(0, 0.5);

    this.bg = scene.add.graphics();

    this.container = scene.add.container(0, 0, [this.bg, this.keyHint, this.label]);
    this.container.setDepth(2000);
    this.container.setAlpha(0);
    this.container.setScrollFactor(0);
  }

  public show(prompt: string, worldX: number, worldY: number): void {
    this.label.setText(prompt);
    this.targetX = worldX;
    this.targetY = worldY - 28;
    this.visible = true;
  }

  public hide(): void {
    this.visible = false;
  }

  public update(camera: Phaser.Cameras.Scene2D.Camera): void {
    if (!this.visible) {
      if (this.currentAlpha > 0.01) {
        this.currentAlpha = Phaser.Math.Linear(this.currentAlpha, 0, this.fadeSpeed * 2);
        this.container.setAlpha(this.currentAlpha);
      } else {
        this.container.setAlpha(0);
      }
      return;
    }

    const screenX = this.targetX - camera.scrollX;
    const screenY = this.targetY - camera.scrollY;

    this.container.setPosition(screenX, screenY);

    this.currentAlpha = Phaser.Math.Linear(this.currentAlpha, 1, this.fadeSpeed);
    this.container.setAlpha(this.currentAlpha);

    const keyW = this.keyHint.width + 8;
    const labelW = this.label.width + 8;
    const totalW = keyW + labelW + 10;
    const h = Math.max(this.keyHint.height, this.label.height) + 10;

    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.75);
    this.bg.fillRoundedRect(-totalW / 2 - 4, -h / 2, totalW + 8, h, 5);

    this.bg.lineStyle(2, 0xffcc00, 0.9);
    this.bg.strokeRoundedRect(-totalW / 2 - 4, -h / 2, totalW + 8, h, 5);

    this.keyHint.setPosition(-totalW / 2, 0);
    this.label.setPosition(-totalW / 2 + keyW + 6, 0);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
