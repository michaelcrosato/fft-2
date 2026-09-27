import { createHash } from "node:crypto";
import { readdirSync, readFileSync } from "node:fs";
import { relative, resolve } from "node:path";
import { type AudioManifest, manifest } from "../src/audio/manifest";

export function audioCatalogue(data: AudioManifest = manifest): string {
	const rows = Object.entries(data.assets).map(([id, asset]) => {
		const cues = (["music", "sfx"] as const).flatMap((kind) =>
			Object.entries(data[kind])
				.filter(([, cue]) => cue.asset === id)
				.map(([name]) => `\`${kind}.${name}\``),
		);
		const esc = (s: string) => s.replaceAll("|", "\\|");
		return `| \`public/${asset.src}\` | ${cues.join(", ")} | ${esc(asset.source.file)} | [Source](${asset.source.page}) · [Download](${asset.source.download}) | ${asset.processing} |`;
	});
	return [
		"<!-- audio-catalogue:start -->",
		"| Bundled placeholder | Cue(s) | Original source file / archive member | Source | Processing |",
		"|---|---|---|---|---|",
		...rows,
		"<!-- audio-catalogue:end -->",
	].join("\n");
}

/** Runs during the normal build. No network or audio utilities required. */
export function validateAudioAssets(
	root = process.cwd(),
	data: AudioManifest = manifest,
): string[] {
	const errors: string[] = [];
	const used = new Set<string>();
	for (const kind of ["music", "sfx"] as const)
		for (const [id, cue] of Object.entries(data[kind])) {
			const asset = data.assets[cue.asset];
			if (!asset) {
				errors.push(`${kind}.${id}: missing asset ${cue.asset}`);
				continue;
			}
			used.add(cue.asset);
			for (const [field, value] of Object.entries(cue)) {
				if (typeof value === "number" && (!Number.isFinite(value) || value < 0))
					errors.push(`${kind}.${id}: invalid ${field}`);
			}
			if (cue.pitch !== undefined && cue.pitch <= 0)
				errors.push(`${kind}.${id}: invalid pitch`);
			if ((cue.offset ?? 0) + (cue.duration ?? 0) > asset.duration)
				errors.push(`${kind}.${id}: excerpt exceeds file duration`);
		}
	if (!data.sfx[data.fallbackSfx]) errors.push("Missing fallback SFX cue");
	const paths = new Set<string>();
	for (const [id, asset] of Object.entries(data.assets)) {
		if (!used.has(id)) errors.push(`${id}: unused audio asset`);
		if (!asset.src.startsWith("audio/") || asset.src.includes("..")) {
			errors.push(`${id}: invalid local path`);
			continue;
		}
		paths.add(asset.src);
		if (!(asset.duration > 0)) errors.push(`${id}: invalid duration`);
		if (
			!asset.title ||
			!asset.game ||
			!asset.source.file ||
			!asset.source.page ||
			!asset.source.download
		)
			errors.push(`${id}: missing provenance`);
		try {
			const bytes = readFileSync(resolve(root, "public", asset.src));
			if (createHash("sha256").update(bytes).digest("hex") !== asset.sha256)
				errors.push(`${id}: file checksum mismatch`);
		} catch {
			errors.push(`${id}: missing file ${asset.src}`);
		}
	}
	try {
		for (const file of readdirSync(resolve(root, "public/audio"), {
			recursive: true,
			withFileTypes: true,
		})) {
			if (!file.isFile()) continue;
			const name = relative(
				resolve(root, "public"),
				resolve(file.parentPath, file.name),
			).replaceAll("\\", "/");
			if (!paths.has(name)) errors.push(`Uncatalogued audio file: ${name}`);
		}
		if (
			!readFileSync(resolve(root, "README.md"), "utf8").includes(
				audioCatalogue(data),
			)
		)
			errors.push("README audio catalogue is stale: run npm run audio:catalog");
	} catch {
		errors.push("Missing audio directory or README");
	}
	return errors;
}
