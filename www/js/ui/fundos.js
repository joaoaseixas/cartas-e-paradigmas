// Cenários em SVG gerados por código (leves, nítidos em qualquer tela e sem arquivos de imagem).
const prng = (seed) => () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;

const arvores = (r, n, y, hMin, hMax, cor, larg = 34) => {
  let s = '';
  for (let i = 0; i < n; i++) {
    const x = (i / (n - 1)) * 380 - 10 + (r() - 0.5) * 20, h = hMin + r() * (hMax - hMin), w = larg * (0.8 + r() * 0.5);
    s += `<polygon points="${x},${y - h} ${x - w / 2},${y} ${x + w / 2},${y}" fill="${cor}"/>`;
    s += `<polygon points="${x},${y - h * 0.72} ${x - w * 0.62},${y - h * 0.18} ${x + w * 0.62},${y - h * 0.18}" fill="${cor}"/>`;
  }
  return s;
};
const colinas = (y, cor, amp, r) => {
  let d = `M0 ${y}`;
  for (let x = 0; x <= 360; x += 40) d += ` Q${x + 20} ${y - amp * (0.4 + r())} ${x + 40} ${y}`;
  return `<path d="${d} L360 800 L0 800Z" fill="${cor}"/>`;
};
const estrelas = (r, n) => Array.from({ length: n }, () => `<circle cx="${r() * 360}" cy="${r() * 330}" r="${0.4 + r() * 1.1}" fill="#fff" opacity="${0.3 + r() * 0.6}"/>`).join('');
const pilares = (r, n, cor, topo) => Array.from({ length: n }, (_, i) => {
  const x = 20 + (i / (n - 1)) * 320, w = 22;
  return `<rect x="${x - w / 2}" y="${topo}" width="${w}" height="520" fill="${cor}"/><rect x="${x - w / 2 - 5}" y="${topo - 8}" width="${w + 10}" height="12" fill="${cor}"/>`;
}).join('');
const cristais = (r, n, cor) => Array.from({ length: n }, () => {
  const x = r() * 360, y = 330 + r() * 120, h = 14 + r() * 26;
  return `<polygon points="${x},${y - h} ${x - 7},${y} ${x + 7},${y}" fill="${cor}" opacity=".85"/>`;
}).join('');
const estalactites = (r, n, cor) => Array.from({ length: n }, () => {
  const x = r() * 360, h = 30 + r() * 80;
  return `<polygon points="${x - 12},0 ${x + 12},0 ${x},${h}" fill="${cor}"/>`;
}).join('');
const espinhos = (r, n, cor) => Array.from({ length: n }, (_, i) => {
  const x = (i / (n - 1)) * 370 - 5, h = 40 + r() * 90;
  return `<polygon points="${x - 14},800 ${x},${800 - h - 330} ${x + 14},800" fill="${cor}"/>`;
}).join('');
const castelo = (cor) => `<g fill="${cor}"><rect x="40" y="250" width="280" height="260"/><rect x="20" y="190" width="56" height="320"/><rect x="284" y="190" width="56" height="320"/><rect x="150" y="150" width="60" height="360"/>
  ${[20, 36, 52, 284, 300, 316, 150, 166, 182, 198].map((x) => `<rect x="${x}" y="${x < 100 || (x > 280) ? 176 : 136}" width="10" height="16"/>`).join('')}
  <polygon points="150,150 180,100 210,150"/><polygon points="20,190 48,140 76,190"/><polygon points="284,190 312,140 340,190"/></g>
  <g fill="#ffcf70" opacity=".8"><rect x="172" y="200" width="16" height="26" rx="8"/><rect x="40" y="240" width="10" height="18" rx="5"/><rect x="310" y="240" width="10" height="18" rx="5"/></g>`;

const TEMAS = {
  floresta: (r) => ({ c1: '#2f6b4a', c2: '#0e2519', corpo: `<circle cx="280" cy="90" r="46" fill="#fff6c0" opacity=".25"/><circle cx="280" cy="90" r="24" fill="#fff6c0" opacity=".5"/>${colinas(330, '#1b4631', 40, r)}${arvores(r, 9, 430, 90, 150, '#123522')}${arvores(r, 7, 520, 120, 200, '#0b2316', 48)}`, vagalumes: '#e9ffb0' }),
  noite: (r) => ({ c1: '#1c2b57', c2: '#080b1a', corpo: `${estrelas(r, 60)}<circle cx="90" cy="100" r="40" fill="#f4f0d2"/><circle cx="104" cy="92" r="40" fill="#1c2b57" opacity=".35"/>${colinas(350, '#0f1a38', 40, r)}${arvores(r, 10, 440, 100, 170, '#070c1d')}${arvores(r, 7, 530, 130, 210, '#04070f', 50)}`, vagalumes: '#b8d0ff' }),
  cripta: (r) => ({ c1: '#3a2358', c2: '#0f0819', corpo: `${estrelas(r, 25)}${pilares(r, 5, '#1b1030', 120)}<g fill="#150c25">${Array.from({ length: 6 }, (_, i) => `<rect x="${20 + i * 58}" y="440" width="24" height="46" rx="12"/>`).join('')}</g>`, vagalumes: '#c9a4ff' }),
  cidadela: (r) => ({ c1: '#4a5170', c2: '#14172b', corpo: `${estrelas(r, 30)}${castelo('#161a2e')}${colinas(480, '#0d1020', 22, r)}`, vagalumes: '#ffe2a0' }),
  mina: (r) => ({ c1: '#4a3322', c2: '#140d08', corpo: `${estalactites(r, 9, '#24160d')}${cristais(r, 12, '#66e0ff')}${colinas(470, '#1c120a', 30, r)}`, vagalumes: '#8fe9ff' }),
  salao: (r) => ({ c1: '#4d1228', c2: '#16040c', corpo: `${pilares(r, 4, '#220714', 80)}<g fill="#ff6a3d" opacity=".75">${[70, 150, 230, 310].map((x) => `<ellipse cx="${x}" cy="200" rx="7" ry="12"/>`).join('')}</g>`, vagalumes: '#ff9a6a' }),
  covil: (r) => ({ c1: '#5a1210', c2: '#150303', corpo: `<ellipse cx="180" cy="470" rx="260" ry="120" fill="#ff5a1f" opacity=".35"/>${espinhos(r, 9, '#1a0505')}${colinas(500, '#2a0806', 30, r)}`, vagalumes: '#ffb36b' }),
};

export function fundoSVG(tema, seed = 7) {
  const r = prng(seed + tema.length * 13);
  const t = (TEMAS[tema] ?? TEMAS.floresta)(r);
  return `<svg viewBox="0 0 360 800" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg">
    <defs><linearGradient id="g${tema}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${t.c1}"/><stop offset="1" stop-color="${t.c2}"/></linearGradient>
    <radialGradient id="v${tema}" cx="50%" cy="45%" r="75%"><stop offset=".55" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".7"/></radialGradient></defs>
    <rect width="360" height="800" fill="url(#g${tema})"/>${t.corpo}<rect width="360" height="800" fill="url(#v${tema})"/></svg>`;
}

// Fundo 3D compartilhado (Three.js). Se o WebGL não existir, cai para o cenário SVG acima.
import { obterCena, THREE } from '../three/cena.js';
import { Ator } from '../three/atores.js';

export function criarFundo(tema, { palco = false } = {}) {
  const el = document.createElement('div');
  el.className = 'bg bg3d';
  const cena = obterCena();
  if (!cena.ok) { el.innerHTML = fundoSVG(tema); return el; }
  cena.aoQuadro = null;
  cena.modoAmbiente(tema, { palco });
  cena.anexar(el);
  if (palco) {
    const a = cena.adicionarAtor(new Ator(cena, { id: 'palco-a' }, 'luke', { x: -1.9, z: 0, yaw: Math.PI / 2 }));
    const b = cena.adicionarAtor(new Ator(cena, { id: 'palco-b' }, 'demogorgon', { x: 2.1, z: 0, yaw: -Math.PI / 2 }));
    let t0 = 0;
    cena.efeitos.push({ update: (dt) => {
      t0 += dt;
      if (t0 > 3.2) {
        t0 = 0;
        const centro = new THREE.Vector3(0, 1.5, 0);
        cena.corte(centro, '#4fd1ff', 2); cena.corte(centro, '#ff2a3a', 2); cena.faiscas(centro, '#ffe9a6', 26, { vel: 6 }); cena.anelOnda(new THREE.Vector3(0, 0.05, 0), '#ffffff', { max: 3 });
        a.piscar('#4fd1ff'); b.piscar('#ff2a3a');
      }
      return true;
    } });
  }
  return el;
}

/** Fundo 3D em modo vitrine; devolve o elemento e uma função para trocar os heróis exibidos. */
export function criarVitrine(tema = 'noite') {
  const el = document.createElement('div');
  el.className = 'bg bg3d';
  const cena = obterCena();
  if (!cena.ok) return { el, mostrar() {} };
  cena.aoQuadro = null;
  cena.modoVitrine(tema);
  cena.anexar(el);
  const mostrar = (modelos, { y, z, alt } = {}) => {
    cena.limparAtores();
    const n = modelos.length;
    cena.vitrineZ = z ?? (n === 1 ? 6.2 : 8.8); cena.vitrineY = y ?? (n === 1 ? 0.5 : 0.5); cena.vitrineAlt = alt ?? 1.9;
    modelos.forEach((m, i) => {
      const k = i - (n - 1) / 2;
      cena.adicionarAtor(new Ator(cena, { id: 'vit' + i }, m, { x: k * 2.5, z: Math.abs(k) * -0.5, yaw: -k * 0.28 }));
    });
  };
  return { el, mostrar, cena };
}
