import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, SCENES } from '../config/constants';

export class StartScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENES.START });
  }

  create(): void {
    // Title text
    this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, 'FOOD FIGHTERS', {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#ffcc00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Prompt text with blinking effect
    const prompt = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 40, 'Press ENTER to start', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffffff',
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
      this.scene.start(SCENES.CHARACTER_SELECT);
    });
  }
}
