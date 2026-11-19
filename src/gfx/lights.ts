// The light rig's sources beyond the sun (docs/PLAN-ART-STYLES.md, Phase 3): the Light sources setting
// picks 1 (the sun), 2 (sun and rim) or 3 (sun, rim and a front fill that follows the camera), or each
// scene's own ('today'). Lights are added the first time they are wanted and only dimmed afterwards:
// adding or removing a light rebuilds every lit shader, dimming one doesn't.
import { THREE } from './three';
import type { Camera, DirectionalLight, Scene } from 'three/webgpu';

export type LightSetting = 'today' | 1 | 2 | 3;

export interface RigOptions {
  /** the scene's own rim light, if it has one today */
  rim: DirectionalLight | null;
  rimColor: string;
  rimIntensity: number;
  frontColor: string;
  frontIntensity: number;
}

export class LightRig {
  private rim: DirectionalLight | null;
  private front: DirectionalLight | null = null;
  private setting: LightSetting = 'today';

  constructor(private readonly scene: Scene, private readonly sun: DirectionalLight, private readonly o: RigOptions) {
    this.rim = o.rim;
  }

  /** how many of the rig's lights shine now (for the tests) */
  get count(): number {
    return 1 + (this.rim && this.rim.intensity > 0 ? 1 : 0) + (this.front && this.front.intensity > 0 ? 1 : 0);
  }

  apply(setting: LightSetting) {
    this.setting = setting;
    const wantRim = setting === 'today' ? !!this.o.rim : setting >= 2;
    if (wantRim && !this.rim) {
      // opposite the sun, lower: light on the edges seen from the camera's side
      this.rim = new THREE.DirectionalLight(this.o.rimColor, this.o.rimIntensity);
      this.rim.position.set(-this.sun.position.x, this.sun.position.y * 0.6, -this.sun.position.z);
      this.scene.add(this.rim);
    }
    if (this.rim) this.rim.intensity = wantRim ? this.o.rimIntensity : 0;
    const wantFront = setting === 3;
    if (wantFront && !this.front) {
      this.front = new THREE.DirectionalLight(this.o.frontColor, this.o.frontIntensity);
      this.scene.add(this.front);
    }
    if (this.front) this.front.intensity = wantFront ? this.o.frontIntensity : 0;
  }

  /** keep the front fill on the camera's side, a little above it */
  follow(cam: Camera) {
    if (!this.front || this.setting !== 3) return;
    this.front.position.copy(cam.position);
    this.front.position.y += 6;
  }
}
