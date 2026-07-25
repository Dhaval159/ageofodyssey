import Phaser from "phaser";
import {
  AnimationId,
  AnimationDef,
  AnimationTransition,
  EntityAnimationConfig,
} from "./AnimationConfig";
import { Logger } from "../../core/Logger";

export class AnimationRegistry {
  private static configs: Map<string, EntityAnimationConfig> = new Map();

  public static register(entityType: string, config: EntityAnimationConfig): void {
    AnimationRegistry.configs.set(entityType, config);
  }

  public static getConfig(entityType: string): EntityAnimationConfig | null {
    return AnimationRegistry.configs.get(entityType) ?? null;
  }

  public static generatePlayerPlaceholders(scene: Phaser.Scene): void {
    const fw = 32;
    const fh = 48;
    const color = 0x00ffcc;
    const stroke = 0xffffff;

    const defs: Record<AnimationId, { frameCount: number; frameRate: number; repeat: number; speedScale?: number }> = {
      [AnimationId.IDLE]: { frameCount: 2, frameRate: 3, repeat: -1 },
      [AnimationId.WALK]: { frameCount: 4, frameRate: 8, repeat: -1, speedScale: 1.2 },
      [AnimationId.RUN]: { frameCount: 4, frameRate: 12, repeat: -1, speedScale: 1.5 },
      [AnimationId.ROLL]: { frameCount: 2, frameRate: 10, repeat: 0 },
      [AnimationId.ATTACK]: { frameCount: 2, frameRate: 10, repeat: 0 },
      [AnimationId.HEAVY_ATTACK]: { frameCount: 2, frameRate: 8, repeat: 0 },
      [AnimationId.BLOCK]: { frameCount: 1, frameRate: 1, repeat: -1 },
      [AnimationId.HURT]: { frameCount: 1, frameRate: 1, repeat: 0 },
      [AnimationId.DEATH]: { frameCount: 2, frameRate: 4, repeat: 0 },
    };

    const prefix = "placeholder_player";
    const sheetKey = `${prefix}_sheet`;

    const totalFrames = Object.values(defs).reduce((sum, d) => sum + d.frameCount, 0);
    const sheetWidth = fw * totalFrames;
    const sheetHeight = fh;

    const graphics = scene.make.graphics();

    let frameIndex = 0;
    for (const [animIdStr, animDef] of Object.entries(defs)) {
      const animId = animIdStr as AnimationId;
      for (let f = 0; f < animDef.frameCount; f++) {
        const ox = frameIndex * fw;
        AnimationRegistry.drawPlayerFrame(graphics, ox, 0, fw, fh, animId, f, animDef.frameCount, color, stroke);
        frameIndex++;
      }
    }

    graphics.generateTexture(sheetKey, sheetWidth, sheetHeight);
    graphics.destroy();

    const texture = scene.textures.get(sheetKey);
    texture.add("__BASE", 0, 0, 0, sheetWidth, sheetHeight);

    let globalFrameIndex = 0;
    for (const [animIdStr, animDef] of Object.entries(defs)) {
      const animId = animIdStr as AnimationId;
      const frameIndices: number[] = [];
      for (let f = 0; f < animDef.frameCount; f++) {
        const frameName = `frame_${globalFrameIndex}`;
        texture.add(frameName, 0, globalFrameIndex * fw, 0, fw, fh);
        frameIndices.push(globalFrameIndex);
        globalFrameIndex++;
      }

      const animKey = `${prefix}_${animId.toLowerCase()}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: frameIndices.map((i) => ({
            key: sheetKey,
            frame: `frame_${i}`,
          })),
          frameRate: animDef.frameRate,
          repeat: animDef.repeat,
        });
      }
    }

    const animations: Record<AnimationId, AnimationDef> = {} as Record<AnimationId, AnimationDef>;
    for (const [animIdStr, animDef] of Object.entries(defs)) {
      const animId = animIdStr as AnimationId;
      animations[animId] = {
        key: sheetKey,
        prefix,
        frameCount: animDef.frameCount,
        frameRate: animDef.frameRate,
        repeat: animDef.repeat,
        speedScale: animDef.speedScale,
      };
    }

    const transitions: AnimationTransition[] = [
      { from: AnimationId.IDLE, to: AnimationId.WALK },
      { from: AnimationId.IDLE, to: AnimationId.RUN },
      { from: AnimationId.WALK, to: AnimationId.IDLE },
      { from: AnimationId.WALK, to: AnimationId.RUN },
      { from: AnimationId.RUN, to: AnimationId.IDLE },
      { from: AnimationId.RUN, to: AnimationId.WALK },
      { from: AnimationId.IDLE, to: AnimationId.ROLL },
      { from: AnimationId.WALK, to: AnimationId.ROLL },
      { from: AnimationId.RUN, to: AnimationId.ROLL },
      { from: AnimationId.IDLE, to: AnimationId.ATTACK },
      { from: AnimationId.WALK, to: AnimationId.ATTACK },
      { from: AnimationId.RUN, to: AnimationId.ATTACK },
      { from: AnimationId.IDLE, to: AnimationId.HEAVY_ATTACK },
      { from: AnimationId.WALK, to: AnimationId.HEAVY_ATTACK },
      { from: AnimationId.RUN, to: AnimationId.HEAVY_ATTACK },
      { from: AnimationId.IDLE, to: AnimationId.BLOCK },
      { from: AnimationId.WALK, to: AnimationId.BLOCK },
      { from: AnimationId.RUN, to: AnimationId.BLOCK },
      { from: AnimationId.ROLL, to: AnimationId.IDLE },
      { from: AnimationId.ATTACK, to: AnimationId.IDLE },
      { from: AnimationId.HEAVY_ATTACK, to: AnimationId.IDLE },
      { from: AnimationId.BLOCK, to: AnimationId.IDLE },
      { from: AnimationId.HURT, to: AnimationId.IDLE },
      { from: AnimationId.DEATH, to: AnimationId.IDLE },
      { from: AnimationId.IDLE, to: AnimationId.HURT },
      { from: AnimationId.WALK, to: AnimationId.HURT },
      { from: AnimationId.RUN, to: AnimationId.HURT },
      { from: AnimationId.IDLE, to: AnimationId.DEATH },
      { from: AnimationId.WALK, to: AnimationId.DEATH },
      { from: AnimationId.RUN, to: AnimationId.DEATH },
      { from: AnimationId.ATTACK, to: AnimationId.DEATH },
      { from: AnimationId.BLOCK, to: AnimationId.DEATH },
      { from: AnimationId.HURT, to: AnimationId.DEATH },
    ];

    const config: EntityAnimationConfig = {
      entityType: "player",
      animations,
      defaultAnimation: AnimationId.IDLE,
      transitions,
      spritesheet: {
        key: sheetKey,
        frameWidth: fw,
        frameHeight: fh,
      },
    };

    AnimationRegistry.register("player", config);
    Logger.getInstance().log(`[AnimationRegistry] Player placeholder animations generated (${totalFrames} frames)`);
  }

  public static generateWolfPlaceholders(scene: Phaser.Scene): void {
    const fw = 40;
    const fh = 28;
    const color = 0x808080;
    const stroke = 0x404040;

    const defs: Record<string, { frameCount: number; frameRate: number; repeat: number; speedScale?: number }> = {
      [AnimationId.IDLE]: { frameCount: 2, frameRate: 3, repeat: -1 },
      [AnimationId.WALK]: { frameCount: 3, frameRate: 6, repeat: -1, speedScale: 1.2 },
      [AnimationId.RUN]: { frameCount: 3, frameRate: 10, repeat: -1, speedScale: 1.5 },
      [AnimationId.ATTACK]: { frameCount: 2, frameRate: 8, repeat: 0 },
      [AnimationId.HURT]: { frameCount: 1, frameRate: 1, repeat: 0 },
      [AnimationId.DEATH]: { frameCount: 2, frameRate: 4, repeat: 0 },
    };

    const prefix = "placeholder_wolf";
    const sheetKey = `${prefix}_sheet`;

    const totalFrames = Object.values(defs).reduce((sum, d) => sum + d.frameCount, 0);
    const sheetWidth = fw * totalFrames;
    const sheetHeight = fh;

    const graphics = scene.make.graphics();

    let frameIndex = 0;
    for (const [animIdStr, animDef] of Object.entries(defs)) {
      const animId = animIdStr as AnimationId;
      for (let f = 0; f < animDef.frameCount; f++) {
        const ox = frameIndex * fw;
        AnimationRegistry.drawWolfFrame(graphics, ox, 0, fw, fh, animId, f, animDef.frameCount, color, stroke);
        frameIndex++;
      }
    }

    graphics.generateTexture(sheetKey, sheetWidth, sheetHeight);
    graphics.destroy();

    const texture = scene.textures.get(sheetKey);
    texture.add("__BASE", 0, 0, 0, sheetWidth, sheetHeight);

    let globalFrameIndex = 0;
    for (const [animIdStr, animDef] of Object.entries(defs)) {
      const animId = animIdStr as AnimationId;
      const frameIndices: number[] = [];
      for (let f = 0; f < animDef.frameCount; f++) {
        const frameName = `frame_${globalFrameIndex}`;
        texture.add(frameName, 0, globalFrameIndex * fw, 0, fw, fh);
        frameIndices.push(globalFrameIndex);
        globalFrameIndex++;
      }

      const animKey = `${prefix}_${animId.toLowerCase()}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: frameIndices.map((i) => ({
            key: sheetKey,
            frame: `frame_${i}`,
          })),
          frameRate: animDef.frameRate,
          repeat: animDef.repeat,
        });
      }
    }

    const animations: Record<AnimationId, AnimationDef> = {} as Record<AnimationId, AnimationDef>;
    for (const [animIdStr, animDef] of Object.entries(defs)) {
      const animId = animIdStr as AnimationId;
      animations[animId] = {
        key: sheetKey,
        prefix,
        frameCount: animDef.frameCount,
        frameRate: animDef.frameRate,
        repeat: animDef.repeat,
        speedScale: animDef.speedScale,
      };
    }

    const transitions: AnimationTransition[] = [
      { from: AnimationId.IDLE, to: AnimationId.WALK },
      { from: AnimationId.IDLE, to: AnimationId.RUN },
      { from: AnimationId.WALK, to: AnimationId.IDLE },
      { from: AnimationId.WALK, to: AnimationId.RUN },
      { from: AnimationId.RUN, to: AnimationId.IDLE },
      { from: AnimationId.RUN, to: AnimationId.WALK },
      { from: AnimationId.IDLE, to: AnimationId.ATTACK },
      { from: AnimationId.WALK, to: AnimationId.ATTACK },
      { from: AnimationId.RUN, to: AnimationId.ATTACK },
      { from: AnimationId.IDLE, to: AnimationId.HURT },
      { from: AnimationId.WALK, to: AnimationId.HURT },
      { from: AnimationId.RUN, to: AnimationId.HURT },
      { from: AnimationId.ATTACK, to: AnimationId.IDLE },
      { from: AnimationId.ATTACK, to: AnimationId.WALK },
      { from: AnimationId.ATTACK, to: AnimationId.RUN },
      { from: AnimationId.HURT, to: AnimationId.IDLE },
      { from: AnimationId.HURT, to: AnimationId.WALK },
      { from: AnimationId.HURT, to: AnimationId.RUN },
      { from: AnimationId.IDLE, to: AnimationId.DEATH },
      { from: AnimationId.WALK, to: AnimationId.DEATH },
      { from: AnimationId.RUN, to: AnimationId.DEATH },
      { from: AnimationId.ATTACK, to: AnimationId.DEATH },
      { from: AnimationId.HURT, to: AnimationId.DEATH },
    ];

    const config: EntityAnimationConfig = {
      entityType: "wolf",
      animations,
      defaultAnimation: AnimationId.IDLE,
      transitions,
      spritesheet: {
        key: sheetKey,
        frameWidth: fw,
        frameHeight: fh,
      },
    };

    AnimationRegistry.register("wolf", config);
    Logger.getInstance().log(`[AnimationRegistry] Wolf placeholder animations generated (${totalFrames} frames)`);
  }

  private static drawWolfFrame(
    g: Phaser.GameObjects.Graphics,
    ox: number,
    oy: number,
    _fw: number,
    _fh: number,
    animId: AnimationId,
    frame: number,
    totalFrames: number,
    color: number,
    stroke: number
  ): void {
    const cx = ox + 18;
    const bodyTop = oy + 8;
    const bodyBottom = oy + 18;
    const bodyWidth = 20;
    const legHeight = 10;

    g.fillStyle(color, 1);
    g.lineStyle(1, stroke, 0.6);

    const bobY = (animId === AnimationId.IDLE && frame === 1) ? 1 : 0;
    const walkOffset = (animId === AnimationId.WALK || animId === AnimationId.RUN)
      ? Math.sin((frame / totalFrames) * Math.PI * 2) * 3 : 0;
    const runLean = (animId === AnimationId.RUN && frame % 2 === 1) ? 2 : 0;
    const isDead = animId === AnimationId.DEATH;

    const bodyY = bodyTop + bobY + (isDead && frame === 1 ? 6 : 0);
    const headXOff = isDead && frame === 1 ? -4 : 0;

    // Body
    g.fillRect(ox + 8 + runLean, bodyY, bodyWidth, 10);
    g.strokeRect(ox + 8 + runLean, bodyY, bodyWidth, 10);

    // Head
    if (isDead && frame === 1) {
      g.fillCircle(cx - 6 + headXOff, bodyY + 5, 4);
      g.strokeCircle(cx - 6 + headXOff, bodyY + 5, 4);
    } else {
      g.fillCircle(cx + 12 + runLean, bodyY + 3, 4);
      g.strokeCircle(cx + 12 + runLean, bodyY + 3, 4);
    }

    if (animId === AnimationId.ATTACK) {
      const mouthOpen = frame === 1 ? 3 : 0;
      g.fillStyle(0xcc4444, 1);
      g.fillCircle(cx + 16 + mouthOpen + runLean, bodyY + 5, 2);
      g.fillStyle(color, 1);
    }

    // Legs
    const legPhase = walkOffset;
    g.fillRect(ox + 9 + runLean, bodyBottom + bobY + (isDead && frame === 1 ? 4 : 0), 4, legHeight + legPhase);
    g.fillRect(ox + 15 + runLean, bodyBottom + bobY + (isDead && frame === 1 ? 4 : 0), 4, legHeight - legPhase);
    g.fillRect(ox + 21 + runLean, bodyBottom + bobY + (isDead && frame === 1 ? 4 : 0), 4, legHeight - legPhase);
    g.fillRect(ox + 27 + runLean, bodyBottom + bobY + (isDead && frame === 1 ? 4 : 0), 4, legHeight + legPhase);

    // Tail
    if (!isDead || frame === 0) {
      g.fillRect(ox + 4 + runLean, bodyY + 2, 4, 3);
    }

    // Hurt flash
    if (animId === AnimationId.HURT) {
      g.fillStyle(0xff6666, 0.5);
      g.fillRect(ox + 8, bodyTop, bodyWidth, 10);
      g.fillStyle(color, 1);
    }
  }

  private static drawPlayerFrame(
    g: Phaser.GameObjects.Graphics,
    ox: number,
    oy: number,
    _fw: number,
    _fh: number,
    animId: AnimationId,
    frame: number,
    totalFrames: number,
    color: number,
    stroke: number
  ): void {
    const cx = ox + 16;
    const headY = oy + 7;
    const bodyTop = oy + 14;
    const bodyBottom = oy + 30;

    g.fillStyle(color, 1);
    g.lineStyle(1, stroke, 0.6);

    switch (animId) {
      case AnimationId.IDLE: {
        const bobY = frame === 0 ? 0 : 1;
        g.fillCircle(cx, headY + bobY, 5);
        g.strokeCircle(cx, headY + bobY, 5);
        g.fillRect(ox + 10, bodyTop + bobY, 12, 16);
        g.strokeRect(ox + 10, bodyTop + bobY, 12, 16);
        g.fillRect(ox + 8, bodyBottom + bobY, 5, 12);
        g.fillRect(ox + 19, bodyBottom + bobY, 5, 12);
        break;
      }
      case AnimationId.WALK: {
        const legOffset = Math.sin((frame / totalFrames) * Math.PI * 2) * 4;
        g.fillCircle(cx, headY, 5);
        g.strokeCircle(cx, headY, 5);
        g.fillRect(ox + 10, bodyTop, 12, 16);
        g.strokeRect(ox + 10, bodyTop, 12, 16);
        g.fillRect(ox + 8 + legOffset, bodyBottom, 5, 12);
        g.fillRect(ox + 19 - legOffset, bodyBottom, 5, 12);
        break;
      }
      case AnimationId.RUN: {
        const runOffset = Math.sin((frame / totalFrames) * Math.PI * 2) * 6;
        const lean = frame % 2 === 1 ? 1 : 0;
        g.fillCircle(cx + lean, headY, 5);
        g.strokeCircle(cx + lean, headY, 5);
        g.fillRect(ox + 10 + lean, bodyTop, 12, 16);
        g.strokeRect(ox + 10 + lean, bodyTop, 12, 16);
        g.fillRect(ox + 7 + runOffset, bodyBottom, 5, 12);
        g.fillRect(ox + 20 - runOffset, bodyBottom, 5, 12);
        break;
      }
      case AnimationId.ROLL: {
        if (frame === 0) {
          g.fillCircle(cx, oy + 30, 4);
          g.strokeCircle(cx, oy + 30, 4);
          g.fillRect(ox + 9, oy + 20, 14, 14);
          g.strokeRect(ox + 9, oy + 20, 14, 14);
        } else {
          g.fillCircle(cx, oy + 32, 8);
          g.strokeCircle(cx, oy + 32, 8);
        }
        break;
      }
      case AnimationId.ATTACK: {
        g.fillCircle(cx, headY, 5);
        g.strokeCircle(cx, headY, 5);
        g.fillRect(ox + 10, bodyTop, 12, 16);
        g.strokeRect(ox + 10, bodyTop, 12, 16);
        g.fillRect(ox + 8, bodyBottom, 5, 12);
        g.fillRect(ox + 19, bodyBottom, 5, 12);
        const armExtend = frame === 0 ? -3 : 8;
        g.fillRect(ox + 22, bodyTop + 2 + armExtend, 6, 4);
        break;
      }
      case AnimationId.HEAVY_ATTACK: {
        g.fillCircle(cx, headY, 5);
        g.strokeCircle(cx, headY, 5);
        g.fillRect(ox + 10, bodyTop, 12, 16);
        g.strokeRect(ox + 10, bodyTop, 12, 16);
        g.fillRect(ox + 8, bodyBottom, 5, 12);
        g.fillRect(ox + 19, bodyBottom, 5, 12);
        const armExtend = frame === 0 ? -5 : 12;
        g.fillRect(ox + 22, bodyTop + armExtend, 8, 5);
        break;
      }
      case AnimationId.BLOCK: {
        g.fillCircle(cx, headY, 5);
        g.strokeCircle(cx, headY, 5);
        g.fillRect(ox + 10, bodyTop, 12, 16);
        g.strokeRect(ox + 10, bodyTop, 12, 16);
        g.fillRect(ox + 8, bodyBottom, 5, 12);
        g.fillRect(ox + 19, bodyBottom, 5, 12);
        g.fillRect(ox + 6, bodyTop - 2, 20, 6);
        break;
      }
      case AnimationId.HURT: {
        const leanBack = -2;
        g.fillCircle(cx + leanBack, headY, 5);
        g.strokeCircle(cx + leanBack, headY, 5);
        g.fillRect(ox + 10 + leanBack, bodyTop, 12, 16);
        g.strokeRect(ox + 10 + leanBack, bodyTop, 12, 16);
        break;
      }
      case AnimationId.DEATH: {
        if (frame === 0) {
          g.fillCircle(cx - 2, headY, 5);
          g.strokeCircle(cx - 2, headY, 5);
          g.fillRect(ox + 9, bodyTop + 4, 12, 12);
          g.strokeRect(ox + 9, bodyTop + 4, 12, 12);
          g.fillRect(ox + 7, bodyBottom + 2, 5, 8);
          g.fillRect(ox + 18, bodyBottom + 2, 5, 8);
        } else {
          g.fillCircle(cx - 4, oy + 20, 5);
          g.strokeCircle(cx - 4, oy + 20, 5);
          g.fillRect(ox + 6, oy + 26, 18, 10);
          g.strokeRect(ox + 6, oy + 26, 18, 10);
          g.fillRect(ox + 4, oy + 36, 4, 6);
          g.fillRect(ox + 22, oy + 36, 4, 6);
        }
      }
    }
  }

  public static generateCyclopsPlaceholders(scene: Phaser.Scene): void {
    const fw = 80;
    const fh = 100;
    const color = 0xbc9c8c;
    const stroke = 0x5a4a3a;

    const defs: Record<AnimationId, { frameCount: number; frameRate: number; repeat: number; speedScale?: number }> = {
      [AnimationId.IDLE]: { frameCount: 2, frameRate: 3, repeat: -1 },
      [AnimationId.WALK]: { frameCount: 4, frameRate: 6, repeat: -1, speedScale: 1.0 },
      [AnimationId.RUN]: { frameCount: 4, frameRate: 8, repeat: -1, speedScale: 1.2 },
      [AnimationId.ROLL]: { frameCount: 1, frameRate: 1, repeat: 0 },
      [AnimationId.ATTACK]: { frameCount: 3, frameRate: 10, repeat: 0 },
      [AnimationId.HEAVY_ATTACK]: { frameCount: 3, frameRate: 8, repeat: 0 },
      [AnimationId.BLOCK]: { frameCount: 3, frameRate: 8, repeat: 0 },
      [AnimationId.HURT]: { frameCount: 1, frameRate: 1, repeat: 0 },
      [AnimationId.DEATH]: { frameCount: 2, frameRate: 4, repeat: 0 },
    };

    const prefix = "placeholder_cyclops";
    const sheetKey = `${prefix}_sheet`;

    const totalFrames = Object.values(defs).reduce((sum, d) => sum + d.frameCount, 0);
    const sheetWidth = fw * totalFrames;
    const sheetHeight = fh;

    const graphics = scene.make.graphics();

    let frameIndex = 0;
    for (const [animIdStr, animDef] of Object.entries(defs)) {
      const animId = animIdStr as AnimationId;
      for (let f = 0; f < animDef.frameCount; f++) {
        const ox = frameIndex * fw;
        AnimationRegistry.drawCyclopsFrame(graphics, ox, 0, fw, fh, animId, f, animDef.frameCount, color, stroke);
        frameIndex++;
      }
    }

    graphics.generateTexture(sheetKey, sheetWidth, sheetHeight);
    graphics.destroy();

    const texture = scene.textures.get(sheetKey);
    texture.add("__BASE", 0, 0, 0, sheetWidth, sheetHeight);

    let globalFrameIndex = 0;
    for (const [animIdStr, animDef] of Object.entries(defs)) {
      const animId = animIdStr as AnimationId;
      const frameIndices: number[] = [];
      for (let f = 0; f < animDef.frameCount; f++) {
        const frameName = `frame_cyc_${globalFrameIndex}`;
        texture.add(frameName, 0, globalFrameIndex * fw, 0, fw, fh);
        frameIndices.push(globalFrameIndex);
        globalFrameIndex++;
      }

      const animKey = `${prefix}_${animId.toLowerCase()}`;
      if (!scene.anims.exists(animKey)) {
        scene.anims.create({
          key: animKey,
          frames: frameIndices.map((i) => ({
            key: sheetKey,
            frame: `frame_cyc_${i}`,
          })),
          frameRate: animDef.frameRate,
          repeat: animDef.repeat,
        });
      }
    }

    const animations: Record<AnimationId, AnimationDef> = {} as Record<AnimationId, AnimationDef>;
    for (const [animIdStr, animDef] of Object.entries(defs)) {
      const animId = animIdStr as AnimationId;
      animations[animId] = {
        key: sheetKey,
        prefix,
        frameCount: animDef.frameCount,
        frameRate: animDef.frameRate,
        repeat: animDef.repeat,
        speedScale: animDef.speedScale,
      };
    }

    const transitions = [
      { from: AnimationId.IDLE, to: AnimationId.WALK },
      { from: AnimationId.WALK, to: AnimationId.IDLE },
      { from: AnimationId.IDLE, to: AnimationId.RUN },
      { from: AnimationId.RUN, to: AnimationId.IDLE },
      { from: AnimationId.WALK, to: AnimationId.RUN },
      { from: AnimationId.RUN, to: AnimationId.WALK },
      { from: AnimationId.IDLE, to: AnimationId.ATTACK },
      { from: AnimationId.WALK, to: AnimationId.ATTACK },
      { from: AnimationId.RUN, to: AnimationId.ATTACK },
      { from: AnimationId.ATTACK, to: AnimationId.IDLE },
      { from: AnimationId.ATTACK, to: AnimationId.WALK },
      { from: AnimationId.IDLE, to: AnimationId.HEAVY_ATTACK },
      { from: AnimationId.WALK, to: AnimationId.HEAVY_ATTACK },
      { from: AnimationId.HEAVY_ATTACK, to: AnimationId.IDLE },
      { from: AnimationId.HEAVY_ATTACK, to: AnimationId.WALK },
      { from: AnimationId.IDLE, to: AnimationId.HURT },
      { from: AnimationId.WALK, to: AnimationId.HURT },
      { from: AnimationId.RUN, to: AnimationId.HURT },
      { from: AnimationId.ATTACK, to: AnimationId.HURT },
      { from: AnimationId.HURT, to: AnimationId.IDLE },
      { from: AnimationId.HURT, to: AnimationId.WALK },
      { from: AnimationId.IDLE, to: AnimationId.DEATH },
      { from: AnimationId.WALK, to: AnimationId.DEATH },
      { from: AnimationId.RUN, to: AnimationId.DEATH },
      { from: AnimationId.ATTACK, to: AnimationId.DEATH },
      { from: AnimationId.HURT, to: AnimationId.DEATH },
    ];

    const config: EntityAnimationConfig = {
      entityType: "cyclops",
      animations,
      defaultAnimation: AnimationId.IDLE,
      transitions,
      spritesheet: {
        key: sheetKey,
        frameWidth: fw,
        frameHeight: fh,
      },
    };

    AnimationRegistry.register("cyclops", config);
    Logger.getInstance().log(`[AnimationRegistry] Cyclops placeholder animations generated (${totalFrames} frames)`);
  }

  private static drawCyclopsFrame(
    g: Phaser.GameObjects.Graphics,
    ox: number,
    oy: number,
    fw: number,
    _fh: number,
    animId: AnimationId,
    frame: number,
    totalFrames: number,
    color: number,
    stroke: number
  ): void {
    const cx = ox + fw / 2;
    const headY = oy + 25;
    const bodyTop = oy + 38;
    const bodyBottom = oy + 70;
    const bodyWidth = 36;
    const bodyHeight = 32;
    const legHeight = 24;

    g.fillStyle(color, 1);
    g.lineStyle(1.5, stroke, 0.8);

    switch (animId) {
      case AnimationId.IDLE: {
        const bobY = frame === 0 ? 0 : 2;
        // Head
        g.fillCircle(cx, headY + bobY, 14);
        g.strokeCircle(cx, headY + bobY, 14);
        // Eye (Single glowing eye)
        g.fillStyle(0xffff00, 1);
        g.fillCircle(cx, headY + bobY, 3.5);
        g.fillStyle(0xff0000, 1);
        g.fillCircle(cx, headY + bobY, 1.5);
        g.fillStyle(color, 1);
        // Torso
        g.fillRect(ox + (fw - bodyWidth) / 2, bodyTop + bobY, bodyWidth, bodyHeight);
        g.strokeRect(ox + (fw - bodyWidth) / 2, bodyTop + bobY, bodyWidth, bodyHeight);
        // Legs
        g.fillRect(cx - 12, bodyBottom + bobY, 8, legHeight);
        g.fillRect(cx + 4, bodyBottom + bobY, 8, legHeight);
        g.strokeRect(cx - 12, bodyBottom + bobY, 8, legHeight);
        g.strokeRect(cx + 4, bodyBottom + bobY, 8, legHeight);
        // Club resting on shoulder
        g.fillStyle(0x6e473b, 1);
        g.fillRect(cx - 24, bodyTop - 8 + bobY, 6, 20);
        g.fillStyle(0x8a5849, 1);
        g.fillRect(cx - 25, bodyTop - 20 + bobY, 8, 12);
        g.fillStyle(color, 1);
        break;
      }
      case AnimationId.WALK:
      case AnimationId.RUN: {
        const legOffset = Math.sin((frame / totalFrames) * Math.PI * 2) * (animId === AnimationId.RUN ? 10 : 6);
        const bobY = frame % 2 === 0 ? 0 : 1;
        // Head
        g.fillCircle(cx, headY + bobY, 14);
        g.strokeCircle(cx, headY + bobY, 14);
        // Eye
        g.fillStyle(0xffff00, 1);
        g.fillCircle(cx, headY + bobY, 3.5);
        g.fillStyle(0xff0000, 1);
        g.fillCircle(cx, headY + bobY, 1.5);
        g.fillStyle(color, 1);
        // Torso
        g.fillRect(ox + (fw - bodyWidth) / 2, bodyTop + bobY, bodyWidth, bodyHeight);
        g.strokeRect(ox + (fw - bodyWidth) / 2, bodyTop + bobY, bodyWidth, bodyHeight);
        // Legs moving
        g.fillRect(cx - 12, bodyBottom + bobY + legOffset, 8, legHeight - legOffset);
        g.fillRect(cx + 4, bodyBottom + bobY - legOffset, 8, legHeight + legOffset);
        g.strokeRect(cx - 12, bodyBottom + bobY + legOffset, 8, legHeight - legOffset);
        g.strokeRect(cx + 4, bodyBottom + bobY - legOffset, 8, legHeight + legOffset);
        // Club swings
        g.fillStyle(0x6e473b, 1);
        g.fillRect(cx - 24 + legOffset * 0.3, bodyTop - 4 + bobY, 6, 20);
        g.fillStyle(0x8a5849, 1);
        g.fillRect(cx - 25 + legOffset * 0.3, bodyTop - 16 + bobY, 8, 12);
        g.fillStyle(color, 1);
        break;
      }
      case AnimationId.ROLL: {
        // Boss cannot roll, but complete the interface
        g.fillCircle(cx, headY + 10, 14);
        g.strokeCircle(cx, headY + 10, 14);
        g.fillRect(ox + (fw - bodyWidth) / 2, bodyTop + 10, bodyWidth, bodyHeight);
        break;
      }
      case AnimationId.ATTACK: {
        // Stomp: raise leg high in frame 1, slam down in frame 2
        const stompY = frame === 1 ? -8 : 0;
        // Head
        g.fillCircle(cx, headY, 14);
        g.strokeCircle(cx, headY, 14);
        // Eye (Glows yellow)
        g.fillStyle(0xffcc00, 1);
        g.fillCircle(cx, headY, 4);
        g.fillStyle(color, 1);
        // Torso
        g.fillRect(ox + (fw - bodyWidth) / 2, bodyTop, bodyWidth, bodyHeight);
        g.strokeRect(ox + (fw - bodyWidth) / 2, bodyTop, bodyWidth, bodyHeight);
        // Legs (One raises)
        g.fillRect(cx - 12, bodyBottom, 8, legHeight);
        g.fillRect(cx + 4, bodyBottom + stompY, 8, legHeight - stompY);
        g.strokeRect(cx - 12, bodyBottom, 8, legHeight);
        g.strokeRect(cx + 4, bodyBottom + stompY, 8, legHeight - stompY);
        break;
      }
      case AnimationId.HEAVY_ATTACK: {
        // Heavy Club Slam: raise club high in frame 0-1, smash down in frame 2
        const isSlam = frame === 2;
        // Head
        g.fillCircle(cx, headY + (isSlam ? 4 : -2), 14);
        g.strokeCircle(cx, headY + (isSlam ? 4 : -2), 14);
        // Eye
        g.fillStyle(0xff3300, 1);
        g.fillCircle(cx, headY + (isSlam ? 4 : -2), 4);
        g.fillStyle(color, 1);
        // Torso
        g.fillRect(ox + (fw - bodyWidth) / 2, bodyTop + (isSlam ? 4 : -2), bodyWidth, bodyHeight);
        g.strokeRect(ox + (fw - bodyWidth) / 2, bodyTop + (isSlam ? 4 : -2), bodyWidth, bodyHeight);
        // Legs
        g.fillRect(cx - 12, bodyBottom, 8, legHeight);
        g.fillRect(cx + 4, bodyBottom, 8, legHeight);
        g.strokeRect(cx - 12, bodyBottom, 8, legHeight);
        g.strokeRect(cx + 4, bodyBottom, 8, legHeight);
        // Giant Club
        g.fillStyle(0x6e473b, 1);
        if (isSlam) {
          // Slam down forward
          g.fillRect(cx + 10, bodyBottom - 6, 24, 8);
          g.fillStyle(0x8a5849, 1);
          g.fillRect(cx + 34, bodyBottom - 10, 16, 16);
        } else {
          // Raising high above
          g.fillRect(cx - 4, bodyTop - 34, 8, 24);
          g.fillStyle(0x8a5849, 1);
          g.fillRect(cx - 8, bodyTop - 50, 16, 16);
        }
        g.fillStyle(color, 1);
        break;
      }
      case AnimationId.BLOCK: {
        // Slow Grab / Roar / Rock Throw: reach arm forward
        const reachX = frame === 1 ? 12 : (frame === 2 ? 24 : 0);
        // Head
        g.fillCircle(cx, headY, 14);
        g.strokeCircle(cx, headY, 14);
        // Eye
        g.fillStyle(0xffff00, 1);
        g.fillCircle(cx, headY, 4);
        g.fillStyle(color, 1);
        // Torso
        g.fillRect(ox + (fw - bodyWidth) / 2, bodyTop, bodyWidth, bodyHeight);
        g.strokeRect(ox + (fw - bodyWidth) / 2, bodyTop, bodyWidth, bodyHeight);
        // Legs
        g.fillRect(cx - 12, bodyBottom, 8, legHeight);
        g.fillRect(cx + 4, bodyBottom, 8, legHeight);
        // Reach arm
        g.fillStyle(color, 1);
        g.fillRect(cx + 10, bodyTop + 6, 12 + reachX, 8);
        g.strokeRect(cx + 10, bodyTop + 6, 12 + reachX, 8);
        break;
      }
      case AnimationId.HURT: {
        // Flash red, tilt back
        g.fillStyle(0xff6666, 1);
        g.fillCircle(cx - 4, headY, 14);
        g.strokeCircle(cx - 4, headY, 14);
        // Eye (Red)
        g.fillStyle(0xff0000, 1);
        g.fillCircle(cx - 4, headY, 4.5);
        // Torso
        g.fillStyle(0xff6666, 1);
        g.fillRect(ox + (fw - bodyWidth) / 2 - 4, bodyTop, bodyWidth, bodyHeight);
        g.strokeRect(ox + (fw - bodyWidth) / 2 - 4, bodyTop, bodyWidth, bodyHeight);
        g.fillRect(cx - 16, bodyBottom, 8, legHeight);
        g.fillRect(cx, bodyBottom, 8, legHeight);
        break;
      }
      case AnimationId.DEATH: {
        // Fall flat
        if (frame === 0) {
          // Falling
          g.fillCircle(cx - 10, headY + 16, 14);
          g.strokeCircle(cx - 10, headY + 16, 14);
          g.fillRect(ox + 16, bodyTop + 20, bodyWidth, bodyHeight);
        } else {
          // Dead flat
          g.fillCircle(cx - 24, bodyBottom + 8, 14);
          g.strokeCircle(cx - 24, bodyBottom + 8, 14);
          // Crossed eye (X representation)
          g.lineStyle(2, 0x000000, 0.8);
          g.lineBetween(cx - 27, bodyBottom + 5, cx - 21, bodyBottom + 11);
          g.lineBetween(cx - 27, bodyBottom + 11, cx - 21, bodyBottom + 5);
          // Flat body
          g.fillStyle(color, 1);
          g.fillRect(cx - 10, bodyBottom + 2, bodyHeight, bodyWidth);
          g.strokeRect(cx - 10, bodyBottom + 2, bodyHeight, bodyWidth);
        }
        break;
      }
    }
  }
}
