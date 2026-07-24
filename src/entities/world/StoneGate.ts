import Phaser from "phaser";
import { IInteractable } from "../../systems/interaction/IInteractable";

export class StoneGate implements IInteractable {
    public readonly id: string;
    private gateGraphics: Phaser.GameObjects.Graphics;
    private leftDoor: Phaser.GameObjects.Graphics;
    private rightDoor: Phaser.GameObjects.Graphics;
    private gateX: number;
    private gateY: number;
    private gateWidth: number;
    private isOpen: boolean = false;
    private interactionEnabled: boolean = true;
    private isAnimating: boolean = false;
    private requiredTorches: string[] = [];
    private litTorches: Set<string> = new Set();
    private onOpenCallback: (() => void) | null = null;

    constructor(
        scene: Phaser.Scene,
        id: string,
        x: number,
        y: number,
        width: number,
        height: number,
        requiredTorchIds: string[]
    ) {
        this.id = id;
        this.gateX = x;
        this.gateY = y;
        this.gateWidth = width;
        this.requiredTorches = requiredTorchIds;

        // Main gate frame
        this.gateGraphics = scene.add.graphics();
        this.gateGraphics.fillStyle(0x4a4a3a, 1);
        this.gateGraphics.fillRect(x - width / 2, y - height / 2, width, height);
        this.gateGraphics.lineStyle(3, 0x3a3a2a, 0.8);
        this.gateGraphics.strokeRect(x - width / 2, y - height / 2, width, height);

        // Stone pattern lines
        this.gateGraphics.lineStyle(1, 0x5a5a4a, 0.3);
        for (let i = 1; i < 4; i++) {
            const ly = y - height / 2 + (height / 4) * i;
            this.gateGraphics.lineBetween(x - width / 2, ly, x + width / 2, ly);
        }
        for (let i = 1; i < 3; i++) {
            const lx = x - width / 2 + (width / 3) * i;
            this.gateGraphics.lineBetween(lx, y - height / 2, lx, y + height / 2);
        }
        this.gateGraphics.setDepth(7);

        // Left door
        this.leftDoor = scene.add.graphics();
        this.leftDoor.fillStyle(0x5a5a4a, 1);
        this.leftDoor.fillRect(x - width / 2 - 2, y - height / 2, width / 2, height);
        this.leftDoor.lineStyle(2, 0x4a4a3a, 0.6);
        this.leftDoor.strokeRect(x - width / 2 - 2, y - height / 2, width / 2, height);
        this.leftDoor.setDepth(8);

        // Right door
        this.rightDoor = scene.add.graphics();
        this.rightDoor.fillStyle(0x5a5a4a, 1);
        this.rightDoor.fillRect(x + 2, y - height / 2, width / 2, height);
        this.rightDoor.lineStyle(2, 0x4a4a3a, 0.6);
        this.rightDoor.strokeRect(x + 2, y - height / 2, width / 2, height);
        this.rightDoor.setDepth(8);

        // Torch sockets on gate
        const socketG = scene.add.graphics();
        socketG.fillStyle(0x3a3a2a, 1);
        // Left socket
        socketG.fillCircle(x - width / 4, y, 6);
        socketG.fillStyle(0x2a2a1a, 0.8);
        socketG.fillCircle(x - width / 4, y, 3);
        // Right socket
        socketG.fillCircle(x + width / 4, y, 6);
        socketG.fillStyle(0x2a2a1a, 0.8);
        socketG.fillCircle(x + width / 4, y, 3);
        socketG.setDepth(7);
    }

    public checkTorchLit(torchId: string, isLit: boolean): void {
        if (isLit) {
            this.litTorches.add(torchId);
        } else {
            this.litTorches.delete(torchId);
        }

        // Check if all required torches are lit
        const allLit = this.requiredTorches.every((id) => this.litTorches.has(id));
        if (allLit && !this.isOpen && !this.isAnimating) {
            this.open();
        } else if (!allLit && this.isOpen && !this.isAnimating) {
            this.close();
        }
    }

    public open(): void {
        if (this.isOpen || this.isAnimating) return;
        this.isAnimating = true;

        const leftTargetX = this.gateX - this.gateWidth;
        const rightTargetX = this.gateX + this.gateWidth;

        // Slide doors open
        if (this.leftDoor.scene) {
            this.leftDoor.scene.tweens.add({
                targets: this.leftDoor,
                x: leftTargetX - this.gateX,
                duration: 800,
                ease: "Power2",
            });
            this.rightDoor.scene.tweens.add({
                targets: this.rightDoor,
                x: rightTargetX - this.gateX,
                duration: 800,
                ease: "Power2",
            });

            // Screen shake
            this.leftDoor.scene.cameras.main.shake(500, 0.003);

            // Dust effect
            const dustG = this.leftDoor.scene.add.graphics();
            dustG.fillStyle(0x8a7a5a, 0.4);
            for (let i = 0; i < 8; i++) {
                const dx = this.gateX + Phaser.Math.Between(-20, 20);
                const dy = this.gateY + Phaser.Math.Between(-30, 30);
                dustG.fillCircle(dx, dy, Phaser.Math.Between(2, 6));
            }
            dustG.setDepth(10);
            this.leftDoor.scene.tweens.add({
                targets: dustG,
                alpha: 0,
                duration: 1000,
                onComplete: () => dustG.destroy(),
            });
        }

        this.leftDoor.x = 0;
        this.rightDoor.x = 0;

        this.isOpen = true;
        this.isAnimating = false;

        if (this.onOpenCallback) {
            this.onOpenCallback();
        }
    }

    public close(): void {
        if (!this.isOpen || this.isAnimating) return;
        this.isAnimating = true;

        if (this.leftDoor.scene) {
            this.leftDoor.scene.tweens.add({
                targets: this.leftDoor,
                x: 0,
                duration: 800,
                ease: "Power2",
            });
            this.rightDoor.scene.tweens.add({
                targets: this.rightDoor,
                x: 0,
                duration: 800,
                ease: "Power2",
            });

            this.leftDoor.scene.cameras.main.shake(300, 0.002);
        }

        this.leftDoor.x = 0;
        this.rightDoor.x = 0;

        this.isOpen = false;
        this.isAnimating = false;
    }

    public isGateOpen(): boolean {
        return this.isOpen;
    }

    public setOnOpenCallback(callback: () => void): void {
        this.onOpenCallback = callback;
    }

    // IInteractable implementation
    public getId(): string {
        return this.id;
    }

    public getInteractionPrompt(): string {
        if (this.isOpen) return "";
        return `Light the torches (${this.litTorches.size}/${this.requiredTorches.length})`;
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.gateX, y: this.gateY };
    }

    public getInteractionRange(): number {
        return 100;
    }

    public isInteractionEnabled(): boolean {
        return !this.isOpen && this.interactionEnabled;
    }

    public setInteractionEnabled(enabled: boolean): void {
        this.interactionEnabled = enabled;
    }

    public interact(): void {
        // Gate shows status prompt but doesn't directly interact
    }
}
