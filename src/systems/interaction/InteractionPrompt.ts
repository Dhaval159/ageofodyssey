import Phaser from "phaser";

export class InteractionPrompt {
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private visible: boolean = false;
  private targetX: number = 0;
  private targetY: number = 0;
  private currentAlpha: number = 0;

  constructor(scene: Phaser.Scene) {
    this.bg = scene.add.graphics();
    this.label = scene.add.text(0, 0, "", {
      fontSize: "14px",
      color: "#ffffff",
      fontStyle: "bold",
    });
    this.label.setOrigin(0.5, 1);
    this.container = scene.add.container(0, 0, [this.bg, this.label]);
    this.container.setDepth(1000);
    this.container.setAlpha(0);
    this.container.setScrollFactor(0);
  }

  public show(prompt: string, worldX: number, worldY: number): void {
    this.label.setText(prompt);
    this.targetX = worldX;
    this.targetY = worldY - 20;
    this.visible = true;
  }

  public hide(): void {
    this.visible = false;
  }

  public update(camera: Phaser.Cameras.Scene2D.Camera): void {
    if (!this.visible) {
      this.currentAlpha = 0;
      this.container.setAlpha(0);
      return;
    }

    const screenX = this.targetX - camera.scrollX;
    const screenY = this.targetY - camera.scrollY;

    this.container.setPosition(screenX, screenY);
    this.currentAlpha = Phaser.Math.Linear(this.currentAlpha, 1, 0.15);
    this.container.setAlpha(this.currentAlpha);

    const w = this.label.width + 20;
    const h = this.label.height + 8;
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.7);
    this.bg.fillRoundedRect(-w / 2, -h - 4, w, h + 4, 4);
    this.bg.lineStyle(1, 0xffd700, 0.8);
    this.bg.strokeRoundedRect(-w / 2, -h - 4, w, h + 4, 4);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
