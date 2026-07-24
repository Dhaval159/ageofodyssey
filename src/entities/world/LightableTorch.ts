import Phaser from "phaser";
import { IInteractable } from "../../systems/interaction/IInteractable";

export class LightableTorch extends Phaser.GameObjects.Container implements IInteractable {
    private torchId: string;
    private isLit: boolean = false;
    private graphics: Phaser.GameObjects.Graphics;
    private flameGraphics: Phaser.GameObjects.Graphics;
    private flickerTimer: number = 0;
    private interactionEnabled: boolean = true;
    private onLitCallback: ((torchId: string) => void) | null = null;

    constructor(scene: Phaser.Scene, id: string, x: number, y: number) {
        super(scene, x, y);

        this.torchId = id;

        // Draw torch pole
        this.graphics = scene.add.graphics();
        this.graphics.fillStyle(0x5a3a1a, 1);
        this.graphics.fillRect(-2, -16, 4, 32);
        this.graphics.fillStyle(0x6a4a2a, 1);
        this.graphics.fillRect(-5, -16, 10, 5);
        this.add(this.graphics);

        // Draw flame (unlit initially)
        this.flameGraphics = scene.add.graphics();
        this.drawUnlitFlame();
        this.add(this.flameGraphics);

        scene.add.existing(this);
        this.setDepth(6);
    }

    private drawUnlitFlame(): void {
        this.flameGraphics.clear();
        this.flameGraphics.fillStyle(0x3a3a3a, 0.5);
        this.flameGraphics.fillCircle(0, -18, 3);
        this.flameGraphics.fillStyle(0x2a2a2a, 0.3);
        this.flameGraphics.fillCircle(0, -18, 2);
    }

    private drawLitFlame(): void {
        this.flameGraphics.clear();

        // Outer flame
        this.flameGraphics.fillStyle(0xff6600, 0.8);
        this.flameGraphics.fillCircle(0, -19, 5);
        this.flameGraphics.fillStyle(0xff8800, 0.6);
        this.flameGraphics.fillTriangle(-4, -17, 4, -17, 0, -24);

        // Inner flame
        this.flameGraphics.fillStyle(0xffaa00, 0.9);
        this.flameGraphics.fillCircle(0, -19, 3);
        this.flameGraphics.fillStyle(0xffdd44, 0.8);
        this.flameGraphics.fillCircle(0, -20, 1.5);

        // Glow
        this.flameGraphics.fillStyle(0xff8800, 0.15);
        this.flameGraphics.fillCircle(0, -18, 10);
    }

    public getId(): string {
        return this.torchId;
    }

    public getInteractionPrompt(): string {
        return this.isLit ? "[E] Extinguish torch" : "[E] Light torch";
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public getInteractionRange(): number {
        return 50;
    }

    public isInteractionEnabled(): boolean {
        return this.interactionEnabled;
    }

    public setInteractionEnabled(enabled: boolean): void {
        this.interactionEnabled = enabled;
    }

    public interact(): void {
        if (this.isLit) {
            this.extinguish();
        } else {
            this.light();
        }
    }

    public light(): void {
        if (this.isLit) return;
        this.isLit = true;
        this.drawLitFlame();

        // Ignition flash
        if (this.scene) {
            const flash = this.scene.add.circle(this.x, this.y - 18, 8, 0xffaa00, 0.4);
            flash.setDepth(8);
            this.scene.tweens.add({
                targets: flash,
                alpha: 0,
                scale: 2,
                duration: 300,
                onComplete: () => flash.destroy(),
            });
        }

        if (this.onLitCallback) {
            this.onLitCallback(this.torchId);
        }
    }

    public extinguish(): void {
        if (!this.isLit) return;
        this.isLit = false;
        this.drawUnlitFlame();
    }

    public isTorchLit(): boolean {
        return this.isLit;
    }

    public setOnLitCallback(callback: (torchId: string) => void): void {
        this.onLitCallback = callback;
    }

    public getTorchId(): string {
        return this.torchId;
    }

    public update(_time: number, delta: number): void {
        if (!this.isLit) return;

        this.flickerTimer += delta;
        if (this.flickerTimer > 80) {
            this.flickerTimer = 0;
            // Random flame flicker
            const flickerX = Phaser.Math.Between(-1, 1);
            const flickerY = Phaser.Math.Between(-1, 1);
            this.flameGraphics.setPosition(flickerX, flickerY);

            // Random alpha flicker
            const alpha = 0.7 + Math.random() * 0.3;
            this.flameGraphics.setAlpha(alpha);
        }
    }
}
