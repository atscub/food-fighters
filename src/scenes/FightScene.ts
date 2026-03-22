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
  private p1WinDots: Phaser.GameObjects.Arc[] = [];
  private p2WinDots: Phaser.GameObjects.Arc[] = [];

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
  private keyEsc!: Phaser.Input.Keyboard.Key;
  private keyP!: Phaser.Input.Keyboard.Key;

  // Pause state
  private paused = false;
  private pauseOverlay: Phaser.GameObjects.Container | null = null;

  // Winner screen objects for cleanup
  private winnerScreenObjects: Phaser.GameObjects.GameObject[] = [];

  // Combo tracking
  private p1ComboCount = 0;
  private p2ComboCount = 0;
  private comboText: Phaser.GameObjects.Text | null = null;

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

    // Round win indicator dots
    this.p1WinDots = [];
    this.p2WinDots = [];
    const p1DotXPositions = [55, 75];
    const p2DotXPositions = [GAME_WIDTH - 55, GAME_WIDTH - 75];
    for (let i = 0; i < WINS_NEEDED; i++) {
      const p1Dot = this.add.arc(p1DotXPositions[i], 55, 6, 0, 360, false)
        .setFillStyle(0x000000, 0)
        .setStrokeStyle(2, 0x66aaff)
        .setDepth(22);
      this.p1WinDots.push(p1Dot);

      const p2Dot = this.add.arc(p2DotXPositions[i], 55, 6, 0, 360, false)
        .setFillStyle(0x000000, 0)
        .setStrokeStyle(2, 0xff6666)
        .setDepth(22);
      this.p2WinDots.push(p2Dot);
    }

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

    this.keyP = kb.addKey(Phaser.Input.Keyboard.KeyCodes.P);
    this.keyP.on('down', () => this.togglePause());

    this.keyEsc = kb.addKey(Phaser.Input.Keyboard.KeyCodes.ESC);
    this.keyEsc.on('down', () => {
      soundManager.stopBGM();
      this.cleanUp();
      this.scene.start(SCENES.CHARACTER_SELECT);
    });
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

  private togglePause(): void {
    // Don't allow pause when winner screen is showing
    if (this.winnerScreenObjects.length > 0) return;

    if (this.paused) {
      // Unpause
      if (this.pauseOverlay) {
        this.pauseOverlay.destroy();
        this.pauseOverlay = null;
      }
      this.paused = false;
      this.time.paused = false;
      soundManager.resumeBGM();
    } else if (this.roundActive) {
      // Pause
      this.paused = true;
      this.time.paused = true;
      soundManager.pauseBGM();

      const cx = GAME_WIDTH / 2;
      const cy = GAME_HEIGHT / 2;

      const bg = this.add.rectangle(cx, cy, GAME_WIDTH, GAME_HEIGHT, 0x000000, 0.8).setOrigin(0.5);

      const titleText = this.add.text(cx, cy - 60, 'PAUSED', {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      }).setOrigin(0.5);

      const resumeText = this.add.text(cx, cy + 20, 'Press P to resume', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#aaffaa',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      const quitText = this.add.text(cx, cy + 56, 'Press ESC to quit', {
        fontSize: '20px',
        fontFamily: 'monospace',
        color: '#ffaaaa',
        stroke: '#000000',
        strokeThickness: 3,
      }).setOrigin(0.5);

      this.pauseOverlay = this.add.container(0, 0, [bg, titleText, resumeText, quitText]).setDepth(90);
    }
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

    // Reset combo state
    this.p1ComboCount = 0;
    this.p2ComboCount = 0;
    if (this.comboText) {
      this.comboText.destroy();
      this.comboText = null;
    }

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

    // Update round win indicator dots
    if (outcome === 'p1') {
      this.p1WinDots[this.p1Wins - 1].setFillStyle(0x66aaff);
    } else if (outcome === 'p2') {
      this.p2WinDots[this.p2Wins - 1].setFillStyle(0xff6666);
    }

    // Check for match winner
    if (this.p1Wins >= WINS_NEEDED || this.p2Wins >= WINS_NEEDED) {
      this.showMatchWinner();
    } else if (this.round < TOTAL_ROUNDS) {
      // Show round winner announcement before next round
      if (outcome !== 'draw') {
        const winnerLabel = outcome === 'p1' ? 'P1 WINS THE ROUND!' : 'P2 WINS THE ROUND!';
        const roundWinText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2, winnerLabel, {
          fontSize: '36px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#ffcc00',
          stroke: '#000000',
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(50);

        this.tweens.add({
          targets: roundWinText,
          alpha: 0,
          duration: 400,
          delay: 1300,
          ease: 'Power2',
          onComplete: () => {
            roundWinText.destroy();
          },
        });
      }

      this.round++;
      this.roundText.setText(`Round ${this.round}`);

      // Reset fighters
      this.p1.reset(200);
      this.p2.reset(600);

      // Show round intro after announcement has had time to display
      const introDelay = outcome !== 'draw' ? 2000 : 500;
      this.time.delayedCall(introDelay, () => {
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

    // Disable ESC during winner screen so it doesn't conflict with ENTER handler
    this.keyEsc.removeAllListeners();

    let winnerLabel: string;
    let winnerCharKey: string;
    if (this.p1Wins > this.p2Wins) {
      winnerLabel = 'P1';
      winnerCharKey = this.p1Character;
    } else if (this.p2Wins > this.p1Wins) {
      winnerLabel = 'P2';
      winnerCharKey = this.p2Character;
    } else {
      winnerLabel = 'NOBODY';
      winnerCharKey = this.p1Character;
    }

    this.winnerScreenObjects = [];

    // Dark overlay
    const overlay = this.add
      .rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x000000)
      .setAlpha(0.7)
      .setDepth(40);
    this.winnerScreenObjects.push(overlay);

    // Winner label text at higher position
    const winText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, `${winnerLabel} WINS!`, {
        fontSize: '48px',
        fontFamily: 'monospace',
        color: '#ffcc00',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 5,
      })
      .setOrigin(0.5)
      .setDepth(41);
    this.winnerScreenObjects.push(winText);

    // Winning character idle sprite centered below the text
    const idleKey = animSpriteKey(winnerCharKey, 'idle');
    const winnerSprite = this.add
      .sprite(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 30, idleKey)
      .setScale(1.5, 1.5)
      .setDepth(41);
    if (this.anims.exists(idleKey)) {
      winnerSprite.play(idleKey);
    }
    this.winnerScreenObjects.push(winnerSprite);

    // Score text
    const scoreText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 110, `${this.p1Wins} - ${this.p2Wins}`, {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 4,
      })
      .setOrigin(0.5)
      .setDepth(41);
    this.winnerScreenObjects.push(scoreText);

    // Blinking "Press ENTER" prompt at bottom
    const promptText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 155, 'Press ENTER to rematch', {
        fontSize: '18px',
        fontFamily: 'monospace',
        color: '#aaffaa',
        stroke: '#000000',
        strokeThickness: 3,
      })
      .setOrigin(0.5)
      .setDepth(41);
    this.winnerScreenObjects.push(promptText);

    this.tweens.add({
      targets: promptText,
      alpha: 0,
      duration: 500,
      ease: 'Linear',
      yoyo: true,
      repeat: -1,
    });

    // Listen once for ENTER to go to character select
    const enterKey = this.input.keyboard!.addKey(Phaser.Input.Keyboard.KeyCodes.ENTER);
    enterKey.once('down', () => {
      this.winnerScreenObjects.forEach((obj) => obj.destroy());
      this.winnerScreenObjects = [];
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
    if (this.pauseOverlay) {
      this.pauseOverlay.destroy();
      this.pauseOverlay = null;
    }
    this.paused = false;
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
    if (this.paused) return;
    if (!this.roundActive) return;

    // Update fighters with input
    const p1Input = this.getP1Input();
    const p2Input = this.getP2Input();

    this.p1.update(delta, p1Input, this.p2);
    this.p2.update(delta, p2Input, this.p1);

    // Dust particles on landing
    if (this.p1.justLanded) {
      this.spawnDustParticles(this.p1.x, GROUND_Y);
    }
    if (this.p2.justLanded) {
      this.spawnDustParticles(this.p2.x, GROUND_Y);
    }

    // Check attack hits each frame during active attack windows
    const p1HpBefore = this.p1.hp;
    const p2HpBefore = this.p2.hp;
    const p1Result = this.p1.checkAttackHit(this.p2);
    const p2Result = this.p2.checkAttackHit(this.p1);

    // Combo tracking
    const p1HitP2 = p1Result === 'hit' && this.p2.hp < p2HpBefore;
    const p2HitP1 = p2Result === 'hit' && this.p1.hp < p1HpBefore;

    if (p1HitP2) {
      this.p1ComboCount++;
      this.p2ComboCount = 0;
      this.updateComboDisplay(1, this.p1ComboCount);
    } else if (p2HitP1) {
      this.p2ComboCount++;
      this.p1ComboCount = 0;
      this.updateComboDisplay(2, this.p2ComboCount);
    }

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
      if (p1Result === 'hit') {
        this.spawnHitSparks(this.p2.x, this.p2.y - FIGHTER_HEIGHT / 2);
      }
      if (p2Result === 'hit') {
        this.spawnHitSparks(this.p1.x, this.p1.y - FIGHTER_HEIGHT / 2);
      }
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

  private updateComboDisplay(player: 1 | 2, count: number): void {
    if (count >= 2) {
      const label = `${count} HIT COMBO!`;
      if (!this.comboText) {
        this.comboText = this.add.text(GAME_WIDTH / 2, 120, label, {
          fontSize: '32px',
          fontFamily: 'monospace',
          fontStyle: 'bold',
          color: '#ff8800',
          stroke: '#000000',
          strokeThickness: 5,
        }).setOrigin(0.5).setDepth(35);
      } else {
        this.comboText.setText(label);
        this.comboText.setAlpha(1);
      }
      // Tint slightly differently per player
      this.comboText.setColor(player === 1 ? '#66aaff' : '#ff6666');
    } else {
      if (this.comboText) {
        this.comboText.destroy();
        this.comboText = null;
      }
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

  private spawnDustParticles(x: number, y: number): void {
    const count = Phaser.Math.Between(5, 8);
    for (let i = 0; i < count; i++) {
      const offsetX = Phaser.Math.Between(-20, 20);
      const radius = Phaser.Math.Between(2, 4);
      const particle = this.add.arc(x + offsetX, y, radius, 0, 360, false)
        .setFillStyle(0xccaa88, 0.6)
        .setDepth(12);

      const velX = Phaser.Math.Between(-60, 60);
      const velY = Phaser.Math.Between(-50, -20);

      this.tweens.add({
        targets: particle,
        x: particle.x + velX * 0.4,
        y: particle.y + velY * 0.4,
        alpha: 0,
        duration: 400,
        ease: 'Power1',
        onComplete: () => {
          particle.destroy();
        },
      });
    }
  }

  private spawnHitSparks(x: number, y: number): void {
    const count = Phaser.Math.Between(4, 6);
    for (let i = 0; i < count; i++) {
      const offsetX = Phaser.Math.Between(-15, 15);
      const offsetY = Phaser.Math.Between(-15, 15);
      const spark = this.add.rectangle(x + offsetX, y + offsetY, 3, 3, 0xffff44)
        .setDepth(16);

      const velX = Phaser.Math.Between(-80, 80);
      const velY = Phaser.Math.Between(-80, 80);

      this.tweens.add({
        targets: spark,
        x: spark.x + velX * 0.3,
        y: spark.y + velY * 0.3,
        alpha: 0,
        scaleX: 0,
        scaleY: 0,
        duration: 300,
        ease: 'Power2',
        onComplete: () => {
          spark.destroy();
        },
      });
    }
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
