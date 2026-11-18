/// <reference types="vite/client" />
declare module 'three-legacy';
declare module 'three/addons/*';

/** True in the 52in1 package build (HUB_PACKAGE=1): code that 52in1 forbids, such as WebHID, is compiled out. */
declare const __HUB_PACKAGE__: boolean;
