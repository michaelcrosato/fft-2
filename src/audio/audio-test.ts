/**
 * Dev page script for audio-test.html: audition every cue of the original score and every
 * sound effect, and measure any of them offline.
 */
import { OFFLINE_LEAD, audio, renderOffline } from './audio';
import { lengths } from './sequencer';

const $ = <T extends HTMLElement = HTMLElement>(id: string) => document.getElementById(id) as T;
const fmt = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;

audio.attachUnlock();
// handy for poking at the engine from the devtools console
(window as unknown as { audio: typeof audio; renderOffline: typeof renderOffline }).audio = audio;
(window as unknown as { renderOffline: typeof renderOffline; OFFLINE_LEAD: number }).renderOffline = renderOffline;
(window as unknown as { OFFLINE_LEAD: number }).OFFLINE_LEAD = OFFLINE_LEAD;

const banner = $('unlock');
const markUnlocked = () => {
  if (audio.unlocked) { banner.textContent = 'Audio is running.'; banner.classList.add('ok'); }
  else if (!audio.available) banner.textContent = 'Web Audio is not available in this browser: the engine runs in silent no-op mode.';
};
banner.addEventListener('click', () => void audio.unlock().then(markUnlocked));
document.addEventListener('pointerdown', () => setTimeout(markUnlocked, 50), { capture: true });

// ---- mixer ---------------------------------------------------------------
const vols = audio.getVolumes();
const bindVol = (id: string, key: 'master' | 'music' | 'sfx') => {
  const el = $<HTMLInputElement>(id);
  el.value = String(vols[key]);
  el.addEventListener('input', () => audio.setVolumes({ [key]: +el.value }));
};
bindVol('vMaster', 'master');
bindVol('vMusic', 'music');
bindVol('vSfx', 'sfx');
$('duck').addEventListener('click', () => audio.duck(0.7, 2));
const lowEl = $<HTMLInputElement>('low');
lowEl.addEventListener('change', () => audio.setQuality(lowEl.checked ? 'low' : 'high'));

const fadeEl = $<HTMLInputElement>('fade');
fadeEl.addEventListener('input', () => ($('fadeV').textContent = `${(+fadeEl.value).toFixed(1)}s`));
$('stop').addEventListener('click', () => audio.stopMusic(+fadeEl.value));

/** Peak and RMS of a rendered buffer, in dBFS. */
function levels(b: AudioBuffer) {
  let peak = 0, sum = 0, n = 0;
  for (let c = 0; c < b.numberOfChannels; c++) {
    const d = b.getChannelData(c);
    for (let i = 0; i < d.length; i++) { const a = Math.abs(d[i]); if (a > peak) peak = a; sum += d[i] * d[i]; n++; }
  }
  const db = (x: number) => (x > 0 ? 20 * Math.log10(x) : -Infinity);
  return `peak ${db(peak).toFixed(1)} dB · rms ${db(Math.sqrt(sum / Math.max(1, n))).toFixed(1)} dB`;
}

// ---- score -------------------------------------------------------------------
const tracksEl = $('tracks');
const cards = new Map<string, HTMLElement>();
for (const id of audio.trackIds) {
  const song = audio.song(id)!;
  const { intro, body } = lengths(song);
  const card = document.createElement('div');
  card.className = 'card';
  const len = document.createElement('span');
  len.className = 'len';
  len.textContent = `${intro ? `${fmt(intro)} + ` : ''}${fmt(body)} · ${song.once ? 'once' : 'loop'}`;
  const idEl = document.createElement('div'); idEl.className = 'id'; idEl.textContent = id;
  const name = document.createElement('div'); name.className = 'name'; name.textContent = song.title;
  const d = document.createElement('div'); d.className = 'd'; d.textContent = `${song.key} · ${song.bpm} bpm · ${song.room}`;
  const meter = document.createElement('div'); meter.className = 'd';
  const measure = document.createElement('button');
  measure.textContent = 'Measure';
  measure.addEventListener('click', (e) => {
    e.stopPropagation();
    meter.textContent = 'rendering…';
    void renderOffline('music', id, Math.min(60, intro + body)).then((b) => { meter.textContent = levels(b); }, (err) => { meter.textContent = String(err); });
  });
  card.append(len, idEl, name, d, measure, meter);
  card.addEventListener('click', () => { void audio.unlock().then(markUnlocked); audio.playMusic(id, { fade: +fadeEl.value, restart: true }); });
  tracksEl.appendChild(card);
  cards.set(id, card);
}

// ---- sfx -------------------------------------------------------------------
const pitchEl = $<HTMLInputElement>('pitch');
const panEl = $<HTMLInputElement>('pan');
const svolEl = $<HTMLInputElement>('svol');
pitchEl.addEventListener('input', () => ($('pitchV').textContent = (+pitchEl.value).toFixed(2)));
panEl.addEventListener('input', () => ($('panV').textContent = (+panEl.value).toFixed(2)));
const play = (id: string, extra: { pitch?: number } = {}) => {
  void audio.unlock().then(markUnlocked);
  audio.sfx(id, { pitch: extra.pitch ?? +pitchEl.value, pan: +panEl.value, volume: +svolEl.value });
};
const sfxEl = $('sfx');
for (const id of [...audio.sfxIds, 'unknownId']) {
  const b = document.createElement('button');
  b.textContent = id;
  b.addEventListener('click', () => play(id));
  sfxEl.appendChild(b);
}
$('storm').addEventListener('click', () => {
  const ids = ['hit', 'swing', 'fire', 'ice', 'bolt', 'heal', 'gil', 'explosion', 'magic', 'block'];
  for (let i = 0; i < 60; i++) setTimeout(() => play(ids[i % ids.length], { pitch: 0.8 + Math.random() * 0.5 }), i * 25);
});

// ---- now playing + meter -------------------------------------------------------
const meter = $<HTMLCanvasElement>('meter');
const g = meter.getContext('2d');
let buf: Uint8Array | null = null;
const tick = () => {
  const d = audio.debug();
  const id = d.track;
  for (const [k, c] of cards) c.classList.toggle('on', k === id);
  if (id) {
    $('nowTitle').textContent = audio.song(id)?.title ?? id;
    $('nowMeta').textContent = `${id} · ${d.section ?? '-'} · ${fmt(d.time)} / ${fmt(d.length)} · loops ${d.loops} · players ${d.musicVoices} · sfx voices ${d.sfxVoices} · ${d.state}`;
    $('barFill').style.width = `${Math.min(100, (d.time / Math.max(1, d.length)) * 100)}%`;
  } else {
    $('nowTitle').textContent = audio.currentMusic ? `${audio.currentMusic} (waiting for unlock)` : 'Silence';
    $('nowMeta').textContent = `state ${d.state} · sfx voices ${d.sfxVoices}${d.error ? ` · ${d.error}` : ''}`;
    $('barFill').style.width = '0';
  }
  const an = audio.analyser;
  if (g && an) {
    if (!buf || buf.length !== an.fftSize) buf = new Uint8Array(an.fftSize);
    an.getByteTimeDomainData(buf as Uint8Array<ArrayBuffer>);
    const w = meter.width, h = meter.height;
    g.clearRect(0, 0, w, h);
    g.strokeStyle = '#c9a24a';
    g.lineWidth = 2;
    g.beginPath();
    for (let i = 0; i < buf.length; i++) { const x = (i / (buf.length - 1)) * w; const y = (buf[i] / 255) * h; if (i) g.lineTo(x, y); else g.moveTo(x, y); }
    g.stroke();
  }
  requestAnimationFrame(tick);
};
requestAnimationFrame(tick);
