import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENES,
  CHARACTERS,
  CHARACTER_KEYS,
  GROUND_Y,
  MAX_HP,
  ROUND_TIME,
  TOTAL_ROUNDS,
  WINS_NEEDED,
  SPRITE_FRAME_WIDTH,
  SPRITE_FRAME_HEIGHT,
  ANIM_STATES,
  animSpriteKey,
  FIGHTER_HEIGHT,
} from '../config/constants';
import { Fighter, FighterInput } from '../objects/Fighter';
import { TouchControls } from '../objects/TouchControls';
import { determineRoundWinner } from '../utils/damage';
import { soundManager } from '../audio/SoundManager';

interface FightData {
  p1Character: string;
  p2Character: string;
}

export class FightScene extends Phaser.Scene {
  // Fighters
  private p1!: Fighter;
  private p2!: Fighter;

  // HUD
  private p1HpBar!: Phaser.GameObjects.Rectangle;
  private p2HpBar!: Phaser.GameObjects.Rectangle;
  private p1HpBg!: Phaser.GameObjects.Rectangle;
  private p2HpBg!: Phaser.GameObjects.Rectangle;
  private timerText!: Phaser.GameObjects.Text;
  private roundText!: Phaser.GameObjects.Text;
  private p1WinsText!: Phaser.GameObjects.Text;
  private p2WinsText!: Phaser.GameObjects.Text;

  // Round state
  private roundTimer = ROUND_TIME;
  private timerEvent!: Phaser.Time.TimerEvent;
  private round = 1;
  private p1Wins = 0;
  private p2Wins = 0;
  private p1Character = 'sausage';
  private p2Character = 'burger';
  private roundActive = false;
  private _roundEnded = false;

  // Keyboard keys
  private keyW!: Phaser.Input.Keyboard.Key;
  private keyA!: Phaser.Input.Keyboard.Key;
  private keyS!: Phaser.Input.Keyboard.Key;
  private keyD!: Phaser.Input.Keyboard.Key;
  private keyF!: Phaser.Input.Keyboard.Key;
  private keyG!: Phaser.Input.Keyboard.Key;
  private keyUp!: Phaser.Input.Keyboard.Key;
  private keyDown!: Phaser.Input.Keyboard.Key;
  private keyLeft!: Phaser.Input.Keyboard.Key;
  private keyRight!: Phaser.Input.Keyboard.Key;
  private keyK!: Phaser.Input.Keyboard.Key;
  private keyL!: Phaser.Input.Keyboard.Key;

  // Touch controls
  private touchControls!: TouchControls;

  // Controls help overlay
  private helpOverlay: Phaser.GameObjects.Container | null = null;
  private keyH!: Phaser.Input.Keyboard.Key;

  constructor() {
    super({ key: SCENES.FIGHT });
  }

  init(data: FightData): void {
    this.p1Character = data.p1Character || 'sausage';
    this.p2Character = data.p2Character || 'burger';
    this.round = 1;
    this.p1Wins = 0;
    this.p2Wins = 0;
  }

  preload(): void {
    // Load ALL animation spritesheets for each character (idle, walk, punch, kick, jump, block, ko)
    CHARACTER_KEYS.forEach((charKey) => {
      ANIM_STATES.forEach((state) => {
        const key = animSpriteKey(charKey, state);
        if (!this.textures.exists(key)) {
          this.load.spritesheet(key, `assets/sprites/${key}.png`, {
            frameWidth: SPRITE_FRAME_WIDTH,
            frameHeight: SPRITE_FRAME_HEIGHT,
          });
        }
      });
    });

    // Load background if available
    if (!this.textures.exists('kitchen-arena')) {
      this.load.image('kitchen-arena', 'assets/backgrounds/kitchen-arena.png');
    }
  }

  create(): void {
    const p1Stats = CHARACTERS[this.p1Character];
    const p2Stats = CHARACTERS[this.p2Character];

    // Background
    if (this.textures.exists('kitchen-arena') && this.textures.get('kitchen-arena').key !== '__MISSING') {
      this.add
        .image(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'kitchen-arena')
        .setDisplaySize(GAME_WIDTH, GAME_HEIGHT)
        .setDepth(0);
    } else {
      // Fallback colored rectangles
      this.add
        .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x222244)
        .setDepth(0);

      // Ground
      this.add
        .rectangle(GAME_WIDTH / 2, GROUND_Y + 35, GAME_WIDTH, 70, 0x444422)
        .setDepth(0);
    }

    // Create fighters
    this.p1 = new Fighter(this, 200, p1Stats, true, 10);
    this.p2 = new Fighter(this, 600, p2Stats, false, 10);

    // --- HUD ---
    // HP bar backgrounds
    this.p1HpBg = this.add.rectangle(170, 30, 260, 20, 0x333333).setDepth(20);
    this.p2HpBg = this.add
      .rectangle(GAME_WIDTH - 170, 30, 260, 20, 0x333333)
      .setDepth(20);

    // HP bars (foreground)
    // P1 bar: origin at left edge, shrinks from right
    this.p1HpBar = this.add.rectangle(45, 30, 250, 14, 0x44cc44).setOrigin(0, 0.5).setDepth(21);
    // P2 bar: origin at right edge, shrinks from left
    this.p2HpBar = this.add
      .rectangle(GAME_WIDTH - 45, 30, 250, 14, 0x44cc44)
      .setOrigin(1, 0.5)
      .setDepth(21);

    // HP labels
    this.add
      .text(45, 22, `P1 ${p1Stats.name}`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0)
      .setDepth(22);

    this.add
      .text(GAME_WIDTH - 45, 22, `P2 ${p2Stats.name}`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setDepth(22);

    // Timer
    this.timerText = this.add
      .text(GAME_WIDTH / 2, 30, String(ROUND_TIME), {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(22);

    // Round display
    this.roundText = this.add
      .text(GAME_WIDTH / 2, 60, `Round ${this.round}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#cccccc',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(22);

    // Win counters
    this.p1WinsText = this.add
      .text(45, 50, `Wins: ${this.p1Wins}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#66aaff',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0)
      .setDepth(22);

    this.p2WinsText = this.add
      .text(GAME_WIDTH - 45, 50, `Wins: ${this.p2Wins}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#ff6666',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(1, 0)
      .setDepth(22);

    // Setup keyboard controls
    this.setupControls();

    // Setup touch controls
    this.touchControls = new TouchControls(this);

    // Help hint
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT - 10, 'Press H for controls', {
      fontSize: '12px', fontFamily: 'monospace', color: '#888888',
      stroke: '#000000', strokeThickness: 2,
    }).setOrigin(0.5).setDepth(22);

    // Show "Round 1" then "FIGHT!" then start
    this.showRoundIntro();
  }

  private setupControls(): void {
    const kb = this.input.keyboard!;
    this.keyW = kb.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keyA = kb.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keyS = kb.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keyD = kb.addKey(Phaser.Input.Keyboard.KeyCodes.D);
    this.keyF = kb.addKey(Phaser.Input.Keyboard.KeyCodes.F);
    this.keyG = kb.addKey(Phaser.Input.Keyboard.KeyCodes.G);

    this.keyUp = kb.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keyDown = kb.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keyLeft = kb.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keyRight = kb.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keyK = kb.addKey(Phaser.Input.Keyboard.KeyCodes.K);
    this.keyL = kb.addKey(Phaser.Input.Keyboard.KeyCodes.L);
    this.keyH = kb.addKey(Phaser.Input.Keyboard.KeyCodes.H);
    this.keyH.on('down', () => this.toggleHelp());
  }

  private toggleHelp(): void {
    if (this.helpOverlay) {
      this.helpOverlay.destroy();
      this.helpOverlay = null;
      return;
    }

    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.rectangle(cx, cy, 500, 320, 0x000000, 0.85).setOrigin(0.5);

    const title = this.add.text(cx, cy - 140, 'CONTROLS', {
      fontSize: '24px', fontFamily: 'monospace', color: '#ffcc00', fontStyle: 'bold',
    }).setOrigin(0.5);

    const lines = [
      '       Player 1          Player 2',
      '',
      'Move   A / D              \u2190 / \u2192',
      'Jump   W                  \u2191',
      'Block  S                  \u2193',
      'Punch  F                  K',
      'Kick   G                  L',
      '',
      'Jump over your opponent to get behind them!',
      '',
      'Press H to close',
    ];

    const body = this.add.text(cx, cy + 10, lines.join('\n'), {
      fontSize: '13px', fontFamily: 'monospace', color: '#ffffff',
      lineSpacing: 4, align: 'center',
    }).setOrigin(0.5);

    this.helpOverlay = this.add.container(0, 0, [bg, title, body]).setDepth(100);
  }

  private showRoundIntro(): void {
    const roundLabel = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Round ${this.round}`, {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.time.delayedCall(1200, () => {
      roundLabel.destroy();

      const fightText = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'FIGHT!', {
          fontSize: '64px',
          fontFamily: 'monospace',
          color: '#ff4444',
          fontStyle: 'bold',
        })
        .setOrigin(0.5)
        .setDepth(50);

      soundManager.playRoundStart();

      this.tweens.add({
        targets: fightText,
        alpha: 0,
        scale: 2,
        duration: 800,
        ease: 'Power2',
        onComplete: () => {
          fightText.destroy();
          this.startRound();
        },
      });
    });
  }

  private startRound(): void {
    this.roundActive = true;
    this._roundEnded = false;
    this.roundTimer = ROUND_TIME;
    this.timerText.setText(String(this.roundTimer));
    this.timerText.setColor('#ffffff');
    this.timerText.setScale(1.0);

    // Start background music on first round, resume if stopped
    soundManager.playBGM();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        if (!this.roundActive) return;
        this.roundTimer--;
        this.timerText.setText(String(this.roundTimer));
        if (this.roundTimer <= 10) {
          this.timerText.setColor('#ff4444');
          this.tweens.add({
            targets: this.timerText,
            scaleX: 1.3,
            scaleY: 1.3,
            duration: 100,
            ease: 'Power1',
            yoyo: true,
            onComplete: () => {
              this.timerText.setScale(1.0);
            },
          });
        }
        if (this.roundTimer <= 0) {
          this.endRound();
        }
      },
      repeat: ROUND_TIME - 1,
    });
  }

  private endRound(): void {
    if (this._roundEnded) return;
    this._roundEnded = true;
    this.roundActive = false;
    if (this.timerEvent) {
      this.timerEvent.destroy();
    }

    // Determine round winner
    const outcome = determineRoundWinner(this.p1.hp, this.p2.hp);
    if (outcome === 'p1') {
      this.p1Wins++;
    } else if (outcome === 'p2') {
      this.p2Wins++;
    }
    // draw: no wins awarded

    // Update win counter display
    this.p1WinsText.setText(`Wins: ${this.p1Wins}`);
    this.p2WinsText.setText(`Wins: ${this.p2Wins}`);

    // Check for match winner
    if (this.p1Wins >= WINS_NEEDED || this.p2Wins >= WINS_NEEDED) {
      this.showMatchWinner();
    } else if (this.round < TOTAL_ROUNDS) {
      this.round++;
      this.roundText.setText(`Round ${this.round}`);

      // Reset fighters
      this.p1.reset(200);
      this.p2.reset(600);

      // Show round intro then start
      this.time.delayedCall(500, () => {
        this.showRoundIntro();
      });
    } else {
      // All rounds played
      this.showMatchWinner();
    }
  }

  private showMatchWinner(): void {
    // Stop background music when match ends
    soundManager.stopBGM();

    let winnerLabel: string;
    if (this.p1Wins > this.p2Wins) {
      winnerLabel = 'P1';
    } else if (this.p2Wins > this.p1Wins) {
      winnerLabel = 'P2';
    } else {
      winnerLabel = 'NOBODY';
    }

    const winText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `${winnerLabel} WINS!`, {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#ffcc00',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(50);

    this.time.delayedCall(3000, () => {
      winText.destroy();
      this.cleanUp();
      this.scene.start(SCENES.CHARACTER_SELECT);
    });
  }

  private cleanUp(): void {
    this.p1.destroy();
    this.p2.destroy();
    this.touchControls.destroy();
    if (this.helpOverlay) {
      this.helpOverlay.destroy();
      this.helpOverlay = null;
    }
  }

  /** Read keyboard state and merge with touch for P1 */
  private getP1Input(): FighterInput {
    const kbInput: FighterInput = {
      left: this.keyA.isDown,
      right: this.keyD.isDown,
      jump: this.keyW.isDown,
      block: this.keyS.isDown,
      punch: this.keyF.isDown,
      kick: this.keyG.isDown,
    };

    // Merge touch controls (OR with keyboard)
    if (this.touchControls.isVisible) {
      const touch = this.touchControls.getInput();
      return {
        left: kbInput.left || touch.left,
        right: kbInput.right || touch.right,
        jump: kbInput.jump || touch.jump,
        block: kbInput.block || touch.block,
        punch: kbInput.punch || touch.punch,
        kick: kbInput.kick || touch.kick,
      };
    }

    return kbInput;
  }

  private getP2Input(): FighterInput {
    return {
      left: this.keyLeft.isDown,
      right: this.keyRight.isDown,
      jump: this.keyUp.isDown,
      block: this.keyDown.isDown,
      punch: this.keyK.isDown,
      kick: this.keyL.isDown,
    };
  }

  update(_time: number, delta: number): void {
    if (!this.roundActive) return;

    // Update fighters with input
    const p1Input = this.getP1Input();
    const p2Input = this.getP2Input();

    this.p1.update(delta, p1Input, this.p2);
    this.p2.update(delta, p2Input, this.p1);

    // Check attack hits each frame during active attack windows
    const p1HpBefore = this.p1.hp;
    const p2HpBefore = this.p2.hp;
    const p1Result = this.p1.checkAttackHit(this.p2);
    const p2Result = this.p2.checkAttackHit(this.p1);

    // Floating damage numbers
    if (p2Result === 'hit' || p2Result === 'blocked') {
      const dmg = p1HpBefore - this.p1.hp;
      if (dmg > 0) {
        this.showDamageNumber(this.p1.x, this.p1.y - FIGHTER_HEIGHT, dmg, p2Result === 'blocked');
      }
    }
    if (p1Result === 'hit' || p1Result === 'blocked') {
      const dmg = p2HpBefore - this.p2.hp;
      if (dmg > 0) {
        this.showDamageNumber(this.p2.x, this.p2.y - FIGHTER_HEIGHT, dmg, p1Result === 'blocked');
      }
    }

    // Sound effects for hits / blocks
    if (p1Result === 'hit' || p2Result === 'hit') {
      soundManager.playHit();
      this.cameras.main.shake(100, 0.005);
      this.flashScreen();
    } else if (p1Result === 'blocked' || p2Result === 'blocked') {
      soundManager.playBlock();
    }

    // Sound effects for jumps
    if (this.p1.jumpedThisFrame || this.p2.jumpedThisFrame) {
      soundManager.playJump();
    }

    // Update HP bars
    this.updateHpBar(this.p1HpBar, this.p1.hp);
    this.updateHpBar(this.p2HpBar, this.p2.hp);

    // Check for KO
    if (this.p1.isKO || this.p2.isKO) {
      soundManager.playKO();
      this.cameras.main.shake(300, 0.01);
      // Small delay before ending round for dramatic effect
      this.roundActive = false;
      if (this.timerEvent) {
        this.timerEvent.destroy();
      }
      this.time.delayedCall(800, () => {
        this.endRound();
      });
    }
  }

  private showDamageNumber(x: number, y: number, damage: number, blocked: boolean): void {
    const color = blocked ? '#aaaaaa' : '#ffff00';
    const fontSize = blocked ? '16px' : '22px';
    const text = this.add.text(x, y, String(damage), {
      fontSize,
      fontFamily: 'monospace',
      fontStyle: 'bold',
      color,
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(30);

    this.tweens.add({
      targets: text,
      y: y - 50,
      alpha: 0,
      duration: 800,
      ease: 'Power1',
      onComplete: () => {
        text.destroy();
      },
    });
  }

  private flashScreen(): void {
    const flash = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0xffffff)
      .setAlpha(0.3)
      .setDepth(15);
    this.tweens.add({
      targets: flash,
      alpha: 0,
      duration: 100,
      ease: 'Linear',
      onComplete: () => {
        flash.destroy();
      },
    });
  }

  private updateHpBar(bar: Phaser.GameObjects.Rectangle, hp: number): void {
    const ratio = hp / MAX_HP;
    bar.width = ratio * 250;

    // Color: green -> yellow -> red
    if (ratio > 0.5) {
      bar.fillColor = 0x44cc44; // green
    } else if (ratio > 0.25) {
      bar.fillColor = 0xcccc44; // yellow
    } else {
      bar.fillColor = 0xcc4444; // red
    }
  }

  shutdown(): void {
    this.cleanUp();
  }
}
