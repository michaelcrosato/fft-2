/**
 * Dev page script for audio-test.html: audition every track and sound effect.
 */
import { audio } from "./audio";
import { manifest } from "./manifest";

const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
	document.getElementById(id) as T;
const fmt = (s: number) =>
	`${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

audio.attachUnlock();
// handy for poking at the engine from the devtools console
(window as unknown as { audio: typeof audio }).audio = audio;

const banner = $("unlock");
const markUnlocked = () => {
	if (audio.unlocked) {
		banner.textContent = "Audio is running.";
		banner.classList.add("ok");
	} else if (!audio.available) {
		banner.textContent =
			"Web Audio is not available in this browser: the engine runs in silent no-op mode.";
	}
};
banner.addEventListener("click", () => void audio.unlock().then(markUnlocked));
document.addEventListener("pointerdown", () => setTimeout(markUnlocked, 50), {
	capture: true,
});

// ---- mixer ---------------------------------------------------------------
const vols = audio.getVolumes();
const bindVol = (id: string, key: "master" | "music" | "sfx") => {
	const el = $<HTMLInputElement>(id);
	el.value = String(vols[key]);
	el.addEventListener("input", () => audio.setVolumes({ [key]: +el.value }));
};
bindVol("vMaster", "master");
bindVol("vMusic", "music");
bindVol("vSfx", "sfx");
$("duck").addEventListener("click", () => audio.duck(0.7, 2));

const fadeEl = $<HTMLInputElement>("fade");
fadeEl.addEventListener(
	"input",
	() => ($("fadeV").textContent = `${(+fadeEl.value).toFixed(1)}s`),
);
$("stop").addEventListener("click", () => audio.stopMusic(+fadeEl.value));

// ---- tracks ----------------------------------------------------------------
const tracksEl = $("tracks");
const cards = new Map<string, HTMLElement>();
for (const id of audio.trackIds) {
	const cue = manifest.music[id];
	const def = manifest.assets[cue.asset];
	const card = document.createElement("div");
	card.className = "card";
	const loopInfo = cue.loop ? "loop" : "once";
	card.innerHTML = `<span class="len">${fmt(def.duration)} · ${loopInfo}</span><div class="id"></div><div class="name"></div><div class="d"></div>`;
	(card.querySelector(".id") as HTMLElement).textContent = id;
	(card.querySelector(".name") as HTMLElement).textContent = def.title;
	(card.querySelector(".d") as HTMLElement).textContent = def.game;
	card.addEventListener("click", () => {
		void audio.unlock().then(markUnlocked);
		audio.playMusic(id, { fade: +fadeEl.value, restart: true });
	});
	tracksEl.appendChild(card);
	cards.set(id, card);
}

// ---- sfx -------------------------------------------------------------------
const pitchEl = $<HTMLInputElement>("pitch");
const panEl = $<HTMLInputElement>("pan");
const svolEl = $<HTMLInputElement>("svol");
pitchEl.addEventListener(
	"input",
	() => ($("pitchV").textContent = (+pitchEl.value).toFixed(2)),
);
panEl.addEventListener(
	"input",
	() => ($("panV").textContent = (+panEl.value).toFixed(2)),
);
const play = (id: string, extra: { pitch?: number } = {}) => {
	void audio.unlock().then(markUnlocked);
	audio.sfx(id, {
		pitch: extra.pitch ?? +pitchEl.value,
		pan: +panEl.value,
		volume: +svolEl.value,
	});
};
const sfxEl = $("sfx");
for (const id of [...audio.sfxIds, "unknownId"]) {
	const b = document.createElement("button");
	b.textContent = id;
	b.addEventListener("click", () => play(id));
	sfxEl.appendChild(b);
}
$("blips").addEventListener("click", () => {
	const text = "The tale the Church burned begins here.";
	[...text].forEach((ch, i) => {
		setTimeout(
			() =>
				ch !== " " && play("textBlip", { pitch: 0.95 + Math.random() * 0.1 }),
			i * 38,
		);
	});
});
$("storm").addEventListener("click", () => {
	const ids = [
		"hit",
		"swing",
		"fire",
		"ice",
		"bolt",
		"heal",
		"gil",
		"explosion",
		"magic",
		"block",
	];
	for (let i = 0; i < 60; i++)
		setTimeout(
			() => play(ids[i % ids.length], { pitch: 0.8 + Math.random() * 0.5 }),
			i * 25,
		);
});

// ---- now playing + meter -------------------------------------------------------
const meter = $<HTMLCanvasElement>("meter");
const g = meter.getContext("2d");
let buf: Uint8Array | null = null;
const tick = () => {
	const d = audio.debug();
	const id = d.track;
	for (const [k, c] of cards) c.classList.toggle("on", k === id);
	if (id) {
		const def = manifest.assets[manifest.music[id].asset];
		$("nowTitle").textContent = def.title;
		$("nowMeta").textContent =
			`${id} · section ${d.section ?? "-"} · ${fmt(d.time)} / ${fmt(d.length)} · loops ${d.loops} · voices ${d.musicVoices}+${d.sfxVoices} · ${d.state}`;
		$("barFill").style.width =
			`${Math.min(100, (d.time / Math.max(1, d.length)) * 100)}%`;
		$("barLoop").style.left = "0%";
	} else {
		$("nowTitle").textContent = audio.currentMusic
			? `${audio.currentMusic} (${audio.unlocked ? "loading" : "waiting for unlock"})`
			: "Silence";
		$("nowMeta").textContent =
			`state ${d.state} · sfx voices ${d.sfxVoices}${d.error ? ` · ${d.error}` : ""}`;
		$("barFill").style.width = "0";
	}
	const an = audio.analyser;
	if (g && an) {
		if (!buf || buf.length !== an.fftSize) buf = new Uint8Array(an.fftSize);
		an.getByteTimeDomainData(buf as Uint8Array<ArrayBuffer>);
		const w = meter.width;
		const h = meter.height;
		g.clearRect(0, 0, w, h);
		g.strokeStyle = "#c9a24a";
		g.lineWidth = 2;
		g.beginPath();
		for (let i = 0; i < buf.length; i++) {
			const x = (i / (buf.length - 1)) * w;
			const y = (buf[i] / 255) * h;
			if (i) g.lineTo(x, y);
			else g.moveTo(x, y);
		}
		g.stroke();
	}
	requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
