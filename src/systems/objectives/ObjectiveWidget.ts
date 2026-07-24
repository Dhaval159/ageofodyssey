import Phaser from "phaser";

export class ObjectiveWidget {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private label: Phaser.GameObjects.Text;
  private icon: Phaser.GameObjects.Graphics;
  private isVisible: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    const { width } = scene.scale;

    this.bg = scene.add.graphics();
    this.icon = scene.add.graphics();
    this.label = scene.add.text(0, 0, "", {
      fontSize: "18px",
      color: "#ffd700",
      fontStyle: "bold",
      wordWrap: { width: 350 },
    });

    this.container = scene.add.container(width, 60, [this.bg, this.icon, this.label]);
    this.container.setDepth(950);
    this.container.setScrollFactor(0);
    this.container.setAlpha(0);
  }

  public show(objective: string): void {
    this.label.setText(objective);

    const w = this.label.width + 50;
    const h = this.label.height + 20;
    const { width } = this.scene.scale;

    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.75);
    this.bg.fillRoundedRect(-w, -h / 2, w, h, 6);
    this.bg.lineStyle(1, 0xffd700, 0.5);
    this.bg.strokeRoundedRect(-w, -h / 2, w, h, 6);

    this.icon.clear();
    this.icon.fillStyle(0xffd700, 1);
    this.icon.fillCircle(-w + 15, 0, 4);

    this.label.setPosition(-w + 28, -this.label.height / 2);
    this.container.setX(width + 20);

    this.isVisible = true;

    this.scene.tweens.add({
      targets: this.container,
      x: width,
      alpha: 1,
      duration: 500,
      ease: "Power3",
    });
  }

  public hide(): void {
    if (!this.isVisible) return;
    this.isVisible = false;

    const { width } = this.scene.scale;
    this.scene.tweens.add({
      targets: this.container,
      x: width + 50,
      alpha: 0,
      duration: 400,
      ease: "Power2",
    });
  }

  public update(_delta: number): void {
    if (!this.isVisible) return;

    const { width } = this.scene.scale;

    if (this.container.x > width - 10) {
      this.container.setAlpha(Phaser.Math.Linear(this.container.alpha, 1, 0.1));
    } else {
      this.container.setAlpha(1);
    }
  }

  public destroy(): void {
    this.container.destroy();
  }
}
