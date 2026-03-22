import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES } from '../config/constants';
import { soundManager } from '../audio/SoundManager';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.START });
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
      void soundManager.init().then(() => {
        soundManager.playMenuSelect();
      });
      this.scene.start(SCENES.CHARACTER_SELECT);
    });
  }
}
