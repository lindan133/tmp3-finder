let audioContext: AudioContext | null = null;

export function playMatchSound(enabled: boolean) {
  if (!enabled) return;

  try {
    audioContext ??= new AudioContext();
    const ctx = audioContext;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.type = "sine";
    osc.frequency.value = 880;
    gain.gain.value = 0.08;

    osc.connect(gain);
    gain.connect(ctx.destination);

    const now = ctx.currentTime;
    osc.start(now);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
    osc.stop(now + 0.15);
  } catch {
    // ignore audio errors
  }
}
