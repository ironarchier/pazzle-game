// Quiet Pages: original score and oscillator synthesis created for this project.
// No recordings, samples, soundfonts, reference songs or artist-style prompts.
import { mkdirSync, writeFileSync } from 'node:fs';
import { Mp3Encoder } from '@breezystack/lamejs';

const sampleRate = 32000;
const bars = 32;
const frames = Math.round((bars * 4 * 60 / 72) * sampleRate / 1152) * 1152;
const duration = frames / sampleRate;
const beat = duration / (bars * 4);
const left = new Float64Array(frames), right = new Float64Array(frames);
const hz = note => 440 * 2 ** ((note - 69) / 12);
const tau = Math.PI * 2;
const chords = [
  [48, 55, 59, 62, 64], // Cmaj9
  [43, 55, 59, 62, 64], // G6
  [45, 52, 55, 59, 60], // Am9
  [41, 53, 57, 60, 64], // Fmaj7
  [50, 57, 60, 64, 65], // Dm9
  [40, 55, 60, 62, 64], // Cadd9/E
  [41, 53, 55, 60, 64], // Fmaj9
  [43, 55, 60, 62, 69], // Gsus4(add9)
];

function voice(note, start, length, gain, pan, kind) {
  const frequency = hz(note);
  const first = Math.round(start * sampleRate);
  const count = Math.round(length * sampleRate);
  const gainL = Math.sqrt((1 - pan) / 2) * gain;
  const gainR = Math.sqrt((1 + pan) / 2) * gain;
  for (let i = 0; i < count; i++) {
    const t = i / sampleRate;
    const phase = tau * frequency * t;
    let a, b, envelope;
    if (kind === 'pad') {
      const attack = Math.min(1, t / 2.2);
      const release = Math.min(1, (length - t) / 4.5);
      envelope = Math.sin(attack * Math.PI / 2) ** 2 * Math.sin(release * Math.PI / 2) ** 2;
      envelope *= 0.87 + 0.13 * Math.sin(tau * t / 11 + note);
      a = 0.75 * Math.sin(phase) + 0.16 * Math.sin(phase * 1.0007 + 0.2) + 0.07 * Math.sin(phase * 2);
      b = 0.75 * Math.sin(phase) + 0.16 * Math.sin(phase * 0.9993 - 0.2) + 0.07 * Math.sin(phase * 2);
    } else {
      envelope = (1 - Math.exp(-t / 0.035)) * Math.exp(-t / 2.25);
      envelope *= Math.min(1, (length - t) / 0.4);
      a = Math.sin(phase) + 0.19 * Math.sin(phase * 2.002) * Math.exp(-t / 0.9) + 0.035 * Math.sin(phase * 3.001) * Math.exp(-t / 0.45);
      b = a;
    }
    const index = (first + i) % frames; // Wrap tails onto the next repetition.
    left[index] += a * envelope * gainL;
    right[index] += b * envelope * gainR;
  }
}

chords.forEach((chord, section) => {
  const start = section * 16 * beat;
  chord.forEach((note, part) => voice(note, start + part * 0.13, 16 * beat + 4.5, part === 0 ? 0.032 : 0.022, (part - 2) * 0.22, 'pad'));
  for (let bar = 0; bar < 4; bar++) {
    // Sparse, gently changing figures; the harmony carries the track.
    const pattern = [[2, 4], [3, 1], [4, 2, 3], [1, 3]][bar];
    const positions = pattern.length === 3 ? [0.2, 1.9, 3.1] : [0.25, 2.5];
    pattern.forEach((part, index) => {
      const note = chord[part] + (chord[part] < 60 ? 12 : 0);
      voice(note, start + (bar * 4 + positions[index]) * beat, 7, 0.075 + ((section + bar + index) % 3) * 0.008, Math.sin(section * 1.7 + bar + index) * 0.28, 'keys');
    });
  }
});

// Diffuse stereo room made entirely from delayed oscillator signals.
const dryL = left.slice(), dryR = right.slice();
const taps = [0.137, 0.223, 0.347, 0.463, 0.617, 0.811, 1.037, 1.293, 1.619, 2.017, 2.431, 2.873];
taps.forEach((seconds, tap) => {
  const delay = Math.round(seconds * sampleRate);
  const gain = 0.085 * Math.exp(-seconds / 1.4);
  const sourceL = tap % 2 ? dryL : dryR, sourceR = tap % 2 ? dryR : dryL;
  for (let i = 0; i < frames; i++) {
    const source = i >= delay ? i - delay : frames + i - delay;
    left[i] += sourceL[source] * gain;
    right[i] += sourceR[source] * gain;
  }
});

// Warm low-pass, remove DC, leave headroom and soften MP3 loop padding.
let peak = 0, sum = 0;
for (const channel of [left, right]) {
  let low = channel[frames - 1], dc = 0;
  for (let i = 0; i < frames; i++) {
    low += 0.44 * (channel[i] - low);
    dc += 0.0009 * (low - dc);
    const fade = Math.min(1, i / (sampleRate * 0.16), (frames - 1 - i) / (sampleRate * 0.16));
    channel[i] = (low - dc) * Math.sin(fade * Math.PI / 2) ** 2;
    peak = Math.max(peak, Math.abs(channel[i]));
  }
}
const scale = 0.6 / peak;
const pcmL = new Int16Array(frames), pcmR = new Int16Array(frames);
for (let i = 0; i < frames; i++) {
  pcmL[i] = Math.round(left[i] * scale * 32767);
  pcmR[i] = Math.round(right[i] * scale * 32767);
  sum += ((left[i] * scale) ** 2 + (right[i] * scale) ** 2) / 2;
}

mkdirSync('output/audio', { recursive: true });
mkdirSync('public/music', { recursive: true });
const wav = Buffer.alloc(44 + frames * 4);
wav.write('RIFF', 0); wav.writeUInt32LE(wav.length - 8, 4); wav.write('WAVEfmt ', 8);
wav.writeUInt32LE(16, 16); wav.writeUInt16LE(1, 20); wav.writeUInt16LE(2, 22);
wav.writeUInt32LE(sampleRate, 24); wav.writeUInt32LE(sampleRate * 4, 28);
wav.writeUInt16LE(4, 32); wav.writeUInt16LE(16, 34); wav.write('data', 36);
wav.writeUInt32LE(frames * 4, 40);
for (let i = 0; i < frames; i++) { wav.writeInt16LE(pcmL[i], 44 + i * 4); wav.writeInt16LE(pcmR[i], 46 + i * 4); }
writeFileSync('output/audio/quiet-pages-master.wav', wav);
const encoder = new Mp3Encoder(2, sampleRate, 96);
const chunks = [];
for (let i = 0; i < frames; i += 1152) {
  const encoded = encoder.encodeBuffer(pcmL.subarray(i, i + 1152), pcmR.subarray(i, i + 1152));
  if (encoded.length) chunks.push(Buffer.from(encoded));
}
chunks.push(Buffer.from(encoder.flush()));
const mp3 = Buffer.concat(chunks);
writeFileSync('public/music/quiet-pages.mp3', mp3);
const report = { title: 'Quiet Pages', durationSeconds: duration, bpm: 72, bars, sampleRate, channels: 2, bitrateKbps: 96, peak: 0.6, rmsDbFS: 10 * Math.log10(sum / frames), bytes: mp3.length, externalSamples: false };
writeFileSync('output/audio/quiet-pages-report.json', JSON.stringify(report, null, 2) + '\n');
console.log(report);
