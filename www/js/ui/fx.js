// Animações de combate (Web Animations API). Tudo desenhado numa camada fixa sobre a tela.
const camada = () => document.getElementById('fx-layer');
const centro = (el) => { const r = el.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: r.height }; };

export const EMOJI_ELEMENTO = { fogo: ['🔥', '🔥', '✨'], gelo: ['❄️', '❄️', '💎'], raio: ['⚡', '⚡', '✨'], sagrado: ['✨', '☀️', '✨'], fisico: ['💥', '✦', '💢'], veneno: ['☠️', '🟢', '💚'], sombra: ['🌑', '💜', '✦'] };
export const PROJETIL = { fogo: '🔥', gelo: '❄️', raio: '⚡', sagrado: '✨', sombra: '🌑', veneno: '🟢' };

export const Fx = {
  centro,

  flutuar(el, texto, cls = 'dmg', { dx = 0, dy = -64, ms = 900, atraso = 0 } = {}) {
    if (!el) return;
    const { x, y } = centro(el);
    const n = document.createElement('div');
    n.className = `float ${cls}`; n.textContent = texto;
    n.style.left = `${x + dx}px`; n.style.top = `${y - 18}px`;
    camada().append(n);
    const a = n.animate([
      { transform: 'translate(-50%,-50%) scale(.4)', opacity: 0 },
      { transform: 'translate(-50%,-50%) scale(1.25)', opacity: 1, offset: 0.18 },
      { transform: `translate(-50%,calc(-50% + ${dy}px)) scale(1)`, opacity: 1, offset: 0.7 },
      { transform: `translate(-50%,calc(-50% + ${dy - 16}px)) scale(.9)`, opacity: 0 },
    ], { duration: ms, delay: atraso, easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'both' });
    a.onfinish = () => n.remove();
  },

  explosao(el, emojis, n = 7, { raio = 54, ms = 650 } = {}) {
    if (!el) return;
    const { x, y } = centro(el);
    for (let i = 0; i < n; i++) {
      const p = document.createElement('div');
      p.className = 'burst'; p.textContent = emojis[i % emojis.length];
      p.style.left = `${x}px`; p.style.top = `${y}px`; p.style.fontSize = `${16 + Math.random() * 16}px`;
      camada().append(p);
      const ang = (i / n) * Math.PI * 2 + Math.random() * 0.8, d = raio * (0.5 + Math.random() * 0.7);
      const a = p.animate([
        { transform: 'translate(-50%,-50%) scale(.3)', opacity: 1 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d}px), calc(-50% + ${Math.sin(ang) * d}px)) scale(1.1) rotate(${Math.random() * 120 - 60}deg)`, opacity: 0.9, offset: 0.6 },
        { transform: `translate(calc(-50% + ${Math.cos(ang) * d * 1.3}px), calc(-50% + ${Math.sin(ang) * d * 1.3 + 14}px)) scale(.5)`, opacity: 0 },
      ], { duration: ms, easing: 'ease-out', fill: 'both' });
      a.onfinish = () => p.remove();
    }
  },

  projetil(de, para, emoji, ms = 280) {
    if (!de || !para) return Promise.resolve();
    const a = centro(de), b = centro(para);
    const p = document.createElement('div');
    p.className = 'proj'; p.textContent = emoji;
    p.style.left = `${a.x}px`; p.style.top = `${a.y}px`;
    camada().append(p);
    const ang = Math.atan2(b.y - a.y, b.x - a.x) * 180 / Math.PI;
    const an = p.animate([
      { transform: `translate(-50%,-50%) scale(.6) rotate(${ang}deg)`, opacity: 0.2 },
      { transform: `translate(calc(-50% + ${b.x - a.x}px), calc(-50% + ${b.y - a.y}px)) scale(1.3) rotate(${ang}deg)`, opacity: 1 },
    ], { duration: ms, easing: 'cubic-bezier(.5,0,.8,.6)', fill: 'forwards' });
    return new Promise((res) => { an.onfinish = () => { p.remove(); res(); }; });
  },

  conjurar(el, arte) {
    if (!el) return;
    const { x, y } = centro(el);
    const n = document.createElement('div');
    n.className = 'cast-art'; n.textContent = arte; n.style.left = `${x}px`; n.style.top = `${y - 30}px`;
    camada().append(n);
    const a = n.animate([
      { transform: 'translate(-50%,-50%) scale(.2)', opacity: 0 },
      { transform: 'translate(-50%,-90%) scale(1.15)', opacity: 1, offset: 0.35 },
      { transform: 'translate(-50%,-150%) scale(.9)', opacity: 0 },
    ], { duration: 650, easing: 'ease-out', fill: 'both' });
    a.onfinish = () => n.remove();
  },

  investida(el, alvo, ms = 260) {
    if (!el || !alvo) return;
    const a = centro(el), b = centro(alvo);
    const dx = (b.x - a.x) * 0.45, dy = (b.y - a.y) * 0.45;
    el.animate([{ transform: 'translate(0,0)' }, { transform: `translate(${dx}px,${dy}px) scale(1.12)`, offset: 0.4 }, { transform: 'translate(0,0)' }], { duration: ms, easing: 'ease-in-out' });
  },

  tremer(el) { if (!el) return; el.classList.remove('shake'); void el.offsetWidth; el.classList.add('shake'); setTimeout(() => el.classList.remove('shake'), 420); },
  piscar(el) { if (!el) return; el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); setTimeout(() => el.classList.remove('flash'), 380); },

  flashTela() {
    const f = document.createElement('div'); f.className = 'screen-flash'; camada().append(f); setTimeout(() => f.remove(), 900);
    document.getElementById('app').animate([{ transform: 'translate(0,0)' }, { transform: 'translate(-8px,4px)' }, { transform: 'translate(8px,-4px)' }, { transform: 'translate(-5px,2px)' }, { transform: 'translate(0,0)' }], { duration: 450 });
  },

  toast(texto) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = texto; document.body.append(t); setTimeout(() => t.remove(), 1700);
  },
};
