import { Howler } from 'howler';

Howler.volume(0.45);

const SOUND_TONES = {
    hover: [520, 0.025, 'sine'],
    select: [680, 0.04, 'triangle'],
    play: [220, 0.08, 'sawtooth'],
    discard: [150, 0.07, 'triangle'],
    resource_gain: [760, 0.06, 'sine'],
    resource_loss: [190, 0.05, 'square'],
    damage_light: [130, 0.07, 'square'],
    damage_heavy: [80, 0.12, 'sawtooth'],
    turn_start: [440, 0.08, 'triangle'],
    victory: [880, 0.18, 'sine'],
    defeat: [95, 0.2, 'sawtooth'],
    denied: [110, 0.08, 'square']
};

let audioContext = null;

const getAudioContext = () => {
    const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextCtor) return null;
    if (!audioContext) audioContext = new AudioContextCtor();
    if (audioContext.state === 'suspended') audioContext.resume();
    return audioContext;
};

export const soundManager = {
    play(name) {
        const tone = SOUND_TONES[name];
        const ctx = getAudioContext();
        if (!tone || !ctx) return;

        const [frequency, duration, type] = tone;
        const oscillator = ctx.createOscillator();
        const gain = ctx.createGain();
        const now = ctx.currentTime;

        oscillator.type = type;
        oscillator.frequency.setValueAtTime(frequency, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(0.06, now + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        oscillator.connect(gain);
        gain.connect(ctx.destination);
        oscillator.start(now);
        oscillator.stop(now + duration + 0.02);
    }
};
