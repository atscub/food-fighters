import Phaser from 'phaser';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  SCENES,
  CHARACTERS,
  GROUND_Y,
  MAX_HP,
  ROUND_TIME,
  TOTAL_ROUNDS,
  WINS_NEEDED,
} from '../config/constants';

interface FightData {
  p1Character: string;
  p2Character: string;
}

export class FightScene extends Phaser.Scene {
  private p1!: Phaser.GameObjects.Rectangle;
  private p2!: Phaser.GameObjects.Rectangle;
  private p1Hp = MAX_HP;
  private p2Hp = MAX_HP;
  private p1HpBar!: Phaser.GameObjects.Rectangle;
  private p2HpBar!: Phaser.GameObjects.Rectangle;
  private roundTimer = ROUND_TIME;
  private timerText!: Phaser.GameObjects.Text;
  private timerEvent!: Phaser.Time.TimerEvent;
  private round = 1;
  private p1Wins = 0;
  private p2Wins = 0;
  private roundText!: Phaser.GameObjects.Text;
  private p1Character = 'sausage';
  private p2Character = 'burger';
  private roundActive = false;

  // Movement keys
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

  // Velocities for manual movement
  private p1VelX = 0;
  private p1VelY = 0;
  private p2VelX = 0;
  private p2VelY = 0;

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

  create(): void {
    const p1Stats = CHARACTERS[this.p1Character];
    const p2Stats = CHARACTERS[this.p2Character];

    // Background
    this.add.rectangle(GAME_WIDTH / 2, GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT, 0x222244);

    // Ground
    this.add.rectangle(GAME_WIDTH / 2, GROUND_Y + 35, GAME_WIDTH, 70, 0x444422);

    // Fighters (colored rectangles as placeholders)
    this.p1 = this.add.rectangle(200, GROUND_Y - 30, 40, 60, p1Stats.color);
    this.p2 = this.add.rectangle(600, GROUND_Y - 30, 40, 60, p2Stats.color);

    // HP bar backgrounds
    this.add.rectangle(170, 30, 260, 20, 0x333333);
    this.add.rectangle(GAME_WIDTH - 170, 30, 260, 20, 0x333333);

    // HP bars
    this.p1HpBar = this.add.rectangle(170, 30, 250, 14, 0x44cc44);
    this.p2HpBar = this.add.rectangle(GAME_WIDTH - 170, 30, 250, 14, 0x44cc44);

    // HP labels
    this.add
      .text(45, 22, `P1 ${p1Stats.name}`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(0);

    this.add
      .text(GAME_WIDTH - 45, 22, `P2 ${p2Stats.name}`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ffffff',
      })
      .setOrigin(1, 0);

    // Timer
    this.timerText = this.add
      .text(GAME_WIDTH / 2, 30, String(ROUND_TIME), {
        fontSize: '28px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    // Round display
    this.roundText = this.add
      .text(GAME_WIDTH / 2, 60, `Round ${this.round}`, {
        fontSize: '14px',
        fontFamily: 'monospace',
        color: '#cccccc',
      })
      .setOrigin(0.5);

    // Win counters
    this.add
      .text(45, 50, `Wins: ${this.p1Wins}`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#66aaff',
      })
      .setOrigin(0);

    this.add
      .text(GAME_WIDTH - 45, 50, `Wins: ${this.p2Wins}`, {
        fontSize: '12px',
        fontFamily: 'monospace',
        color: '#ff6666',
      })
      .setOrigin(1, 0);

    // "FIGHT!" text that fades
    const fightText = this.add
      .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'FIGHT!', {
        fontSize: '64px',
        fontFamily: 'monospace',
        color: '#ff4444',
        fontStyle: 'bold',
      })
      .setOrigin(0.5);

    this.tweens.add({
      targets: fightText,
      alpha: 0,
      scale: 2,
      duration: 1000,
      ease: 'Power2',
      onComplete: () => {
        fightText.destroy();
        this.startRound();
      },
    });

    // Setup controls
    this.setupControls();
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

    // Placeholder attack logging
    this.keyF.on('down', () => {
      if (this.roundActive) console.log('P1 PUNCH');
    });
    this.keyG.on('down', () => {
      if (this.roundActive) console.log('P1 KICK');
    });
    this.keyK.on('down', () => {
      if (this.roundActive) console.log('P2 PUNCH');
    });
    this.keyL.on('down', () => {
      if (this.roundActive) console.log('P2 KICK');
    });
  }

  private startRound(): void {
    this.roundActive = true;
    this.roundTimer = ROUND_TIME;
    this.p1Hp = MAX_HP;
    this.p2Hp = MAX_HP;

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.roundTimer--;
        this.timerText.setText(String(this.roundTimer));
        if (this.roundTimer <= 0) {
          this.endRound();
        }
      },
      repeat: ROUND_TIME - 1,
    });
  }

  private endRound(): void {
    this.roundActive = false;
    if (this.timerEvent) {
      this.timerEvent.destroy();
    }

    // Determine round winner
    if (this.p1Hp > this.p2Hp) {
      this.p1Wins++;
    } else if (this.p2Hp > this.p1Hp) {
      this.p2Wins++;
    }
    // Draw: no wins awarded

    // Check for match winner
    if (this.p1Wins >= WINS_NEEDED || this.p2Wins >= WINS_NEEDED) {
      const winner = this.p1Wins >= WINS_NEEDED ? 'P1' : 'P2';
      const winText = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `${winner} WINS!`, {
          fontSize: '48px',
          fontFamily: 'monospace',
          color: '#ffcc00',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      this.time.delayedCall(3000, () => {
        winText.destroy();
        this.scene.start(SCENES.CHARACTER_SELECT);
      });
    } else if (this.round < TOTAL_ROUNDS) {
      this.round++;
      this.roundText.setText(`Round ${this.round}`);

      // Reset positions
      this.p1.setPosition(200, GROUND_Y - 30);
      this.p2.setPosition(600, GROUND_Y - 30);

      // Show round text then start
      const nextRoundText = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `Round ${this.round}`, {
          fontSize: '48px',
          fontFamily: 'monospace',
          color: '#ffffff',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      this.time.delayedCall(1500, () => {
        nextRoundText.destroy();
        this.startRound();
      });
    } else {
      // All rounds played, determine winner
      const winner =
        this.p1Wins > this.p2Wins
          ? 'P1'
          : this.p2Wins > this.p1Wins
            ? 'P2'
            : 'NOBODY';
      const winText = this.add
        .text(GAME_WIDTH / 2, GAME_HEIGHT / 2, `${winner} WINS!`, {
          fontSize: '48px',
          fontFamily: 'monospace',
          color: '#ffcc00',
          fontStyle: 'bold',
        })
        .setOrigin(0.5);

      this.time.delayedCall(3000, () => {
        winText.destroy();
        this.scene.start(SCENES.CHARACTER_SELECT);
      });
    }
  }

  update(): void {
    if (!this.roundActive) return;

    const p1Speed = CHARACTERS[this.p1Character].speed;
    const p2Speed = CHARACTERS[this.p2Character].speed;

    // P1 movement (WASD)
    this.p1VelX = 0;
    if (this.keyA.isDown) this.p1VelX = -p1Speed;
    if (this.keyD.isDown) this.p1VelX = p1Speed;

    this.p1.x += this.p1VelX * (1 / 60);

    // P2 movement (Arrows)
    this.p2VelX = 0;
    if (this.keyLeft.isDown) this.p2VelX = -p2Speed;
    if (this.keyRight.isDown) this.p2VelX = p2Speed;

    this.p2.x += this.p2VelX * (1 / 60);

    // Clamp positions to screen bounds
    this.p1.x = Phaser.Math.Clamp(this.p1.x, 20, GAME_WIDTH - 20);
    this.p2.x = Phaser.Math.Clamp(this.p2.x, 20, GAME_WIDTH - 20);

    // Update HP bars
    this.p1HpBar.width = (this.p1Hp / MAX_HP) * 250;
    this.p2HpBar.width = (this.p2Hp / MAX_HP) * 250;
  }
}
