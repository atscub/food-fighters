/**
 * GoatCounter custom event tracking.
 * Events appear in the GoatCounter dashboard under their path names.
 * See: https://www.goatcounter.com/help/events
 */

interface GoatCounter {
  count: (vars: { path: string; title: string; event: boolean }) => void;
}

declare global {
  interface Window {
    goatcounter?: GoatCounter;
  }
}

function trackEvent(name: string, title?: string): void {
  try {
    window.goatcounter?.count({
      path: `event/${name}`,
      title: title ?? name,
      event: true,
    });
  } catch {
    // Silently ignore - analytics should never break the game
  }
}

export function trackGameStart(): void {
  trackEvent('game-start', 'Game Started');
}

export function trackCharacterSelected(player: string, character: string): void {
  trackEvent(`character-select/${character}`, `${player} selected ${character}`);
}

export function trackFightStarted(p1: string, p2: string): void {
  trackEvent(`fight-start/${p1}-vs-${p2}`, `Fight: ${p1} vs ${p2}`);
}

export function trackRoundEnded(winner: string, p1: string, p2: string, round: number): void {
  trackEvent(
    `round-end/${winner}`,
    `Round ${round}: ${winner} wins (${p1} vs ${p2})`,
  );
}

export function trackMatchEnded(
  winner: string,
  p1: string,
  p2: string,
  p1Wins: number,
  p2Wins: number,
): void {
  trackEvent(
    `match-end/${winner}`,
    `Match: ${winner} wins ${p1Wins}-${p2Wins} (${p1} vs ${p2})`,
  );
}

export function trackRematch(p1: string, p2: string): void {
  trackEvent(`rematch/${p1}-vs-${p2}`, `Rematch: ${p1} vs ${p2}`);
}
