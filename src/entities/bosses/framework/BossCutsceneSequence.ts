import Phaser from "phaser";
import { DialogueManager } from "../../../systems/dialogue/DialogueManager";
import { AudioManager } from "../../../systems/audio/AudioManager";
import { GameStateManager, GameState } from "../../../core/GameStateManager";
import { Logger } from "../../../core/Logger";

export type CutsceneStepType =
  | "PAN"
  | "ZOOM"
  | "DIALOGUE"
  | "WAIT"
  | "SHAKE"
  | "SFX"
  | "MUSIC"
  | "PARTICLES"
  | "FADE"
  | "CUSTOM";

export interface CutsceneStep {
  type: CutsceneStepType;
  params?: any;
}

export class BossCutsceneSequence {
  private scene: Phaser.Scene;
  private steps: CutsceneStep[] = [];
  private currentStepIndex: number = 0;
  private onCompleteCallback: (() => void) | null = null;
  private isRunning: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  public start(steps: CutsceneStep[], onComplete: () => void): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.steps = steps;
    this.currentStepIndex = 0;
    this.onCompleteCallback = onComplete;

    Logger.getInstance().log("[BossCutsceneSequence] Started cinematic sequence");
    
    // Disable standard camera follow and lock input
    GameStateManager.getInstance().setState(GameState.CUTSCENE);

    this.executeNextStep();
  }

  private executeNextStep(): void {
    if (this.currentStepIndex >= this.steps.length) {
      this.complete();
      return;
    }

    const step = this.steps[this.currentStepIndex];
    this.currentStepIndex++;

    Logger.getInstance().log(`[BossCutsceneSequence] Executing step: ${step.type}`);

    const next = () => this.executeNextStep();

    switch (step.type) {
      case "PAN":
        this.handlePan(step.params, next);
        break;
      case "ZOOM":
        this.handleZoom(step.params, next);
        break;
      case "DIALOGUE":
        this.handleDialogue(step.params, next);
        break;
      case "WAIT":
        this.handleWait(step.params, next);
        break;
      case "SHAKE":
        this.handleShake(step.params, next);
        break;
      case "SFX":
        this.handleSFX(step.params, next);
        break;
      case "MUSIC":
        this.handleMusic(step.params, next);
        break;
      case "PARTICLES":
        this.handleParticles(step.params, next);
        break;
      case "FADE":
        this.handleFade(step.params, next);
        break;
      case "CUSTOM":
        if (step.params && typeof step.params.action === "function") {
          step.params.action(this.scene, next);
        } else {
          next();
        }
        break;
      default:
        Logger.getInstance().warn(`[BossCutsceneSequence] Unknown step type: ${step.type}`);
        next();
    }
  }

  private handlePan(params: any, next: () => void): void {
    const x = params.x;
    const y = params.y;
    const duration = params.duration ?? 1000;
    const ease = params.ease ?? "Sine.easeInOut";

    this.scene.cameras.main.pan(x, y, duration, ease, false, (_cam: any, progress: number) => {
      if (progress === 1) {
        // pan complete
        next();
      }
    });
  }

  private handleZoom(params: any, next: () => void): void {
    const zoom = params.zoom ?? 1;
    const duration = params.duration ?? 1000;
    const ease = params.ease ?? "Sine.easeInOut";

    this.scene.cameras.main.zoomTo(zoom, duration, ease, false, (_cam: any, progress: number) => {
      if (progress === 1) {
        next();
      }
    });
  }

  private handleDialogue(params: any, next: () => void): void {
    const dialogueManager = DialogueManager.getInstance();
    dialogueManager.start({
      lines: params.lines,
      onEnd: () => {
        next();
      }
    });
  }

  private handleWait(params: any, next: () => void): void {
    const duration = params.duration ?? 1000;
    this.scene.time.delayedCall(duration, next);
  }

  private handleShake(params: any, next: () => void): void {
    const duration = params.duration ?? 500;
    const intensity = params.intensity ?? 0.005;

    this.scene.cameras.main.shake(duration, intensity);
    
    if (params.wait === true) {
      this.scene.time.delayedCall(duration, next);
    } else {
      next();
    }
  }

  private handleSFX(params: any, next: () => void): void {
    const key = params.key;
    const volume = params.volume ?? 1.0;
    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized() && this.scene.cache.audio.has(key)) {
        audioManager.getSFXPlayer().play(key, { volume });
      }
    } catch {}
    next();
  }

  private handleMusic(params: any, next: () => void): void {
    const key = params.key;
    const loop = params.loop ?? true;
    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized() && this.scene.cache.audio.has(key)) {
        audioManager.getMusicPlayer().play(key, { loop });
      }
    } catch {}
    next();
  }

  private handleParticles(params: any, next: () => void): void {
    if (params && typeof params.trigger === "function") {
      params.trigger(this.scene);
    }
    next();
  }

  private handleFade(params: any, next: () => void): void {
    const direction = params.direction ?? "out"; // "in" or "out"
    const duration = params.duration ?? 1000;
    const color = params.color ?? 0x000000;

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    if (direction === "out") {
      this.scene.cameras.main.fadeOut(duration, r, g, b, (_cam: any, progress: number) => {
        if (progress === 1) next();
      });
    } else {
      this.scene.cameras.main.fadeIn(duration, r, g, b, (_cam: any, progress: number) => {
        if (progress === 1) next();
      });
    }
  }

  private complete(): void {
    this.isRunning = false;
    Logger.getInstance().log("[BossCutsceneSequence] Cinematic sequence complete");
    if (this.onCompleteCallback) {
      this.onCompleteCallback();
    }
  }
}
