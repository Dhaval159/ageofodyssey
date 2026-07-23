/**
 * Tracks the current and previous state of a single input action.
 */
export class InputState {
  private pressed: boolean = false;
  private held: boolean = false;
  private released: boolean = false;
  private justPressed: boolean = false;

  public setPressed(value: boolean): void {
    this.pressed = value;
  }

  public setHeld(value: boolean): void {
    this.held = value;
  }

  public setReleased(value: boolean): void {
    this.released = value;
  }

  public setJustPressed(value: boolean): void {
    this.justPressed = value;
  }

  public isPressed(): boolean {
    return this.pressed;
  }

  public isHeld(): boolean {
    return this.held;
  }

  public isReleased(): boolean {
    return this.released;
  }

  public wasJustPressed(): boolean {
    return this.justPressed;
  }

  public resetFrameState(): void {
    this.pressed = false;
    this.released = false;
    this.justPressed = false;
  }
}
