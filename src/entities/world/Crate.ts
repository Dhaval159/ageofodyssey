import Phaser from "phaser";
import { IInteractable } from "../../systems/interaction/IInteractable";
import { WorldObject } from "./WorldObject";

export interface CrateConfig {
    scene: Phaser.Scene;
    x: number;
    y: number;
    width?: number;
    height?: number;
    pushRange?: number;
}

export class Crate implements IInteractable {
    public readonly id: string;
    public worldObject: WorldObject;
    private pushRange: number;
    private lastPushTime: number = 0;
    private pushCooldown: number = 300;
    private isMoving: boolean = false;
    private currentX: number;
    private currentY: number;

    constructor(config: CrateConfig) {
        this.id = `crate_${config.x}_${config.y}`;
        this.pushRange = config.pushRange ?? 48;
        this.currentX = config.x;
        this.currentY = config.y;

        const w = config.width ?? 28;
        const h = config.height ?? 28;

        this.worldObject = new WorldObject({
            scene: config.scene,
            id: this.id,
            type: "crate",
            x: config.x,
            y: config.y,
            width: w,
            height: h,
            color: 0x8a6a3a,
            alpha: 1,
            isCollidable: true,
            strokeColor: 0x6a4a1a,
            strokeWidth: 2,
        });

        // Draw cross planks
        const g = config.scene.add.graphics();
        g.lineStyle(1, 0x6a4a1a, 0.4);
        g.lineBetween(config.x - w / 2, config.y - h / 2, config.x + w / 2, config.y + h / 2);
        g.lineBetween(config.x + w / 2, config.y - h / 2, config.x - w / 2, config.y + h / 2);
        g.setDepth(2);
        this.worldObject.setDepth(2);
    }

    public getId(): string {
        return this.id;
    }

    public getInteractionPrompt(): string {
        return "[E] Push crate";
    }

    public getPosition(): { x: number; y: number } {
        return { x: this.currentX, y: this.currentY };
    }

    public getInteractionRange(): number {
        return this.pushRange;
    }

    public isInteractionEnabled(): boolean {
        const now = Date.now();
        return now - this.lastPushTime > this.pushCooldown && !this.isMoving;
    }

    public interact(): void {
        this.push();
    }

    public push(): void {
        this.lastPushTime = Date.now();
    }

    public pushInDirection(dx: number, dy: number, checkCollision: (x: number, y: number) => boolean): boolean {
        if (this.isMoving) return false;

        const pushDist = 28;
        const newX = this.currentX + dx * pushDist;
        const newY = this.currentY + dy * pushDist;

        // Check if destination is free
        if (checkCollision(newX, newY)) {
            return false;
        }

        this.isMoving = true;

        const scene = (this.worldObject as any).gameObject?.scene;
        if (scene) {
            scene.tweens.add({
                targets: this.worldObject.gameObject,
                x: newX,
                y: newY,
                duration: 200,
                ease: "Power2",
                onComplete: () => {
                    this.currentX = newX;
                    this.currentY = newY;
                    this.isMoving = false;
                },
            });
        } else {
            this.worldObject.gameObject.setPosition(newX, newY);
            this.currentX = newX;
            this.currentY = newY;
            this.isMoving = false;
        }

        return true;
    }

    public setDepth(depth: number): void {
        this.worldObject.setDepth(depth);
    }

    public getBounds(): { x: number; y: number; width: number; height: number } {
        return {
            x: this.currentX - this.worldObject.width / 2,
            y: this.currentY - this.worldObject.height / 2,
            width: this.worldObject.width,
            height: this.worldObject.height,
        };
    }
}
