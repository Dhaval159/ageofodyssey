import Phaser from "phaser";

/**
 * ScreenFadeSystem provides simple static fade helpers built on top of Phaser cameras.
 */
export class ScreenFadeSystem {
  public static fadeOut(scene: Phaser.Scene, duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      scene.cameras.main.fadeOut(duration, 0, 0, 0);
      scene.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE,
        resolve
      );
    });
  }

  public static fadeIn(scene: Phaser.Scene, duration: number = 500): Promise<void> {
    return new Promise((resolve) => {
      scene.cameras.main.fadeIn(duration, 0, 0, 0);
      scene.cameras.main.once(
        Phaser.Cameras.Scene2D.Events.FADE_IN_COMPLETE,
        resolve
      );
    });
  }
}
