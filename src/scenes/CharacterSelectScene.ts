import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENES,
  CHARACTER_KEYS,
  CHARACTERS,
  SPRITE_FRAME_WIDTH,
  SPRITE_FRAME_HEIGHT,
  animSpriteKey,
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
  private p1SelectTween: Phaser.Tweens.Tween | null = null;
  private p2SelectTween: Phaser.Tweens.Tween | null = null;
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private lockedTexts: Phaser.GameObjects.Text[] = [];
  private p1LockedText: Phaser.GameObjects.Text | null = null;
  private p2LockedText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: SCENES.CHARACTER_SELECT });
  }

  preload(): void {
    // Load idle and walk spritesheets for all characters
    CHARACTER_KEYS.forEach((key) => {
      const stats = CHARACTERS[key];
      if (!this.textures.exists(stats.spriteKey)) {
        this.load.spritesheet(stats.spriteKey, `assets/sprites/${stats.spriteKey}.png`, {
          frameWidth: SPRITE_FRAME_WIDTH,
          frameHeight: SPRITE_FRAME_HEIGHT,
        });
      }
      const walkKey = animSpriteKey(key, 'walk');
      if (!this.textures.exists(walkKey)) {
        this.load.spritesheet(walkKey, `assets/sprites/${walkKey}.png`, {
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
      const posY = GAME_HEIGHT / 2 - 80;

      // Create idle and walk animations if texture is available
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

        const walkKey = animSpriteKey(key, 'walk');
        const walkAnimKey = `${walkKey}-anim`;
        if (this.textures.exists(walkKey) && !this.anims.exists(walkAnimKey)) {
          this.anims.create({
            key: walkAnimKey,
            frames: this.anims.generateFrameNumbers(walkKey, { start: 0, end: 3 }),
            frameRate: 10,
            repeat: -1,
          });
        }

        const spr = this.add.sprite(posX, posY, spriteKey);
        spr.setScale(0.9);
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

      // Ability description
      this.add.text(cx, spdBarY + barHeight + 8, char.abilityDesc, {
        fontSize: '9px',
        fontFamily: 'monospace',
        color: '#aaaaaa',
      }).setOrigin(0.5, 0).setDepth(5);
    });

    // P1 selection indicator
    this.p1Text = this.add
      .text(0, GAME_HEIGHT / 2 + 65, 'P1', {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#66aaff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // P2 selection indicator
    this.p2Text = this.add
      .text(0, GAME_HEIGHT / 2 + 85, 'P2', {
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

    // Graphics layer for selection box borders (drawn below sprites)
    this.selectionGraphics = this.add.graphics();
    this.selectionGraphics.setDepth(2);

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
        this.updateSelectionDisplay();
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
        this.updateSelectionDisplay();
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
    // Box dimensions relative to sprite position (sprites sit at GAME_HEIGHT/2 - 80)
    const boxHalfW = 54;
    const boxHalfH = 62;
    const spriteBaseY = GAME_HEIGHT / 2 - 80;

    this.p1Text.setX(startX + this.p1Index * spacing);
    this.p2Text.setX(startX + this.p2Index * spacing);

    // Highlight character name labels
    this.characterLabels.forEach((label, i) => {
      if (i === this.p1Index && i === this.p2Index) {
        label.setColor('#ff88ff');
      } else if (i === this.p1Index) {
        label.setColor('#66aaff');
      } else if (i === this.p2Index) {
        label.setColor('#ff6666');
      } else {
        label.setColor('#ffffff');
      }
    });

    // Redraw selection box graphics
    this.selectionGraphics.clear();

    const drawSelectionBox = (
      cx: number,
      color: number,
      confirmed: boolean,
    ): void => {
      const x = cx - boxHalfW;
      const y = spriteBaseY - boxHalfH;
      const w = boxHalfW * 2;
      const h = boxHalfH * 2;
      const glowAlpha = confirmed ? 0.28 : 0.15;
      const lineWidth = confirmed ? 4 : 3;

      // Glow fill — slightly larger rectangle
      this.selectionGraphics.fillStyle(color, glowAlpha);
      this.selectionGraphics.fillRect(x - 4, y - 4, w + 8, h + 8);

      // Border stroke
      this.selectionGraphics.lineStyle(lineWidth, color, confirmed ? 1.0 : 0.9);
      this.selectionGraphics.strokeRect(x, y, w, h);
    };

    if (this.p1Index === this.p2Index) {
      // Both on same character: single magenta box
      const cx = startX + this.p1Index * spacing;
      const confirmed = this.p1Confirmed || this.p2Confirmed;
      drawSelectionBox(cx, 0xff44ff, confirmed);
    } else {
      drawSelectionBox(startX + this.p1Index * spacing, 0x4488ff, this.p1Confirmed);
      drawSelectionBox(startX + this.p2Index * spacing, 0xff4444, this.p2Confirmed);
    }

    // Manage LOCKED texts — destroy stale ones and create new ones if needed
    if (this.p1Confirmed) {
      const targetX = startX + this.p1Index * spacing;
      const targetY = spriteBaseY - boxHalfH - 18;
      if (!this.p1LockedText) {
        this.p1LockedText = this.add.text(targetX, targetY, 'LOCKED', {
          fontSize: '13px',
          fontFamily: 'monospace',
          color: '#4488ff',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(10);
        this.lockedTexts.push(this.p1LockedText);
      } else {
        this.p1LockedText.setPosition(targetX, targetY);
      }
    }

    if (this.p2Confirmed) {
      const sameSlot = this.p1Index === this.p2Index;
      const targetX = startX + this.p2Index * spacing + (sameSlot ? 0 : 0);
      const targetY = spriteBaseY - boxHalfH - (this.p1Confirmed && sameSlot ? 34 : 18);
      if (!this.p2LockedText) {
        this.p2LockedText = this.add.text(targetX, targetY, 'LOCKED', {
          fontSize: '13px',
          fontFamily: 'monospace',
          color: '#ff4444',
          fontStyle: 'bold',
          stroke: '#000000',
          strokeThickness: 3,
        }).setOrigin(0.5).setDepth(10);
        this.lockedTexts.push(this.p2LockedText);
      } else {
        this.p2LockedText.setPosition(targetX, targetY);
      }
    }

    // Update walk animation and pulse tween for each sprite
    this.characterSprites.forEach((spr, i) => {
      if (!spr.visible) return;
      const key = CHARACTER_KEYS[i];
      const idleKey = CHARACTERS[key].spriteKey;
      const walkKey = animSpriteKey(key, 'walk');
      const walkAnimKey = `${walkKey}-anim`;
      const idleAnimKey = `${idleKey}-anim`;
      const isSelected = i === this.p1Index || i === this.p2Index;

      if (isSelected) {
        // Switch to walk animation
        if (this.textures.exists(walkKey)) {
          if (spr.texture.key !== walkKey) {
            spr.setTexture(walkKey);
          }
          if (this.anims.exists(walkAnimKey) && !spr.anims.isPlaying) {
            spr.play(walkAnimKey);
          } else if (this.anims.exists(walkAnimKey) && spr.anims.currentAnim?.key !== walkAnimKey) {
            spr.play(walkAnimKey);
          }
        }
        // Start pulse tween if not already running for this sprite
        const existingTween =
          i === this.p1Index ? this.p1SelectTween : this.p2SelectTween;
        if (!existingTween || !existingTween.isPlaying()) {
          const tween = this.tweens.add({
            targets: spr,
            scaleX: 0.95,
            scaleY: 0.95,
            duration: 300,
            yoyo: true,
            repeat: -1,
            ease: 'Sine.easeInOut',
          });
          if (i === this.p1Index) this.p1SelectTween = tween;
          if (i === this.p2Index) this.p2SelectTween = tween;
        }
      } else {
        // Revert to idle animation
        if (spr.texture.key !== idleKey) {
          spr.setTexture(idleKey);
        }
        if (this.anims.exists(idleAnimKey) && spr.anims.currentAnim?.key !== idleAnimKey) {
          spr.play(idleAnimKey);
        }
        spr.setScale(0.9);
      }
    });

    // Stop tweens for sprites no longer selected by either player
    if (this.p1SelectTween) {
      const p1Spr = this.characterSprites[this.p1Index];
      if (this.p1SelectTween.targets[0] !== p1Spr) {
        this.p1SelectTween.stop();
        (this.p1SelectTween.targets[0] as Phaser.GameObjects.Sprite).setScale(0.9);
        this.p1SelectTween = null;
      }
    }
    if (this.p2SelectTween) {
      const p2Spr = this.characterSprites[this.p2Index];
      if (this.p2SelectTween.targets[0] !== p2Spr) {
        this.p2SelectTween.stop();
        (this.p2SelectTween.targets[0] as Phaser.GameObjects.Sprite).setScale(0.9);
        this.p2SelectTween = null;
      }
    }
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
    this.p1SelectTween?.stop();
    this.p2SelectTween?.stop();
    this.p1SelectTween = null;
    this.p2SelectTween = null;
    this.characterSprites.forEach((s) => s.destroy());
    this.characterSprites = [];
    this.lockedTexts.forEach((t) => t.destroy());
    this.lockedTexts = [];
    this.p1LockedText = null;
    this.p2LockedText = null;
  }
}
