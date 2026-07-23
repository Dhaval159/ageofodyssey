import Phaser from "phaser";

/**
 * TransitionOverlay provides a full-screen overlay used for fade and custom transition effects.
 * Automatically redraws and resizes when the game viewport changes.
 */
export class TransitionOverlay {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private background: Phaser.GameObjects.Graphics;
  private resizeHandler: () => void;

  constructor(scene: Phaser.Scene, depth: number = 9999) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.background = scene.add.graphics();
    this.container.add(this.background);
    this.container.setDepth(depth);
    this.container.setVisible(false);

    this.resizeHandler = this.resize.bind(this);
    scene.scale.on("resize", this.resizeHandler);

    this.resize();
  }

  public resize(): void {
    const { width, height } = this.scene.scale;
    this.background.clear();
    this.background.fillStyle(0x000000, 1);
    this.background.fillRect(0, 0, width, height);
  }

  public show(duration: number = 500): Promise<void> {
    this.container.setAlpha(0);
    this.container.setVisible(true);

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 1,
        duration,
        ease: "Linear",
        onComplete: () => resolve(),
      });
    });
  }

  public hide(duration: number = 500): Promise<void> {
    this.container.setAlpha(1);

    return new Promise((resolve) => {
      this.scene.tweens.add({
        targets: this.container,
        alpha: 0,
        duration,
        ease: "Linear",
        onComplete: () => {
          this.container.setVisible(false);
          resolve();
        },
      });
    });
  }

  public destroy(): void {
    this.scene.scale.off("resize", this.resizeHandler);
    this.container.destroy();
  }
}
