import Phaser from "phaser";

export class UIHelpers {
  public static createOverlay(scene: Phaser.Scene): Phaser.GameObjects.Graphics {
    const { width, height } = scene.scale;
    const overlay = scene.add.graphics();
    overlay.fillStyle(0x000000, 0.7);
    overlay.fillRect(0, 0, width, height);
    return overlay;
  }

  public static createLoadingBar(scene: Phaser.Scene): {
    container: Phaser.GameObjects.Container;
    bg: Phaser.GameObjects.Graphics;
    fill: Phaser.GameObjects.Graphics;
    percentText: Phaser.GameObjects.Text;
  } {
    const { width, height } = scene.scale;
    const barWidth = 400;
    const barHeight = 24;
    const barX = width / 2 - barWidth / 2;
    const barY = height / 2;

    const container = scene.add.container(0, 0);

    const bg = scene.add.graphics();
    bg.fillStyle(0x222222, 1);
    bg.fillRoundedRect(barX, barY, barWidth, barHeight, 8);
    container.add(bg);

    const fill = scene.add.graphics();
    container.add(fill);

    const percentText = scene.add.text(width / 2, barY - 40, "0%", {
      fontSize: "20px",
      color: "#ffffff",
    });
    percentText.setOrigin(0.5);
    container.add(percentText);

    return { container, bg, fill, percentText };
  }

  public static updateLoadingBar(
    fill: Phaser.GameObjects.Graphics,
    percentText: Phaser.GameObjects.Text,
    progress: number
  ): void {
    const barWidth = 400;
    const barHeight = 24;
    const barX = fill.scene.scale.width / 2 - barWidth / 2;
    const barY = fill.scene.scale.height / 2;

    fill.clear();
    fill.fillStyle(0x00c800, 1);
    fill.fillRoundedRect(barX + 2, barY + 2, (barWidth - 4) * progress, barHeight - 4, 6);

    const percent = Math.floor(progress * 100);
    percentText.setText(`${percent}%`);
  }

  public static createTitleText(
    scene: Phaser.Scene,
    text: string,
    x: number,
    y: number
  ): Phaser.GameObjects.Text {
    const gameText = scene.add.text(x, y, text, {
      fontSize: "56px",
      color: "#ffd700",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 6,
    });
    gameText.setOrigin(0.5);
    return gameText;
  }

  public static fadeOutScene(
    scene: Phaser.Scene,
    duration: number,
    onComplete?: () => void
  ): void {
    scene.cameras.main.fadeOut(duration, 0, 0, 0);
    scene.cameras.main.once(
      Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
      () => {
        if (onComplete) onComplete();
      }
    );
  }

  /**
   * Adjusts a UI element (typically with scrollFactor = 0) to maintain its visual position and scale on screen
   * regardless of the camera's zoom level.
   */
  public static adjustForZoom(
    element: { setScale: Function; setPosition: Function; scene: Phaser.Scene },
    originalX: number,
    originalY: number,
    originalScale: number = 1.0
  ): void {
    const camera = element.scene.cameras.main;
    const z = camera.zoom;
    element.setScale(originalScale / z);
    element.setPosition(
      camera.width / 2 + (originalX - camera.width / 2) / z,
      camera.height / 2 + (originalY - camera.height / 2) / z
    );
  }
}
