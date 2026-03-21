import { describe, it, expect } from 'vitest';
import {
  calculateDamage,
  determineRoundWinner,
  DamageInput,
} from '../utils/damage';
import { DAMAGE, BLOCK_REDUCTION, AERIAL_BONUS } from '../config/constants';

describe('calculateDamage', () => {
  it('should calculate punch damage with power 1.0', () => {
    const input: DamageInput = {
      attackType: 'punch',
      power: 1.0,
      isAerial: false,
      isBlocking: false,
    };
    expect(calculateDamage(input)).toBe(Math.round(DAMAGE.PUNCH * 1.0));
  });

  it('should calculate kick damage with power 1.0', () => {
    const input: DamageInput = {
      attackType: 'kick',
      power: 1.0,
      isAerial: false,
      isBlocking: false,
    };
    expect(calculateDamage(input)).toBe(Math.round(DAMAGE.KICK * 1.0));
  });

  it('should apply power multiplier for punch (high power 1.3)', () => {
    const input: DamageInput = {
      attackType: 'punch',
      power: 1.3,
      isAerial: false,
      isBlocking: false,
    };
    expect(calculateDamage(input)).toBe(Math.round(DAMAGE.PUNCH * 1.3));
  });

  it('should apply power multiplier for kick (low power 0.8)', () => {
    const input: DamageInput = {
      attackType: 'kick',
      power: 0.8,
      isAerial: false,
      isBlocking: false,
    };
    expect(calculateDamage(input)).toBe(Math.round(DAMAGE.KICK * 0.8));
  });

  it('should add aerial bonus (+4) for airborne attacks', () => {
    const input: DamageInput = {
      attackType: 'punch',
      power: 1.0,
      isAerial: true,
      isBlocking: false,
    };
    expect(calculateDamage(input)).toBe(
      Math.round(DAMAGE.PUNCH * 1.0 + AERIAL_BONUS),
    );
  });

  it('should add aerial bonus to kick', () => {
    const input: DamageInput = {
      attackType: 'kick',
      power: 1.0,
      isAerial: true,
      isBlocking: false,
    };
    expect(calculateDamage(input)).toBe(
      Math.round(DAMAGE.KICK * 1.0 + AERIAL_BONUS),
    );
  });

  it('should reduce damage by 80% when blocking (punch)', () => {
    const input: DamageInput = {
      attackType: 'punch',
      power: 1.0,
      isAerial: false,
      isBlocking: true,
    };
    const expected = Math.round(DAMAGE.PUNCH * 1.0 * (1 - BLOCK_REDUCTION));
    expect(calculateDamage(input)).toBe(expected);
  });

  it('should reduce damage by 80% when blocking (kick)', () => {
    const input: DamageInput = {
      attackType: 'kick',
      power: 1.0,
      isAerial: false,
      isBlocking: true,
    };
    const expected = Math.round(DAMAGE.KICK * 1.0 * (1 - BLOCK_REDUCTION));
    expect(calculateDamage(input)).toBe(expected);
  });

  it('should apply both aerial bonus and block reduction together', () => {
    const input: DamageInput = {
      attackType: 'punch',
      power: 1.0,
      isAerial: true,
      isBlocking: true,
    };
    const expected = Math.round(
      (DAMAGE.PUNCH * 1.0 + AERIAL_BONUS) * (1 - BLOCK_REDUCTION),
    );
    expect(calculateDamage(input)).toBe(expected);
  });

  it('should combine power multiplier, aerial bonus, and blocking', () => {
    const input: DamageInput = {
      attackType: 'kick',
      power: 1.3,
      isAerial: true,
      isBlocking: true,
    };
    const expected = Math.round(
      (DAMAGE.KICK * 1.3 + AERIAL_BONUS) * (1 - BLOCK_REDUCTION),
    );
    expect(calculateDamage(input)).toBe(expected);
  });

  it('should return at least 0 damage (no negative damage)', () => {
    // Even with blocking, damage should not go negative
    const input: DamageInput = {
      attackType: 'punch',
      power: 0.8,
      isAerial: false,
      isBlocking: true,
    };
    expect(calculateDamage(input)).toBeGreaterThanOrEqual(0);
  });
});

describe('determineRoundWinner', () => {
  it('should return p1 when p1 has more HP', () => {
    expect(determineRoundWinner(50, 30)).toBe('p1');
  });

  it('should return p2 when p2 has more HP', () => {
    expect(determineRoundWinner(30, 50)).toBe('p2');
  });

  it('should return draw when HP is equal', () => {
    expect(determineRoundWinner(50, 50)).toBe('draw');
  });

  it('should return p2 when p1 HP is 0 (KO)', () => {
    expect(determineRoundWinner(0, 50)).toBe('p2');
  });

  it('should return p1 when p2 HP is 0 (KO)', () => {
    expect(determineRoundWinner(50, 0)).toBe('p1');
  });

  it('should return draw when both HP are 0', () => {
    expect(determineRoundWinner(0, 0)).toBe('draw');
  });

  it('should return p2 when p1 HP is negative (overkill)', () => {
    expect(determineRoundWinner(-5, 10)).toBe('p2');
  });

  it('should return draw when both HP negative', () => {
    expect(determineRoundWinner(-5, -3)).toBe('draw');
  });
});
