import data from "./manifest.json";

export interface AudioAsset {
	src: string;
	title: string;
	game: string;
	source: { page: string; download: string; file: string; sha256: string };
	processing: string;
	sha256: string;
	duration: number;
}
export interface AudioCue {
	asset: string;
	gain?: number;
	loop?: boolean;
	pitch?: number;
	gapMs?: number;
	/** Optional SFX excerpt within the replacement file, in seconds. */
	offset?: number;
	duration?: number;
}
export interface AudioManifest {
	version: number;
	usage: string;
	assets: Record<string, AudioAsset>;
	music: Record<string, AudioCue>;
	sfx: Record<string, AudioCue>;
	fallbackSfx: string;
}
/** The JSON file is the only audio catalogue. Call sites use stable cue names. */
export const manifest: AudioManifest = data;
export function assetUrl(asset: AudioAsset): string {
	// Vite's relative base also works when the build is served under a subdirectory.
	const url = new URL(`${import.meta.env.BASE_URL}${asset.src}`, document.baseURI);
	// A replacement gets a new browser cache key even when its filename stays the same.
	url.searchParams.set("v", asset.sha256);
	return url.href;
}
