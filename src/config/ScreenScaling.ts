import { Logger } from "../core/Logger";

/**
 * Screen scaling configuration for different resolutions
 */
export class ScreenScaling {
  private static instance: ScreenScaling;
  private zoom: number = 1;

  private constructor() { }

  public static getInstance(): ScreenScaling {
    if (!ScreenScaling.instance) {
      ScreenScaling.instance = new ScreenScaling();
    }
    return ScreenScaling.instance;
  }

  public updateScale(width: number, height: number): void {
    const baseWidth: number = 1280;
    const baseHeight: number = 720;

    this.zoom = Math.min(
      width / baseWidth,
      height / baseHeight
    );

    Logger.getInstance().log("Updated scale to " + this.zoom);
  }
}
