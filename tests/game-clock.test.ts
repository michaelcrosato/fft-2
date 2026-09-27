import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { GameClock } from '../src/core/gameClock';

describe('gameplay pause clock', () => {
  beforeEach(() => vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance'] }));
  afterEach(() => vi.useRealTimers());

  it('resumes a partially elapsed delay with its remaining time', async () => {
    const clock = new GameClock();
    const done = vi.fn();
    clock.schedule(done, 1000);
    await vi.advanceTimersByTimeAsync(300);
    const resume = clock.pause();
    await vi.advanceTimersByTimeAsync(5000);
    expect(done).not.toHaveBeenCalled();
    resume();
    await vi.advanceTimersByTimeAsync(699);
    expect(done).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(1);
    expect(done).toHaveBeenCalledOnce();
  });

  it('holds newly created delays and continuation points until every pause is released', async () => {
    const clock = new GameClock();
    const first = clock.pause(),
      second = clock.pause();
    const checkpoint = vi.fn(),
      slept = vi.fn();
    void clock.whenRunning().then(checkpoint);
    void clock.sleep(100).then(slept);
    first();
    first();
    await vi.advanceTimersByTimeAsync(2000);
    expect(clock.paused).toBe(true);
    expect(checkpoint).not.toHaveBeenCalled();
    expect(slept).not.toHaveBeenCalled();
    second();
    await vi.advanceTimersByTimeAsync(0);
    expect(checkpoint).toHaveBeenCalledOnce();
    expect(slept).not.toHaveBeenCalled();
    await vi.advanceTimersByTimeAsync(100);
    expect(slept).toHaveBeenCalledOnce();
  });

  it('does not revive a cancelled timer after resuming', async () => {
    const clock = new GameClock();
    const done = vi.fn();
    const cancel = clock.schedule(done, 50);
    const resume = clock.pause();
    cancel();
    resume();
    await vi.advanceTimersByTimeAsync(500);
    expect(done).not.toHaveBeenCalled();
  });
});
