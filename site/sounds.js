// Sound effects, synthesized with the Web Audio API. No audio files: every
// sound is a short recipe of oscillators and gain envelopes rendered when it
// is played. Loaded on every page as the global PetsSounds.
//
//   play(name)                   'hatch' | 'send' | 'failed' | 'tick'; returns the length in ms
//   react(pet, text, tone, state) the pet's chatter voice plus a cadence for the tone
//   enabled() / setEnabled(bool) the mute switch, remembered in localStorage
//   toggle(container)            builds the mute button in a header
//
// Browsers only start audio after a user gesture, so the AudioContext is
// created lazily and every caller runs inside a click or submit handler, or
// after one happened in this tab.
(function () {
  'use strict';
  const KEY = 'pets-sound';
  const VOLUME = 0.6; // master, deliberately low: this is played at work

  // Voice per pet kind: base pitch in Hz and waveform. Small animals sit
  // high, big ones low; the blip tempo follows the pitch. Custom pets get a
  // pitch from a hash of their id, so each one keeps the same voice.
  const VOICES = {
    alpaca: [560, 'triangle'], bear: [240, 'triangle'], cat: [760, 'triangle'],
    crocodile: [220, 'square'], dog: [480, 'triangle'], dolphin: [1100, 'sine'],
    duck: [880, 'square'], elephant: [180, 'triangle'], fox: [700, 'triangle'],
    giraffe: [330, 'triangle'], panda: [420, 'triangle'], pig: [600, 'square'],
    shark: [200, 'square'], tiger: [300, 'triangle'], wolf: [380, 'triangle'],
    zebra: [440, 'triangle'],
  };

  let ctx = null;
  function context() {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    if (!ctx) ctx = new AC();
    if (ctx.state === 'suspended') ctx.resume().catch(() => {});
    return ctx;
  }

  function enabled() {
    try { return localStorage.getItem(KEY) !== 'off'; } catch (e) { return true; }
  }
  function setEnabled(on) {
    try { localStorage.setItem(KEY, on ? 'on' : 'off'); } catch (e) { /* private mode: lasts for this page only */ }
    document.dispatchEvent(new CustomEvent('pets-sound', { detail: on }));
  }

  // One note. freq slides to `to` over the note when given. Times in seconds.
  function tone(ac, o) {
    const osc = ac.createOscillator();
    const gain = ac.createGain();
    osc.type = o.type || 'triangle';
    osc.frequency.setValueAtTime(o.freq, o.at);
    if (o.to) osc.frequency.exponentialRampToValueAtTime(o.to, o.at + o.dur);
    gain.gain.setValueAtTime(0.0001, o.at);
    gain.gain.exponentialRampToValueAtTime(o.peak * VOLUME, o.at + (o.attack || 0.01));
    gain.gain.exponentialRampToValueAtTime(0.0001, o.at + o.dur);
    osc.connect(gain).connect(ac.destination);
    osc.start(o.at);
    osc.stop(o.at + o.dur + 0.02);
  }

  const RECIPES = {
    // Ascending major chord with a top note: something new arrived.
    hatch(ac, t) {
      [523, 659, 784, 1047].forEach((f, i) => tone(ac, { freq: f, at: t + i * 0.09, dur: 0.45, type: 'triangle', peak: 0.22 }));
      tone(ac, { freq: 1568, at: t + 0.36, dur: 0.6, type: 'sine', peak: 0.1 });
      return 1000;
    },
    // Barely audible tick on submit.
    send(ac, t) {
      tone(ac, { freq: 1200, at: t, dur: 0.05, type: 'sine', peak: 0.12 });
      return 60;
    },
    // Soft low thud, sliding down: the pet could not react.
    failed(ac, t) {
      tone(ac, { freq: 160, to: 90, at: t, dur: 0.28, type: 'triangle', peak: 0.25, attack: 0.02 });
      return 300;
    },
    // Confirmation when sound is switched on.
    tick(ac, t) {
      tone(ac, { freq: 880, at: t, dur: 0.08, type: 'sine', peak: 0.15 });
      return 100;
    },
  };

  function play(name) {
    if (!enabled() || !RECIPES[name]) return 0;
    const ac = context();
    if (!ac) return 0;
    try { return RECIPES[name](ac, ac.currentTime); } catch (e) { return 0; }
  }

  function hash(s) {
    let h = 2166136261;
    for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  function voiceFor(pet) {
    const v = VOICES[pet.kind];
    if (v) return { freq: v[0], type: v[1] };
    const h = hash(String(pet.id || pet.name || ''));
    return { freq: 200 + (h % 700), type: ['triangle', 'square', 'sine'][h % 3] };
  }

  // The pet "speaks": a burst of short blips around its base pitch, like a
  // cartoon voice. The tone bends the burst: positive drifts up, negative
  // drifts down and drags; low energy slows it down. A short cadence after
  // the burst says which way things went.
  function react(pet, text, tone_, state) {
    if (!enabled()) return 0;
    const ac = context();
    if (!ac) return 0;
    try {
      const voice = voiceFor(pet);
      const count = Math.max(5, Math.min(12, Math.round(String(text || '').length / 25)));
      let step = (0.045 + 12 / voice.freq) * (tone_ === 'negative' ? 1.35 : 1);
      const energy = state && typeof state.energy === 'number' ? state.energy : 70;
      if (energy < 50) step *= 1 + (50 - energy) / 200;
      const drift = tone_ === 'positive' ? 3 : tone_ === 'negative' ? -4 : 0; // semitones over the burst
      let seed = hash(String(pet.id || '') + count);
      const t0 = ac.currentTime;
      for (let i = 0; i < count; i++) {
        seed = (Math.imul(seed, 1103515245) + 12345) >>> 0;
        const wobble = ((seed >>> 16) % 7) - 3; // -3..3 semitones
        const semis = wobble + drift * (i / (count - 1));
        tone(ac, { freq: voice.freq * Math.pow(2, semis / 12), at: t0 + i * step, dur: step * 0.8, type: voice.type, peak: 0.12 });
      }
      const tc = t0 + count * step + 0.05;
      if (tone_ === 'positive') {
        tone(ac, { freq: 659, at: tc, dur: 0.18, type: 'triangle', peak: 0.16 });
        tone(ac, { freq: 988, at: tc + 0.12, dur: 0.4, type: 'triangle', peak: 0.16 });
      } else if (tone_ === 'negative') {
        tone(ac, { freq: 440, at: tc, dur: 0.2, type: 'triangle', peak: 0.16 });
        tone(ac, { freq: 349, to: 311, at: tc + 0.16, dur: 0.45, type: 'triangle', peak: 0.16 });
      } else {
        tone(ac, { freq: 523, at: tc, dur: 0.3, type: 'sine', peak: 0.12 });
      }
      return Math.round((tc - t0 + 0.6) * 1000);
    } catch (e) { return 0; }
  }

  // Mute button for a page header. Clicking is a gesture, so switching sound
  // on also unlocks audio for the rest of the page and plays a tick to prove it.
  function toggle(container) {
    container.replaceChildren();
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'btn sound-toggle';
    const render = () => {
      const on = enabled();
      btn.textContent = on ? 'Sound on' : 'Sound off';
      btn.setAttribute('aria-pressed', on ? 'true' : 'false');
      btn.title = on ? 'Mute sound effects' : 'Turn sound effects on';
    };
    btn.addEventListener('click', () => {
      setEnabled(!enabled());
      render();
      if (enabled()) play('tick');
    });
    document.addEventListener('pets-sound', render);
    render();
    container.appendChild(btn);
  }

  window.PetsSounds = { play, react, enabled, setEnabled, toggle };
})();
