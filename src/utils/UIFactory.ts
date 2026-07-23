import Phaser from "phaser";
import { AssetKeys } from "../constants/AssetKeys";

export interface IButtonConfig {
  scene: Phaser.Scene;
  text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  fontSize?: string;
  normalKey?: string;
  hoverKey?: string;
  activeKey?: string;
  textColor?: string;
  hoverTextColor?: string;
  activeTextColor?: string;
  onClick?: () => void;
  onHover?: () => void;
  onOut?: () => void;
}

export class Button {
  public container: Phaser.GameObjects.Container;
  public background: Phaser.GameObjects.Image;
  public text: Phaser.GameObjects.Text;

  private config: IButtonConfig;
  private isSelected: boolean = false;

  constructor(config: IButtonConfig) {
    this.config = config;
    this.container = config.scene.add.container(config.x, config.y);
    this.background = config.scene.add.image(
      0,
      0,
      config.normalKey || AssetKeys.UI_BUTTON_NORMAL
    );
    this.background.setDisplaySize(config.width, config.height);
    this.text = config.scene.add.text(0, 0, config.text, {
      fontSize: config.fontSize || "20px",
      color: config.textColor || "#ffffff",
    });
    this.text.setOrigin(0.5);
    this.container.add([this.background, this.text]);
    this.setupInteractions();
  }

  private setupInteractions(): void {
    this.container.setSize(this.config.width, this.config.height);
    this.container.setInteractive({ useHandCursor: true });

    this.container.on("pointerover", () => {
      this.background.setTexture(this.config.hoverKey || AssetKeys.UI_BUTTON_HOVER);
      this.text.setColor(this.config.hoverTextColor || "#00ff00");
      this.container.setScale(this.config.scene.scale.width > 768 ? 1.03 : 1.0);
      if (this.config.onHover) this.config.onHover();
    });

    this.container.on("pointerout", () => {
      this.background.setTexture(this.config.normalKey || AssetKeys.UI_BUTTON_NORMAL);
      this.text.setColor(this.config.textColor || "#ffffff");
      this.container.setScale(1.0);
      if (this.isSelected) {
        this.text.setColor("#ffffaa");
      }
      if (this.config.onOut) this.config.onOut();
    });

    this.container.on("pointerdown", () => {
      this.background.setTexture(this.config.activeKey || AssetKeys.UI_BUTTON_ACTIVE);
      this.text.setColor(this.config.activeTextColor || "#aaffaa");
      this.config.scene.tweens.add({
        targets: this.container,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 60,
        yoyo: true,
        ease: "Quad.easeOut",
      });
    });

    this.container.on("pointerup", () => {
      this.background.setTexture(this.config.hoverKey || AssetKeys.UI_BUTTON_HOVER);
      this.text.setColor(this.config.hoverTextColor || "#00ff00");
      if (this.config.onClick) this.config.onClick();
    });

    this.container.on("pointerleave", () => {
      this.background.setTexture(this.config.normalKey || AssetKeys.UI_BUTTON_NORMAL);
      this.text.setColor(this.config.textColor || "#ffffff");
      this.container.setScale(1.0);
    });
  }

  public setSelected(selected: boolean): void {
    this.isSelected = selected;
    if (selected) {
      this.text.setColor("#ffffaa");
      this.container.setScale(1.04);
    } else {
      this.text.setColor(this.config.textColor || "#ffffff");
      this.container.setScale(1.0);
      this.background.setTexture(this.config.normalKey || AssetKeys.UI_BUTTON_NORMAL);
      this.background.clearTint();
    }
  }

  public getBounds(): Phaser.Geom.Rectangle {
    return this.container.getBounds();
  }

  public setVisible(visible: boolean): void {
    this.container.setVisible(visible);
  }

  public getY(): number {
    return this.container.y;
  }

  public setY(y: number): void {
    this.container.y = y;
  }
}
