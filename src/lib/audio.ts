/**
 * SD MATCH (Smart Digital Make A Match) - MIN 1 ENDE
 * Audio Utility: Sound Effects (Tepuk Tangan, ZONK, Klik Kartu) & Confetti
 * 
 * Menggunakan audio buffer / Web Audio API synthesizers sebagai zero-latency fallback
 * sehingga SFX selalu berbunyi secara instan tanpa perlu menunggu download file audio!
 */

import confetti from "canvas-confetti";

// AudioContext singleton untuk Web Audio API
let audioCtx: AudioContext | null = null;

function getAudioContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
    }
  }
  if (audioCtx && audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
  }
  return audioCtx;
}

/**
 * Preload sound files jika ada di folder public
 */
const audioCache: Record<string, HTMLAudioElement> = {};

export function preloadAudio(src: string): void {
  if (typeof window === "undefined") return;
  if (!audioCache[src]) {
    const audio = new Audio(src);
    audio.preload = "auto";
    audioCache[src] = audio;
  }
}

/**
 * Mainkan audio file lokal jika tersedia, jika gagal fallback ke sintesis Web Audio API
 */
export function playSoundFile(src: string, fallbackFn: () => void): void {
  if (typeof window === "undefined") return;
  try {
    let audio = audioCache[src];
    if (!audio) {
      audio = new Audio(src);
      audioCache[src] = audio;
    }
    audio.currentTime = 0;
    const playPromise = audio.play();
    if (playPromise !== undefined) {
      playPromise.catch(() => {
        // Fallback ke synthesized sound jika file audio tidak ditemukan / diblokir browser
        fallbackFn();
      });
    }
  } catch {
    fallbackFn();
  }
}

// ==============================================================================
// SYNTHESIZED SOUND EFFECTS (WEB AUDIO API - ZERO DEPENDENCY, INSTANT PLAY)
// ==============================================================================

/**
 * 1. SFX TEPUK TANGAN & FANFARE KEMENANGAN (BENAR!)
 * Menghasilkan tepuk tangan riang berlapis + akord mayor nada ceria (C-E-G-C)
 */
export function playApplause(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // A. Akord Ceria / Fanfare (C5, E5, G5, C6)
  const notes = [523.25, 659.25, 783.99, 1046.5];
  notes.forEach((freq, idx) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "triangle";
    osc.frequency.setValueAtTime(freq, now + idx * 0.08);

    gain.gain.setValueAtTime(0, now + idx * 0.08);
    gain.gain.linearRampToValueAtTime(0.2, now + idx * 0.08 + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.08 + 0.6);

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.start(now + idx * 0.08);
    osc.stop(now + idx * 0.08 + 0.65);
  });

  // B. Efek Tepukan Tangan (Clapping Noise Bursts)
  for (let i = 0; i < 12; i++) {
    const clapDelay = 0.15 + i * (0.04 + Math.random() * 0.03);
    const bufferSize = ctx.sampleRate * 0.05; // 50ms burst
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = noiseBuffer.getChannelData(0);

    for (let j = 0; j < bufferSize; j++) {
      output[j] = Math.random() * 2 - 1;
    }

    const whiteNoise = ctx.createBufferSource();
    whiteNoise.buffer = noiseBuffer;

    const filter = ctx.createBiquadFilter();
    filter.type = "bandpass";
    filter.frequency.setValueAtTime(1200 + Math.random() * 400, now + clapDelay);
    filter.Q.setValueAtTime(3.0, now + clapDelay);

    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, now + clapDelay);
    gain.gain.exponentialRampToValueAtTime(0.001, now + clapDelay + 0.045);

    whiteNoise.connect(filter);
    filter.connect(gain);
    gain.connect(ctx.destination);

    whiteNoise.start(now + clapDelay);
    whiteNoise.stop(now + clapDelay + 0.05);
  }
}

/**
 * 2. SFX "ZONK" (SALAH!)
 * Menghasilkan suara buzzer gagal / nada turun komedi khas kuis televisi
 */
export function playZonk(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;

  // Dua nada 'buzz' turun (Disonansi F# -> F turun lambat)
  const osc1 = ctx.createOscillator();
  const osc2 = ctx.createOscillator();
  const gain = ctx.createGain();

  osc1.type = "sawtooth";
  osc2.type = "sawtooth";

  // Frekuensi turun drastis (Zonk slide effect)
  osc1.frequency.setValueAtTime(160, now);
  osc1.frequency.linearRampToValueAtTime(100, now + 0.45);

  osc2.frequency.setValueAtTime(155, now);
  osc2.frequency.linearRampToValueAtTime(95, now + 0.45);

  // Amplop volume
  gain.gain.setValueAtTime(0, now);
  gain.gain.linearRampToValueAtTime(0.28, now + 0.03);
  gain.gain.setValueAtTime(0.25, now + 0.35);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.55);

  // Filter lowpass agar suaranya padat dan khas "Womp-Womp / Zonk"
  const filter = ctx.createBiquadFilter();
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(600, now);
  filter.frequency.linearRampToValueAtTime(300, now + 0.45);

  osc1.connect(filter);
  osc2.connect(filter);
  filter.connect(gain);
  gain.connect(ctx.destination);

  osc1.start(now);
  osc2.start(now);
  osc1.stop(now + 0.6);
  osc2.stop(now + 0.6);
}

/**
 * 3. SFX KLIK / PILIH KARTU
 */
export function playCardClick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(600, now);
  osc.frequency.exponentialRampToValueAtTime(900, now + 0.06);

  gain.gain.setValueAtTime(0.12, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.07);
}

/**
 * 4. SFX COUNTDOWN TICKING (10 Detik Terakhir)
 */
export function playTimerTick(): void {
  const ctx = getAudioContext();
  if (!ctx) return;

  const now = ctx.currentTime;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();

  osc.type = "sine";
  osc.frequency.setValueAtTime(880, now);

  gain.gain.setValueAtTime(0.08, now);
  gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

  osc.connect(gain);
  gain.connect(ctx.destination);

  osc.start(now);
  osc.stop(now + 0.06);
}

/**
 * 5. KONFETI INTERAKTIF (PERAYAAN JAWABAN BENAR)
 */
export function triggerCelebrationConfetti(): void {
  if (typeof window === "undefined") return;

  // Letupan konfeti dari kiri & kanan layar
  confetti({
    particleCount: 80,
    spread: 70,
    origin: { y: 0.7, x: 0.3 },
    colors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"],
  });

  setTimeout(() => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.7, x: 0.7 },
      colors: ["#10B981", "#3B82F6", "#F59E0B", "#EF4444", "#8B5CF6"],
    });
  }, 150);
}

/**
 * 6. PERAYAAN AKHIR GAME (VICTORY CONFETTI CANNON)
 */
export function triggerVictoryConfetti(): void {
  if (typeof window === "undefined") return;

  const duration = 2500;
  const animationEnd = Date.now() + duration;

  const interval: any = setInterval(() => {
    const timeLeft = animationEnd - Date.now();
    if (timeLeft <= 0) {
      return clearInterval(interval);
    }
    const particleCount = 40 * (timeLeft / duration);
    confetti({
      startVelocity: 30,
      spread: 360,
      ticks: 60,
      origin: {
        x: Math.random(),
        y: Math.random() - 0.2,
      },
      colors: ["#10B981", "#F59E0B", "#3B82F6", "#EC4899", "#8B5CF6"],
    });
  }, 250);
}

