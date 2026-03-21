import { DAMAGE, BLOCK_REDUCTION, AERIAL_BONUS } from '../config/constants';

export type AttackType = 'punch' | 'kick';

export interface DamageInput {
  attackType: AttackType;
  power: number; // attacker's power multiplier
  isAerial: boolean; // attacker is in the air
  isBlocking: boolean; // defender is blocking
}

/**
 * Pure function: calculates final damage dealt.
 * Formula: (baseDamage * power + aerialBonus) * blockReduction
 */
export function calculateDamage(input: DamageInput): number {
  const baseDamage = input.attackType === 'punch' ? DAMAGE.PUNCH : DAMAGE.KICK;
  let dmg = baseDamage * input.power;

  if (input.isAerial) {
    dmg += AERIAL_BONUS;
  }

  if (input.isBlocking) {
    dmg *= 1 - BLOCK_REDUCTION;
  }

  return Math.round(dmg);
}

export type RoundOutcome = 'p1' | 'p2' | 'draw';

/**
 * Determines the winner of a round based on HP.
 * - If one HP is 0 or below, the other wins (KO).
 * - Otherwise, higher HP wins.
 * - Equal HP = draw.
 */
export function determineRoundWinner(p1Hp: number, p2Hp: number): RoundOutcome {
  if (p1Hp <= 0 && p2Hp <= 0) return 'draw';
  if (p1Hp <= 0) return 'p2';
  if (p2Hp <= 0) return 'p1';
  if (p1Hp > p2Hp) return 'p1';
  if (p2Hp > p1Hp) return 'p2';
  return 'draw';
}
