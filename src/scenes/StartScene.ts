import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENES,
  CHARACTER_KEYS,
  ANIM_STATES,
  animSpriteKey,
  SPRITE_FRAME_WIDTH,
  SPRITE_FRAME_HEIGHT,
} from '../config/constants';
import { soundManager } from '../audio/SoundManager';
import { trackGameStart } from '../utils/analytics';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.START });
  }

  preload(): void {
    CHARACTER_KEYS.forEach((charKey) => {
      const key = animSpriteKey(charKey, ANIM_STATES[0]);
      if (!this.textures.exists(key)) {
        this.load.spritesheet(key, `assets/sprites/${key}.png`, {
          frameWidth: SPRITE_FRAME_WIDTH,
          frameHeight: SPRITE_FRAME_HEIGHT,
        });
      }
    });
  }

  create(): void {
    // Gradient background: dark blue at top to dark red at bottom via vertical stripes
    const bg = this.add.graphics();
    const stripeCount = 40;
    const stripeHeight = GAME_HEIGHT / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      const t = i / (stripeCount - 1);
      const r = Math.round(0x1a + t * (0x2e - 0x1a));
      const g = Math.round(0x0a + t * (0x0a - 0x0a));
      const b = Math.round(0x2e + t * (0x0a - 0x2e));
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, Math.floor(i * stripeHeight), GAME_WIDTH, Math.ceil(stripeHeight) + 1);
    }

    // Floor bar at the bottom
    const floorBar = this.add.graphics();
    floorBar.fillStyle(0x0d0505, 1);
    floorBar.fillRect(0, GAME_HEIGHT - 24, GAME_WIDTH, 24);
    floorBar.fillStyle(0x4a1a1a, 1);
    floorBar.fillRect(0, GAME_HEIGHT - 26, GAME_WIDTH, 2);

    // Decorative character sprites standing on the floor
    const charXPositions = [120, 300, 500, 680];
    const charY = GAME_HEIGHT - 60;
    CHARACTER_KEYS.forEach((charKey, index) => {
      const idleKey = animSpriteKey(charKey, ANIM_STATES[0]);
      const animKey = `${idleKey}-anim-start`;
      if (!this.anims.exists(animKey)) {
        this.anims.create({
          key: animKey,
          frames: this.anims.generateFrameNumbers(idleKey, { start: 0, end: 3 }),
          frameRate: 6,
          repeat: -1,
        });
      }
      const sprite = this.add.sprite(charXPositions[index], charY, idleKey);
      sprite.setScale(0.8);
      sprite.setDepth(1);
      sprite.play(animKey);

      this.tweens.add({
        targets: sprite,
        scaleY: 0.82,
        scaleX: 0.8,
        duration: 900,
        ease: 'Sine.easeInOut',
        yoyo: true,
        repeat: -1,
        delay: index * 200,
      });
    });

    // Title text
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'FOOD FIGHTERS', {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#ffcc00',
        fontStyle: 'bold',
        stroke: '#7a4400',
        strokeThickness: 4,
      })
      .setOrigin(0.5);

    // Subtitle text
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'Local Multiplayer Kitchen Brawl', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0.5)
      .setAlpha(0.7);

    // Prompt text with blinking effect
    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 50, 'Press ENTER to start', {
        fontSize: '24px',
        fontFamily: 'monospace',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: prompt,
      alpha: 0,
      duration: 600,
      ease: 'Power1',
      yoyo: true,
      repeat: -1,
    });

    // Listen for ENTER key
    const enterKey = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.ENTER
    );
    enterKey.once('down', () => {
      trackGameStart();
      void soundManager.init().then(() => {
        soundManager.playMenuSelect();
        soundManager.playMenuBGM();
      });
      this.scene.start(SCENES.CHARACTER_SELECT);
    });
  }
}
