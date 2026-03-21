import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../config/constants';
import { FighterInput } from './Fighter';

/**
 * Virtual touch controls overlay for mobile devices.
 * Left side: D-pad (LEFT, RIGHT, UP/Jump, DOWN/Block)
 * Right side: PUNCH and KICK buttons
 *
 * Only shown on touch-capable devices.
 */
export class TouchControls {
  private scene: Phaser.Scene;
  private buttons: Phaser.GameObjects.Arc[] = [];
  private labels: Phaser.GameObjects.Text[] = [];
  private visible = false;

  // Track which buttons are currently pressed
  public left = false;
  public right = false;
  public up = false;
  public down = false;
  public punch = false;
  public kick = false;

  // Pointer tracking for multi-touch
  private activePointers: Map<number, string> = new Map();

  constructor(scene: Phaser.Scene) {
    this.scene = scene;

    if (!TouchControls.isTouchDevice()) return;

    this.visible = true;
    this.createDpad();
    this.createActionButtons();

    // Enable multi-touch (up to 4 pointers)
    scene.input.addPointer(3);
  }

  static isTouchDevice(): boolean {
    if (typeof navigator === 'undefined') return false;
    return navigator.maxTouchPoints > 0 || 'ontouchstart' in globalThis;
  }

  private createButton(
    x: number,
    y: number,
    radius: number,
    label: string,
    buttonId: string,
  ): void {
    const btn = this.scene.add.circle(x, y, radius, 0xffffff, 0.2);
    btn.setDepth(100);
    btn.setScrollFactor(0);
    btn.setInteractive();

    const txt = this.scene.add
      .text(x, y, label, {
        fontSize: '16px',
        fontFamily: 'monospace',
        color: '#ffffff',
        fontStyle: 'bold',
      })
      .setOrigin(0.5)
      .setDepth(101)
      .setScrollFactor(0)
      .setAlpha(0.5);

    btn.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      this.setButton(buttonId, true);
      btn.setFillStyle(0xffffff, 0.5);
      this.activePointers.set(pointer.id, buttonId);
    });

    btn.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      this.setButton(buttonId, false);
      btn.setFillStyle(0xffffff, 0.2);
      this.activePointers.delete(pointer.id);
    });

    btn.on('pointerout', (pointer: Phaser.Input.Pointer) => {
      this.setButton(buttonId, false);
      btn.setFillStyle(0xffffff, 0.2);
      this.activePointers.delete(pointer.id);
    });

    this.buttons.push(btn);
    this.labels.push(txt);
  }

  private createDpad(): void {
    const btnSize = 32;
    const baseX = 90;
    const baseY = GAME_HEIGHT - 90;
    const spacing = 70;

    // LEFT
    this.createButton(baseX - spacing / 2, baseY, btnSize, '<', 'left');
    // RIGHT
    this.createButton(baseX + spacing / 2, baseY, btnSize, '>', 'right');
    // UP (Jump)
    this.createButton(baseX, baseY - spacing, btnSize, '^', 'up');
    // DOWN (Block)
    this.createButton(baseX, baseY + spacing * 0.4, btnSize, 'v', 'down');
  }

  private createActionButtons(): void {
    const btnSize = 35;
    const baseX = GAME_WIDTH - 90;
    const baseY = GAME_HEIGHT - 90;

    // PUNCH
    this.createButton(baseX - 45, baseY - 20, btnSize, 'P', 'punch');
    // KICK
    this.createButton(baseX + 25, baseY + 20, btnSize, 'K', 'kick');
  }

  private setButton(id: string, pressed: boolean): void {
    switch (id) {
      case 'left':
        this.left = pressed;
        break;
      case 'right':
        this.right = pressed;
        break;
      case 'up':
        this.up = pressed;
        break;
      case 'down':
        this.down = pressed;
        break;
      case 'punch':
        this.punch = pressed;
        break;
      case 'kick':
        this.kick = pressed;
        break;
    }
  }

  /** Returns current touch input state merged as FighterInput */
  getInput(): FighterInput {
    return {
      left: this.left,
      right: this.right,
      jump: this.up,
      block: this.down,
      punch: this.punch,
      kick: this.kick,
    };
  }

  get isVisible(): boolean {
    return this.visible;
  }

  destroy(): void {
    this.buttons.forEach((b) => b.destroy());
    this.labels.forEach((l) => l.destroy());
    this.buttons = [];
    this.labels = [];
  }
}
