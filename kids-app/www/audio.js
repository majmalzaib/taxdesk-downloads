'use strict';
/*
 * Sound engine for Little Stars.
 * Everything is synthesised with the Web Audio API, so there are no audio
 * files to download and the app works fully offline.
 */
const Sound = (() => {
  let ctx = null, master, musicBus, sfxBus, noiseBuf;
  let musicOn = false, step = 0, nextTime = 0, timer = null;
  const MUSIC_LEVEL = 0.32, DUCK_LEVEL = 0.1;

  const SEMI = { C: 0, 'C#': 1, D: 2, 'D#': 3, E: 4, F: 5, 'F#': 6, G: 7, 'G#': 8, A: 9, 'A#': 10, B: 11 };
  const freq = (name) => {
    const m = /^([A-G]#?)(\d)$/.exec(name);
    const midi = (+m[2] + 1) * 12 + SEMI[m[1]];
    return 440 * Math.pow(2, (midi - 69) / 12);
  };

  function init() {
    if (ctx) { if (ctx.state !== 'running') ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    const comp = ctx.createDynamicsCompressor();
    comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.9; master.connect(comp);
    musicBus = ctx.createGain(); musicBus.gain.value = 0; musicBus.connect(master);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.75; sfxBus.connect(master);
    noiseBuf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * 0.5), ctx.sampleRate);
    const d = noiseBuf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    // Unlock audio on iOS by playing one silent sample inside the tap.
    const s = ctx.createBufferSource();
    s.buffer = ctx.createBuffer(1, 1, 22050);
    s.connect(ctx.destination); s.start(0);
  }
  const ok = () => !!ctx;
  const now = () => ctx.currentTime;

  function osc(f, t, dur, { type = 'sine', vol = 0.4, attack = 0.005, dest = sfxBus, endF = 0 } = {}) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f, t);
    if (endF) o.frequency.exponentialRampToValueAtTime(endF, t + dur);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(dest);
    o.start(t); o.stop(t + dur + 0.03);
    return o;
  }

  function noise(t, dur, { vol = 0.4, type = 'highpass', f = 1000, q = 1, dest = sfxBus } = {}) {
    const s = ctx.createBufferSource(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
    s.buffer = noiseBuf;
    fl.type = type; fl.frequency.value = f; fl.Q.value = q;
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(fl); fl.connect(g); g.connect(dest);
    s.start(t); s.stop(t + dur + 0.03);
  }

  /* ---------- instruments for the music room ---------- */
  const INSTR = {
    xylo(f, t) {
      osc(f, t, 0.9, { vol: 0.45 });
      osc(f * 2, t, 0.35, { vol: 0.1 });
      osc(f * 4, t, 0.18, { vol: 0.1 });
    },
    piano(f, t) {
      osc(f, t, 1.5, { type: 'triangle', vol: 0.42, attack: 0.003 });
      osc(f * 2, t, 0.7, { vol: 0.12 });
      osc(f * 3, t, 0.3, { vol: 0.05 });
    },
    robot(f, t) {
      const o = ctx.createOscillator(), fl = ctx.createBiquadFilter(), g = ctx.createGain();
      o.type = 'square'; o.frequency.value = f;
      fl.type = 'lowpass';
      fl.frequency.setValueAtTime(3200, t);
      fl.frequency.exponentialRampToValueAtTime(400, t + 0.4);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.16, t + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      o.connect(fl); fl.connect(g); g.connect(sfxBus);
      o.start(t); o.stop(t + 0.5);
    },
  };

  function playNote(name, instr = 'xylo', when = 0) {
    if (!ok()) return;
    (INSTR[instr] || INSTR.xylo)(freq(name), now() + when);
  }

  /* ---------- sound effects ---------- */
  const fx = {
    tap() { if (ok()) osc(700, now(), 0.08, { vol: 0.22 }); },
    correct() {
      if (!ok()) return;
      const t = now();
      ['C5', 'E5', 'G5', 'C6'].forEach((n, i) => osc(freq(n), t + i * 0.08, 0.32, { type: 'triangle', vol: 0.3 }));
    },
    wrong() {
      if (!ok()) return;
      const t = now();
      osc(freq('G4'), t, 0.18, { type: 'triangle', vol: 0.25 });
      osc(freq('D#4'), t + 0.18, 0.32, { type: 'triangle', vol: 0.25 });
    },
    pop() {
      if (!ok()) return;
      const t = now();
      osc(900, t, 0.12, { vol: 0.4, endF: 150 });
      noise(t, 0.08, { vol: 0.35, f: 2000 });
    },
    flip() { if (ok()) osc(380, now(), 0.15, { vol: 0.2, endF: 900 }); },
    boing() {
      if (!ok()) return;
      const t = now(), o = osc(180, t, 0.55, { vol: 0.4 });
      o.frequency.exponentialRampToValueAtTime(560, t + 0.12);
      o.frequency.exponentialRampToValueAtTime(240, t + 0.5);
    },
    sparkle() {
      if (!ok()) return;
      const t = now();
      ['C6', 'E6', 'G6', 'C7', 'G6', 'E6'].forEach((n, i) => osc(freq(n), t + i * 0.05, 0.25, { vol: 0.12 }));
    },
    fanfare() {
      if (!ok()) return;
      const t = now();
      [['G4', 0, 0.15], ['C5', 0.15, 0.15], ['E5', 0.3, 0.15], ['G5', 0.45, 0.3], ['E5', 0.75, 0.15], ['G5', 0.9, 0.7]]
        .forEach(([n, s, d]) => {
          osc(freq(n), t + s, d + 0.15, { type: 'square', vol: 0.08 });
          osc(freq(n), t + s, d + 0.25, { type: 'triangle', vol: 0.28 });
        });
    },
    count(i) {
      if (!ok()) return;
      const scale = ['C5', 'D5', 'E5', 'G5', 'A5', 'C6', 'D6', 'E6', 'G6', 'A6'];
      osc(freq(scale[i % scale.length]), now(), 0.3, { type: 'triangle', vol: 0.3 });
    },
    drum() {
      if (!ok()) return;
      const t = now();
      osc(160, t, 0.4, { vol: 0.9, endF: 45 });
      noise(t, 0.03, { vol: 0.2, f: 3000 });
    },
    clap() {
      if (!ok()) return;
      const t = now();
      [0, 0.012, 0.026].forEach((d) => noise(t + d, 0.1, { vol: 0.6, type: 'bandpass', f: 1400, q: 1.2 }));
    },
    bell() {
      if (!ok()) return;
      const t = now();
      osc(1046, t, 1.4, { vol: 0.3 });
      osc(1046 * 2.76, t, 0.6, { vol: 0.1 });
      osc(1046 * 5.4, t, 0.3, { vol: 0.05 });
    },
  };

  /* ---------- background music: an original, cheerful loop ---------- */
  const BPM = 112, STEP = 60 / BPM / 2; // eighth notes
  const MELODY = (
    'E5 - G5 E5 C5 - D5 E5  C5 - E5 C5 A4 - B4 C5  A4 - C5 A4 F4 - G4 A4  B4 - D5 B4 G4 A4 B4 D5 ' +
    'G5 - E5 G5 C6 - G5 E5  A5 - E5 C5 A4 - C5 E5  F5 - C5 A4 C5 - F5 A5  G5 F5 E5 D5 C5 - - -'
  ).trim().split(/\s+/);
  const CHORDS = [
    { bass: 'C3', notes: ['C4', 'E4', 'G4'] },
    { bass: 'A2', notes: ['A3', 'C4', 'E4'] },
    { bass: 'F2', notes: ['F3', 'A3', 'C4'] },
    { bass: 'G2', notes: ['G3', 'B3', 'D4'] },
  ];

  function playStep(s, t) {
    const bar = Math.floor(s / 8), b = s % 8, m = MELODY[s];
    if (m && m !== '-') {
      osc(freq(m), t, STEP * 1.8, { type: 'triangle', vol: 0.22, dest: musicBus });
      osc(freq(m) * 2, t, STEP, { vol: 0.03, dest: musicBus });
    }
    const ch = CHORDS[bar % 4];
    if (b === 0 || b === 4) osc(freq(ch.bass), t, STEP * 1.8, { vol: 0.32, dest: musicBus });
    if (b === 2 || b === 6) ch.notes.forEach((n) => osc(freq(n), t, STEP * 1.2, { vol: 0.06, dest: musicBus }));
    if (b % 2 === 1) noise(t, 0.03, { vol: 0.035, f: 7000, dest: musicBus });
  }

  function schedule() {
    while (nextTime < ctx.currentTime + 0.15) {
      playStep(step, nextTime);
      step = (step + 1) % MELODY.length;
      nextTime += STEP;
    }
  }

  function startMusic() {
    if (!ok()) return;
    musicOn = true;
    musicBus.gain.cancelScheduledValues(now());
    musicBus.gain.setTargetAtTime(MUSIC_LEVEL, now(), 0.3);
    if (!timer) {
      step = 0;
      nextTime = now() + 0.05;
      timer = setInterval(schedule, 40);
    }
  }

  function stopMusic() {
    musicOn = false;
    if (timer) { clearInterval(timer); timer = null; }
    if (ok()) musicBus.gain.setTargetAtTime(0, now(), 0.1);
  }

  // Lower the music while the voice is talking.
  function duck(on) {
    if (!ok() || !musicOn) return;
    musicBus.gain.setTargetAtTime(on ? DUCK_LEVEL : MUSIC_LEVEL, now(), 0.12);
  }

  function suspend() { if (ok()) ctx.suspend(); }
  function resume() { if (ok()) ctx.resume(); }

  return { init, freq, playNote, startMusic, stopMusic, duck, suspend, resume, ...fx };
})();
