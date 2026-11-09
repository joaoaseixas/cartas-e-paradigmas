// Modelos 3D procedurais (low-poly) de heróis e inimigos. Todos "olham" para +Z e têm o pé em y=0.
// Cada construtor devolve { grupo, altura, partes, flutua? }.
import { THREE } from './cena.js';

const M = (color, o = {}) => new THREE.MeshStandardMaterial({ color, roughness: 0.55, metalness: 0.25, flatShading: true, ...o });
const E = (color, intensity = 1.6) => new THREE.MeshStandardMaterial({ color: '#000000', emissive: color, emissiveIntensity: intensity, roughness: 1 });
const mesh = (geo, mat, x = 0, y = 0, z = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); return m; };
const cil = (rt, rb, h, mat, seg = 8) => new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, h, seg), mat);
const esf = (r, mat, sx = 1, sy = 1, sz = 1) => { const m = new THREE.Mesh(new THREE.SphereGeometry(r, 14, 10), mat); m.scale.set(sx, sy, sz); return m; };
const caixa = (w, h, d, mat) => new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat);
const cap = (r, l, mat) => new THREE.Mesh(new THREE.CapsuleGeometry(r, l, 4, 10), mat);
const cone = (r, h, mat, seg = 10, aberto = false) => new THREE.Mesh(new THREE.ConeGeometry(r, h, seg, 1, aberto), mat);

let glowTex = null;
const glow = (cor, tam = 1) => {
  glowTex ??= (() => {
    const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
    const gr = g.createRadialGradient(32, 32, 0, 32, 32, 32); gr.addColorStop(0, 'rgba(255,255,255,1)'); gr.addColorStop(0.3, 'rgba(255,255,255,.5)'); gr.addColorStop(1, 'rgba(255,255,255,0)');
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color: cor, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
  s.scale.set(tam, tam, 1); return s;
};

/** Sabre de plasma: cabo + lâmina emissiva + halo. A lâmina cresce em +Y. */
export function sabre(cor = '#4fd1ff', comp = 1.15) {
  const g = new THREE.Group();
  g.add(cil(0.045, 0.05, 0.34, M('#9aa3b5', { metalness: 0.9, roughness: 0.3 }), 8));
  const lamina = cil(0.032, 0.032, comp, E(cor, 3), 8); lamina.position.y = 0.17 + comp / 2;
  const halo = cil(0.075, 0.075, comp, new THREE.MeshBasicMaterial({ color: cor, transparent: true, opacity: 0.28, blending: THREE.AdditiveBlending, depthWrite: false }), 8); halo.position.copy(lamina.position);
  const ponta = glow(cor, 0.9); ponta.position.y = 0.17 + comp * 0.6;
  g.add(lamina, halo, ponta); g.userData.lamina = lamina;
  return g;
}

function humanoide({ torso = '#7a6a58', calca = '#3a3f55', pele = '#e2b48e', larg = 1, esc = 1, botas = '#222' }) {
  const g = new THREE.Group(); const p = {};
  const pernaE = cil(0.1, 0.09, 0.72, M(calca), 8); pernaE.position.set(-0.15, 0.4, 0);
  const pernaD = pernaE.clone(); pernaD.position.x = 0.15;
  const bE = caixa(0.19, 0.12, 0.3, M(botas)); bE.position.set(-0.15, 0.06, 0.04); const bD = bE.clone(); bD.position.x = 0.15;
  const corpo = cap(0.27 * larg, 0.46, M(torso)); corpo.position.y = 1.08; corpo.scale.z = 0.8;
  const cabeca = esf(0.22, M(pele)); cabeca.position.y = 1.62;
  const braco = (lado) => {
    const s = new THREE.Group(); s.position.set(0.37 * larg * lado, 1.33, 0);
    s.add(mesh(new THREE.CylinderGeometry(0.075, 0.065, 0.55, 8), M(torso), 0, -0.27, 0), mesh(new THREE.SphereGeometry(0.08, 8, 6), M(pele), 0, -0.58, 0));
    return s;
  };
  p.bracoD = braco(1); p.bracoE = braco(-1); p.cabeca = cabeca; p.corpo = corpo; p.pernaE = pernaE; p.pernaD = pernaD;
  const olho = (x) => { const o = caixa(0.045, 0.05, 0.02, M('#1a1410')); o.position.set(x * 0.085, 1.65, 0.205); return o; };
  g.add(pernaE, pernaD, bE, bD, corpo, cabeca, olho(1), olho(-1), p.bracoD, p.bracoE);
  g.scale.setScalar(esc);
  return { g, p };
}

const empunhar = (braco, objeto, rot = [-Math.PI / 2 + 0.2, 0, 0], y = -0.58) => { objeto.position.set(0, y, 0.05); objeto.rotation.set(...rot); braco.add(objeto); };

// =================================================================== HERÓIS
export const MODELOS = {
  luke() { // Luke Skywalker (túnica preta, sabre verde)
    const { g, p } = humanoide({ torso: '#1b1b22', calca: '#14141a', botas: '#0b0b0e' });
    const capa = cone(0.62, 1.5, M('#101014', { side: THREE.DoubleSide }), 12, true); capa.position.set(0, 0.85, -0.16); capa.scale.z = 0.55;
    const cinto = mesh(new THREE.TorusGeometry(0.28, 0.04, 6, 16), M('#f5c451', { metalness: 0.8 }), 0, 0.88, 0); cinto.rotation.x = Math.PI / 2;
    const cabelo = esf(0.235, M('#c9a25a'), 1, 0.7, 1.05); cabelo.position.set(0, 1.7, -0.02);
    const s = sabre('#3dff6a', 1.1); empunhar(p.bracoD, s);
    p.bracoD.rotation.x = -0.5;
    const luva = esf(0.085, M('#0b0b0e')); luva.position.set(0.37, 0.75, 0); g.add(capa, cinto, cabelo);
    return { grupo: g, altura: 1.95, partes: { ...p, saber: s }, arma: 'corpo', cor: '#3dff6a' };
  },
  yoda() { // Mestre Yoda
    const g = new THREE.Group(); const p = {};
    const robe = cone(0.62, 1.6, M('#8a7752', { side: THREE.DoubleSide }), 14); robe.position.y = 0.8;
    const torso = cap(0.26, 0.3, M('#b59d6a')); torso.position.y = 1.35; torso.scale.z = 0.8;
    const cabeca = esf(0.24, M('#86b86a'), 1.1, 0.95, 1); cabeca.position.y = 1.8;
    const orelha = (x) => { const o = cone(0.09, 0.55, M('#86b86a'), 6); o.position.set(x * 0.34, 1.86, 0); o.rotation.z = -x * 1.35; return o; };
    const capuz = new THREE.Group(); capuz.add(orelha(1), orelha(-1));
    const olhos = caixa(0.24, 0.045, 0.02, E('#1b2a10', 1)); olhos.position.set(0, 1.82, 0.22);
    const braco = (l) => { const s = new THREE.Group(); s.position.set(0.34 * l, 1.52, 0); s.add(mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.5, 8), M('#5b3aa8'), 0, -0.25, 0), mesh(new THREE.SphereGeometry(0.075, 8, 6), M('#d6a98a'), 0, -0.55, 0)); return s; };
    p.bracoD = braco(1); p.bracoE = braco(-1); p.cabeca = cabeca; p.corpo = torso;
    const orbe = new THREE.Group(); orbe.add(mesh(new THREE.SphereGeometry(0.14, 12, 10), E('#7dff8a', 2.4)), glow('#7dff8a', 1.1)); orbe.position.set(0.7, 1.5, 0.25);
    p.orbe = orbe;
    const bastao = cil(0.025, 0.03, 1.2, M('#5a4026'), 6); bastao.position.set(-0.45, 0.6, 0.15);
    g.add(robe, torso, cabeca, capuz, olhos, p.bracoD, p.bracoE, orbe, bastao);
    g.scale.setScalar(0.72);
    return { grupo: g, altura: 1.55, partes: p, arma: 'magia', cor: '#7dff8a' };
  },
  han() { // Han Solo
    const { g, p } = humanoide({ torso: '#e9e6dc', calca: '#2a3042', botas: '#2a1f16' });
    const capacete = esf(0.235, M('#5a3a22'), 1, 0.7, 1.05); capacete.position.set(0, 1.7, -0.02);
    const visor = caixa(0.02, 0.02, 0.02, M('#000')); visor.position.set(0, 1.5, 0.2);
    const colete = caixa(0.58, 0.46, 0.34, M('#15151b')); colete.position.set(0, 1.12, 0.01);
    const mochila = caixa(0.1, 0.5, 0.05, M('#6b4a2a')); mochila.position.set(0.28, 0.75, 0.12);
    const blaster = new THREE.Group(); blaster.add(caixa(0.1, 0.16, 0.42, M('#252a35', { metalness: 0.8 })), mesh(new THREE.CylinderGeometry(0.03, 0.03, 0.34, 6), M('#111'), 0, 0.02, 0.36), glow('#35e6ff', 0.4));
    blaster.children[1].rotation.x = Math.PI / 2; blaster.children[2].position.set(0, 0.02, 0.55);
    empunhar(p.bracoD, blaster, [-Math.PI / 2 + 0.1, 0, 0], -0.55); p.bracoD.rotation.x = -0.15;
    g.add(capacete, colete, mochila);
    return { grupo: g, altura: 1.9, partes: { ...p, arma: blaster, visor }, arma: 'tiro', cor: '#ff5a3a' };
  },
  leia() { // Princesa Leia (vestido branco, coques)
    const { g, p } = humanoide({ torso: '#f4f4f6', calca: '#f4f4f6', pele: '#e8bf9d', botas: '#d8d8de' });
    const vestido = cone(0.5, 1.2, M('#f4f4f6', { side: THREE.DoubleSide }), 14); vestido.position.y = 0.62;
    const coque = (x) => { const c = esf(0.13, M('#4a2c1a')); c.position.set(x * 0.27, 1.68, -0.02); return c; };
    const cabelo = esf(0.235, M('#4a2c1a'), 1, 0.8, 1.05); cabelo.position.set(0, 1.68, -0.04);
    const cinto = mesh(new THREE.TorusGeometry(0.27, 0.035, 6, 16), M('#8a8f9c', { metalness: 0.7 }), 0, 1.0, 0); cinto.rotation.x = Math.PI / 2;
    const drone = new THREE.Group(); drone.add(mesh(new THREE.SphereGeometry(0.12, 12, 10), E('#5dffa8', 2.2)), glow('#5dffa8', 0.9)); drone.position.set(-0.6, 1.7, 0.1);
    p.drone = drone;
    g.add(vestido, coque(1), coque(-1), cabelo, cinto, drone);
    return { grupo: g, altura: 1.9, partes: p, arma: 'magia', cor: '#5dffa8' };
  },
  chewie() { // Chewbacca
    const { g, p } = humanoide({ torso: '#6b4423', calca: '#5a381b', pele: '#6b4423', botas: '#3a2410', larg: 1.3, esc: 1.2 });
    const pelo = (x, y, z, s = 1) => { const c = esf(0.2 * s, M('#7a4f2a'), 1, 1.1, 1); c.position.set(x, y, z); return c; };
    const cabeca2 = esf(0.26, M('#7a4f2a'), 1, 1.05, 1); cabeca2.position.set(0, 1.66, 0);
    const focinho = caixa(0.18, 0.12, 0.12, M('#2a1a0c')); focinho.position.set(0, 1.58, 0.26);
    const olhos = caixa(0.2, 0.04, 0.02, M('#1a1008')); olhos.position.set(0, 1.7, 0.24);
    p.cabeca.visible = false;
    const bandoleira = cil(0.05, 0.05, 0.85, M('#2a1c10'), 6); bandoleira.position.set(0, 1.12, 0.22); bandoleira.rotation.z = 0.75;
    const fivela = caixa(0.1, 0.1, 0.04, M('#b8941f', { metalness: 0.8 })); fivela.position.set(0, 1.12, 0.26);
    const bowcaster = new THREE.Group(); bowcaster.add(caixa(0.12, 0.16, 0.7, M('#3a3f4a', { metalness: 0.7 })), caixa(0.4, 0.05, 0.06, M('#8a6a3a')), glow('#ff8a2a', 0.5)); bowcaster.children[2].position.set(0, 0.02, 0.45);
    empunhar(p.bracoD, bowcaster, [-Math.PI / 2 + 0.05, 0, 0], -0.5);
    g.add(pelo(0, 1.25, -0.1, 1.4), pelo(0.42, 1.2, 0, 0.7), pelo(-0.42, 1.2, 0, 0.7), cabeca2, focinho, olhos, bandoleira, fivela);
    return { grupo: g, altura: 2.15, partes: { ...p, arma: bowcaster }, arma: 'corpo', cor: '#ff8a2a' };
  },

  // =================================================================== INIMIGOS
  goblin() { // Soldado do Império
    const { g, p } = humanoide({ torso: '#f2f4f7', calca: '#e1e5ea', pele: '#f2f4f7', botas: '#20232b', esc: 1 });
    const capacete = esf(0.25, M('#f7f9fb', { metalness: 0.2 }), 1, 1.05, 1.05); capacete.position.y = 1.63;
    const visor = caixa(0.34, 0.1, 0.1, M('#0b0d12')); visor.position.set(0, 1.62, 0.2);
    const visor2 = caixa(0.16, 0.2, 0.08, M('#0b0d12')); visor2.position.set(0, 1.5, 0.22);
    p.cabeca.visible = false;
    const rifle = new THREE.Group(); rifle.add(caixa(0.1, 0.14, 0.7, M('#1c2029', { metalness: 0.7 })), glow('#ff3b3b', 0.5)); rifle.children[1].position.set(0, 0.02, 0.42);
    empunhar(p.bracoD, rifle, [-Math.PI / 2 + 0.05, 0, 0], -0.5);
    g.add(capacete, visor, visor2);
    return { grupo: g, altura: 1.85, partes: { ...p, arma: rifle }, arma: 'tiro', cor: '#ff3b3b' };
  },
  lobo() { // Wampa
    const g = new THREE.Group(); const p = {};
    const pele = M('#e6eef2'), escura = M('#aebcc6');
    const corpo = cap(0.34, 0.9, pele); corpo.rotation.x = Math.PI / 2; corpo.position.set(0, 0.78, 0);
    const lombo = caixa(0.5, 0.14, 0.9, escura); lombo.position.set(0, 1.1, -0.05);
    const cabeca = new THREE.Group(); cabeca.position.set(0, 0.95, 0.75);
    cabeca.add(caixa(0.4, 0.36, 0.5, pele), mesh(new THREE.BoxGeometry(0.28, 0.2, 0.3), escura, 0, -0.08, 0.34),
      mesh(new THREE.ConeGeometry(0.05, 0.22, 6), M('#f0e6d0'), 0.1, -0.24, 0.45), mesh(new THREE.ConeGeometry(0.05, 0.22, 6), M('#f0e6d0'), -0.1, -0.24, 0.45),
      mesh(new THREE.SphereGeometry(0.05, 8, 6), E('#58c8ff', 3), 0.14, 0.1, 0.24), mesh(new THREE.SphereGeometry(0.05, 8, 6), E('#58c8ff', 3), -0.14, 0.1, 0.24),
      mesh(new THREE.ConeGeometry(0.08, 0.22, 5), escura, 0.15, 0.28, 0), mesh(new THREE.ConeGeometry(0.08, 0.22, 5), escura, -0.15, 0.28, 0));
    const patas = [[-0.22, 0.45], [0.22, 0.45], [-0.22, -0.45], [0.22, -0.45]].map(([x, z]) => { const l = cil(0.09, 0.07, 0.62, escura); l.position.set(x, 0.32, z); return l; });
    const cauda = cone(0.1, 0.6, escura, 6); cauda.position.set(0, 0.95, -0.85); cauda.rotation.x = -1.1;
    const espinhos = [0.4, 0.1, -0.2, -0.5].map((z) => { const s = cone(0.07, 0.25, M('#8a9aa6'), 5); s.position.set(0, 1.25, z); return s; });
    p.cabeca = cabeca; p.corpo = corpo;
    g.add(corpo, lombo, cabeca, cauda, ...patas, ...espinhos);
    return { grupo: g, altura: 1.5, partes: p, arma: 'corpo', cor: '#ff9a2e' };
  },
  esqueleto: () => droideBatalha(false),
  zumbi: () => droideBatalha(true),
  morcego() { // Droide Sonda
    const g = new THREE.Group(); const p = {};
    const corpo = esf(0.42, M('#262b36', { metalness: 0.8, roughness: 0.35 })); corpo.position.y = 0;
    const lente = esf(0.18, E('#ff2a2a', 3)); lente.position.set(0, 0, 0.36); const brilho = glow('#ff2a2a', 0.9); brilho.position.set(0, 0, 0.42);
    const anel = mesh(new THREE.TorusGeometry(0.44, 0.04, 6, 20), M('#555d70', { metalness: 0.9 }), 0, 0, 0); anel.rotation.x = Math.PI / 2;
    const bracos = [0, 1, 2].map((i) => { const a = (i / 3) * Math.PI * 2; const b = cil(0.025, 0.02, 0.55, M('#555d70', { metalness: 0.8 })); b.position.set(Math.cos(a) * 0.3, -0.35, Math.sin(a) * 0.3); b.rotation.set(Math.sin(a) * 0.5, 0, -Math.cos(a) * 0.5); return b; });
    const antena = cil(0.012, 0.012, 0.5, M('#aab'), 5); antena.position.set(0, 0.6, -0.1);
    const grupo = new THREE.Group(); grupo.add(corpo, lente, brilho, anel, ...bracos, antena); grupo.position.y = 1.35; g.add(grupo);
    p.corpo = grupo; p.cabeca = grupo; p.anel = anel;
    return { grupo: g, altura: 2.0, partes: p, flutua: true, arma: 'tiro', cor: '#ff2a2a' };
  },
  cultista() { // Inquisidor
    const g = new THREE.Group(); const p = {};
    const robe = cone(0.6, 1.65, M('#15151d', { side: THREE.DoubleSide }), 14); robe.position.y = 0.82;
    const torso = cap(0.25, 0.3, M('#22222e')); torso.position.y = 1.38; torso.scale.z = 0.8;
    const cabeca = esf(0.2, M('#c21f1f')); cabeca.position.y = 1.8;
    const capuz = new THREE.Group(); for (let i = -2; i <= 2; i++) { const c = cone(0.03, 0.2 + (2 - Math.abs(i)) * 0.05, M('#101016'), 5); c.position.set(i * 0.07, 2.0 + (2 - Math.abs(i)) * 0.02, 0); capuz.add(c); }
    const tatu = caixa(0.2, 0.28, 0.02, M('#111')); tatu.position.set(0, 1.8, 0.2); capuz.add(tatu);
    const olhos = caixa(0.2, 0.035, 0.02, E('#ffd23a', 3)); olhos.position.set(0, 1.8, 0.19);
    const braco = (l) => { const s = new THREE.Group(); s.position.set(0.33 * l, 1.55, 0); s.add(mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.5, 8), M('#15151d'), 0, -0.25, 0), mesh(new THREE.SphereGeometry(0.07, 8, 6), M('#cfc6c0'), 0, -0.55, 0)); return s; };
    p.bracoD = braco(1); p.bracoE = braco(-1); p.cabeca = cabeca; p.corpo = torso;
    const dupla = new THREE.Group(); const b1 = sabre('#ff2a3a', 0.8), b2 = sabre('#ff2a3a', 0.8); b2.rotation.z = Math.PI; dupla.add(b1, b2);
    empunhar(p.bracoD, dupla, [-Math.PI / 2 + 0.3, 0, 0]);
    g.add(robe, torso, cabeca, capuz, olhos, p.bracoD, p.bracoE);
    return { grupo: g, altura: 2.1, partes: { ...p, saber: dupla }, arma: 'corpo', cor: '#ff2a3a' };
  },
  vampiro() { // Caçador Sombrio
    const { g, p } = humanoide({ torso: '#5f7a58', calca: '#4a5a4e', pele: '#8a9484', botas: '#3a3f35', larg: 1.1, esc: 1.12 });
    const capa = cone(0.7, 1.5, M('#6a5a3a', { side: THREE.DoubleSide }), 14, true); capa.position.set(0, 0.85, -0.2); capa.scale.z = 0.5;
    const mascara = esf(0.235, M('#5f7a58', { metalness: 0.6, roughness: 0.4 }), 1, 1.1, 1); mascara.position.y = 1.64;
    const olhos = caixa(0.3, 0.05, 0.02, E('#101010', 0.1)); olhos.position.set(0, 1.66, 0.22);
    const tvisor = caixa(0.05, 0.22, 0.02, E('#101010', 0.1)); tvisor.position.set(0, 1.6, 0.225);
    const ombro = (x) => { const o = esf(0.2, M('#b8412a', { metalness: 0.6 }), 1, 0.7, 1); o.position.set(x, 1.5, 0); return o; };
    const linhas = caixa(0.34, 0.4, 0.04, M('#b8941f', { metalness: 0.7 })); linhas.position.set(0, 1.1, 0.24);
    const jato = caixa(0.34, 0.6, 0.2, M('#4a5a4e', { metalness: 0.7 })); jato.position.set(0, 1.1, -0.3);
    const chama = glow('#58b8ff', 0.5); chama.position.set(0, 0.7, -0.3);
    p.cabeca.visible = false;
    const garras = (b) => [-0.04, 0, 0.04].map((x) => { const c = cone(0.012, 0.16, M('#e6e0e6'), 4); c.position.set(x, -0.7, 0.03); c.rotation.x = Math.PI; b.add(c); return c; });
    garras(p.bracoD); garras(p.bracoE);
    g.add(capa, mascara, olhos, tvisor, ombro(0.4), ombro(-0.4), linhas, jato, chama);
    return { grupo: g, altura: 2.15, partes: p, arma: 'tiro', cor: '#ff5a3a' };
  },
  golem() { // Andador Blindado
    const g = new THREE.Group(); const p = {};
    const cinza = M('#6b7585', { metalness: 0.7, roughness: 0.45 }), escura = M('#2a303c', { metalness: 0.8 });
    const corpo = caixa(1.7, 0.9, 1.9, cinza); corpo.position.y = 2.1;
    const topo = caixa(1.4, 0.3, 1.5, escura); topo.position.y = 2.7;
    const cabeca = new THREE.Group(); cabeca.position.set(0, 2.25, 1.15);
    cabeca.add(caixa(0.7, 0.55, 0.9, cinza), mesh(new THREE.BoxGeometry(0.5, 0.12, 0.05), E('#ff7a1f', 3), 0, 0.1, 0.46), mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.9, 8), escura, 0.2, -0.2, 0.7), mesh(new THREE.CylinderGeometry(0.07, 0.09, 0.9, 8), escura, -0.2, -0.2, 0.7));
    cabeca.children[3].rotation.x = Math.PI / 2; cabeca.children[4].rotation.x = Math.PI / 2;
    const janelas = [-0.55, 0, 0.55].map((z) => { const j = caixa(0.04, 0.16, 0.3, E('#ff7a1f', 2)); j.position.set(0.86, 2.25, z); return j; });
    const pernas = [[-0.75, 0.7], [0.75, 0.7], [-0.75, -0.7], [0.75, -0.7]].map(([x, z]) => {
      const l = new THREE.Group(); l.position.set(x, 1.7, z);
      const a = cil(0.14, 0.12, 1.1, escura); a.position.y = -0.4; a.rotation.z = x > 0 ? -0.35 : 0.35; l.add(a, caixa(0.5, 0.15, 0.6, cinza)); l.children[1].position.set(x > 0 ? 0.35 : -0.35, -1.0, 0); return l;
    });
    p.cabeca = cabeca; p.corpo = corpo; p.pernas = pernas;
    g.add(corpo, topo, cabeca, ...janelas, ...pernas);
    return { grupo: g, altura: 3.1, partes: p, arma: 'tiro', cor: '#ff7a1f', raio: 1.2 };
  },
  demogorgon() { // Lorde Sombrio (chefe)
    const { g, p } = humanoide({ torso: '#0e0d14', calca: '#0a0910', pele: '#222', botas: '#050508', larg: 1.25, esc: 1.45 });
    const capa = cone(0.95, 2.2, M('#150a10', { side: THREE.DoubleSide }), 16, true); capa.position.set(0, 1.0, -0.25); capa.scale.z = 0.5;
    const capaInt = cone(0.9, 2.1, M('#6a0f1a', { side: THREE.DoubleSide }), 16, true); capaInt.position.set(0, 1.0, -0.2); capaInt.scale.z = 0.5;
    const elmo = esf(0.32, M('#0b0b10', { metalness: 0.8, roughness: 0.2 }), 1.12, 1.05, 1.05); elmo.position.y = 1.68;
    const crista = new THREE.Mesh(new THREE.SphereGeometry(0.34, 14, 8, 0, Math.PI * 2, 0, Math.PI / 2), M('#0b0b10', { metalness: 0.85, roughness: 0.2 })); crista.position.set(0, 1.72, -0.04); crista.scale.set(1.15, 0.9, 1.1);
    const olhos = new THREE.Mesh(new THREE.ConeGeometry(0.1, 0.1, 3), E('#1a1a22', 0.2)); olhos.position.set(0, 1.66, 0.3); olhos.rotation.x = Math.PI / 2; olhos.scale.set(1.8, 1, 0.4);
    const grade = caixa(0.18, 0.16, 0.06, M('#2a2a34', { metalness: 0.7 })); grade.position.set(0, 1.5, 0.3);
    const ombro = (x) => { const o = esf(0.26, M('#16151e', { metalness: 0.7 }), 1.1, 0.7, 1); o.position.set(x, 1.5, 0); return o; };
    const painel = caixa(0.34, 0.3, 0.04, M('#1c1c26', { metalness: 0.7 })); painel.position.set(0, 1.15, 0.26); const luzes = [-0.08, 0, 0.08].map((x, i) => { const l = caixa(0.04, 0.04, 0.02, E(['#ff2030', '#3a8cff', '#ffe066'][i], 2.5)); l.position.set(x, 1.17, 0.29); return l; }); g.add(...luzes);
    p.cabeca.visible = false;
    const s = sabre('#ff1e2e', 1.5); empunhar(p.bracoD, s); p.bracoD.rotation.x = -0.4;
    const ciber = mesh(new THREE.CylinderGeometry(0.09, 0.07, 0.5, 8), E('#ff1e2e', 1.4), 0, -0.27, 0); ciber.visible = false;
    p.bracoE.add(ciber);
    g.add(capa, capaInt, elmo, crista, olhos, grade, ombro(0.5), ombro(-0.5), painel, glow('#ff1e2e', 0.01));
    return { grupo: g, altura: 2.95, partes: { ...p, saber: s, ciber, olhos, painel }, arma: 'corpo', cor: '#ff1e2e', raio: 0.6 };
  },
  bau() { // Contêiner de Carga
    const g = new THREE.Group();
    const c = caixa(1.3, 0.95, 1.0, M('#4a5568', { metalness: 0.7, roughness: 0.45 })); c.position.y = 0.48;
    const listra = (x) => { const l = caixa(0.14, 0.97, 1.02, M('#f2c94c')); l.position.set(x, 0.48, 0); return l; };
    const fresta = caixa(1.32, 0.05, 1.02, E('#58e1ff', 2.4)); fresta.position.y = 0.68;
    const alca = caixa(0.3, 0.08, 0.1, M('#2a303c')); alca.position.set(0, 1.0, 0);
    g.add(c, listra(-0.45), listra(0.45), fresta, alca);
    return { grupo: g, altura: 1.1, partes: { corpo: c }, cor: '#58e1ff', estatico: true };
  },
  portao() { // Portão do Hangar com campo defletor
    const g = new THREE.Group();
    const m = M('#59647a', { metalness: 0.7, roughness: 0.4 });
    const pilar = (x) => { const p = caixa(0.34, 2.3, 0.4, m); p.position.set(x, 1.15, 0); const luz = caixa(0.06, 1.8, 0.05, E('#58e1ff', 2.4)); luz.position.set(x, 1.15, 0.22); return [p, luz]; };
    const viga = caixa(2.3, 0.3, 0.45, m); viga.position.y = 2.35;
    const campo = new THREE.Mesh(new THREE.PlaneGeometry(1.8, 2.1), new THREE.MeshBasicMaterial({ color: '#58e1ff', transparent: true, opacity: 0.28, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    campo.position.y = 1.2; campo.userData.campo = true;
    g.add(...pilar(-1), ...pilar(1), viga, campo);
    return { grupo: g, altura: 2.6, partes: { campo }, cor: '#58e1ff', estatico: true };
  },
};

function droideBatalha(queimado) {
  const cor = queimado ? '#4a4540' : '#cdb78a', cor2 = queimado ? '#2a2724' : '#a08f68';
  const g = new THREE.Group(); const p = {};
  const torso = caixa(0.36, 0.56, 0.2, M(cor, { roughness: 0.7 })); torso.position.y = 1.05;
  const pelve = caixa(0.28, 0.16, 0.18, M(cor2)); pelve.position.y = 0.72;
  const perna = (x) => { const l = new THREE.Group(); l.position.set(x, 0.7, 0); l.add(mesh(new THREE.CylinderGeometry(0.05, 0.04, 0.7, 6), M(cor2), 0, -0.35, 0), mesh(new THREE.BoxGeometry(0.12, 0.06, 0.24), M(cor2), 0, -0.7, 0.05)); return l; };
  const cabeca = new THREE.Group(); cabeca.position.y = 1.5;
  cabeca.add(mesh(new THREE.CapsuleGeometry(0.1, 0.24, 4, 8), M(cor), 0, 0.02, 0.06), mesh(new THREE.BoxGeometry(0.14, 0.04, 0.03), E(queimado ? '#ff7a1f' : '#ffb340', 3), 0, 0.04, 0.17));
  cabeca.rotation.x = 0.2;
  const braco = (l) => { const s = new THREE.Group(); s.position.set(0.26 * l, 1.26, 0); s.add(mesh(new THREE.CylinderGeometry(0.035, 0.03, 0.55, 6), M(cor2), 0, -0.27, 0)); return s; };
  p.bracoD = braco(1); p.bracoE = braco(-1); p.cabeca = cabeca; p.corpo = torso;
  const rifle = new THREE.Group(); rifle.add(caixa(0.07, 0.1, 0.5, M('#222834', { metalness: 0.8 })), glow('#ff3b3b', 0.4)); rifle.children[1].position.set(0, 0.02, 0.3);
  empunhar(p.bracoD, rifle, [-Math.PI / 2 + 0.05, 0, 0], -0.5);
  const detalhes = [];
  if (queimado) {
    const fa = (x, y) => { const s = esf(0.05, E('#ff7a1f', 3)); s.position.set(x, y, 0.11); return s; };
    detalhes.push(fa(0.1, 1.15), fa(-0.08, 0.95), caixa(0.1, 0.02, 0.02, E('#58e1ff', 2.5)));
    detalhes[2].position.set(-0.06, 1.2, 0.11);
    p.bracoE.rotation.z = 0.5; torso.rotation.z = 0.12;
  }
  g.add(torso, pelve, perna(-0.1), perna(0.1), cabeca, p.bracoD, p.bracoE, ...detalhes);
  g.scale.setScalar(queimado ? 1.12 : 1.05);
  return { grupo: g, altura: 1.9, partes: { ...p, arma: rifle }, arma: 'tiro', cor: queimado ? '#ff7a1f' : '#ffb340' };
}

// ----------------------------------------------------------------- variantes (recolor) e novos heróis
/** Reaproveita um modelo trocando cores de materiais (mapa "hex sem #" -> nova cor). */
function variante(base, trocas = {}, extra) {
  const m = base();
  const ajusta = (mat) => {
    if (!mat) return;
    const hc = mat.color?.getHexString?.(); if (hc && trocas[hc]) mat.color.set(trocas[hc]);
    const he = mat.emissive?.getHexString?.(); if (he && he !== '000000' && trocas[he]) mat.emissive.set(trocas[he]);
  };
  m.grupo.traverse((o) => ajusta(o.material));
  if (m.cor) { const k = m.cor.replace('#', ''); if (trocas[k]) m.cor = trocas[k]; }
  extra?.(m);
  return m;
}

MODELOS.obiwan = () => variante(MODELOS.luke, { '1b1b22': '#cdb48c', '14141a': '#6b5a3e', '101014': '#7a6347', c9a25a: '#8a5a34', '3dff6a': '#4fa8ff', '0b0b0e': '#3a2b1c' }, (m) => {
  const barba = esf(0.2, M('#8a5a34'), 1, 0.8, 0.9); barba.position.set(0, 1.5, 0.08); m.grupo.add(barba);
});
MODELOS.mace = () => variante(MODELOS.luke, { '1b1b22': '#6b3fa0', '14141a': '#3a2a55', '101014': '#4b2f70', c9a25a: '#7a4f32', e2b48e: '#7a4f32', '3dff6a': '#c06bff', '0b0b0e': '#25183a' });
MODELOS.ahsoka = () => variante(MODELOS.luke, { '1b1b22': '#2a5a8a', '14141a': '#1d2f4a', '101014': '#d9692a', c9a25a: '#e0742f', e2b48e: '#e0742f', '3dff6a': '#8cff5a', '0b0b0e': '#142238' }, (m) => {
  const chifre = (x) => { const c = cone(0.07, 0.5, M('#e0742f'), 6); c.position.set(x * 0.22, 1.95, 0); c.rotation.z = -x * 0.35; return c; };
  const faixa = (x) => { const c = caixa(0.04, 0.2, 0.02, M('#fff1d0')); c.position.set(x * 0.1, 1.62, 0.22); return c; };
  m.grupo.add(chifre(1), chifre(-1), faixa(1), faixa(-1));
  if (m.partes.bracoE) { const s2 = sabre('#ffe066', 1.0); empunhar(m.partes.bracoE, s2); m.partes.bracoE.rotation.x = -0.4; }
});
MODELOS.lando = () => variante(MODELOS.han, { e9e6dc: '#f2c04a', '2a3042': '#1d2a4a', '5a3a22': '#1a120d', e2b48e: '#8a5a3a', '2a1f16': '#1a120d' }, (m) => {
  const capa = cone(0.62, 1.4, M('#2a6ad6', { side: THREE.DoubleSide }), 12, true); capa.position.set(0, 0.85, -0.18); capa.scale.z = 0.5; m.grupo.add(capa);
  const bigode = caixa(0.18, 0.03, 0.03, M('#1a120d')); bigode.position.set(0, 1.55, 0.21); m.grupo.add(bigode);
});
MODELOS.r2 = () => {
  const g = new THREE.Group(); const p = {};
  const corpo = cil(0.34, 0.36, 0.7, M('#e8ecf2', { metalness: 0.5, roughness: 0.35 }), 16); corpo.position.y = 0.62;
  const faixa1 = cil(0.345, 0.345, 0.12, M('#2a6ad6'), 16); faixa1.position.y = 0.42;
  const faixa2 = cil(0.345, 0.345, 0.08, M('#2a6ad6'), 16); faixa2.position.y = 0.78;
  const cupula = new THREE.Mesh(new THREE.SphereGeometry(0.34, 18, 10, 0, Math.PI * 2, 0, Math.PI / 2), M('#e8ecf2', { metalness: 0.5, roughness: 0.3 })); cupula.position.y = 0.97;
  const lente = esf(0.085, E('#ff3b3b', 3)); lente.position.set(0, 1.12, 0.27);
  const lenteB = esf(0.06, E('#58a6ff', 3)); lenteB.position.set(0.14, 1.05, 0.26);
  const brilho = glow('#ff3b3b', 0.45); brilho.position.set(0, 1.12, 0.31);
  const perna = (x) => { const l = caixa(0.1, 0.55, 0.16, M('#2a6ad6', { metalness: 0.4 })); l.position.set(x, 0.3, 0); const pe = caixa(0.16, 0.07, 0.3, M('#8a93a3', { metalness: 0.7 })); pe.position.set(x, 0.04, 0.06); return [l, pe]; };
  const braco = (l) => { const s = new THREE.Group(); s.position.set(0.37 * l, 0.8, 0); s.add(mesh(new THREE.CylinderGeometry(0.035, 0.035, 0.4, 6), M('#8a93a3', { metalness: 0.8 }), 0, -0.2, 0)); return s; };
  p.bracoD = braco(1); p.bracoE = braco(-1); p.cabeca = cupula; p.corpo = corpo;
  g.add(corpo, faixa1, faixa2, cupula, lente, lenteB, brilho, ...perna(-0.26), ...perna(0.26), p.bracoD, p.bracoE);
  return { grupo: g, altura: 1.5, partes: p, arma: 'magia', cor: '#58a6ff' };
};

export function criarModelo(chave) {
  const f = MODELOS[chave] ?? MODELOS.goblin;
  return f();
}
