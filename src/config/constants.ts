// Game dimensions
export const GAME_WIDTH = 800;
export const GAME_HEIGHT = 450;

// Fight settings
export const MAX_HP = 100;
export const ROUND_TIME = 90; // seconds
export const TOTAL_ROUNDS = 3;
export const WINS_NEEDED = 2;

// Physics
export const GROUND_Y = 380;
export const GRAVITY = 800;
export const MOVE_SPEED = 200;
export const JUMP_VELOCITY = -400;

// Damage values
export const DAMAGE = {
  PUNCH: 8,
  KICK: 12,
  SPECIAL: 20,
} as const;

// Combat tuning
export const BLOCK_REDUCTION = 0.8;
export const AERIAL_BONUS = 4;
export const ATTACK_COOLDOWN = 400; // ms before next attack
export const ATTACK_DURATION = 200; // ms attack hitbox is active
export const HIT_STUN_DURATION = 300; // ms invulnerability after being hit

// Fighter dimensions
export const FIGHTER_WIDTH = 40;
export const FIGHTER_HEIGHT = 60;
export const HITBOX_WIDTH = 45; // attack hitbox extends in front
export const HITBOX_HEIGHT = 40;

// Sprite frame dimensions (each spritesheet is 512x127 with 4 frames)
export const SPRITE_FRAME_WIDTH = 128;
export const SPRITE_FRAME_HEIGHT = 127;

// Character stats
export interface CharacterStats {
  name: string;
  hp: number;
  speed: number;
  color: number;
  power: number; // damage multiplier
  spriteKey: string; // key used for the spritesheet texture
}

export const CHARACTERS: Record<string, CharacterStats> = {
  sausage: {
    name: 'Sausage',
    hp: MAX_HP,
    speed: 220,
    color: 0xcc6633,
    power: 0.8,
    spriteKey: 'sausage-idle',
  },
  burger: {
    name: 'Burger',
    hp: MAX_HP,
    speed: 160,
    color: 0xcc9933,
    power: 1.3,
    spriteKey: 'burger-idle',
  },
  bacon: {
    name: 'Bacon',
    hp: MAX_HP,
    speed: 240,
    color: 0xff6666,
    power: 1.0,
    spriteKey: 'bacon-idle',
  },
  cheese: {
    name: 'Cheese',
    hp: MAX_HP,
    speed: 200,
    color: 0xffcc00,
    power: 1.0,
    spriteKey: 'cheese-idle',
  },
} as const;

export const CHARACTER_KEYS = Object.keys(CHARACTERS);

// Controls mapping
export const CONTROLS = {
  P1: {
    LEFT: 'A',
    RIGHT: 'D',
    UP: 'W',
    DOWN: 'S',
    PUNCH: 'F',
    KICK: 'G',
  },
  P2: {
    LEFT: 'LEFT',
    RIGHT: 'RIGHT',
    UP: 'UP',
    DOWN: 'DOWN',
    PUNCH: 'K',
    KICK: 'L',
  },
} as const;

// Scene keys
export const SCENES = {
  START: 'StartScene',
  CHARACTER_SELECT: 'CharacterSelectScene',
  FIGHT: 'FightScene',
} as const;
