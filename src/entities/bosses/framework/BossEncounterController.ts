import Phaser from "phaser";
import { BossPhaseManager } from "./BossPhaseManager";
import { BossHealthUI } from "./BossHealthUI";
import { BossMusicController } from "./BossMusicController";
import { BossCheckpoint } from "./BossCheckpoint";
import { BossCutsceneSequence, CutsceneStep } from "./BossCutsceneSequence";
import { BossDefeatSequence } from "./BossDefeatSequence";
import { BossArenaController, BossArenaConfig } from "./BossArenaController";
import { EscapeSequenceController, EscapeSequenceConfig } from "./EscapeSequenceController";
import { ObjectiveManager } from "../../../systems/objectives/ObjectiveManager";
import { GameStateManager, GameState } from "../../../core/GameStateManager";
import { Logger } from "../../../core/Logger";
import { AudioManager } from "../../../systems/audio/AudioManager";
import { Cyclops } from "../Cyclops";

export interface BossEncounterConfig {
  bossId: string;
  bossName: string;
  maxHp: number;
  phaseThresholds: {
    phase2: number; // HP ratio, e.g. 0.7
    phase3: number; // HP ratio, e.g. 0.4
    enrage: number; // HP ratio, e.g. 0.2
  };
  introCutsceneSteps: CutsceneStep[];
  defeatDialogueLines: Array<{ speaker: string; text: string }>;
  musicKeys: {
    theme: string;
    enraged?: string;
  };
  checkpointId: string;
  arenaConfig: BossArenaConfig;
  escapeConfig?: EscapeSequenceConfig;
}

export class BossEncounterController {
  private scene: Phaser.Scene;
  private config: BossEncounterConfig;

  // Controllers
  private phaseManager: BossPhaseManager<BossEncounterController>;
  private arenaController: BossArenaController;
  private musicController: BossMusicController;
  private checkpoint: BossCheckpoint;
  private cutsceneSequence: BossCutsceneSequence;
  private defeatSequence: BossDefeatSequence;
  private escapeController: EscapeSequenceController | null = null;
  public bossEntity: Cyclops | null = null;
  
  // UI
  private healthUI: BossHealthUI | null = null;

  // State
  private currentHp: number;
  private maxHp: number;
  private encounterStarted: boolean = false;
  private introCompleted: boolean = false;
  private isDefeated: boolean = false;
  public phaseString: string = "Phase 1";

  // Active player overlap tracking
  private playerOverlapCollider: Phaser.Physics.Arcade.Collider | null = null;
  private playerCutsceneOverlapCollider: Phaser.Physics.Arcade.Collider | null = null;

  constructor(scene: Phaser.Scene, config: BossEncounterConfig) {
    this.scene = scene;
    this.config = config;
    this.maxHp = config.maxHp;
    this.currentHp = config.maxHp;

    // Instantiations
    this.phaseManager = new BossPhaseManager(this);
    this.arenaController = new BossArenaController(scene, config.arenaConfig);
    this.musicController = new BossMusicController(scene);
    this.checkpoint = new BossCheckpoint(config.checkpointId);
    this.cutsceneSequence = new BossCutsceneSequence(scene);
    this.defeatSequence = new BossDefeatSequence(scene);

    if (config.escapeConfig) {
      this.escapeController = new EscapeSequenceController(scene);
    }

    this.registerPhases();
  }

  private registerPhases(): void {
    // Phase 1 State
    this.phaseManager.registerPhase("PHASE_1", {
      id: "PHASE_1",
      owner: this,
      enter: () => {
        this.phaseString = "Phase 1";
        this.healthUI?.setPhaseText("Phase 1");
      },
      update: () => {},
      exit: () => {}
    });

    // Phase 2 State
    this.phaseManager.registerPhase("PHASE_2", {
      id: "PHASE_2",
      owner: this,
      enter: () => {
        this.phaseString = "Phase 2";
        this.healthUI?.setPhaseText("Phase 2");
        Logger.getInstance().log("[BossEncounter] Entered Phase 2!");
      },
      update: () => {},
      exit: () => {}
    });

    // Phase 3 State
    this.phaseManager.registerPhase("PHASE_3", {
      id: "PHASE_3",
      owner: this,
      enter: () => {
        this.phaseString = "Phase 3";
        this.healthUI?.setPhaseText("Phase 3");
        Logger.getInstance().log("[BossEncounter] Entered Phase 3!");
      },
      update: () => {},
      exit: () => {}
    });

    // Enraged State
    this.phaseManager.registerPhase("ENRAGED", {
      id: "ENRAGED",
      owner: this,
      enter: () => {
        this.phaseString = "Enraged";
        this.healthUI?.setPhaseText("Enraged");
        Logger.getInstance().log("[BossEncounter] Boss has ENRAGED!");
        // Transition music to enraged track if configured
        if (this.config.musicKeys.enraged) {
          this.musicController.changeMusicForPhase(this.config.musicKeys.enraged);
        }
      },
      update: () => {},
      exit: () => {}
    });

    // Death State
    this.phaseManager.registerPhase("DEATH", {
      id: "DEATH",
      owner: this,
      enter: () => {
        this.phaseString = "Death";
        this.healthUI?.setPhaseText("Defeated");
        Logger.getInstance().log("[BossEncounter] Boss death triggered");
        this.triggerDefeat();
      },
      update: () => {},
      exit: () => {}
    });
  }

  public initialize(player: Phaser.GameObjects.GameObject): void {
    // 1. Build arena physical components & triggers
    this.arenaController.buildArena();

    // 2. Set up trigger physics overlaps
    const entryTrigger = this.arenaController.getEntryTrigger();
    if (entryTrigger) {
      this.playerOverlapCollider = this.scene.physics.add.overlap(player, entryTrigger, () => {
        entryTrigger.onOverlap();
        this.handlePlayerEnterArena();
      });
    }

    const cutsceneTrigger = this.arenaController.getCutsceneTrigger();
    if (cutsceneTrigger) {
      this.playerCutsceneOverlapCollider = this.scene.physics.add.overlap(player, cutsceneTrigger, () => {
        cutsceneTrigger.onOverlap();
        this.handlePlayerEnterCutscene();
      });
    }

    // 3. Register and setup checkpoint resets
    this.checkpoint.register(this.config.bossName + " Lair", this.config.arenaConfig.playerSpawnX, this.config.arenaConfig.playerSpawnY);
    this.checkpoint.setOnResetCallback(() => {
      this.resetEncounter();
    });

    // Make sure exit boulder is closed initially
    this.arenaController.setExitOpen(false);
  }

  public update(time: number, delta: number): void {
    // Update subcomponents
    this.arenaController.update(time, delta);
    this.phaseManager.update(time, delta);
    if (this.healthUI) {
      this.healthUI.update(time, delta);
    }
    if (this.escapeController) {
      this.escapeController.update(time, delta);
    }
  }

  private handlePlayerEnterArena(): void {
    if (this.encounterStarted) return;
    this.encounterStarted = true;

    Logger.getInstance().log("[BossEncounter] Player crossed entry gate. Closing doors behind them.");
    
    // Close entrance doors
    this.arenaController.closeEntrance();
    
    // Screen shake and rumble sound
    this.scene.cameras.main.shake(200, 0.005);
    try {
      const audioManager = AudioManager.getInstance();
      if (audioManager.isInitialized() && this.scene.cache.audio.has("rumble")) {
        audioManager.getSFXPlayer().play("rumble", { volume: 0.2 });
      }
    } catch {}

    // Trapped dialog
    const dialogueManager = this.scene.scene.get("CaveScene") ? (this.scene as any).dialogueManager : null;
    if (dialogueManager) {
      dialogueManager.start({
        lines: [
          { speaker: "Odysseus", text: "A massive stone slab fell behind us! We are trapped!" }
        ]
      });
    }

    // Activate the checkpoint immediately so if they die, they respawn inside
    this.checkpoint.activate();
  }

  private handlePlayerEnterCutscene(): void {
    if (this.introCompleted) return;
    this.introCompleted = true;

    Logger.getInstance().log("[BossEncounter] Player reached center trigger. Activating cutscene sequence.");

    // Run the data-driven cinematic sequence
    this.cutsceneSequence.start(this.config.introCutsceneSteps, () => {
      this.startEncounterGameplay();
    });
  }

  private startEncounterGameplay(): void {
    Logger.getInstance().log("[BossEncounter] Cutscene finished. Initializing combat and UI.");

    // Spawn Cyclops Boss Entity
    const spawn = this.arenaController.getBossSpawn();
    this.bossEntity = new Cyclops(this.scene, spawn.x, spawn.y, (this.scene as any).player);

    // Start background music
    this.musicController.playMusic(this.config.musicKeys.theme);

    // Initialize health UI
    this.healthUI = new BossHealthUI(this.scene, this.config.bossName, this.maxHp);
    this.healthUI.animateEntrance();

    // Start Phase 1 state
    this.phaseManager.changePhase("PHASE_1");

    // Restore gameplay controls
    GameStateManager.getInstance().setState(GameState.PLAYING);
    if (this.scene.scene.get("CaveScene")) {
      (this.scene as any).playerControlEnabled = true;
      (this.scene as any).setupCamera();
      if ((this.scene as any).cameraManager && (this.scene as any).player) {
        (this.scene as any).cameraManager.follow((this.scene as any).player);
      }
    }

    // Set objectives
    const objectiveManager = ObjectiveManager.getInstance();
    objectiveManager.completeObjective("reach_deepest");
    objectiveManager.setObjective("survive_encounter", "Survive the encounter");
  }

  public takeDamage(amount: number): void {
    if (!this.introCompleted || this.isDefeated) return;

    this.currentHp = Phaser.Math.Clamp(this.currentHp - amount, 0, this.maxHp);
    Logger.getInstance().log(`[BossEncounter] Boss took ${amount} damage. HP: ${this.currentHp}/${this.maxHp}`);

    if (this.healthUI) {
      this.healthUI.updateHealth(this.currentHp);
    }

    const ratio = this.currentHp / this.maxHp;
    const currentPhase = this.phaseManager.getCurrentPhase()?.id;

    if (this.currentHp <= 0 && currentPhase !== "DEATH") {
      this.phaseManager.changePhase("DEATH");
    } else if (ratio <= this.config.phaseThresholds.enrage && currentPhase !== "ENRAGED" && currentPhase !== "DEATH") {
      this.phaseManager.changePhase("ENRAGED");
    } else if (ratio <= this.config.phaseThresholds.phase3 && currentPhase !== "PHASE_3" && currentPhase !== "ENRAGED" && currentPhase !== "DEATH") {
      this.phaseManager.changePhase("PHASE_3");
    } else if (ratio <= this.config.phaseThresholds.phase2 && currentPhase !== "PHASE_2" && currentPhase !== "PHASE_3" && currentPhase !== "ENRAGED" && currentPhase !== "DEATH") {
      this.phaseManager.changePhase("PHASE_2");
    }
  }

  private triggerDefeat(): void {
    if (this.isDefeated) return;
    this.isDefeated = true;

    Logger.getInstance().log("[BossEncounter] Boss defeated! Running defeat sequence.");

    // Exit Health UI
    if (this.healthUI) {
      this.healthUI.animateExit();
    }

    // Outro sequence
    this.defeatSequence.start({
      deathDialogueLines: this.config.defeatDialogueLines,
      cameraTargetX: this.config.arenaConfig.centerX - 230,
      cameraTargetY: this.config.arenaConfig.centerY,
      onClearExit: () => {
        // Clear exit boulder
        this.arenaController.setExitOpen(true);
      },
      onComplete: () => {
        // Complete objective
        const objectiveManager = ObjectiveManager.getInstance();
        objectiveManager.completeObjective("survive_encounter");

        if (this.config.escapeConfig && this.escapeController) {
          Logger.getInstance().log("[BossEncounter] Starting escape sequence!");
          const exitX = this.config.arenaConfig.centerX - 280;
          this.escapeController.start(this.config.escapeConfig, (this.scene as any).player, exitX);
        } else {
          objectiveManager.setObjective("escape_cave", "Escape the Cyclops' Cave");
          Logger.getInstance().log("[BossEncounter] Victory sequence complete! Objective set to Escape.");
        }
      }
    });
  }

  public resetEncounter(): void {
    Logger.getInstance().log("[BossEncounter] Resetting encounter...");

    if (this.bossEntity) {
      this.bossEntity.destroyEnemy();
      this.bossEntity = null;
    }

    // Reset health & states
    this.currentHp = this.maxHp;
    this.encounterStarted = false;
    this.introCompleted = false;
    this.isDefeated = false;
    this.phaseString = "Phase 1";

    // Clean UI
    if (this.healthUI) {
      this.healthUI.destroy();
      this.healthUI = null;
    }

    // Stop music
    this.musicController.stopMusic(0);

    // Reset arena components & triggers
    this.arenaController.resetArena();
    this.phaseManager.changePhase("PHASE_1");
  }

  // Getters for F3 debug panel
  public isEncounterActive(): boolean {
    return this.encounterStarted;
  }

  public getBossHp(): number {
    return this.currentHp;
  }

  public getMaxHp(): number {
    return this.maxHp;
  }

  public getCurrentPhaseId(): string {
    return this.phaseManager.getCurrentPhase()?.id ?? "N/A";
  }

  public getTriggerStatus(): string {
    const entry = this.arenaController.getEntryTrigger();
    const cutscene = this.arenaController.getCutsceneTrigger();
    const entryActive = entry ? (entry.body as Phaser.Physics.Arcade.StaticBody).enable : false;
    const cutsceneActive = cutscene ? (cutscene.body as Phaser.Physics.Arcade.StaticBody).enable : false;
    return `Entry:${entryActive ? "Active" : "Closed"} | Cutscene:${cutsceneActive ? "Active" : "Closed"}`;
  }

  public getEscapeController(): EscapeSequenceController | null {
    return this.escapeController;
  }

  public destroy(): void {
    if (this.playerOverlapCollider) {
      this.scene.physics.world.removeCollider(this.playerOverlapCollider);
    }
    if (this.playerCutsceneOverlapCollider) {
      this.scene.physics.world.removeCollider(this.playerCutsceneOverlapCollider);
    }

    if (this.bossEntity) {
      this.bossEntity.destroyEnemy();
      this.bossEntity = null;
    }

    this.arenaController.destroy();
    this.phaseManager.destroy();
    if (this.healthUI) {
      this.healthUI.destroy();
    }
    if (this.escapeController) {
      this.escapeController.destroy();
    }
    this.musicController.stopMusic(0);
    Logger.getInstance().log("[BossEncounterController] Cleaned up");
  }
}
