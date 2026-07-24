import Phaser from "phaser";

export class DialogueBox {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private bg: Phaser.GameObjects.Graphics;
  private speakerLabel: Phaser.GameObjects.Text;
  private textLabel: Phaser.GameObjects.Text;
  private continueLabel: Phaser.GameObjects.Text;
  private skipLabel: Phaser.GameObjects.Text;

  private fullText: string = "";
  private displayedText: string = "";
  private charIndex: number = 0;
  private typingTimer: number = 0;
  private typingSpeed: number = 40;
  private isTyping: boolean = false;
  private isVisible: boolean = false;
  private onContinue: (() => void) | null = null;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    const { width } = scene.scale;
    const boxY = 540;
    const boxH = 160;

    this.bg = scene.add.graphics();

    this.speakerLabel = scene.add.text(40, boxY + 12, "", {
      fontSize: "18px",
      color: "#ffd700",
      fontStyle: "bold",
      wordWrap: { width: width - 80 },
    });

    this.textLabel = scene.add.text(40, boxY + 42, "", {
      fontSize: "16px",
      color: "#ffffff",
      wordWrap: { width: width - 80 },
      lineSpacing: 4,
    });

    this.continueLabel = scene.add.text(width - 40, boxY + boxH - 30, "[E] Continue", {
      fontSize: "13px",
      color: "#aaaaaa",
    });
    this.continueLabel.setOrigin(1, 0);

    this.skipLabel = scene.add.text(40, boxY + boxH - 30, "[Space] Skip", {
      fontSize: "13px",
      color: "#666666",
    });

    this.container = scene.add.container(0, 0, [
      this.bg,
      this.speakerLabel,
      this.textLabel,
      this.continueLabel,
      this.skipLabel,
    ]);
    this.container.setDepth(900);
    this.container.setScrollFactor(0);
    this.container.setAlpha(0);

    this.redraw(width, boxY, boxH);
  }

  private redraw(width: number, boxY: number, boxH: number): void {
    this.bg.clear();
    this.bg.fillStyle(0x000000, 0.85);
    this.bg.fillRoundedRect(20, boxY, width - 40, boxH, 8);
    this.bg.lineStyle(2, 0xffd700, 0.6);
    this.bg.strokeRoundedRect(20, boxY, width - 40, boxH, 8);
  }

  public show(
    speaker: string,
    text: string,
    onContinue: () => void
  ): void {
    this.fullText = text;
    this.displayedText = "";
    this.charIndex = 0;
    this.typingTimer = 0;
    this.isTyping = true;
    this.isVisible = true;
    this.onContinue = onContinue;

    this.speakerLabel.setText(speaker);
    this.speakerLabel.setColor(speaker === "Narrator" ? "#88aaff" : "#ffd700");
    this.textLabel.setText("");
    this.continueLabel.setAlpha(0);
    this.skipLabel.setAlpha(0.4);

    const { width } = this.scene.scale;
    const boxY = 540;
    const boxH = 160;
    this.redraw(width, boxY, boxH);

    this.container.setAlpha(0);
    this.scene.tweens.add({
      targets: this.container,
      alpha: 1,
      duration: 200,
      ease: "Power2",
    });
  }

  public hide(): void {
    this.isVisible = false;
    this.scene.tweens.add({
      targets: this.container,
      alpha: 0,
      duration: 150,
      ease: "Power2",
    });
  }

  public update(delta: number): void {
    if (!this.isVisible || !this.isTyping) return;

    this.typingTimer += delta;

    const charsPerStep = Math.floor(this.typingTimer / this.typingSpeed);
    if (charsPerStep > 0 && this.charIndex < this.fullText.length) {
      this.charIndex = Math.min(this.charIndex + charsPerStep, this.fullText.length);
      this.displayedText = this.fullText.substring(0, this.charIndex);
      this.textLabel.setText(this.displayedText);
      this.typingTimer = 0;
    }

    if (this.charIndex >= this.fullText.length) {
      this.isTyping = false;
      this.continueLabel.setAlpha(0.6 + Math.sin(this.scene.time.now * 0.004) * 0.4);
      this.skipLabel.setAlpha(0.2);
    }
  }

  public continue(): void {
    if (this.isTyping) {
      this.charIndex = this.fullText.length;
      this.displayedText = this.fullText;
      this.textLabel.setText(this.displayedText);
      this.isTyping = false;
      this.continueLabel.setAlpha(0.6 + Math.sin(this.scene.time.now * 0.004) * 0.4);
      this.skipLabel.setAlpha(0.2);
      return;
    }

    if (this.onContinue) {
      this.onContinue();
    }
  }

  public skip(): void {
    if (this.isTyping) {
      this.charIndex = this.fullText.length;
      this.displayedText = this.fullText;
      this.textLabel.setText(this.displayedText);
      this.isTyping = false;
      this.continueLabel.setAlpha(0.6 + Math.sin(this.scene.time.now * 0.004) * 0.4);
      this.skipLabel.setAlpha(0.2);
    }
  }

  public isVisibleAndActive(): boolean {
    return this.isVisible;
  }

  public isTypingActive(): boolean {
    return this.isTyping;
  }

  public destroy(): void {
    this.container.destroy();
  }
}
