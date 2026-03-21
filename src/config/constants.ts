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

// Character stats
export interface CharacterStats {
  name: string;
  hp: number;
  speed: number;
  punchDamage: number;
  kickDamage: number;
  color: number;
}

export const CHARACTERS: Record<string, CharacterStats> = {
  sausage: {
    name: 'Sausage',
    hp: MAX_HP,
    speed: 220,
    punchDamage: 7,
    kickDamage: 11,
    color: 0xcc6633,
  },
  burger: {
    name: 'Burger',
    hp: MAX_HP,
    speed: 160,
    punchDamage: 10,
    kickDamage: 15,
    color: 0xcc9933,
  },
  bacon: {
    name: 'Bacon',
    hp: MAX_HP,
    speed: 240,
    punchDamage: 6,
    kickDamage: 10,
    color: 0xff6666,
  },
  cheese: {
    name: 'Cheese',
    hp: MAX_HP,
    speed: 200,
    punchDamage: 8,
    kickDamage: 13,
    color: 0xffcc00,
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
