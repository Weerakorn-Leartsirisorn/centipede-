export class AudioBus {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.enabled = true;
  }

  ensure() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.22;
      this.master.connect(this.ctx.destination);
    }
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  #now() {
    return this.ctx.currentTime;
  }

  #gain(duration, peak = 0.2) {
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(0.0001, this.#now());
    g.gain.exponentialRampToValueAtTime(peak, this.#now() + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, this.#now() + duration);
    g.connect(this.master);
    return g;
  }

  #osc(type, freq, duration, peak, slideTo) {
    if (!this.ctx || !this.enabled) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(freq, this.#now());
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, this.#now() + duration);
    const g = this.#gain(duration, peak);
    o.connect(g);
    o.start();
    o.stop(this.#now() + duration + 0.02);
  }

  #noise(duration, peak, freq = 900) {
    if (!this.ctx || !this.enabled) return;
    const buffer = this.ctx.createBuffer(1, this.ctx.sampleRate * duration, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    const g = this.#gain(duration, peak);
    src.connect(filter);
    filter.connect(g);
    src.start();
  }

  laser() {
    this.#osc('square', 980, 0.07, 0.08, 240);
  }

  pop() {
    this.#osc('triangle', 420, 0.08, 0.07, 140);
    this.#noise(0.06, 0.05, 1200);
  }

  explode() {
    this.#noise(0.18, 0.16, 500);
    this.#osc('sawtooth', 180, 0.16, 0.07, 40);
  }

  combo(level) {
    const f = 520 + Math.min(level, 10) * 40;
    this.#osc('sine', f, 0.12, 0.08, f * 1.5);
  }

  pickup() {
    this.#osc('sine', 660, 0.08, 0.07, 880);
    this.#osc('sine', 880, 0.12, 0.05, 1320);
  }

  hurt() {
    this.#osc('sawtooth', 220, 0.28, 0.12, 70);
    this.#noise(0.22, 0.1, 300);
  }

  wave() {
    this.#osc('triangle', 330, 0.18, 0.06, 660);
    this.#osc('sine', 495, 0.22, 0.05, 990);
  }

  extraLife() {
    this.#osc('sine', 523, 0.12, 0.08);
    this.#osc('sine', 659, 0.16, 0.07);
    this.#osc('sine', 784, 0.2, 0.06);
  }
}
