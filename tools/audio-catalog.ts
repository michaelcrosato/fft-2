import { readFileSync, writeFileSync } from "node:fs";
import { audioCatalogue } from "./audio-assets";

const path = new URL("../README.md", import.meta.url);
const readme = readFileSync(path, "utf8");
const marker =
	/<!-- audio-catalogue:start -->[\s\S]*?<!-- audio-catalogue:end -->/;
if (!marker.test(readme))
	throw new Error("README is missing the audio catalogue markers");
writeFileSync(path, readme.replace(marker, audioCatalogue()));
console.log("Updated README audio catalogue from src/audio/manifest.json");
