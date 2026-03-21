import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENES,
  CHARACTER_KEYS,
  CHARACTERS,
} from '../config/constants';

export class CharacterSelectScene extends Phaser.Scene {
  private p1Index = 0;
  private p2Index = 1;
  private p1Confirmed = false;
  private p2Confirmed = false;
  private p1Text!: Phaser.GameObjects.Text;
  private p2Text!: Phaser.GameObjects.Text;
  private p1ConfirmText!: Phaser.GameObjects.Text;
  private p2ConfirmText!: Phaser.GameObjects.Text;
  private characterLabels: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: SCENES.CHARACTER_SELECT });
  }

  create(): void {
    this.p1Index = 0;
    this.p2Index = 1;
    this.p1Confirmed = false;
    this.p2Confirmed = false;

    // Title
    this.add
      .text(GAME_WIDTH / 2, 40, 'SELECT YOUR CHARACTER', {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffcc00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Character names displayed in a row
    const startX = 120;
    const spacing = 180;
    this.characterLabels = CHARACTER_KEYS.map((key, i) => {
      const char = CHARACTERS[key];
      return this.add
        .text(startX + i * spacing, GAME_HEIGHT / 2 - 20, char.name, {
          fontSize: '22px',
          fontFamily: 'monospace',
          color: '#ffffff',
        })
        .setOrigin(0.5);
    });

    // P1 selection indicator
    this.p1Text = this.add
      .text(0, GAME_HEIGHT / 2 + 30, 'P1', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#66aaff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // P2 selection indicator
    this.p2Text = this.add
      .text(0, GAME_HEIGHT / 2 + 50, 'P2', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ff6666',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Confirm status
    this.p1ConfirmText = this.add
      .text(100, GAME_HEIGHT - 60, 'P1: A/D to select, F to confirm', {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#66aaff',
      })
      .setOrigin(0);

    this.p2ConfirmText = this.add
      .text(
        GAME_WIDTH - 100,
        GAME_HEIGHT - 60,
        'P2: Arrows to select, K to confirm',
        {
          fontSize: '14px',
          fontFamily: 'monospace',
          color: '#ff6666',
        }
      )
      .setOrigin(1, 0);

    this.updateSelectionDisplay();

    // P1 controls: A/D to navigate, F to confirm
    const keyA = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    const keyD = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    const keyF = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.F);

    keyA.on('down', () => {
      if (!this.p1Confirmed) {
        this.p1Index =
          (this.p1Index - 1 + CHARACTER_KEYS.length) % CHARACTER_KEYS.length;
        this.updateSelectionDisplay();
      }
    });

    keyD.on('down', () => {
      if (!this.p1Confirmed) {
        this.p1Index = (this.p1Index + 1) % CHARACTER_KEYS.length;
        this.updateSelectionDisplay();
      }
    });

    keyF.on('down', () => {
      if (!this.p1Confirmed) {
        this.p1Confirmed = true;
        this.p1ConfirmText.setText(
          `P1: ${CHARACTERS[CHARACTER_KEYS[this.p1Index]].name} LOCKED IN!`
        );
        this.checkBothConfirmed();
      }
    });

    // P2 controls: Arrows to navigate, K to confirm
    const keyLeft = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.LEFT
    );
    const keyRight = this.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.RIGHT
    );
    const keyK = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.K);

    keyLeft.on('down', () => {
      if (!this.p2Confirmed) {
        this.p2Index =
          (this.p2Index - 1 + CHARACTER_KEYS.length) % CHARACTER_KEYS.length;
        this.updateSelectionDisplay();
      }
    });

    keyRight.on('down', () => {
      if (!this.p2Confirmed) {
        this.p2Index = (this.p2Index + 1) % CHARACTER_KEYS.length;
        this.updateSelectionDisplay();
      }
    });

    keyK.on('down', () => {
      if (!this.p2Confirmed) {
        this.p2Confirmed = true;
        this.p2ConfirmText.setText(
          `P2: ${CHARACTERS[CHARACTER_KEYS[this.p2Index]].name} LOCKED IN!`
        );
        this.checkBothConfirmed();
      }
    });
  }

  private updateSelectionDisplay(): void {
    const startX = 120;
    const spacing = 180;

    this.p1Text.setX(startX + this.p1Index * spacing);
    this.p2Text.setX(startX + this.p2Index * spacing);

    // Highlight selected characters
    this.characterLabels.forEach((label, i) => {
      if (i === this.p1Index && i === this.p2Index) {
        label.setColor('#ff88ff'); // Both selecting same
      } else if (i === this.p1Index) {
        label.setColor('#66aaff');
      } else if (i === this.p2Index) {
        label.setColor('#ff6666');
      } else {
        label.setColor('#ffffff');
      }
    });
  }

  private checkBothConfirmed(): void {
    if (this.p1Confirmed && this.p2Confirmed) {
      this.time.delayedCall(800, () => {
        this.scene.start(SCENES.FIGHT, {
          p1Character: CHARACTER_KEYS[this.p1Index],
          p2Character: CHARACTER_KEYS[this.p2Index],
        });
      });
    }
  }
}
