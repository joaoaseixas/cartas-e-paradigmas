// Efeitos sonoros sintetizados com WebAudio (sem arquivos de áudio => APK pequeno e offline).
let ctx = null;
let ligado = true;

export const Som = {
  set ligado(v) { ligado = !!v; },
  get ligado() { return ligado; },
  destravar() {
    try {
      ctx ??= new (window.AudioContext || window.webkitAudioContext)();
      if (ctx.state === 'suspended') ctx.resume();
    } catch { /* sem áudio: segue o jogo */ }
  },
  tom(freq, dur = 0.12, tipo = 'square', vol = 0.06, para = null, atraso = 0) {
    if (!ligado || !ctx) return;
    const t0 = ctx.currentTime + atraso;
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t0);
    if (para) o.frequency.exponentialRampToValueAtTime(para, t0 + dur);
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g).connect(ctx.destination); o.start(t0); o.stop(t0 + dur + 0.02);
  },
  ruido(dur = 0.15, vol = 0.08, freq = 900) {
    if (!ligado || !ctx) return;
    const n = Math.floor(ctx.sampleRate * dur), buf = ctx.createBuffer(1, n, ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < n; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = freq;
    const g = ctx.createGain(); g.gain.value = vol;
    s.connect(f).connect(g).connect(ctx.destination); s.start();
  },
  sfx(nome) {
    switch (nome) {
      case 'clique': this.tom(520, 0.06, 'triangle', 0.05); break;
      case 'carta': this.tom(300, 0.1, 'triangle', 0.06, 620); break;
      case 'erro': this.tom(150, 0.18, 'sawtooth', 0.05, 90); break;
      case 'golpe': this.ruido(0.12, 0.09, 1400); this.tom(180, 0.1, 'square', 0.05, 80); break;
      case 'dano': this.ruido(0.18, 0.12, 700); this.tom(120, 0.16, 'sawtooth', 0.06, 60); break;
      case 'critico': this.ruido(0.25, 0.14, 1800); this.tom(90, 0.3, 'sawtooth', 0.09, 40); this.tom(660, 0.12, 'square', 0.05, 990, 0.04); break;
      case 'cura': this.tom(520, 0.12, 'sine', 0.07); this.tom(780, 0.18, 'sine', 0.07, null, 0.09); break;
      case 'bloqueio': this.tom(340, 0.1, 'square', 0.05, 520); this.ruido(0.06, 0.05, 3000); break;
      case 'magia': this.tom(400, 0.3, 'sawtooth', 0.04, 1200); this.tom(800, 0.3, 'sine', 0.04, 300, 0.05); break;
      case 'morte': this.tom(220, 0.5, 'sawtooth', 0.07, 40); this.ruido(0.4, 0.08, 500); break;
      case 'vitoria': [523, 659, 784, 1046].forEach((f, i) => this.tom(f, 0.22, 'triangle', 0.07, null, i * 0.13)); break;
      case 'derrota': [392, 330, 262, 196].forEach((f, i) => this.tom(f, 0.3, 'triangle', 0.07, null, i * 0.2)); break;
      case 'turno': this.tom(240, 0.18, 'triangle', 0.06, 360); break;
      case 'saque': this.tom(880, 0.1, 'sine', 0.06); this.tom(1320, 0.18, 'sine', 0.06, null, 0.08); break;
      default: break;
    }
  },
  vibrar(ms = 30) { try { if (ligado && navigator.userActivation?.hasBeenActive) navigator.vibrate?.(ms); } catch { /* ignore */ } },
};
