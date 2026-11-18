// Options → Controller: button prompts, vibration, and a DualSense's extras (connected through 52in1
// or, on a page of its own, over WebHID). Every extra adds to controls that work without it.
import { loadOptions, saveOptions, type Options } from '../../game/state';
import { t } from '../../i18n';
import { dualsense } from '../dualsense';
import { input } from '../input';
import { menu, toast, type MenuItem } from '../widgets';
import { overlay } from './common';

const onOff = (v: boolean) => t(v ? 'controller.on' : 'controller.off');

function status(): { right: string; desc: string } {
  const src = dualsense.source;
  if (src === 'hub') return { right: t('controller.status.hub'), desc: t('controller.status_desc.hub') };
  if (src === 'webhid') return { right: t(dualsense.bus === 'bluetooth' ? 'controller.status.bluetooth' : 'controller.status.usb'), desc: t('controller.status_desc.connect') };
  if (dualsense.inHub) return { right: t('controller.status.none'), desc: t('controller.status_desc.hub_none') };
  return { right: t('controller.status.none'), desc: t(dualsense.canConnect ? 'controller.status_desc.connect' : 'controller.status_desc.unsupported') };
}

export async function openController(parent?: HTMLElement) {
  const ov = overlay(t('controller.title'), parent);
  let last: string | undefined;
  let pendingConnect: Promise<boolean> | null = null;
  try {
    for (;;) {
      const o: Options = loadOptions();
      const caps = dualsense.caps;
      const st = status();
      const items = (): MenuItem<string>[] => [
        { label: t('controller.prompts'), value: 'prompts', right: t(`controller.prompts.${o.buttonPrompts}`), desc: t('controller.prompts_desc') },
        { label: t('controller.vibration'), value: 'vibration', right: t(o.vibration <= 0 ? 'controller.vibration.off' : o.vibration < 1 ? 'controller.vibration.low' : 'controller.vibration.high'), desc: t('controller.vibration_desc') },
        { label: '', value: 'sep1', sep: true },
        { label: t('controller.dualsense'), value: 'status', right: st.right, desc: st.desc, disabled: true },
        ...(dualsense.canConnect && dualsense.source !== 'webhid'
          // the browser's device list opens only inside a click or key press, never a controller's button
          ? [{ label: t('controller.connect'), value: 'connect', desc: st.desc, onChoose: () => { pendingConnect = input.lastDevice === 'pad' ? null : dualsense.connect(); } }]
          : []),
        { label: t('controller.light'), value: 'light', right: onOff(o.dsLight), desc: t('controller.light_desc'), disabled: dualsense.source !== null && !caps.lightbar },
        { label: t('controller.triggers'), value: 'triggers', right: onOff(o.dsTriggers), desc: t('controller.triggers_desc'), disabled: dualsense.source !== null && !caps.triggers },
        { label: t('controller.motion'), value: 'motion', right: t(`controller.motion.${o.motion}`), desc: t('controller.motion_desc'), disabled: dualsense.source !== null && !caps.motion },
        { label: t('controller.sensitivity'), value: 'sense', right: t('controller.sensitivity_value', { value: o.motionSense }), desc: t('controller.motion_desc'), disabled: o.motion === 'off' },
        { label: t('controller.touchpad'), value: 'touchpad', right: onOff(o.touchpad), desc: t('controller.touchpad_desc'), disabled: dualsense.source !== null && !caps.touchpad },
        { label: t('common.back'), value: 'back' },
      ];
      const m = menu({ items: items(), x: 16, y: 64, title: t('controller.title'), parent: ov.root, showDesc: true, tapSelects: false, initial: last });
      const off = dualsense.onChange(() => m.refresh(items()));
      const pick = await m.promise;
      off();
      if (!pick || pick === 'back') return;
      last = pick;
      const cycle = <T,>(arr: T[], v: T) => arr[(arr.indexOf(v) + 1) % arr.length];
      if (pick === 'connect' && !pendingConnect) { toast(t('controller.connect_by_hand')); continue; }
      if (pick === 'connect' && pendingConnect) {
        const ok = await pendingConnect;
        pendingConnect = null;
        toast(t(ok ? 'controller.connected' : 'controller.connect_failed'));
        if (ok) input.haptic('level');
        continue;
      }
      if (pick === 'prompts') o.buttonPrompts = cycle(['auto', 'playstation', 'xbox'] as Options['buttonPrompts'][], o.buttonPrompts);
      if (pick === 'vibration') { o.vibration = cycle([1, 0.5, 0], o.vibration <= 0 ? 0 : o.vibration < 1 ? 0.5 : 1); }
      if (pick === 'light') o.dsLight = !o.dsLight;
      if (pick === 'triggers') o.dsTriggers = !o.dsTriggers;
      if (pick === 'motion') o.motion = cycle(dualsense.inHub ? ['auto', 'on', 'off'] as Options['motion'][] : ['on', 'off'] as Options['motion'][], o.motion === 'auto' && !dualsense.inHub ? 'off' : o.motion);
      if (pick === 'sense') o.motionSense = cycle([0.5, 1, 1.5, 2], o.motionSense);
      if (pick === 'touchpad') o.touchpad = !o.touchpad;
      saveOptions(o);
      if (pick === 'vibration') input.haptic('hit'); // feel the new strength
      if (pick === 'light' && !o.dsLight) dualsense.light(null);
      if (pick === 'triggers' && !o.dsTriggers) dualsense.trigger('both', null);
    }
  } finally {
    ov.close();
  }
}
