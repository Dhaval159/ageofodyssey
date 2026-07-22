/**
 * Resolution and Screen Scaling Management
 */
export class ResolutionManager {
  private static instance: ResolutionManager;

  private constructor() {}

  public static getInstance(): ResolutionManager {
    if (!ResolutionManager.instance) {
      ResolutionManager.instance = new ResolutionManager();
    }
    return ResolutionManager.instance;
  }

  public getScreenWidth(): number {
    return window.innerWidth || 1280;
  }

  public getScreenHeight(): number {
    return window.innerHeight || 720;
  }

  public getOptimalScale(baseWidth: number, baseHeight: number): number {
    const screenRatio = this.getScreenWidth() / this.getScreenHeight();
    const baseRatio = baseWidth / baseHeight;
    return screenRatio > baseRatio
      ? this.getScreenHeight() / baseHeight
      : this.getScreenWidth() / baseWidth;
  }

  public getResolutionKey(): string {
    const width = this.getScreenWidth();
    const height = this.getScreenHeight();
    return `${width}x${height}`;
  }
}