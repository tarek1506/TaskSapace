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

    // Two-tone soft ping: high → low
    play(1046, 0, 0.18, 0.18)   // C6
    play(784, 0.12, 0.22, 0.12) // G5

    // Close the context after sounds finish to free resources
    setTimeout(() => ctx.close(), 600)
  } catch {
    // Silently ignore if Web Audio is blocked or unavailable
  }
}
