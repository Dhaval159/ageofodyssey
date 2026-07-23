import { AnimationId, AnimationTransition } from "./AnimationConfig";

export class AnimationStateMachine {
  private currentState: AnimationId;
  private previousState: AnimationId | null = null;
  private transitions: AnimationTransition[];
  private onStateChange: ((from: AnimationId, to: AnimationId) => void) | null = null;

  constructor(defaultState: AnimationId, transitions: AnimationTransition[]) {
    this.currentState = defaultState;
    this.transitions = transitions;
  }

  public requestTransition(to: AnimationId): boolean {
    if (to === this.currentState) return false;

    const allowed =
      this.transitions.some((t) => t.from === this.currentState && t.to === to) ||
      this.isEmergencyTransition(to);

    if (allowed) {
      this.previousState = this.currentState;
      this.currentState = to;
      if (this.onStateChange) {
        this.onStateChange(this.previousState, to);
      }
      return true;
    }
    return false;
  }

  private isEmergencyTransition(to: AnimationId): boolean {
    return to === AnimationId.HURT || to === AnimationId.DEATH;
  }

  public getCurrentState(): AnimationId {
    return this.currentState;
  }

  public getPreviousState(): AnimationId | null {
    return this.previousState;
  }

  public setOnStateChange(callback: (from: AnimationId, to: AnimationId) => void): void {
    this.onStateChange = callback;
  }

  public getTransitions(): AnimationTransition[] {
    return this.transitions;
  }
}
