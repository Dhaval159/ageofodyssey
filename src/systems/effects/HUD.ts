import Phaser from "phaser";
import { Player } from "../../entities/player/Player";

interface HealthBar {
  bg: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private playerHP: HealthBar;

  private readonly BAR_WIDTH: number = 180;
  private readonly BAR_HEIGHT: number = 16;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(10000);

    this.playerHP = this.createBar(14, 14, this.BAR_WIDTH, 0x44ff44, "ODYSSEUS");
  }

  private createBar(x: number, y: number, width: number, color: number, label: string): HealthBar {
    const bg = this.scene.add.rectangle(x, y, width, this.BAR_HEIGHT, 0x000000, 0.7);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x555555);
    this.container.add(bg);

    const fill = this.scene.add.rectangle(x + 1, y + 1, width - 2, this.BAR_HEIGHT - 2, color, 1);
    fill.setOrigin(0, 0);
    this.container.add(fill);

    const labelText = this.scene.add.text(x + 4, y + 1, label, {
      fontSize: "12px",
      fontFamily: "monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 3,
    });
    labelText.setOrigin(0, 0);
    this.container.add(labelText);

    return { bg, fill, label: labelText };
  }

  public update(player: Player | null): void {
    if (!player) return;

    const hp = player.healthComponent.getCurrentHealth();
    const maxHp = player.healthComponent.getMaxHealth();
    const pct = Math.max(0, hp / maxHp);
    this.playerHP.fill.setDisplaySize(Math.max(1, (this.BAR_WIDTH - 2) * pct), this.BAR_HEIGHT - 2);
    let color: number;
    if (pct > 0.6) color = 0x44ff44;
    else if (pct > 0.3) color = 0xffcc44;
    else color = 0xff4444;
    this.playerHP.fill.setFillStyle(color);
    this.playerHP.label.setText(`ODYSSEUS  ${hp}/${maxHp}`);
  }

  public destroy(): void {
    this.container.destroy();
  }
}
