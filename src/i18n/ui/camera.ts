// The battle camera's on-screen buttons (rotate, zoom, tilt, recenter): names read by screen
// readers, and tooltips that add the keyboard shortcut.
import type { Lines } from '../core';

export const lines: Lines = {
  'camera.toolbar': 'Camera',
  'camera.rotate_left': 'Rotate left',
  'camera.rotate_right': 'Rotate right',
  'camera.zoom_in': 'Zoom in',
  'camera.zoom_out': 'Zoom out',
  'camera.tilt': 'Tilt view',
  'camera.recenter': 'Recenter',
  'camera.tip': '{label} ({key})',
  'camera.tip_wheel': '{label} ({key} / wheel)',
};

export const notes: Record<string, string> = {
  'camera.toolbar': 'Name of the row of camera buttons, read by screen readers.',
  'camera.recenter': 'Move the camera back to the active unit.',
  'camera.tip': 'Tooltip of a camera button: {label} is its name, {key} its keyboard key.',
  'camera.tip_wheel': 'Tooltip of a zoom button: {label} is its name, {key} its keyboard key; "wheel" is the mouse wheel.',
};
