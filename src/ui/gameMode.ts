// Browser immersion is opt-in for each campaign entry, never a saved preference.
import { h } from './dom';
import { input } from './input';
import { toast } from './widgets';

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element;
  webkitFullscreenEnabled?: boolean;
  webkitExitFullscreen?: () => Promise<void> | void;
};
type FullscreenRoot = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

class GameMode {
  active = false;
  private initialized = false;
  private wasFullscreen = false;
  private session = 0;
  private wakeLock: WakeLockSentinel | null = null;
  private wakePending = false;
  private exitButton: HTMLElement | null = null;
  private listeners = new Set<() => void>();

  onChange(listener: () => void) {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  get fullscreen() {
    const doc = document as FullscreenDocument;
    return (doc.fullscreenElement ?? doc.webkitFullscreenElement) === document.documentElement;
  }

  get fullscreenAvailable() {
    const doc = document as FullscreenDocument;
    const root = document.documentElement as FullscreenRoot;
    return !!(
      (typeof root.requestFullscreen === 'function' && doc.fullscreenEnabled !== false) ||
      (root.webkitRequestFullscreen && doc.webkitFullscreenEnabled !== false)
    );
  }

  private init() {
    if (this.initialized) return;
    this.initialized = true;
    const changed = () => {
      if (!this.active) return;
      if (this.fullscreen) this.wasFullscreen = true;
      else if (this.wasFullscreen) this.exit(); // Escape, browser chrome, or switching apps
    };
    document.addEventListener('fullscreenchange', changed);
    document.addEventListener('webkitfullscreenchange', changed);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.releaseWakeLock();
      else void this.keepAwake();
    });
    window.addEventListener('pagehide', () => this.exit());
    window.addEventListener(
      'keydown',
      (e) => {
        if (!this.active || e.code !== 'Escape') return;
        if (document.querySelector('.game-mode-prompt[open]')) return;
        // Leave the browser's Escape behavior intact, without also cancelling a game action.
        e.stopImmediatePropagation();
        this.exit();
      },
      { capture: true },
    );
    // Older touch browsers may ignore overscroll-behavior for history swipes.
    // Only reserve the outer 20px; normal taps, menu scrolling and camera gestures remain usable.
    document.addEventListener(
      'touchstart',
      (e) => {
        if (!this.active || e.touches.length !== 1 || !e.cancelable) return;
        const x = e.touches[0].clientX;
        if (x <= 20 || x >= window.innerWidth - 20) e.preventDefault();
      },
      { passive: false, capture: true },
    );
  }

  /** Called directly from a click/key handler: fullscreen requires transient user activation. */
  async enter(): Promise<void> {
    this.init();
    const session = ++this.session;
    this.active = true;
    this.wasFullscreen = this.fullscreen;
    document.documentElement.classList.add('game-mode');
    if (!this.exitButton) {
      this.exitButton = h(
        'button.game-mode-exit',
        {
          type: 'button',
          title: 'Exit Game Mode',
          'aria-label': 'Exit Game Mode',
          onclick: () => this.exit(),
        },
        '⛶',
      );
      // Outside #ui: scene transitions clear that container. Fullscreen covers the whole document.
      document.body.appendChild(this.exitButton);
    }
    try {
      if (!this.fullscreen) {
        const root = document.documentElement as FullscreenRoot;
        if (root.requestFullscreen) await root.requestFullscreen({ navigationUI: 'hide' });
        else if (root.webkitRequestFullscreen) await root.webkitRequestFullscreen();
      }
    } catch {
      /* Denied, unsupported, or a gamepad action without browser user activation. */
    }
    if (session !== this.session || !this.active) {
      if (!this.active) this.leaveFullscreen(); // an exit won the race with a pending request
      return;
    }
    this.wasFullscreen = this.fullscreen;
    for (const listener of this.listeners) listener();
    void this.keepAwake(); // an optional API must never delay starting a campaign
    toast(
      this.fullscreen
        ? 'Game Mode on. Use ⛶ or Esc to exit.'
        : 'Game Mode protections on; fullscreen is unavailable. You can retry from Options with a tap or key press. Use ⛶ or Esc to exit.',
      6500,
    );
  }

  exit() {
    this.active = false;
    this.wasFullscreen = false;
    this.session++;
    document.documentElement.classList.remove('game-mode');
    this.exitButton?.remove();
    this.exitButton = null;
    this.releaseWakeLock();
    this.leaveFullscreen();
    for (const listener of this.listeners) listener();
  }

  private leaveFullscreen() {
    if (!this.fullscreen) return;
    const doc = document as FullscreenDocument;
    try {
      const result = doc.exitFullscreen ? doc.exitFullscreen() : doc.webkitExitFullscreen?.();
      void Promise.resolve(result).catch(() => {});
    } catch {
      /* The browser may already be leaving fullscreen. */
    }
  }

  private releaseWakeLock() {
    const lock = this.wakeLock;
    this.wakeLock = null;
    if (lock) void lock.release().catch(() => {});
  }

  private async keepAwake() {
    if (!this.active || document.hidden || this.wakeLock || this.wakePending || !navigator.wakeLock) return;
    this.wakePending = true;
    const session = this.session;
    try {
      const lock = await navigator.wakeLock.request('screen');
      if (!this.active || document.hidden || session !== this.session) {
        await lock.release();
        return;
      }
      this.wakeLock = lock;
      lock.addEventListener('release', () => {
        if (this.wakeLock === lock) this.wakeLock = null;
      });
    } catch {
      /* Battery saver, permissions, and unsupported environments are all optional. */
    } finally {
      this.wakePending = false;
      if (session !== this.session && this.active) void this.keepAwake();
    }
  }
}

export const gameMode = new GameMode();

/** Always ask, including when the last campaign used Game Mode. */
export function promptGameMode(): Promise<void> {
  return new Promise((resolve) => {
    const dialog = h('dialog.panel.game-mode-prompt', {
      'aria-labelledby': 'game-mode-title',
      'aria-describedby': 'game-mode-description',
    }) as HTMLDialogElement;
    const enable = h('button.btn', { type: 'button' }, 'Enable Game Mode') as HTMLButtonElement;
    const decline = h('button.btn.ghost', { type: 'button' }, 'Play in Browser') as HTMLButtonElement;
    dialog.append(
      h('h2', { id: 'game-mode-title' }, 'Fullscreen Game Mode?'),
      h(
        'p',
        { id: 'game-mode-description' },
        'Hide browser controls, reduce accidental edge swipes and keep the screen awake while you play, where supported.',
      ),
      h('p.muted', null, 'Exit anytime with ⛶ or Esc. Your device may still allow system gestures.'),
      ...(!gameMode.fullscreenAvailable
        ? [
            h(
              'p',
              null,
              'Fullscreen is unavailable in this browser. Game Mode can still reduce accidental browser gestures.',
            ),
          ]
        : []),
      h('div.game-mode-actions', null, enable, decline),
    );
    let busy = false;
    let closed = false;
    const finish = () => {
      if (closed) return;
      closed = true;
      pop();
      dialog.close();
      dialog.remove();
      resolve();
    };
    enable.onclick = () => {
      if (busy) return;
      busy = true;
      enable.disabled = true;
      // Do not await a menu promise before requesting fullscreen (Safari requires the original gesture).
      void gameMode.enter().finally(finish);
    };
    decline.onclick = () => {
      gameMode.exit();
      finish();
    };
    dialog.addEventListener('cancel', (e) => {
      e.preventDefault();
      decline.click();
    });
    // Native <dialog> contains keyboard focus; the game's Tab binding must not swallow it.
    dialog.addEventListener('keydown', (e) => {
      if (e.key === 'Tab') e.stopPropagation();
    });
    const pop = input.push((action, e) => {
      if (action === 'cancel') {
        e?.preventDefault();
        decline.click();
      }
      if (!busy && ['up', 'down', 'left', 'right'].includes(action)) {
        (document.activeElement === enable ? decline : enable).focus();
      }
      if (!busy && action === 'confirm') (document.activeElement === decline ? decline : enable).click();
      return true;
    });
    document.body.appendChild(dialog);
    dialog.showModal();
    enable.focus();
  });
}
