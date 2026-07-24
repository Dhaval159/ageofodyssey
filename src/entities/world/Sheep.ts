import Phaser from "phaser";
import { IInteractable } from "../../systems/interaction/IInteractable";

export class Sheep extends Phaser.GameObjects.Container implements IInteractable {
    private bodyGraphics: Phaser.GameObjects.Graphics;
    private moveDirection: { x: number; y: number } = { x: 0, y: 0 };
    private moveSpeed: number = 12;
    private restTime: number = 0;
    private isResting: boolean = true;
    private wanderBounds: { minX: number; maxX: number; minY: number; maxY: number };
    private bobOffset: number = 0;
    private flashed: boolean = false;

    constructor(
        scene: Phaser.Scene,
        x: number,
        y: number,
        bounds: { minX: number; maxX: number; minY: number; maxY: number }
    ) {
        super(scene, x, y);

        this.wanderBounds = bounds;

        this.bodyGraphics = scene.add.graphics();
        this.drawSheep();
        this.add(this.bodyGraphics);

        scene.add.existing(this);
        this.setDepth(5);

        this.restTime = Phaser.Math.Between(1000, 4000);
    }

    private drawSheep(): void {
        const g = this.bodyGraphics;
        g.clear();

        // Body
        g.fillStyle(0xddddcc, 1);
        g.fillEllipse(0, 0, 18, 12);

        // Wool texture
        g.fillStyle(0xeeeeee, 0.5);
        g.fillCircle(-4, -3, 3);
        g.fillCircle(2, -4, 3);
        g.fillCircle(6, -2, 2.5);
        g.fillCircle(-2, 2, 2.5);

        // Head
        g.fillStyle(0xccccbb, 1);
        g.fillCircle(10, -2, 4);

        // Ears
        g.fillStyle(0xbbbbaa, 1);
        g.fillEllipse(8, -6, 5, 3);
        g.fillEllipse(13, -5, 4, 2.5);

        // Eyes
        g.fillStyle(0x222222, 1);
        g.fillCircle(11, -3, 1);
        g.fillCircle(13, -2.5, 0.8);

        // Legs
        g.fillStyle(0xbbbbaa, 1);
        g.fillRect(-5, 6, 3, 6);
        g.fillRect(0, 6, 3, 6);
        g.fillRect(-3, 6, 3, 6);
        g.fillRect(2, 6, 3, 6);
    }

    public getId(): string {
        return `sheep_${this.x}_${this.y}`;
    }

    public getInteractionPrompt(): string {
        return "[E] Pet";
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.x, y: this.y };
    }

    public getInteractionRange(): number {
        return 50;
    }

    public isInteractionEnabled(): boolean {
        return true;
    }

    public interact(): void {
        if (this.flashed) return;
        this.flashed = true;

        // Baa reaction
        const baaText = this.scene.add.text(this.x, this.y - 20, "Baa!", {
            fontSize: "11px",
            color: "#ffffff",
            stroke: "#000000",
            strokeThickness: 2,
        });
        baaText.setDepth(100);
        baaText.setOrigin(0.5);

        this.scene.tweens.add({
            targets: baaText,
            y: baaText.y - 20,
            alpha: 0,
            duration: 1000,
            ease: "Power2",
            onComplete: () => baaText.destroy(),
        });

        // Bounce
        this.scene.tweens.add({
            targets: this,
            scaleY: 0.7,
            scaleX: 1.1,
            duration: 100,
            yoyo: true,
            ease: "Bounce",
        });

        this.scene.time.delayedCall(2000, () => {
            this.flashed = false;
        });
    }

    public update(_time: number, delta: number): void {
        const dt = delta / 1000;

        this.bobOffset += dt * 2;
        this.bodyGraphics.y = Math.sin(this.bobOffset) * 1.5;

        this.restTime -= delta;

        if (this.isResting) {
            if (this.restTime <= 0) {
                this.isResting = false;
                this.moveDirection = {
                    x: Phaser.Math.Between(-1, 1),
                    y: Phaser.Math.Between(-1, 1),
                };
                // Normalize diagonal
                const len = Math.sqrt(
                    this.moveDirection.x ** 2 + this.moveDirection.y ** 2
                );
                if (len > 0) {
                    this.moveDirection.x /= len;
                    this.moveDirection.y /= len;
                }
                this.restTime = Phaser.Math.Between(1500, 4000);
            }
        } else {
            // Move
            const newX = this.x + this.moveDirection.x * this.moveSpeed * dt;
            const newY = this.y + this.moveDirection.y * this.moveSpeed * dt;

            // Bounds check
            if (
                newX >= this.wanderBounds.minX &&
                newX <= this.wanderBounds.maxX &&
                newY >= this.wanderBounds.minY &&
                newY <= this.wanderBounds.maxY
            ) {
                this.x = newX;
                this.y = newY;
            } else {
                this.isResting = true;
                this.restTime = Phaser.Math.Between(1000, 3000);
            }

            this.restTime -= delta;
            if (this.restTime <= 0) {
                this.isResting = true;
                this.restTime = Phaser.Math.Between(1000, 3000);
            }
        }
    }
}
