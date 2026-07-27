import Phaser from "phaser";
import { GAME_CONFIG } from "../../../constants/GameConstants";
import { UIHelpers } from "../../../utils/UIHelpers";

export class EscapeTimerUI extends Phaser.GameObjects.Container {
  private timerText: Phaser.GameObjects.Text;
  private warningText: Phaser.GameObjects.Text;
  private backgroundBar: Phaser.GameObjects.Graphics;
  private fillBar: Phaser.GameObjects.Graphics;

  private barWidth: number = 500;
  private barHeight: number = 10;
  private maxTime: number = 100;
  private isUrgent: boolean = false;
  private flashTimer: number = 0;
  private screenY: number = 35;

  constructor(scene: Phaser.Scene) {
    super(scene, GAME_CONFIG.WIDTH / 2, 35);

    this.backgroundBar = scene.add.graphics();
    this.backgroundBar.fillStyle(0x000000, 0.6);
    this.backgroundBar.fillRoundedRect(-this.barWidth / 2 - 10, -22, this.barWidth + 20, 50, 6);
    this.backgroundBar.lineStyle(1, 0x5a2a2a, 0.8);
    this.backgroundBar.strokeRoundedRect(-this.barWidth / 2 - 10, -22, this.barWidth + 20, 50, 6);
    this.add(this.backgroundBar);

    this.timerText = scene.add.text(0, -18, "ESCAPE: 100", {
      fontSize: "18px",
      fontFamily: "Georgia, serif",
      color: "#ffd700",
      fontStyle: "bold",
      shadow: { offsetX: 1, offsetY: 1, color: "#000000", blur: 2, stroke: true, fill: true }
    });
    this.timerText.setOrigin(0.5, 0);
    this.add(this.timerText);

    this.warningText = scene.add.text(0, 2, "", {
      fontSize: "11px",
      fontFamily: "sans-serif",
      color: "#ff6644",
      fontStyle: "bold",
    });
    this.warningText.setOrigin(0.5, 0);
    this.add(this.warningText);

    this.fillBar = scene.add.graphics();
    this.add(this.fillBar);

    scene.add.existing(this);
    this.setScrollFactor(0);
    this.setDepth(910);
    this.setVisible(false);

    this.drawFillBar(1);
  }

  public show(maxTime: number): void {
    this.maxTime = maxTime;
    this.setVisible(true);
    this.setAlpha(0);
    this.screenY = -30;
    this.y = -30; // initial fallback

    this.scene.tweens.add({
      targets: this,
      screenY: 35,
      alpha: 1,
      duration: 600,
      ease: "Cubic.easeOut",
    });
  }

  public hide(): void {
    this.scene.tweens.add({
      targets: this,
      screenY: -30,
      alpha: 0,
      duration: 400,
      ease: "Cubic.easeIn",
      onComplete: () => {
        this.setVisible(false);
      }
    });
  }

  public update(timeRemaining: number): void {
    UIHelpers.adjustForZoom(this, GAME_CONFIG.WIDTH / 2, this.screenY);
    const seconds = Math.ceil(timeRemaining);
    this.timerText.setText(`ESCAPE: ${seconds}`);

    const ratio = Math.max(0, timeRemaining / this.maxTime);
    this.drawFillBar(ratio);

    if (ratio <= 0.25) {
      if (!this.isUrgent) {
        this.isUrgent = true;
        this.timerText.setColor("#ff3333");
        this.warningText.setText("HURRY!");
      }

      this.flashTimer += 16;
      if (this.flashTimer > 300) {
        this.flashTimer = 0;
        this.warningText.setVisible(!this.warningText.visible);
      }
    } else if (ratio <= 0.5) {
      this.timerText.setColor("#ffaa00");
      this.warningText.setText("");
    } else {
      this.timerText.setColor("#ffd700");
      this.warningText.setText("");
    }
  }

  private drawFillBar(ratio: number): void {
    this.fillBar.clear();
    const fillW = this.barWidth * ratio;

    if (fillW > 0) {
      let color = 0x22aa22;
      if (ratio <= 0.25) {
        color = 0xcc2222;
      } else if (ratio <= 0.5) {
        color = 0xccaa22;
      }

      this.fillBar.fillStyle(color, 1);
      this.fillBar.fillRect(-this.barWidth / 2, 18, fillW, this.barHeight);

      this.fillBar.fillStyle(0xffffff, 0.2);
      this.fillBar.fillRect(-this.barWidth / 2, 18, fillW, this.barHeight / 2);
    }
  }

  public destroy(fromScene?: boolean): void {
    super.destroy(fromScene);
  }
}
