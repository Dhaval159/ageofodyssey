import { IEnemyState } from "../states/IEnemyState";
import { EnemyAI } from "./EnemyAI";

export class EnemyStateMachine {
  private states: Map<string, IEnemyState> = new Map();
  private currentState: IEnemyState | null = null;
  private previousStateId: string | null = null;

  public registerState(state: IEnemyState): void {
    this.states.set(state.id, state);
  }

  public transitionTo(stateId: string, ai: EnemyAI): void {
    const nextState = this.states.get(stateId);
    if (!nextState) {
      console.warn(`EnemyStateMachine: state ${stateId} not registered`);
      return;
    }
    if (this.currentState && this.currentState.id === stateId) return;
    if (this.currentState) {
      this.currentState.exit(ai);
    }
    this.previousStateId = this.currentState?.id ?? null;
    this.currentState = nextState;
    this.currentState.enter(ai);
  }

  public update(ai: EnemyAI, dt: number): void {
    if (this.currentState) {
      this.currentState.update(ai, dt);
    }
  }

  public getCurrentStateId(): string | null {
    return this.currentState?.id ?? null;
  }

  public getPreviousStateId(): string | null {
    return this.previousStateId;
  }
}
