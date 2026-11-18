// Options and save/load screens.
import type { Game } from '../../game/game';
import { menu, toast, confirm } from '../widgets';
import { overlay } from './common';
import { listSaves, saveGame, loadGame, loadOptions, saveOptions, type GameState, type Options } from '../../game/state';
import { inHub } from '../hub';
import { audio } from '../../audio/audio';
import { setQuality, rinfo, type Quality } from '../../gfx/renderer';
import { NODES } from '../../data/db';
import { gameMode, promptGameMode } from '../gameMode';
import { fmtDate, fmtNum, t } from '../../i18n';

/** The save list's short chapter labels, by chapter. */
const CHAPTERS = ['system.save.chapter.prologue', 'system.save.chapter.1', 'system.save.chapter.2', 'system.save.chapter.3', 'system.save.chapter.4'];
/** Minutes of play time, always two digits, in the player's digits. */
const twoDigits = (n: number) => (n < 10 ? fmtNum(0) : '') + fmtNum(n);

export async function openSaveLoad(game: Game, mode: 'save' | 'load'): Promise<GameState | null> {
  const ov = overlay(t(mode === 'save' ? 'system.save.screen_save' : 'system.save.screen_load'));
  try {
    for (;;) {
      const saves = listSaves();
      const items = saves.map((s, i) => ({
        label: s
          ? t(i === 7 ? 'system.save.slot_autosave' : 'system.save.slot', { hero: s.heroName, chapter: CHAPTERS[s.chapter] ? t(CHAPTERS[s.chapter]) : '', place: NODES.get(s.location)?.name ?? s.location })
          : i === 7 ? t('system.save.empty_autosave') : t('system.save.empty', { slot: i + 1 }),
        value: String(i),
        // all three in the player's digits, like the two-digit minutes
        right: s ? t('system.save.level_time', { level: fmtNum(s.level), hours: fmtNum(Math.floor(s.playtime / 3600)), minutes: twoDigits(Math.floor((s.playtime % 3600) / 60)) }) : '',
        disabled: mode === 'load' ? !s : i === 7 ? t('system.save.autosave_reserved') : false,
        desc: s ? t('system.save.details', { date: fmtDate(s.savedAt), objective: s.objective }) : '',
      }));
      const pick = await menu({ items, x: 16, y: 64, title: t(mode === 'save' ? 'system.save.menu_save' : 'system.save.menu_load'), parent: ov.root, showDesc: true }).promise;
      if (pick === null) return null;
      const slot = +pick;
      if (mode === 'save') {
        if (saves[slot] && !(await confirm(t('system.save.overwrite')))) continue;
        if (saveGame(game.state, slot)) { audio.sfx('confirm'); toast(t('system.save.saved')); } else toast(t('system.save.failed'));
        return null;
      }
      const st = loadGame(slot);
      if (st) { audio.sfx('confirm'); return st; }
    }
  } finally { ov.close(); }
}

export async function openOptions(game: Game, parent?: HTMLElement) {
  const ov = overlay(t('system.options.title'), parent);
  const o: Options = game.options;
  let last: string | undefined;
  try {
    for (;;) {
      const pct = (v: number) => t('system.options.percent', { pct: Math.round(v * 100) });
      const onOff = (on: boolean) => t(on ? 'system.options.on' : 'system.options.off');
      const difficulty = { easy: 'system.options.difficulty_easy', normal: 'system.options.difficulty_normal', hard: 'system.options.difficulty_hard' };
      // auto, ultra, webgpu… are the settings' technical names, shown as they are
      const inUse = (chosen: string, actual?: string) => t('system.options.setting_in_use', { chosen, in_use: actual ?? '' });
      const items = () => [
        ...(inHub() ? [] : [{ label: t('system.options.game_mode'), value: 'gameMode', right: gameMode.active ? gameMode.fullscreen ? t('system.options.game_mode_fullscreen') : t('system.options.game_mode_browser') : onOff(false), desc: t('system.options.game_mode_desc') }]),
        { label: t('system.options.music'), value: 'music', right: pct(o.music) },
        { label: t('system.options.sfx'), value: 'sfx', right: pct(o.sfx) },
        { label: t('system.options.battle_speed'), value: 'speed', right: t('system.options.speed', { speed: o.battleSpeed }) },
        { label: t('system.options.text_speed'), value: 'text', right: t('system.options.speed', { speed: o.textSpeed }) },
        { label: t('system.options.difficulty'), value: 'difficulty', right: t(difficulty[o.difficulty ?? 'normal']), desc: t('system.options.difficulty_desc') },
        { label: t('system.options.gentle'), value: 'gentle', right: onOff(!!o.gentle), desc: t('system.options.gentle_desc') },
        { label: t('system.options.encounters'), value: 'encounters', right: onOff(o.encounters !== false), desc: t('system.options.encounters_desc') },
        { label: t('system.options.camera_shake'), value: 'shake', right: onOff(!!o.camShake) },
        { label: t('system.options.quality'), value: 'quality', right: inUse(o.quality, rinfo?.quality) },
        { label: t('system.options.renderer'), value: 'renderer', right: inUse(o.renderer, rinfo?.backend), desc: t('system.options.renderer_desc') },
        { label: t('controller.title'), value: 'controller', desc: t('system.options.controller_desc') },
        { label: t('system.options.how_to_play'), value: 'help' },
        { label: t('common.back'), value: 'back' },
      ];
      const optionsMenu = menu({ items: items(), x: 16, y: 64, title: t('system.options.title'), parent: ov.root, showDesc: true, tapSelects: false, initial: last });
      const unsubscribe = gameMode.onChange(() => optionsMenu.refresh(items()));
      const pick = await optionsMenu.promise;
      unsubscribe();
      if (!pick || pick === 'back') return;
      last = pick; // keep the cursor on the setting just changed
      if (pick === 'gameMode') {
        if (gameMode.active) gameMode.exit();
        else await promptGameMode();
        continue;
      }
      if (pick === 'controller') {
        const { openController } = await import('./controller');
        ov.root.style.visibility = 'hidden';
        try { await openController(parent); } finally { ov.root.style.visibility = ''; }
        // the Controller page saves its own settings: take them up so the next save here keeps them
        Object.assign(o, loadOptions());
        continue;
      }
      if (pick === 'help') {
        const { openHelp } = await import('./help');
        ov.root.style.visibility = 'hidden';
        try { await openHelp(parent); } finally { ov.root.style.visibility = ''; }
        continue;
      }
      const cycle = <T,>(arr: T[], v: T) => arr[(arr.indexOf(v) + 1) % arr.length];
      if (pick === 'music') { o.music = cycle([0, 0.25, 0.5, 0.7, 0.85, 1], o.music); audio.setVolumes?.({ music: o.music }); }
      if (pick === 'sfx') { o.sfx = cycle([0, 0.25, 0.5, 0.8, 1], o.sfx); audio.setVolumes?.({ sfx: o.sfx }); audio.sfx('confirm'); }
      if (pick === 'speed') o.battleSpeed = cycle([0.75, 1, 1.5, 2], o.battleSpeed);
      if (pick === 'text') o.textSpeed = cycle([0.75, 1, 1.5, 2.5], o.textSpeed);
      if (pick === 'gentle') o.gentle = !o.gentle;
      if (pick === 'difficulty') o.difficulty = cycle(['easy', 'normal', 'hard'] as Options['difficulty'][], o.difficulty ?? 'normal');
      if (pick === 'shake') o.camShake = !o.camShake;
      if (pick === 'encounters') o.encounters = o.encounters === false;
      if (pick === 'quality') { o.quality = cycle(['auto', 'ultra', 'high', 'medium', 'low'] as Array<Quality | 'auto'>, o.quality); if (o.quality !== 'auto') setQuality(o.quality); toast(t('system.options.quality_changed')); }
      if (pick === 'renderer') o.renderer = cycle(['auto', 'webgpu', 'webgl2', 'webgl1'] as Options['renderer'][], o.renderer);
      saveOptions(o);
    }
  } finally { ov.close(); }
}
