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
  SPRITE_FRAME_WIDTH,
  SPRITE_FRAME_HEIGHT,
  ANIM_STATES,
  AnimState,
  animSpriteKey,
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

/** Result of an attack-hit check, used to trigger sound effects. */
export type AttackResult = 'none' | 'hit' | 'blocked';

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
  public shadow: Phaser.GameObjects.Ellipse;
  public sprite: Phaser.GameObjects.Sprite | null = null;
  private useSprite = false;
  private hitboxDebug: Phaser.GameObjects.Rectangle | null = null;
  private charKey: string = ''; // e.g. 'sausage'
  private animKeys: Map<AnimState, string> = new Map();
  private currentAnimState: AnimState = 'idle';
  private prevAnimState: AnimState | null = null;

  // Passive ability state
  private hasDoubleJump = false;

  // Track whether input was already pressed (for edge-trigger)
  private prevPunch = false;
  private prevKick = false;
  private prevJump = false;

  /** Set to true on the frame a jump starts; cleared by the caller. */
  public jumpedThisFrame = false;

  /** Set to true on the frame a fighter lands; read by FightScene each update. */
  public justLanded = false;

  /** Set to true on the frame an attack expires without having hit anyone. */
  public attackMissed = false;

  private wasAirborne = false;

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

    // Derive the character key (e.g. 'sausage') from spriteKey (e.g. 'sausage-idle')
    this.charKey = stats.spriteKey.replace(/-idle$/, '');

    // Try to create a sprite from the character's spritesheet
    const spriteKey = stats.spriteKey;
    if (scene.textures.exists(spriteKey) && scene.textures.get(spriteKey).key !== '__MISSING') {
      // Create animations for all available states
      for (const animState of ANIM_STATES) {
        const textureKey = animSpriteKey(this.charKey, animState);
        const animKey = `${textureKey}-anim`;

        if (
          scene.textures.exists(textureKey) &&
          scene.textures.get(textureKey).key !== '__MISSING' &&
          !scene.anims.exists(animKey)
        ) {
          // One-shot animations for punch, kick, ko; looping for others
          const isOneShot = animState === 'punch' || animState === 'kick' || animState === 'ko';
          scene.anims.create({
            key: animKey,
            frames: scene.anims.generateFrameNumbers(textureKey, { start: 0, end: 3 }),
            frameRate: animState === 'walk' ? 10 : 8,
            repeat: isOneShot ? 0 : -1,
          });
        }

        this.animKeys.set(animState, animKey);
      }

      // Calculate scale to fit FIGHTER_WIDTH x FIGHTER_HEIGHT
      const scaleX = FIGHTER_WIDTH / SPRITE_FRAME_WIDTH;
      const scaleY = FIGHTER_HEIGHT / SPRITE_FRAME_HEIGHT;

      this.sprite = scene.add.sprite(
        x,
        GROUND_Y - FIGHTER_HEIGHT / 2,
        spriteKey,
      );
      this.sprite.setScale(scaleX, scaleY);
      this.sprite.setDepth(depth);

      // Play idle animation
      const idleAnimKey = this.animKeys.get('idle');
      if (idleAnimKey && scene.anims.exists(idleAnimKey)) {
        this.sprite.play(idleAnimKey);
      }
      this.sprite.setFlipX(!facingRight);
      this.useSprite = true;
    }

    // Always create the rectangle body (used for fallback rendering or hidden behind sprite)
    this.body = scene.add.rectangle(
      x,
      GROUND_Y - FIGHTER_HEIGHT / 2,
      FIGHTER_WIDTH,
      FIGHTER_HEIGHT,
      stats.color,
    );
    this.body.setDepth(depth);
    this.body.setStrokeStyle(0);

    // Shadow ellipse under the fighter
    this.shadow = scene.add.ellipse(x, GROUND_Y + 2, FIGHTER_WIDTH * 1.2, 12, 0x000000, 0.5);
    this.shadow.setDepth(depth - 1);

    // If sprite is available, hide the rectangle
    if (this.useSprite) {
      this.body.setAlpha(0);
    }
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
    this.hasDoubleJump = false;

    // Reset sprite and animation state
    this.currentAnimState = 'idle';
    this.prevAnimState = null;
    if (this.sprite) {
      this.sprite.clearTint();
      this.sprite.setAlpha(1);
      const baseScaleX = FIGHTER_WIDTH / SPRITE_FRAME_WIDTH;
      const baseScaleY = FIGHTER_HEIGHT / SPRITE_FRAME_HEIGHT;
      this.sprite.setScale(baseScaleX, baseScaleY);
    }

    this.shadow.setScale(1, 1);
    this.shadow.setAlpha(0.5);

    this.syncGraphics();
  }

  /** Process input and physics for one frame */
  update(dt: number, input: FighterInput, opponent: Fighter): void {
    this.justLanded = false;
    this.attackMissed = false;

    if (this.state === 'ko') {
      this.syncGraphics();
      return;
    }

    const dtSec = dt / 1000;

    // Decrease timers
    if (this.attackTimer > 0) {
      this.attackTimer -= dt;
      if (this.attackTimer <= 0) {
        this.attackTimer = 0;
        // If the attack expired without connecting, flag a miss
        if (!this.hasHitThisAttack && this.currentAttackType !== null) {
          this.attackMissed = true;
        }
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
    } else if (this.state === 'hitstun') {
      // Preserve knockback velocity during hitstun; dampen it over time
      this.velX *= 0.85;
    } else {
      // During attack/blocking, no horizontal movement
      this.velX = 0;
    }

    // --- Jump (edge-triggered) ---
    this.jumpedThisFrame = false;
    if (canAct && input.jump && !this.prevJump) {
      if (this.onGround) {
        this.velY = JUMP_VELOCITY;
        this.onGround = false;
        this.state = 'jumping';
        this.jumpedThisFrame = true;
      } else if (this.stats.ability === 'agile' && !this.hasDoubleJump) {
        this.velY = JUMP_VELOCITY;
        this.hasDoubleJump = true;
        this.jumpedThisFrame = true;
      }
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
      this.hasDoubleJump = false;
      if (this.state === 'jumping') {
        this.state = 'idle';
      }
    }

    // Detect landing: was in the air last frame, now on the ground
    if (this.wasAirborne && this.onGround) {
      this.justLanded = true;
    }

    // --- Push-back collision with opponent (only when at similar height) ---
    // Allow 20% overlap on each side (60% of full width as minimum distance)
    const verticalGap = Math.abs(this.y - opponent.y);
    const minDist = FIGHTER_WIDTH * 0.6;
    const dist = Math.abs(this.x - opponent.x);
    if (dist < minDist && dist > 0 && verticalGap < FIGHTER_HEIGHT * 0.7) {
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

    // Track airborne state for next frame's landing detection
    this.wasAirborne = !this.onGround;

    // Sync graphics
    this.syncGraphics();
  }

  private startAttack(type: AttackType): void {
    this.state = type === 'punch' ? 'punching' : 'kicking';
    this.attackTimer = ATTACK_DURATION;
    this.cooldownTimer =
      this.stats.ability === 'quickRecovery' ? ATTACK_COOLDOWN * 0.75 : ATTACK_COOLDOWN;
    this.currentAttackType = type;
    this.hasHitThisAttack = false;
  }

  /** Check attack hitbox overlap each frame during the active attack window.
   *  Returns 'hit', 'blocked', or 'none' so the caller can trigger sounds. */
  checkAttackHit(opponent: Fighter): AttackResult {
    if (
      (this.state !== 'punching' && this.state !== 'kicking') ||
      this.hasHitThisAttack ||
      this.currentAttackType === null
    ) {
      return 'none';
    }

    if (this.attackHits(opponent)) {
      const isBlocking = opponent.state === 'blocking';
      const dmg = calculateDamage({
        attackType: this.currentAttackType,
        power: this.stats.power,
        isAerial: !this.onGround,
        isBlocking,
      });
      const kbDir = this.facingRight ? 1 : -1;
      const kbMult = this.stats.ability === 'heavyHitter' ? 1.5 : 1;
      opponent.takeDamage(dmg, kbDir * kbMult);
      this.hasHitThisAttack = true;
      if (isBlocking) {
        if (opponent.stats.ability === 'counterShield' && this.hitStunTimer <= 0) {
          this.takeDamage(3);
        }
        return 'blocked';
      }
      return 'hit';
    }

    return 'none';
  }

  /** Check if attack connects — requires fighters' bodies to overlap.
   *  Attack hitbox starts slightly inside the attacker's body edge so
   *  fighters must be close enough for their bounding boxes to intersect. */
  private attackHits(opponent: Fighter): boolean {
    // Attacker hitbox: starts 20% inside the body edge, extends a small amount outward
    const overlap20 = FIGHTER_WIDTH * 0.2; // 20% of body width
    const hbX = this.facingRight
      ? this.x + FIGHTER_WIDTH / 2 - overlap20
      : this.x - FIGHTER_WIDTH / 2 + overlap20 - HITBOX_WIDTH;
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

  takeDamage(amount: number, knockbackDir?: number): void {
    if (this.hitStunTimer > 0 || this.state === 'ko') return;

    this.hp -= amount;
    if (this.hp <= 0) {
      this.hp = 0;
      this.state = 'ko';
      this.velX = 0;
      this.velY = 0;
    } else {
      this.hitStunTimer =
        this.stats.ability === 'quickRecovery' ? HIT_STUN_DURATION * 0.75 : HIT_STUN_DURATION;
      this.state = 'hitstun';
      this.velX = (knockbackDir || 0) * 150;
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

  /** Map FighterState to the AnimState for spritesheet lookup. */
  private stateToAnimState(): AnimState {
    switch (this.state) {
      case 'walking': return 'walk';
      case 'punching': return 'punch';
      case 'kicking': return 'kick';
      case 'jumping': return 'jump';
      case 'blocking': return 'block';
      case 'ko': return 'ko';
      case 'hitstun': return 'idle'; // hitstun reuses idle sprite with flashing
      default: return 'idle';
    }
  }

  private syncGraphics(): void {
    // Update shadow
    this.shadow.setPosition(this.x, GROUND_Y + 2);
    if (this.state === 'ko') {
      this.shadow.setScale(1.5, 1);
      this.shadow.setAlpha(0.2);
    } else if (!this.onGround) {
      const heightRatio = Math.max(0.3, 1 - (GROUND_Y - this.y) / 200);
      this.shadow.setScale(heightRatio, heightRatio);
      this.shadow.setAlpha(0.5 * heightRatio);
    } else {
      this.shadow.setScale(1, 1);
      this.shadow.setAlpha(0.5);
    }

    this.body.setPosition(this.x, this.y - FIGHTER_HEIGHT / 2);

    if (this.useSprite && this.sprite) {
      // Position sprite at the same location as the rectangle body
      this.sprite.setPosition(this.x, this.y - FIGHTER_HEIGHT / 2);
      this.sprite.setFlipX(!this.facingRight);

      const baseScaleX = FIGHTER_WIDTH / SPRITE_FRAME_WIDTH;
      const baseScaleY = FIGHTER_HEIGHT / SPRITE_FRAME_HEIGHT;

      // Determine which animation to play based on current state
      const targetAnimState = this.stateToAnimState();

      if (targetAnimState !== this.prevAnimState) {
        const animKey = this.animKeys.get(targetAnimState);
        const textureKey = animSpriteKey(this.charKey, targetAnimState);

        if (animKey && this.sprite.scene.anims.exists(animKey)) {
          // Switch texture and play corresponding animation
          this.sprite.setTexture(textureKey);
          this.sprite.play(animKey, true);
        }
        this.prevAnimState = targetAnimState;
      }

      // Flash during hitstun: alternate red tint / normal color
      if (this.state === 'hitstun') {
        if (Math.sin(Date.now() * 0.02) > 0) {
          this.sprite.setTint(0xff0000);
          this.sprite.setAlpha(1);
        } else {
          this.sprite.clearTint();
          this.sprite.setAlpha(0.5);
        }
      } else if (this.state === 'ko') {
        this.sprite.setAlpha(0.4);
        this.sprite.clearTint();
        // Scale is normal; the KO spritesheet already shows the collapsed pose
        this.sprite.setScale(baseScaleX, baseScaleY);
      } else {
        this.sprite.setAlpha(1);
        this.sprite.setScale(baseScaleX, baseScaleY);
        this.sprite.clearTint();
      }

      // Keep the rectangle hidden when using sprite
      this.body.setAlpha(0);
      return;
    }

    // --- Fallback: rectangle-only rendering ---

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
    this.shadow.destroy();
    this.body.destroy();
    if (this.sprite) this.sprite.destroy();
    if (this.hitboxDebug) this.hitboxDebug.destroy();
  }
}
