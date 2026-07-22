/**
 * Plays a soft notification ping using the Web Audio API.
 * No external audio files required.
 */
export function playMessageSound() {
  try {
    const AudioCtx = window.AudioContext || (window as any).webkitAudioContext
    if (!AudioCtx) return
    const ctx = new AudioCtx()

    if (ctx.state === 'suspended') {
      ctx.resume().catch(() => {})
    }

    const play = (freq: number, startAt: number, duration: number, volume: number) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, ctx.currentTime + startAt)

      gain.gain.setValueAtTime(0, ctx.currentTime + startAt)
      gain.gain.linearRampToValueAtTime(volume, ctx.currentTime + startAt + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + startAt + duration)

      osc.start(ctx.currentTime + startAt)
      osc.stop(ctx.currentTime + startAt + duration)
    }

    // Bright, high-pitched 3-note ascending chime (E6 -> A6 -> E7)
    play(1318.5, 0, 0.15, 0.28)    // E6
    play(1760.0, 0.07, 0.18, 0.32)  // A6
    play(2637.0, 0.15, 0.35, 0.38)  // E7

    // Close the context after sounds finish to free resources
    setTimeout(() => ctx.close(), 700)
  } catch {
    // Silently ignore if Web Audio is blocked or unavailable
  }
}
