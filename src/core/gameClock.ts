// Gameplay time stops while the system menu is open. UI input stays live.
export class GameClock {
  private holds = 0;
  private listeners = new Set<() => void>();
  private pausedAt: number | null = null;
  private pausedMs = 0;

  get paused() {
    return this.holds > 0;
  }

  /** Monotonic gameplay milliseconds, including pauses with no animation frames. */
  now(): number {
    return (this.pausedAt ?? performance.now()) - this.pausedMs;
  }

  pause(): () => void {
    this.holds++;
    if (this.holds === 1) {
      this.pausedAt = performance.now();
      for (const listener of this.listeners) listener();
    }
    let released = false;
    return () => {
      if (released) return;
      released = true;
      if (--this.holds === 0) {
        this.pausedMs += performance.now() - this.pausedAt!;
        this.pausedAt = null;
        for (const listener of [...this.listeners]) listener();
      }
    };
  }

  whenRunning(): Promise<void> {
    if (!this.paused) return Promise.resolve();
    return new Promise((resolve) => {
      const changed = () => {
        if (this.paused) return;
        this.listeners.delete(changed);
        resolve();
      };
      this.listeners.add(changed);
    });
  }

  /** Preserve remaining time across pauses; return a cancellation function. */
  schedule(callback: () => void, ms: number): () => void {
    let remaining = Math.max(0, ms);
    let started = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      if (timer === undefined) return;
      clearTimeout(timer);
      timer = undefined;
      remaining = Math.max(0, remaining - (performance.now() - started));
    };
    const changed = () => {
      stop();
      if (this.paused) return;
      started = performance.now();
      timer = setTimeout(() => {
        timer = undefined;
        this.listeners.delete(changed);
        callback();
      }, remaining);
    };
    this.listeners.add(changed);
    changed();
    return () => {
      stop();
      this.listeners.delete(changed);
    };
  }

  sleep(ms: number): Promise<void> {
    return new Promise((resolve) => {
      this.schedule(resolve, ms);
    });
  }
}

export const gameClock = new GameClock();
