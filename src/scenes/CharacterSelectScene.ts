import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENES,
  CHARACTER_KEYS,
  CHARACTERS,
  SPRITE_FRAME_WIDTH,
  SPRITE_FRAME_HEIGHT,
} from '../config/constants';
import { soundManager } from '../audio/SoundManager';

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
  private characterSprites: Phaser.GameObjects.Sprite[] = [];

  constructor() {
    super({ key: SCENES.CHARACTER_SELECT });
  }

  preload(): void {
    // Load all character spritesheets for previews
    CHARACTER_KEYS.forEach((key) => {
      const stats = CHARACTERS[key];
      if (!this.textures.exists(stats.spriteKey)) {
        this.load.spritesheet(stats.spriteKey, `assets/sprites/${stats.spriteKey}.png`, {
          frameWidth: SPRITE_FRAME_WIDTH,
          frameHeight: SPRITE_FRAME_HEIGHT,
        });
      }
    });
  }

  create(): void {
    this.p1Index = 0;
    this.p2Index = 1;
    this.p1Confirmed = false;
    this.p2Confirmed = false;

    // Gradient background: dark purple at top to dark teal at bottom via vertical stripes
    const bg = this.add.graphics();
    const stripeCount = 40;
    const stripeHeight = GAME_HEIGHT / stripeCount;
    for (let i = 0; i < stripeCount; i++) {
      const t = i / (stripeCount - 1);
      const r = Math.round(0x0a + t * (0x0a - 0x0a));
      const g = Math.round(0x0a + t * (0x1e - 0x0a));
      const b = Math.round(0x2e + t * (0x2e - 0x2e));
      const color = (r << 16) | (g << 8) | b;
      bg.fillStyle(color, 1);
      bg.fillRect(0, Math.floor(i * stripeHeight), GAME_WIDTH, Math.ceil(stripeHeight) + 1);
    }

    // Horizontal divider between character area and controls text
    const divider = this.add.graphics();
    divider.lineStyle(1, 0x334455, 0.8);
    divider.beginPath();
    divider.moveTo(40, GAME_HEIGHT - 80);
    divider.lineTo(GAME_WIDTH - 40, GAME_HEIGHT - 80);
    divider.strokePath();

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

    // Create sprite previews above the names
    this.characterSprites = CHARACTER_KEYS.map((key, i) => {
      const char = CHARACTERS[key];
      const spriteKey = char.spriteKey;
      const posX = startX + i * spacing;
      const posY = GAME_HEIGHT / 2 - 60;

      // Create idle animation if texture is available
      if (this.textures.exists(spriteKey) && this.textures.get(spriteKey).key !== '__MISSING') {
        const animKey = `${spriteKey}-anim`;
        if (!this.anims.exists(animKey)) {
          this.anims.create({
            key: animKey,
            frames: this.anims.generateFrameNumbers(spriteKey, { start: 0, end: 3 }),
            frameRate: 8,
            repeat: -1,
          });
        }

        // Scale to a nice preview size (~64px tall)
        const previewHeight = 64;
        const scale = previewHeight / SPRITE_FRAME_HEIGHT;
        const spr = this.add.sprite(posX, posY, spriteKey);
        spr.setScale(scale);
        spr.play(animKey);
        return spr;
      }

      // Fallback: no sprite, return a dummy invisible sprite placeholder
      const placeholder = this.add.sprite(posX, posY, '__DEFAULT');
      placeholder.setVisible(false);
      return placeholder;
    });

    this.characterLabels = CHARACTER_KEYS.map((key, i) => {
      const char = CHARACTERS[key];
      return this.add
        .text(startX + i * spacing, GAME_HEIGHT / 2 + 5, char.name, {
          fontSize: '22px',
          fontFamily: 'monospace',
          color: '#ffffff',
          stroke: '#000000',
          strokeThickness: 3,
        })
        .setOrigin(0.5);
    });

    // Stat bars under each character name
    const maxBarWidth = 60;
    const barHeight = 6;
    const barBaseY = GAME_HEIGHT / 2 + 24;
    const barSpacingY = 14;

    CHARACTER_KEYS.forEach((key, i) => {
      const char = CHARACTERS[key];
      const cx = startX + i * spacing;

      // PWR bar (power ranges 0.8–1.3, normalize with offset 0.5, range 1.0)
      const pwrFill = Math.min(1, Math.max(0, (char.power - 0.5) / 1.0));
      const pwrBarWidth = pwrFill * maxBarWidth;
      const pwrBarX = cx - maxBarWidth / 2;

      // PWR label
      this.add.text(pwrBarX, barBaseY - 2, 'PWR', {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: '#ff9999',
      }).setOrigin(0, 1).setDepth(5);

      // PWR bg
      this.add.rectangle(cx, barBaseY, maxBarWidth, barHeight, 0x442222)
        .setOrigin(0.5, 0).setDepth(5);
      // PWR fill
      if (pwrBarWidth > 0) {
        this.add.rectangle(pwrBarX, barBaseY, pwrBarWidth, barHeight, 0xff4444)
          .setOrigin(0, 0).setDepth(6);
      }

      // SPD bar (speed ranges 160–240, normalize with offset 100, range 200)
      const spdFill = Math.min(1, Math.max(0, (char.speed - 100) / 200));
      const spdBarWidth = spdFill * maxBarWidth;
      const spdBarY = barBaseY + barSpacingY;
      const spdBarX = cx - maxBarWidth / 2;

      // SPD label
      this.add.text(spdBarX, spdBarY - 2, 'SPD', {
        fontSize: '8px',
        fontFamily: 'monospace',
        color: '#9999ff',
      }).setOrigin(0, 1).setDepth(5);

      // SPD bg
      this.add.rectangle(cx, spdBarY, maxBarWidth, barHeight, 0x222244)
        .setOrigin(0.5, 0).setDepth(5);
      // SPD fill
      if (spdBarWidth > 0) {
        this.add.rectangle(spdBarX, spdBarY, spdBarWidth, barHeight, 0x4444ff)
          .setOrigin(0, 0).setDepth(6);
      }
    });

    // P1 selection indicator
    this.p1Text = this.add
      .text(0, GAME_HEIGHT / 2 + 40, 'P1', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#66aaff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // P2 selection indicator
    this.p2Text = this.add
      .text(0, GAME_HEIGHT / 2 + 60, 'P2', {
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
        soundManager.playSelect();
      }
    });

    keyD.on('down', () => {
      if (!this.p1Confirmed) {
        this.p1Index = (this.p1Index + 1) % CHARACTER_KEYS.length;
        this.updateSelectionDisplay();
        soundManager.playSelect();
      }
    });

    keyF.on('down', () => {
      if (!this.p1Confirmed) {
        this.p1Confirmed = true;
        this.p1ConfirmText.setText(
          `P1: ${CHARACTERS[CHARACTER_KEYS[this.p1Index]].name} LOCKED IN!`
        );
        soundManager.playConfirm();
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
        soundManager.playSelect();
      }
    });

    keyRight.on('down', () => {
      if (!this.p2Confirmed) {
        this.p2Index = (this.p2Index + 1) % CHARACTER_KEYS.length;
        this.updateSelectionDisplay();
        soundManager.playSelect();
      }
    });

    keyK.on('down', () => {
      if (!this.p2Confirmed) {
        this.p2Confirmed = true;
        this.p2ConfirmText.setText(
          `P2: ${CHARACTERS[CHARACTER_KEYS[this.p2Index]].name} LOCKED IN!`
        );
        soundManager.playConfirm();
        this.checkBothConfirmed();
      }
    });

    // ESC returns to start menu
    const keyEsc = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    keyEsc.on('down', () => {
      this.scene.start(SCENES.START);
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

  shutdown(): void {
    this.input.keyboard?.removeAllKeys(true);
    this.characterSprites.forEach((s) => s.destroy());
    this.characterSprites = [];
  }
}
