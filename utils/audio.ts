const createOscillator = (type: 'sine' | 'square' | 'triangle' | 'sawtooth', freq: number, duration: number, vol: number = 0.2) => {
  try {
    const AudioContext = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContext) return;
    
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();

    osc.connect(gain);
    gain.connect(ctx.destination);

    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime);
    
    // Soft attack and release to avoid clicking
    gain.gain.setValueAtTime(0, ctx.currentTime);
    gain.gain.linearRampToValueAtTime(vol, ctx.currentTime + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);

    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + duration);
  } catch (e) {
    console.error("Audio play failed", e);
  }
};

export const playSound = (type: 'green' | 'yellow' | 'red' | 'bell') => {
  if (type === 'bell') {
    createOscillator('sine', 880, 1.5, 0.8); // Loud Bell
    setTimeout(() => createOscillator('triangle', 440, 1.5, 0.4), 50); // Harmonics
    return;
  }

  if (type === 'green') {
    // Pleasant chime
    createOscillator('sine', 523.25, 0.8, 0.3); // C5
    setTimeout(() => createOscillator('sine', 659.25, 0.8, 0.3), 100); // E5
  } else if (type === 'yellow') {
    // Warning beep
    createOscillator('triangle', 440, 0.6, 0.3); // A4
  } else if (type === 'red') {
    // Alert buzz
    createOscillator('sawtooth', 220, 0.8, 0.2); // A3
  }
};

export const playBellSound = () => playSound('bell');
