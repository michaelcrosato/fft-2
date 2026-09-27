import { expect, it, vi } from 'vitest';
import { input } from '../src/ui/input';

it('keeps menu input above gameplay handlers that arrive asynchronously', () => {
  const game = vi.fn(),
    menu = vi.fn(),
    lateGame = vi.fn(),
    options = vi.fn();
  const removeGame = input.push(game);
  const removeMenu = input.push(menu, true);
  const removeLate = input.push(lateGame);
  const removeOptions = input.push(options, true);
  try {
    input.dispatch('confirm');
    expect(options).toHaveBeenCalledOnce();
    expect(game).not.toHaveBeenCalled();
    expect(lateGame).not.toHaveBeenCalled();
    removeOptions();
    input.dispatch('cancel');
    expect(menu).toHaveBeenCalledOnce();
    removeMenu();
    input.dispatch('confirm');
    expect(lateGame).toHaveBeenCalledOnce();
  } finally {
    removeOptions();
    removeMenu();
    removeLate();
    removeGame();
  }
});

it('does not send unhandled modal actions through to the battle or cutscene', () => {
  const game = vi.fn();
  const removeGame = input.push(game);
  const removeMenu = input.push(() => false, true);
  try {
    input.dispatch('menu');
    expect(game).not.toHaveBeenCalled();
  } finally {
    removeMenu();
    removeGame();
  }
});
