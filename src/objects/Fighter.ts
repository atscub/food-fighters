import Phaser from 'phaser';
import {
  CharacterStats,
  GROUND_Y,
  GRAVITY,
  JUMP_VELOCITY,
  GAME_WIDTH,
  FIGHTER_WIDTH,
  FIGHTER_HEIGHT,
  HITBOX_WIDTH,
  HITBOX_HEIGHT,
  ATTACK_COOLDOWN,
  ATTACK_DURATION,
  HIT_STUN_DURATION,
} from '../config/constants';
import { calculateDamage, AttackType } from '../utils/damage';

export type FighterState =
  | 'idle'
  | 'walking'
  | 'jumping'
  | 'punching'
  | 'kicking'
  | 'blocking'
  | 'hitstun'
  | 'ko';

export interface FighterInput {
  left: boolean;
  right: boolean;
  jump: boolean;
  block: boolean;
  punch: boolean;
  kick: boolean;
}

export class Fighter {
  // Position and physics
  public x: number;
  public y: number;
  public velX = 0;
  public velY = 0;
  public facingRight: boolean;

  // State
  public state: FighterState = 'idle';
  public hp: number;
  public readonly stats: CharacterStats;

  // Timing
  private attackTimer = 0; // remaining ms of current attack animation
  private cooldownTimer = 0; // remaining ms before next attack
  private hitStunTimer = 0; // remaining ms of hit stun invulnerability
  private onGround = true;

  // Rendering
  public body: Phaser.GameObjects.Rectangle;
  private hitboxDebug: Phaser.GameObjects.Rectangle | null = null;

  // Track whether input was already pressed (for edge-trigger)
  private prevPunch = false;
  private prevKick = false;
  private prevJump = false;

  // Track current attack type and whether it has already connected
  private currentAttackType: AttackType | null = null;
  private hasHitThisAttack = false;

  constructor(
    scene: Phaser.Scene,
    x: number,
    stats: CharacterStats,
    facingRight: boolean,
    depth: number = 0,
  ) {
    this.x = x;
    this.y = GROUND_Y;
    this.stats = stats;
    this.hp = stats.hp;
    this.facingRight = facingRight;

    this.body = scene.add.rectangle(
      x,
      GROUND_Y - FIGHTER_HEIGHT / 2,
      FIGHTER_WIDTH,
      FIGHTER_HEIGHT,
      stats.color,
    );
    this.body.setDepth(depth);
  }

  /** Reset fighter for a new round */
  reset(x: number): void {
    this.x = x;
    this.y = GROUND_Y;
    this.velX = 0;
    this.velY = 0;
    this.hp = this.stats.hp;
    this.state = 'idle';
    this.attackTimer = 0;
    this.cooldownTimer = 0;
    this.hitStunTimer = 0;
    this.onGround = true;
    this.prevPunch = false;
    this.prevKick = false;
    this.prevJump = false;
    this.currentAttackType = null;
    this.hasHitThisAttack = false;
    this.syncGraphics();
  }

  /** Process input and physics for one frame */
  update(dt: number, input: FighterInput, opponent: Fighter): void {
    if (this.state === 'ko') return;

    const dtSec = dt / 1000;

    // Decrease timers
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = 0;
        // attack animation ended
        this.state = this.onGround ? 'idle' : 'jumping';
      }
    }

    if (this.cooldownTimer > 0) {
      this.cooldownTimer -= dt;
      if (this.cooldownTimer <= 0) this.cooldownTimer = 0;
    }

    if (this.hitStunTimer > 0) {
      this.hitStunTimer -= dt;
      if (this.hitStunTimer <= 0) {
        this.hitStunTimer = 0;
        if (this.state === 'hitstun') {
          this.state = this.onGround ? 'idle' : 'jumping';
        }
      }
    }

    // Face opponent
    this.facingRight = opponent.x > this.x;

    // Only allow new actions if not in attack/hitstun/blocking
    const canAct =
      this.state !== 'punching' &&
      this.state !== 'kicking' &&
      this.state !== 'hitstun' &&
      this.state !== 'blocking';

    // --- Blocking (check before movement, separate from canAct) ---
    if (
      this.state !== 'punching' &&
      this.state !== 'kicking' &&
      this.state !== 'hitstun'
    ) {
      if (input.block && this.onGround) {
        this.state = 'blocking';
        this.velX = 0; // can't move while blocking
      } else if (this.state === 'blocking') {
        this.state = 'idle';
      }
    }

    // --- Horizontal movement ---
    if (canAct && this.state !== 'blocking') {
      this.velX = 0;
      if (input.left) this.velX = -this.stats.speed;
      if (input.right) this.velX = this.stats.speed;
    } else {
      // During attack/blocking, no horizontal movement
      this.velX = 0;
    }

    // --- Jump (edge-triggered) ---
    if (canAct && input.jump && !this.prevJump && this.onGround) {
      this.velY = JUMP_VELOCITY;
      this.onGround = false;
      this.state = 'jumping';
      // Release block if jumping
    }

    // --- Gravity ---
    if (!this.onGround) {
      this.velY += GRAVITY * dtSec;
    }

    // --- Apply velocity ---
    this.x += this.velX * dtSec;
    this.y += this.velY * dtSec;

    // --- Ground collision ---
    if (this.y >= GROUND_Y) {
      this.y = GROUND_Y;
      this.velY = 0;
      this.onGround = true;
      if (this.state === 'jumping') {
        this.state = 'idle';
      }
    }

    // --- Push-back collision with opponent ---
    const minDist = FIGHTER_WIDTH;
    const dist = Math.abs(this.x - opponent.x);
    if (dist < minDist && dist > 0) {
      const overlap = minDist - dist;
      const pushDir = this.x < opponent.x ? -1 : 1;
      this.x += pushDir * (overlap / 2);
    }

    // --- Clamp to screen ---
    this.x = Phaser.Math.Clamp(this.x, FIGHTER_WIDTH / 2, GAME_WIDTH - FIGHTER_WIDTH / 2);

    // --- Attacks (edge-triggered) ---
    if (canAct && this.cooldownTimer <= 0) {
      if (input.punch && !this.prevPunch) {
        this.startAttack('punch');
      } else if (input.kick && !this.prevKick) {
        this.startAttack('kick');
      }
    }

    // Walking state (if on ground, not in any action state)
    const isActing =
      this.state === 'punching' ||
      this.state === 'kicking' ||
      this.state === 'blocking' ||
      this.state === 'hitstun';
    if (this.onGround && !isActing) {
      this.state = this.velX !== 0 ? 'walking' : 'idle';
    }

    // Save previous input for edge detection
    this.prevPunch = input.punch;
    this.prevKick = input.kick;
    this.prevJump = input.jump;

    // Sync graphics
    this.syncGraphics();
  }

  private startAttack(type: AttackType): void {
    this.state = type === 'punch' ? 'punching' : 'kicking';
    this.attackTimer = ATTACK_DURATION;
    this.cooldownTimer = ATTACK_COOLDOWN;
    this.currentAttackType = type;
    this.hasHitThisAttack = false;
  }

  /** Check attack hitbox overlap each frame during the active attack window */
  checkAttackHit(opponent: Fighter): void {
    if (
      (this.state !== 'punching' && this.state !== 'kicking') ||
      this.hasHitThisAttack ||
      this.currentAttackType === null
    ) {
      return;
    }

    if (this.attackHits(opponent)) {
      const dmg = calculateDamage({
        attackType: this.currentAttackType,
        power: this.stats.power,
        isAerial: !this.onGround,
        isBlocking: opponent.state === 'blocking',
      });
      opponent.takeDamage(dmg);
      this.hasHitThisAttack = true;
    }
  }

  /** Simple rectangle overlap: hitbox (in front of attacker) vs defender hurtbox */
  private attackHits(opponent: Fighter): boolean {
    // Attacker hitbox
    const hbX = this.facingRight
      ? this.x + FIGHTER_WIDTH / 2
      : this.x - FIGHTER_WIDTH / 2 - HITBOX_WIDTH;
    const hbY = this.y - FIGHTER_HEIGHT / 2;

    // Defender hurtbox (their body)
    const dLeft = opponent.x - FIGHTER_WIDTH / 2;
    const dRight = opponent.x + FIGHTER_WIDTH / 2;
    const dTop = opponent.y - FIGHTER_HEIGHT;
    const dBottom = opponent.y;

    // Hitbox rect
    const aLeft = hbX;
    const aRight = hbX + HITBOX_WIDTH;
    const aTop = hbY;
    const aBottom = hbY + HITBOX_HEIGHT;

    return aLeft < dRight && aRight > dLeft && aTop < dBottom && aBottom > dTop;
  }

  takeDamage(amount: number): void {
    if (this.hitStunTimer > 0 || this.state === 'ko') return;

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'ko';
      this.velX = 0;
      this.velY = 0;
    } else {
      this.hitStunTimer = HIT_STUN_DURATION;
      this.state = 'hitstun';
    }
  }

  get isKO(): boolean {
    return this.hp <= 0;
  }

  get isOnGround(): boolean {
    return this.onGround;
  }

  get isInvulnerable(): boolean {
    return this.hitStunTimer > 0;
  }

  private syncGraphics(): void {
    this.body.setPosition(this.x, this.y - FIGHTER_HEIGHT / 2);

    // Flash during hitstun
    if (this.state === 'hitstun') {
      this.body.setAlpha(Math.sin(Date.now() * 0.02) > 0 ? 1 : 0.3);
    } else if (this.state === 'ko') {
      this.body.setAlpha(0.4);
      // Tilt the KO'd fighter by shrinking height (since we can't rotate rectangles easily)
      this.body.height = FIGHTER_HEIGHT * 0.4;
      this.body.y = this.y - (FIGHTER_HEIGHT * 0.4) / 2;
    } else {
      this.body.setAlpha(1);
      this.body.height = FIGHTER_HEIGHT;
    }

    // Visual feedback for blocking: slightly smaller
    if (this.state === 'blocking') {
      this.body.width = FIGHTER_WIDTH + 6;
      this.body.fillColor = Phaser.Display.Color.GetColor(
        ((this.stats.color >> 16) & 0xff) * 0.6,
        ((this.stats.color >> 8) & 0xff) * 0.6,
        (this.stats.color & 0xff) * 0.6,
      );
    } else if (this.state === 'punching' || this.state === 'kicking') {
      this.body.width = FIGHTER_WIDTH;
      this.body.fillColor = 0xffffff; // Flash white during attack
    } else {
      this.body.width = FIGHTER_WIDTH;
      this.body.fillColor = this.stats.color;
    }
  }

  destroy(): void {
    this.body.destroy();
    if (this.hitboxDebug) this.hitboxDebug.destroy();
  }
}
