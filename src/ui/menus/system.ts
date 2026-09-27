// Options and save/load screens.
import type { Game } from '../../game/game';
import { menu, toast, confirm } from '../widgets';
import { overlay } from './common';
import { listSaves, saveGame, loadGame, deleteSave, saveOptions, type GameState, type Options } from '../../game/state';
import { audio } from '../../audio/audio';
import { setQuality, rinfo, type Quality } from '../../gfx/renderer';
import { NODES } from '../../data/db';

export async function openSaveLoad(game: Game, mode: 'save' | 'load'): Promise<GameState | null> {
  const ov = overlay(mode === 'save' ? 'Save the Chronicle' : 'Load a Chronicle');
  try {
    for (;;) {
      const saves = listSaves();
      const items = saves.map((s, i) => ({
        label: s ? `${i === 7 ? 'Autosave · ' : ''}${s.heroName} — ${['Prologue', 'Ch. I', 'Ch. II', 'Ch. III', 'Ch. IV'][s.chapter] ?? ''} · ${NODES.get(s.location)?.name ?? s.location}` : `${i === 7 ? 'Autosave' : 'Slot ' + (i + 1)} — empty`,
        value: String(i),
        right: s ? `Lv${s.level} · ${Math.floor(s.playtime / 3600)}h${String(Math.floor((s.playtime % 3600) / 60)).padStart(2, '0')}` : '',
        disabled: mode === 'load' ? !s : i === 7 ? 'Autosave slot' : false,
        desc: s ? `${new Date(s.savedAt).toLocaleString()} — ${s.objective}` : '',
      }));
      const pick = await menu({ items, x: 16, y: 64, title: mode === 'save' ? 'Save' : 'Load', parent: ov.root, showDesc: true }).promise;
      if (pick === null) return null;
      const slot = +pick;
      if (mode === 'save') {
        if (saves[slot] && !(await confirm('Overwrite this chronicle?'))) continue;
        if (saveGame(game.state, slot)) { audio.sfx('confirm'); toast('Chronicle saved.'); } else toast('Saving failed (storage unavailable).');
        return null;
      }
      const st = loadGame(slot);
      if (st) { audio.sfx('confirm'); return st; }
    }
  } finally { ov.close(); }
}

export async function openOptions(game: Game) {
  const ov = overlay('Options');
  const o: Options = game.options;
  let last: string | undefined;
  try {
    for (;;) {
      const pct = (v: number) => `${Math.round(v * 100)}%`;
      const pick = await menu({ items: [
        { label: 'Music volume', value: 'music', right: pct(o.music) },
        { label: 'Effects volume', value: 'sfx', right: pct(o.sfx) },
        { label: 'Battle speed', value: 'speed', right: `${o.battleSpeed}×` },
        { label: 'Text speed', value: 'text', right: `${o.textSpeed}×` },
        { label: 'Difficulty', value: 'difficulty', right: { easy: 'Squire (easy)', normal: 'Knight (normal)', hard: 'Lord (hard)' }[o.difficulty ?? 'normal'], desc: 'Enemy level and vigour relative to your company.' },
        { label: 'Gentle mode', value: 'gentle', right: o.gentle ? 'On' : 'Off', desc: 'Fallen allies retreat instead of crystallizing.' },
        { label: 'Random encounters', value: 'encounters', right: o.encounters === false ? 'Off' : 'On', desc: 'Wandering foes may ambush the company in open country.' },
        { label: 'Camera shake', value: 'shake', right: o.camShake ? 'On' : 'Off' },
        { label: 'Graphics quality', value: 'quality', right: `${o.quality} (${rinfo?.quality ?? ''})` },
        { label: 'Renderer', value: 'renderer', right: `${o.renderer} (${rinfo?.backend ?? ''})`, desc: 'Takes effect after reloading the page.' },
        { label: 'How to Play', value: 'help' },
        { label: 'Back', value: 'back' },
      ], x: 16, y: 64, title: 'Options', parent: ov.root, showDesc: true, tapSelects: false, initial: last }).promise;
      if (!pick || pick === 'back') return;
      last = pick; // keep the cursor on the setting just changed
      if (pick === 'help') {
        const { openHelp } = await import('./help');
        ov.root.style.visibility = 'hidden';
        try { await openHelp(); } finally { ov.root.style.visibility = ''; }
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
      if (pick === 'quality') { o.quality = cycle(['auto', 'ultra', 'high', 'medium', 'low'] as Array<Quality | 'auto'>, o.quality); if (o.quality !== 'auto') setQuality(o.quality); toast('Some quality changes apply on the next map.'); }
      if (pick === 'renderer') o.renderer = cycle(['auto', 'webgpu', 'webgl2', 'webgl1'] as Options['renderer'][], o.renderer);
      saveOptions(o);
    }
  } finally { ov.close(); }
}

export { deleteSave };
