// Options → Controller: button prompts, vibration and a DualSense's extras.
import type { Lines } from '../core';

export const lines: Lines = {
  'controller.title': 'Controller',
  'controller.prompts': 'Button prompts',
  'controller.prompts_desc': 'The button names shown in help and menus: those of the controller in your hands, or always one kind.',
  'controller.prompts.auto': 'Automatic',
  'controller.prompts.playstation': 'PlayStation',
  'controller.prompts.xbox': 'Xbox',
  'controller.vibration': 'Vibration',
  'controller.vibration_desc': 'Short pulses on hits, critical blows, knockouts, spells and level-ups, on any controller that rumbles.',
  'controller.vibration.off': 'Off',
  'controller.vibration.low': 'Low',
  'controller.vibration.high': 'High',
  'controller.dualsense': 'DualSense',
  'controller.status.hub': 'Connected through 52in1',
  'controller.status.usb': 'Connected by USB',
  'controller.status.bluetooth': 'Connected by Bluetooth',
  'controller.status.none': 'Not connected',
  'controller.status_desc.hub': 'A DualSense is set up in 52in1\'s Settings. The extras below follow what you allow there.',
  'controller.status_desc.hub_none': 'Connect a DualSense in 52in1\'s Settings to use its light bar, adaptive triggers, motion and touchpad.',
  'controller.status_desc.connect': 'Connect a DualSense by USB or Bluetooth to use its light bar, adaptive triggers, motion and touchpad. Your browser asks which controller to use.',
  'controller.status_desc.unsupported': 'This browser cannot reach a DualSense\'s extras. Chrome or Edge on a computer can. The controller still plays the whole game.',
  'controller.connect': 'Connect a DualSense…',
  'controller.connected': 'DualSense connected.',
  'controller.connect_failed': 'No DualSense was connected.',
  'controller.connect_by_hand': 'Choose Connect with the mouse, a tap or the keyboard: the browser opens its list of controllers only for those.',
  'controller.light': 'Light bar',
  'controller.light_desc': 'The light bar glows in the colour of the unit taking its turn, turning red as it weakens.',
  'controller.triggers': 'Trigger effects',
  'controller.triggers_desc': 'The zoom triggers push back gently, and harder as the camera nears its limits.',
  'controller.motion': 'Motion camera',
  'controller.motion_desc': 'Turn and tip the controller to look around the battlefield, as well as with the right stick.',
  'controller.motion.auto': 'With 52in1\'s Motion aim',
  'controller.motion.on': 'On',
  'controller.motion.off': 'Off',
  'controller.sensitivity': 'Motion sensitivity',
  'controller.sensitivity_value': '{value}×',
  'controller.touchpad': 'Touchpad gestures',
  'controller.touchpad_desc': 'Swipe left or right to rotate, up or down to tilt, pinch to zoom, tap to recenter. Pressing the touchpad shows the turn order.',
  'controller.on': 'On',
  'controller.off': 'Off',
};

export const notes: Record<string, string> = {
  'controller.status.hub': '52in1 is the game library the game runs in; keep its name as written.',
  'controller.sensitivity_value': 'A multiplier, such as 1.5×.',
};

export const max: Record<string, number> = { 'controller.on': 8, 'controller.off': 8 };
