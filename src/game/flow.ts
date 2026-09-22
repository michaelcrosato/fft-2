// Title → new game / continue → story & world map loop.
import type { Game } from './game';
export async function runTitle(game: Game) {
  const { newGame } = await import('./state');
  game.state = newGame('Rhen', [4, 12]);
  await game.runChainedSteps();
}
