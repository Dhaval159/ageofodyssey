import Phaser from "phaser";
import { Player } from "../../entities/player/Player";
import { EnemyManager } from "../../entities/enemies/framework/EnemyManager";

interface HealthBar {
  bg: Phaser.GameObjects.Rectangle;
  fill: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
}

export class HUD {
  private scene: Phaser.Scene;
  private container: Phaser.GameObjects.Container;
  private playerHP: HealthBar;

  private wolfBars: Map<string, HealthBar> = new Map();
  private readonly BAR_WIDTH: number = 160;
  private readonly BAR_HEIGHT: number = 14;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.container = scene.add.container(0, 0);
    this.container.setScrollFactor(0);
    this.container.setDepth(10000);

    this.playerHP = this.createBar(16, 16, this.BAR_WIDTH, 0x44ff44, "HP");
  }

  private createBar(x: number, y: number, width: number, color: number, label: string): HealthBar {
    const bg = this.scene.add.rectangle(x, y, width, this.BAR_HEIGHT, 0x333333, 0.8);
    bg.setOrigin(0, 0);
    bg.setStrokeStyle(1, 0x888888);
    this.container.add(bg);

    const fill = this.scene.add.rectangle(x + 1, y + 1, width - 2, this.BAR_HEIGHT - 2, color, 1);
    fill.setOrigin(0, 0);
    this.container.add(fill);

    const labelText = this.scene.add.text(x + 4, y + 1, label, {
      fontSize: "11px",
      fontFamily: "monospace",
      color: "#ffffff",
      stroke: "#000000",
      strokeThickness: 2,
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
    const color = pct > 0.5 ? 0x44ff44 : pct > 0.25 ? 0xffaa44 : 0xff4444;
    this.playerHP.fill.setFillStyle(color);
    this.playerHP.label.setText(`HP ${hp}/${maxHp}`);

    const debugInfo = EnemyManager.getInstance().getDebugInfo();
    const aliveBars = new Set<string>();

    let barIndex = 0;
    for (const info of debugInfo) {
      if (!info.isAlive || info.health <= 0) continue;
      aliveBars.add(info.entityId);

      let bar = this.wolfBars.get(info.entityId);
      if (!bar) {
        const yPos = 16 + this.BAR_HEIGHT + 8 + barIndex * (this.BAR_HEIGHT + 4);
        const typeName = info.entityType.charAt(0).toUpperCase() + info.entityType.slice(1);
        bar = this.createBar(16, yPos, this.BAR_WIDTH, 0xff4444, `${typeName}`);
        this.wolfBars.set(info.entityId, bar);
      }

      const hpPct = Math.max(0, info.health / info.maxHealth);
      bar.fill.setDisplaySize(Math.max(1, (this.BAR_WIDTH - 2) * hpPct), this.BAR_HEIGHT - 2);
      const barColor = hpPct > 0.5 ? 0xff4444 : hpPct > 0.25 ? 0xff8844 : 0xff2222;
      bar.fill.setFillStyle(barColor);
      bar.label.setText(`${info.state} ${info.health}/${info.maxHealth}`);

      const yPos = 16 + this.BAR_HEIGHT + 8 + barIndex * (this.BAR_HEIGHT + 4);
      bar.bg.setPosition(16, yPos);
      bar.fill.setPosition(17, yPos + 1);
      bar.label.setPosition(20, yPos + 1);

      bar.bg.setVisible(true);
      bar.fill.setVisible(true);
      bar.label.setVisible(true);

      barIndex++;
    }

    for (const [id, bar] of this.wolfBars) {
      if (!aliveBars.has(id)) {
        bar.bg.setVisible(false);
        bar.fill.setVisible(false);
        bar.label.setVisible(false);
      }
    }
  }

  public destroy(): void {
    this.container.destroy();
    this.wolfBars.clear();
  }
}
