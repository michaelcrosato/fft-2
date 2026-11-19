// Options → Art Style (docs/PLAN-ART-STYLES.md, *The settings*): a style per layer or one for both, each
// layer's strength, shade bands, outlines, light sources and lamps. Every change shows at once: the
// panel docks to one side, the scene shows through beside it, and the paused frame is redrawn.
import type { Game } from '../../game/game';
import { loadOptions, saveOptions } from '../../game/state';
import { rinfo } from '../../gfx/renderer';
import { BACKEND } from '../../gfx/three';
import { currentStyleSettings, dropUrlOverrides, styleChanged } from '../../gfx/styles/current';
import { PRESETS } from '../../gfx/styles/presets';
import { LAMP_CAP, resolveStyle } from '../../gfx/styles/resolve';
import {
  BAND_CHOICES, DEFAULT_STYLE_SETTINGS, IMPLEMENTED_STYLES, LAMP_CHOICES, LIGHT_CHOICES, OUTLINE_CHOICES, STYLE_IDS,
  roundStrength, type StyleId, type StyleSettings,
} from '../../gfx/styles/types';
import { t } from '../../i18n';
import type { Action } from '../input';
import { menu, type MenuItem } from '../widgets';
import { overlay } from './common';

type Row = 'linked' | 'style' | 'strength' | 'env' | 'envStrength' | 'actors' | 'actorsStrength' | 'bands' | 'outline' | 'lights' | 'lamps';

/** a style id as a line id: boldCel → bold_cel (line ids are lowercase) */
export const styleLineId = (id: StyleId) => id.replace(/[A-Z]/g, (c) => '_' + c.toLowerCase());
const styleName = (id: StyleId) => t(`artstyle.style.${styleLineId(id)}`);
const pct = (v: number) => t('artstyle.percent', { pct: Math.round(v * 100) });
const cycleIn = <T,>(arr: readonly T[], v: T, dir: 1 | -1) => arr[(arr.indexOf(v) + dir + arr.length) % arr.length];

/** the styles offered, in the page's order */
export function offeredStyles(): StyleId[] {
  return STYLE_IDS.filter((id) => IMPLEMENTED_STYLES.has(id));
}

/** step one setting forward (1) or back (-1); pure, for the tests */
export function stepSetting(s: StyleSettings, row: Row, dir: 1 | -1): StyleSettings {
  const o = { ...s };
  const styles = offeredStyles();
  const strength = (v: number) => roundStrength(Math.max(0, Math.min(1, v + dir * 0.1)));
  switch (row) {
    case 'linked':
      o.styleLinked = !o.styleLinked;
      // unlinking starts both layers from the shared style
      if (!o.styleLinked) { o.styleActors = o.styleEnv; o.styleActorsStrength = o.styleEnvStrength; }
      break;
    case 'style': o.styleEnv = o.styleActors = cycleIn(styles, o.styleEnv, dir); break;
    case 'strength': o.styleEnvStrength = o.styleActorsStrength = strength(o.styleEnvStrength); break;
    case 'env': o.styleEnv = cycleIn(styles, o.styleEnv, dir); break;
    case 'envStrength': o.styleEnvStrength = strength(o.styleEnvStrength); break;
    case 'actors': o.styleActors = cycleIn(styles, o.styleActors, dir); break;
    case 'actorsStrength': o.styleActorsStrength = strength(o.styleActorsStrength); break;
    case 'bands': o.styleBands = cycleIn(BAND_CHOICES, o.styleBands, dir); break;
    case 'outline': o.styleOutline = cycleIn(OUTLINE_CHOICES, o.styleOutline, dir); break;
    case 'lights': o.lights = cycleIn(LIGHT_CHOICES, o.lights, dir); break;
    case 'lamps': o.lamps = cycleIn(LAMP_CHOICES, o.lamps, dir); break;
  }
  return o;
}

export async function openArtStyle(game: Game, parent?: HTMLElement) {
  const ov = overlay(t('artstyle.title'), parent);
  ov.root.classList.add('art-style');
  document.documentElement.classList.add('art-style-preview');
  // what the player sees is what the page shows, URL overrides included; the first change stores it all
  let s: StyleSettings = currentStyleSettings();
  let last: string | undefined;
  const unavailable = BACKEND === 'webgl1' ? t('artstyle.unavailable') : null;
  const narrow = () => typeof matchMedia === 'function' && matchMedia('(max-width: 640px) and (orientation: portrait)').matches;

  const apply = async (next: StyleSettings) => {
    s = next;
    saveOptions({ ...loadOptions(), ...s });
    dropUrlOverrides();
    await styleChanged();
    game.requestFrame();
  };

  const items = (): MenuItem<string>[] => {
    const plan = resolveStyle({ ...s, styleBands: 'auto', styleOutline: 'auto' }, { quality: rinfo?.quality ?? 'medium', backend: BACKEND });
    const ownBands = plan.env.band?.bands ?? plan.actors.band?.bands;
    const ownLights = PRESETS[s.styleEnv]?.lights ?? 'today';
    const lightsText = (v: 'today' | 1 | 2 | 3) => t(v === 'today' ? 'artstyle.lights.today' : `artstyle.lights.${v}`);
    const styleRow = (label: string, row: Row, id: StyleId): MenuItem<string> =>
      ({ label, value: row, right: styleName(id), desc: unavailable ?? t(`artstyle.desc.${styleLineId(id)}`), disabled: unavailable ?? false });
    const strengthRow = (label: string, row: Row, v: number, id: StyleId): MenuItem<string> =>
      ({ label, value: row, right: pct(v), desc: unavailable ?? t('artstyle.strength_desc'), disabled: unavailable ?? id === 'none' });
    return [
      // on WebGL 1 a greyed line says why (focus skips disabled rows, so their descriptions never show)
      ...(unavailable ? [{ label: t('artstyle.unavailable_label'), value: 'unavailable', disabled: unavailable, desc: unavailable }] : []),
      { label: t('artstyle.linked'), value: 'linked', right: t(s.styleLinked ? 'artstyle.on' : 'artstyle.off'), desc: unavailable ?? t('artstyle.linked_desc'), disabled: unavailable ?? false },
      ...(s.styleLinked
        ? [styleRow(t('artstyle.style'), 'style', s.styleEnv), strengthRow(t('artstyle.strength'), 'strength', s.styleEnvStrength, s.styleEnv)]
        : [
          styleRow(t('artstyle.env'), 'env', s.styleEnv), strengthRow(t('artstyle.env_strength'), 'envStrength', s.styleEnvStrength, s.styleEnv),
          styleRow(t('artstyle.actors'), 'actors', s.styleActors), strengthRow(t('artstyle.actors_strength'), 'actorsStrength', s.styleActorsStrength, s.styleActors),
        ]),
      {
        label: t('artstyle.bands'), value: 'bands', desc: unavailable ?? t('artstyle.bands_desc'), disabled: unavailable ?? false,
        right: s.styleBands === 'auto' ? (ownBands ? t('artstyle.own', { value: ownBands }) : t('artstyle.own_plain')) : t('artstyle.count', { n: s.styleBands }),
      },
      {
        label: t('artstyle.outline'), value: 'outline', desc: unavailable ?? t('artstyle.outline_desc'), disabled: unavailable ?? false,
        right: s.styleOutline === 'auto' ? t('artstyle.own_plain') : t(`artstyle.outline.${s.styleOutline}`),
      },
      {
        label: t('artstyle.lights'), value: 'lights', desc: t('artstyle.lights_desc'),
        right: s.lights === 'auto' ? (ownLights === 'today' ? lightsText('today') : t('artstyle.own', { value: lightsText(ownLights) })) : lightsText(s.lights),
      },
      {
        label: t('artstyle.lamps'), value: 'lamps', desc: t('artstyle.lamps_desc'),
        right: s.lamps === 'auto' ? t('artstyle.auto', { value: LAMP_CAP[rinfo?.quality ?? 'medium'] }) : s.lamps === 0 ? t('artstyle.off') : t('artstyle.count', { n: s.lamps }),
      },
      { label: t('artstyle.reset'), value: 'reset', desc: t('artstyle.reset_desc') },
      { label: t('common.back'), value: 'back' },
    ];
  };

  try {
    for (;;) {
      const place = narrow() ? { x: 8, bottom: 8, maxHeight: '46vh' } : { x: 16, y: 64 };
      const m = menu({
        items: items(), ...place, title: t('artstyle.title'), parent: ov.root, showDesc: true, tapSelects: false, initial: last,
        // left and right step the focused setting either way, without leaving the list
        onAction: (a: Action, v) => {
          if ((a !== 'left' && a !== 'right') || !v || v === 'reset' || v === 'back') return false;
          const row = v as Row;
          const it = items().find((i) => i.value === v);
          if (!it || it.disabled) return true;
          void apply(stepSetting(s, row, a === 'right' ? 1 : -1)).then(() => m.refresh(items()));
          return true;
        },
      });
      const pick = await m.promise;
      if (!pick || pick === 'back') return;
      last = pick;
      if (pick === 'reset') await apply({ ...DEFAULT_STYLE_SETTINGS });
      else await apply(stepSetting(s, pick as Row, 1));
    }
  } finally {
    ov.close();
    document.documentElement.classList.remove('art-style-preview');
    game.requestFrame();
  }
}
