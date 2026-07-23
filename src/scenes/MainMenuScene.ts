import Phaser from "phaser";
import { GAME_CONFIG, UI } from "../constants/GameConstants";
import { Logger } from "../core/Logger";
import { GameStateManager } from "../core/GameStateManager";
import { GameState } from "../core/GameStateManager";
import { InputManager } from "../core/InputManager";
import { InputAction } from "../core/InputAction";
import { InputContext } from "../constants/InputContext";
import { Button } from "../utils/UIFactory";

export default class MainMenuScene extends Phaser.Scene {
  private buttons: Button[] = [];
  private selectedIndex: number = 0;
  private isMobile: boolean = false;

  constructor() {
    super({ key: "MainMenuScene" });
  }

  create(): void {
    const { width, height } = this.scale;

    this.cameras.main.fadeIn(500, 0, 0, 0);
    GameStateManager.getInstance().setState(GameState.MAIN_MENU);
    this.isMobile = width < 768;

    const bg = this.add.graphics();
    bg.fillStyle(0x0f0f23, 1);
    bg.fillRect(0, 0, width, height);

    bg.lineStyle(1, 0x333355, 0.3);
    for (let y = 0; y < height; y += 40) {
      bg.lineBetween(0, y, width, y);
    }

    const title = this.add.text(width / 2, height * 0.22, GAME_CONFIG.NAME, {
      fontSize: "56px",
      color: "#ffd700",
      fontStyle: "bold",
      stroke: "#000000",
      strokeThickness: 6,
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(
      width / 2,
      height * 0.22 + 52,
      "A tale of ancient Ithaca",
      {
        fontSize: "18px",
        color: "#888888",
      }
    );
    subtitle.setOrigin(0.5);

    const buttonWidth = this.isMobile ? width * 0.7 : UI.BUTTON.WIDTH;
    const buttonHeight = this.isMobile ? 44 : UI.BUTTON.HEIGHT;
    const buttonFontSize = this.isMobile ? "18px" : UI.BUTTON.FONT_SIZE;
    const buttonGap = this.isMobile ? 12 : UI.MAIN_MENU.BUTTON_GAP;

    const menuItems = [
      {
        label: "New Game",
        onClick: () => {
          Logger.getInstance().log("[MainMenu] New Game clicked");
        },
      },
      {
        label: "Settings",
        onClick: () => {
          Logger.getInstance().log("[MainMenu] Settings clicked");
        },
      },
      {
        label: "Credits",
        onClick: () => {
          Logger.getInstance().log("[MainMenu] Credits clicked");
        },
      },
    ];

    const totalHeight =
      menuItems.length * buttonHeight + (menuItems.length - 1) * buttonGap;
    const startY = height / 2 - totalHeight / 2 + buttonHeight / 2;

    this.buttons = menuItems.map((item, index) => {
      const y = startY + index * (buttonHeight + buttonGap);
      const button = new Button({
        scene: this,
        text: item.label,
        x: width / 2,
        y: y,
        width: buttonWidth,
        height: buttonHeight,
        fontSize: buttonFontSize,
        onClick: item.onClick,
      });
      return button;
    });

    const isDesktop = !/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent
    );
    if (isDesktop) {
      const quitY =
        startY + menuItems.length * (buttonHeight + buttonGap) + UI.QUIT_BUTTON_Y_OFFSET;
      const quitButton = new Button({
        scene: this,
        text: "Quit",
        x: width / 2,
        y: quitY,
        width: buttonWidth,
        height: buttonHeight,
        fontSize: buttonFontSize,
        onClick: () => this.quitGame(),
      });
      this.buttons.push(quitButton);
    }

    this.buttons[this.selectedIndex].setSelected(true);

    const inputManager = InputManager.getInstance();
    inputManager.initialize(this, {
      bindingsProfile: InputContext.createFilteredBindings(InputContext.MENU),
    });

    this.setupKeyboardInput();
    this.setupResize();

    Logger.getInstance().log("MainMenuScene displayed");
  }

  update(): void {
    const input = InputManager.getInstance();

    if (input.wasJustPressed(InputAction.MOVE_UP)) {
      this.moveSelection(-1);
    }

    if (input.wasJustPressed(InputAction.MOVE_DOWN)) {
      this.moveSelection(1);
    }

    if (input.wasJustPressed(InputAction.CONFIRM)) {
      this.activateSelected();
    }
  }

  private setupKeyboardInput(): void {
    // InputContext-bound keyboard input is handled in update() via InputManager.
    // This method is kept for future event-driven extensions.
  }

  private moveSelection(direction: number): void {
    if (this.buttons.length === 0) return;
    const previousIndex = this.selectedIndex;
    this.selectedIndex =
      (this.selectedIndex + direction + this.buttons.length) % this.buttons.length;
    this.buttons[previousIndex].setSelected(false);
    this.buttons[this.selectedIndex].setSelected(true);
  }

  private activateSelected(): void {
    if (this.buttons.length === 0) return;
    const button = this.buttons[this.selectedIndex];
    button.container.emit("pointerdown");
    this.time.delayedCall(50, () => {
      button.container.emit("pointerup");
    });
  }

  private quitGame(): void {
    Logger.getInstance().log("[MainMenu] Quit requested");
    if (typeof window !== "undefined" && window.close) {
      window.close();
    } else {
      Logger.getInstance().log("[MainMenu] Quit not available in this environment");
    }
  }

  private setupResize(): void {
    this.scale.on("resize", (gameSize: Phaser.Structs.Size) => {
      this.repositionElements();
      Logger.getInstance().log(`Resize detected: ${gameSize.width}x${gameSize.height}`);
    });
  }

  private repositionElements(): void {
    const { width, height } = this.scale;
    const buttonWidth = width < 768 ? width * 0.7 : UI.BUTTON.WIDTH;
    const buttonHeight = width < 768 ? 44 : UI.BUTTON.HEIGHT;
    const buttonGap = width < 768 ? 12 : UI.MAIN_MENU.BUTTON_GAP;

    const totalHeight =
      this.buttons.length * buttonHeight + (this.buttons.length - 1) * buttonGap;
    const startY = height / 2 - totalHeight / 2 + buttonHeight / 2;

    this.buttons.forEach((btn, i) => {
      btn.container.x = width / 2;
      btn.container.y = startY + i * (buttonHeight + buttonGap);
      btn.background.setDisplaySize(buttonWidth, buttonHeight);
    });
  }
}
