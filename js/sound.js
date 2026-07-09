/**
 * Sound Manager
 * Synthesizes sounds via Web Audio API — no external audio files needed.
 * Three presets: crisp (default), soft, muted.
 */
class SoundManager {
    constructor() {
        this.ctx = null;
        this.set = 'crisp';
    }

    /**
     * Lazy-init AudioContext on first user interaction (browser policy).
     * Call this from a click/touch handler.
     */
    init() {
        if (this.ctx) return;
        try {
            this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (_) {
            // Web Audio not supported — sounds silently disabled
        }
    }

    /**
     * Play a sound effect.
     * @param {'move'|'merge'} type
     */
    play(type) {
        if (this.set === 'muted' || !this.ctx) return;

        // Resume if suspended (iOS requirement)
        if (this.ctx.state === 'suspended') this.ctx.resume();

        const s = this._settings(type);
        if (!s) return;

        const now = this.ctx.currentTime;
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = s.type;
        osc.frequency.setValueAtTime(s.freq, now);
        gain.gain.setValueAtTime(s.vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + s.dur);

        osc.connect(gain);
        gain.connect(this.ctx.destination);
        osc.start(now);
        osc.stop(now + s.dur);
    }

    /** Switch sound preset. */
    setSoundSet(name) {
        this.set = name;
    }

    /** Return available presets. */
    getSets() {
        return ['crisp', 'soft', 'muted'];
    }

    /* ---- internal ---- */

    _settings(type) {
        const presets = {
            crisp: {
                move:  { freq: 880,  dur: 0.06, vol: 0.18, type: 'sine' },
                merge: { freq: 1320, dur: 0.12, vol: 0.25, type: 'sine' },
            },
            soft: {
                move:  { freq: 440,  dur: 0.08, vol: 0.07, type: 'triangle' },
                merge: { freq: 587,  dur: 0.16, vol: 0.10, type: 'triangle' },
            },
            muted: {},
        };
        return (presets[this.set] || {})[type] || null;
    }
}
