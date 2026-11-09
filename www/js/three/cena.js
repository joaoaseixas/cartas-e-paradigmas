// Cena 3D compartilhada (um único WebGL). Cenário de ópera espacial: estrelas, nebulosa, planeta,
// cruzadores distantes e uma plataforma de combate. Também hospeda efeitos (tiros, raios, faíscas).
import * as THREE from 'three';

export const TEMAS_3D = {
  floresta: { c1: '#0e2a22', c2: '#02080a', accent: '#f2b134', planeta: ['#2f8a52', '#1b4d3a', '#8fd6a0'], neb: ['#1d8f6a', '#2a4bd6'], luz: '#bfffe0' },
  noite: { c1: '#0b1233', c2: '#02030a', accent: '#f2b134', planeta: ['#2b3f8f', '#121c4a', '#7aa0ff'], neb: ['#2a4bd6', '#7a2ad6'], luz: '#a8c4ff' },
  cripta: { c1: '#1d0f33', c2: '#06020d', accent: '#f2b134', planeta: ['#5a2d8a', '#2a1347', '#c9a0ff'], neb: ['#7a2ad6', '#d62a8f'], luz: '#d8b8ff' },
  cidadela: { c1: '#16202e', c2: '#04070c', accent: '#f2b134', planeta: ['#4a5d78', '#1f2a3a', '#9fb7d6'], neb: ['#2a6bd6', '#1f9fbf'], luz: '#d0e8ff' },
  mina: { c1: '#2a1608', c2: '#080402', accent: '#f2b134', planeta: ['#a35a20', '#4a2610', '#ffb878'], neb: ['#d66a2a', '#8f2a2a'], luz: '#ffd8a8' },
  salao: { c1: '#2d0a16', c2: '#080205', accent: '#e5503f', planeta: ['#8a1f3a', '#3d0c19', '#ff8fa8'], neb: ['#d62a4a', '#6a2ad6'], luz: '#ffc0cc' },
  covil: { c1: '#330808', c2: '#0a0202', accent: '#e5503f', planeta: ['#c2300f', '#4a0e05', '#ff9060'], neb: ['#d6402a', '#8f0f2a'], luz: '#ffb8a0' },
};

const cor = (c) => new THREE.Color(c);

/** Parâmetros de enquadramento da batalha (ajustáveis em tempo de execução via window.__L). */
export const LAYOUT = { zE: -4.6, zH: 3.0, esE: 3.0, esH: 1.55, cam: [0, 9.2, 10.2], look: [0, 0.9, -0.6], largura: 8.0 };
if (typeof window !== 'undefined') window.__L = LAYOUT;

function texturaGlow(tam = 128, rgb = '255,255,255') {
  const c = document.createElement('canvas'); c.width = c.height = tam;
  const g = c.getContext('2d'), grad = g.createRadialGradient(tam / 2, tam / 2, 0, tam / 2, tam / 2, tam / 2);
  grad.addColorStop(0, `rgba(${rgb},1)`); grad.addColorStop(0.25, `rgba(${rgb},.55)`); grad.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = grad; g.fillRect(0, 0, tam, tam);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

function texturaPlaneta(c1, c2, c3, seed = 3) {
  const w = 512, h = 256, c = document.createElement('canvas'); c.width = w; c.height = h;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, h); grad.addColorStop(0, c1); grad.addColorStop(1, c2);
  g.fillStyle = grad; g.fillRect(0, 0, w, h);
  let s = seed; const r = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  for (let i = 0; i < 90; i++) {
    g.globalAlpha = 0.12 + r() * 0.2; g.fillStyle = r() > 0.5 ? c3 : c2;
    g.beginPath(); g.ellipse(r() * w, r() * h, 20 + r() * 70, 6 + r() * 26, r() * 0.6, 0, Math.PI * 2); g.fill();
  }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = THREE.RepeatWrapping; return t;
}

function texturaGrade(accent) {
  const n = 512, c = document.createElement('canvas'); c.width = c.height = n;
  const g = c.getContext('2d');
  g.fillStyle = '#0c1220'; g.fillRect(0, 0, n, n);
  g.strokeStyle = accent; g.globalAlpha = 0.28; g.lineWidth = 2;
  for (let i = 0; i <= 16; i++) { const p = (i / 16) * n; g.beginPath(); g.moveTo(p, 0); g.lineTo(p, n); g.moveTo(0, p); g.lineTo(n, p); g.stroke(); }
  g.globalAlpha = 0.5; g.lineWidth = 4;
  g.beginPath(); g.arc(n / 2, n / 2, n * 0.34, 0, Math.PI * 2); g.stroke();
  g.beginPath(); g.arc(n / 2, n / 2, n * 0.18, 0, Math.PI * 2); g.stroke();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}

export class Cena3D {
  constructor() {
    this.ok = false;
    this.atores = new Map();
    this.efeitos = []; // {update(dt)->bool vivo}
    this.tempo = 0;
    this.regiao = null;
    this.modo = 'ambiente';
    this.shake = 0;
    this.aoQuadro = null;
    this.tema = null;
    try {
      this.canvas = document.createElement('canvas');
      this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: 'high-performance' });
      this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      this.renderer.outputColorSpace = THREE.SRGBColorSpace;
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.15;
      this.ok = true;
    } catch (e) { console.warn('WebGL indisponível, usando modo 2D', e); return; }

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 0.7, 0.1, 300);
    this.glow = texturaGlow(128, '255,255,255');
    this.glowCache = new Map();
    this._luzes(); this._fundo(); this._plataforma();
    this.alvoCam = new THREE.Vector3(0, 1.1, -0.8);
    this.posCam = new THREE.Vector3(0, 5.4, 10.8);
    this.orbita = 0;

    this.canvas.addEventListener('webglcontextlost', (e) => { e.preventDefault(); this.perdido = true; });
    this.canvas.addEventListener('webglcontextrestored', () => { this.perdido = false; });
    document.addEventListener('visibilitychange', () => { this.pausado = document.hidden; if (!document.hidden) this.relogio = performance.now(); });
    this.relogio = performance.now();
    const quadro = (agora) => {
      requestAnimationFrame(quadro);
      if (this.pausado || this.perdido) return;
      const dt = Math.min(0.05, (agora - this.relogio) / 1000); this.relogio = agora;
      this.atualizar(dt); this.desenhar();
    };
    requestAnimationFrame(quadro);
  }

  // ------------------------------------------------------------ construção
  _luzes() {
    this.amb = new THREE.HemisphereLight(0x8fa8ff, 0x1a1030, 1.15);
    this.key = new THREE.DirectionalLight(0xffffff, 2.2); this.key.position.set(-4, 9, 7);
    this.rim = new THREE.DirectionalLight(0x58e1ff, 1.6); this.rim.position.set(6, 4, -8);
    this.fill = new THREE.PointLight(0xffffff, 18, 18, 1.6); this.fill.position.set(0, 3, 3);
    this.scene.add(this.amb, this.key, this.rim, this.fill);
  }

  _fundo() {
    // estrelas
    const n = 1400, pos = new Float32Array(n * 3), col = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) {
      const u = Math.random() * 2 - 1, a = Math.random() * Math.PI * 2, r = 90 + Math.random() * 40, s = Math.sqrt(1 - u * u);
      pos.set([r * s * Math.cos(a), Math.abs(r * u) * 0.7 + 2, r * s * Math.sin(a)], i * 3);
      const k = 0.6 + Math.random() * 0.4; col.set([k, k, 1], i * 3);
    }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    this.estrelas = new THREE.Points(g, new THREE.PointsMaterial({ size: 2.2, sizeAttenuation: false, vertexColors: true, transparent: true, opacity: 0.9, depthWrite: false }));
    this.scene.add(this.estrelas);
    // nebulosas (sprites grandes aditivos)
    this.nebs = [0, 1].map((i) => {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, transparent: true, opacity: 0.5, blending: THREE.AdditiveBlending, depthWrite: false, fog: false }));
      s.scale.set(120, 80, 1); s.position.set(i ? 40 : -35, 18 + i * 10, -80 - i * 10); this.scene.add(s); return s;
    });
    // planeta + atmosfera
    this.planeta = new THREE.Group();
    this.planetaMesh = new THREE.Mesh(new THREE.SphereGeometry(10, 40, 28), new THREE.MeshStandardMaterial({ roughness: 0.9, metalness: 0, emissive: 0x000000 }));
    this.atmos = new THREE.Mesh(new THREE.SphereGeometry(10.6, 40, 28), new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.16, side: THREE.BackSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.planeta.add(this.planetaMesh, this.atmos); this.planeta.position.set(-22, 12, -62); this.scene.add(this.planeta);
    // cruzadores distantes
    this.naves = [];
    for (let i = 0; i < 3; i++) {
      const g2 = new THREE.Group();
      const casco = new THREE.Mesh(new THREE.ConeGeometry(1.4, 7, 3), new THREE.MeshStandardMaterial({ color: 0x6b7585, metalness: 0.6, roughness: 0.5, flatShading: true }));
      casco.rotation.x = Math.PI / 2; casco.scale.set(1.6, 1, 0.35);
      const motor = new THREE.Sprite(new THREE.SpriteMaterial({ map: this.glow, color: 0x58b8ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
      motor.scale.set(3, 3, 1); motor.position.z = 3.6;
      g2.add(casco, motor); g2.userData = { v: 0.6 + Math.random() * 0.8, base: i };
      g2.position.set(-50 + i * 40, 10 + i * 4, -50 - i * 14); g2.scale.setScalar(0.8 + i * 0.4);
      this.scene.add(g2); this.naves.push(g2);
    }
    this.scene.fog = new THREE.FogExp2(0x05060f, 0.012);
  }

  _plataforma() {
    this.plataforma = new THREE.Group();
    this.matChao = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.6, roughness: 0.45 });
    const topo = new THREE.Mesh(new THREE.CylinderGeometry(7.6, 7.6, 0.5, 64), [new THREE.MeshStandardMaterial({ color: 0x1b2438, metalness: 0.7, roughness: 0.4 }), this.matChao, new THREE.MeshStandardMaterial({ color: 0x0b101c })]);
    topo.position.y = -0.25;
    this.anel = new THREE.Mesh(new THREE.TorusGeometry(7.55, 0.07, 8, 96), new THREE.MeshBasicMaterial({ color: 0x58e1ff }));
    this.anel.rotation.x = Math.PI / 2; this.anel.position.y = 0.02;
    this.anel2 = new THREE.Mesh(new THREE.TorusGeometry(4.6, 0.035, 8, 96), new THREE.MeshBasicMaterial({ color: 0x58e1ff, transparent: true, opacity: 0.55 }));
    this.anel2.rotation.x = Math.PI / 2; this.anel2.position.y = 0.02;
    const base = new THREE.Mesh(new THREE.CylinderGeometry(6.2, 2.4, 3, 32), new THREE.MeshStandardMaterial({ color: 0x0f1626, metalness: 0.7, roughness: 0.5 }));
    base.position.y = -2;
    this.plataforma.add(topo, this.anel, this.anel2, base); this.scene.add(this.plataforma);
  }

  // ------------------------------------------------------------ tema / modo
  aplicarTema(id) {
    if (!this.ok) return;
    const t = TEMAS_3D[id] ?? TEMAS_3D.noite; if (this.tema === id) return; this.tema = id;
    this.scene.background = cor(t.c2);
    this.scene.fog.color = cor(t.c2);
    this.planetaMesh.material.map = texturaPlaneta(t.planeta[0], t.planeta[1], t.planeta[2], id.length * 7);
    this.planetaMesh.material.needsUpdate = true;
    this.atmos.material.color = cor(t.planeta[2]);
    this.nebs.forEach((s, i) => { s.material.color = cor(t.neb[i]); });
    this.anel.material.color = cor(t.accent); this.anel2.material.color = cor(t.accent);
    this.rim.color = cor(t.accent); this.amb.color = cor(t.luz); this.fill.color = cor(t.accent);
    this.matChao.map?.dispose(); this.matChao.map = texturaGrade(t.accent); this.matChao.needsUpdate = true;
    this.accent = t.accent;
  }

  anexar(el) {
    if (!this.ok) return;
    if (this.canvas.parentElement !== el) el.prepend(this.canvas);
    this.container = el;
    this.ro?.disconnect();
    this.ro = new ResizeObserver(() => this.redimensionar());
    this.ro.observe(el);
    this.redimensionar();
  }

  /** Define a área (em px do container) onde a cena é desenhada. null = tudo. */
  definirRegiao(r) { this.regiao = r; this.redimensionar(); }

  redimensionar() {
    if (!this.ok || !this.container) return;
    const w = this.container.clientWidth, h = this.container.clientHeight;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.canvas.style.width = '100%'; this.canvas.style.height = '100%';
    this.cw = w; this.ch = h;
  }

  _regiao() { return this.regiao ?? { x: 0, y: 0, w: this.cw, h: this.ch }; }

  /** Posiciona a câmera de acordo com o formato da área para que o campo de batalha sempre caiba. */
  _ajustarCamera() {
    const r = this._regiao(); const a = r.w / r.h;
    this.camera.aspect = a;
    if (this.modo === 'batalha') {
      const d = new THREE.Vector3(...LAYOUT.cam).distanceTo(new THREE.Vector3(...LAYOUT.look));
      this.camera.fov = THREE.MathUtils.clamp(2 * Math.atan((LAYOUT.largura / 2 / a) / d) * 180 / Math.PI, 34, 75);
    } else this.camera.fov = a < 1 ? 62 : 45;
    this.camera.updateProjectionMatrix();
  }

  modoBatalha(tema) { this.modo = 'batalha'; this.aplicarTema(tema); this.posCam.set(...LAYOUT.cam); this.alvoCam.set(...LAYOUT.look); this.orbita = 0; }
  /** Vitrine: heróis de frente para a câmera (hub, roleta, revelação). */
  modoVitrine(tema, { z = 10, y = 0.6, alt = 2.4 } = {}) {
    this.modo = 'vitrine'; this.aplicarTema(tema); this.limparAtores();
    this.vitrineZ = z; this.vitrineY = y; this.vitrineAlt = alt; this.regiao = null; this.redimensionar();
  }
  modoAmbiente(tema, { palco = false } = {}) {
    this.modo = palco ? 'palco' : 'ambiente'; this.aplicarTema(tema); this.limparAtores();
    this.regiao = null; this.redimensionar();
  }

  limparAtores() {
    this.atores.forEach((a) => this.scene.remove(a.grupo)); this.atores.clear();
    this.efeitos.forEach((e) => e.limpar?.()); this.efeitos = [];
  }

  adicionarAtor(ator) { this.atores.set(ator.id, ator); this.scene.add(ator.grupo); return ator; }

  // ------------------------------------------------------------ loop
  atualizar(dt) {
    this.tempo += dt;
    const t = this.tempo;
    this.estrelas.rotation.y += dt * 0.004;
    this.planeta.rotation.y += dt * 0.02;
    this.naves.forEach((n) => { n.position.x += n.userData.v * dt * 2; if (n.position.x > 70) n.position.x = -70; });
    this.anel2.rotation.z += dt * 0.15;
    this.atores.forEach((a) => a.atualizar(dt, t));
    this.efeitos = this.efeitos.filter((e) => { const vivo = e.update(dt); if (!vivo) e.limpar?.(); return vivo; });

    // câmera
    this.shake = Math.max(0, this.shake - dt * 2.4);
    if (this.modo === 'batalha') {
      this.posCam.set(...LAYOUT.cam); this.alvoCam.set(...LAYOUT.look);
      this.camera.position.set(this.posCam.x + Math.sin(t * 0.25) * 0.35, this.posCam.y + Math.sin(t * 0.4) * 0.12, this.posCam.z);
    } else if (this.modo === 'vitrine') {
      this.camera.position.set(Math.sin(t * 0.35) * 1.3, this.vitrineAlt ?? 2.4, this.vitrineZ ?? 10);
    } else {
      this.orbita += dt * (this.modo === 'palco' ? 0.12 : 0.05);
      const raio = this.modo === 'palco' ? 13.5 : 12;
      this.camera.position.set(Math.sin(this.orbita) * raio, this.modo === 'palco' ? 2.6 : 4.5, Math.cos(this.orbita) * raio);
    }
    if (this.shake > 0) this.camera.position.add(new THREE.Vector3((Math.random() - 0.5) * this.shake, (Math.random() - 0.5) * this.shake, 0));
    this.camera.lookAt(this.modo === 'batalha' ? this.alvoCam : new THREE.Vector3(0, this.modo === 'vitrine' ? (this.vitrineY ?? 0.6) : this.modo === 'palco' ? -2.4 : 1.5, 0));
  }

  desenhar() {
    if (!this.cw) return;
    const r = this._regiao();
    this._ajustarCamera();
    const rd = this.renderer;
    rd.setScissorTest(false); rd.setViewport(0, 0, this.cw, this.ch);
    rd.setClearColor(0x05060f, 1); rd.clear();
    rd.setScissorTest(true);
    const y = this.ch - r.y - r.h;
    rd.setViewport(r.x, y, r.w, r.h); rd.setScissor(r.x, y, r.w, r.h);
    rd.render(this.scene, this.camera);
    this.camera.updateMatrixWorld();
    this.aoQuadro?.(this);
  }

  /** Projeta um ponto 3D para px relativos ao container. */
  projetar(v3) {
    const r = this._regiao();
    const p = v3.clone().project(this.camera);
    return { x: r.x + (p.x * 0.5 + 0.5) * r.w, y: r.y + (-p.y * 0.5 + 0.5) * r.h, atras: p.z > 1 };
  }

  // ------------------------------------------------------------ efeitos
  glowSprite(rgb, tam = 1.5, opacidade = 1) {
    let m = this.glowCache.get(rgb);
    if (!m) { m = new THREE.SpriteMaterial({ map: this.glow, color: rgb, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }); this.glowCache.set(rgb, m); }
    const s = new THREE.Sprite(m.clone()); s.material.opacity = opacidade; s.scale.set(tam, tam, 1); return s;
  }

  _add(obj, update) {
    this.scene.add(obj);
    this.efeitos.push({ update, limpar: () => { this.scene.remove(obj); obj.traverse?.((o) => { o.geometry?.dispose?.(); if (o.material && !o.isSprite) o.material.dispose?.(); if (o.isSprite) o.material.dispose?.(); }); } });
  }

  /** Projétil (tiro de blaster / bola de energia) de A até B. Resolve ao atingir. */
  projetil(de, para, rgb = '#58e1ff', { vel = 26, tamanho = 1, tipo = 'bolt' } = {}) {
    return new Promise((res) => {
      const g = new THREE.Group();
      if (tipo === 'bolt') {
        const m = new THREE.Mesh(new THREE.CylinderGeometry(0.06 * tamanho, 0.06 * tamanho, 0.9 * tamanho, 6), new THREE.MeshBasicMaterial({ color: rgb }));
        m.rotation.x = Math.PI / 2; g.add(m);
      } else g.add(new THREE.Mesh(new THREE.SphereGeometry(0.22 * tamanho, 12, 10), new THREE.MeshBasicMaterial({ color: rgb })));
      g.add(this.glowSprite(rgb, 1.4 * tamanho));
      g.position.copy(de); g.lookAt(para);
      const dist = de.distanceTo(para), dur = Math.max(0.12, dist / vel); let t = 0;
      this._add(g, (dt) => { t += dt; g.position.lerpVectors(de, para, Math.min(1, t / dur)); if (t >= dur) { res(); return false; } return true; });
    });
  }

  /** Corte de sabre: arco brilhante que se expande. */
  corte(pos, rgb = '#4fd1ff', escala = 1.6) {
    const m = new THREE.Mesh(new THREE.TorusGeometry(0.8, 0.06, 6, 24, Math.PI * 0.8), new THREE.MeshBasicMaterial({ color: rgb, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(pos); m.rotation.set(0, 0, Math.random() * 1.2 - 0.6); this.camera && m.lookAt(this.camera.position); m.rotateZ(Math.random() * 6);
    const g = new THREE.Group(); g.add(m, this.glowSprite(rgb, 2.2, 0.8)); g.position.copy(pos); m.position.set(0, 0, 0);
    let t = 0;
    this._add(g, (dt) => { t += dt * 3.2; g.scale.setScalar(escala * (0.5 + t)); g.children.forEach((c) => { c.material.opacity = Math.max(0, 1 - t); }); return t < 1; });
  }

  /** Onda circular (escudo, cura, impacto no chão). */
  anelOnda(pos, rgb = '#58e1ff', { max = 2.4, dur = 0.6, vertical = false } = {}) {
    const m = new THREE.Mesh(new THREE.RingGeometry(0.85, 1, 40), new THREE.MeshBasicMaterial({ color: rgb, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.copy(pos); if (!vertical) m.rotation.x = -Math.PI / 2; else m.lookAt(this.camera.position);
    let t = 0;
    this._add(m, (dt) => { t += dt / dur; m.scale.setScalar(0.2 + t * max); m.material.opacity = Math.max(0, 1 - t); return t < 1; });
  }

  /** Explosão de faíscas. */
  faiscas(pos, rgb = '#ffd27a', n = 22, { vel = 5, vida = 0.7, tam = 0.12 } = {}) {
    const geo = new THREE.BufferGeometry(); const p = new Float32Array(n * 3); const v = [];
    for (let i = 0; i < n; i++) { p.set([pos.x, pos.y, pos.z], i * 3); const d = new THREE.Vector3(Math.random() - 0.5, Math.random() * 0.9 + 0.1, Math.random() - 0.5).normalize().multiplyScalar(vel * (0.4 + Math.random())); v.push(d); }
    geo.setAttribute('position', new THREE.BufferAttribute(p, 3));
    const pts = new THREE.Points(geo, new THREE.PointsMaterial({ color: rgb, size: tam * 40, sizeAttenuation: false, map: this.glow, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
    pts.frustumCulled = false; let t = 0;
    this._add(pts, (dt) => {
      t += dt; const a = geo.attributes.position;
      for (let i = 0; i < n; i++) { v[i].y -= 9 * dt; a.setXYZ(i, a.getX(i) + v[i].x * dt, Math.max(0.02, a.getY(i) + v[i].y * dt), a.getZ(i) + v[i].z * dt); }
      a.needsUpdate = true; pts.material.opacity = Math.max(0, 1 - t / vida); return t < vida;
    });
  }

  /** Raio elétrico (íons) entre dois pontos. */
  raio(de, para, rgb = '#9fd8ff', dur = 0.35) {
    const seg = 10, pts = []; for (let i = 0; i <= seg; i++) pts.push(new THREE.Vector3());
    const geo = new THREE.BufferGeometry().setFromPoints(pts);
    const l = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: rgb, transparent: true, blending: THREE.AdditiveBlending, linewidth: 2 }));
    const l2 = new THREE.Line(geo, new THREE.LineBasicMaterial({ color: '#ffffff', transparent: true, blending: THREE.AdditiveBlending }));
    const g = new THREE.Group(); g.add(l, l2, this.glowSprite(rgb, 2.4, 0.9)); g.children[2].position.copy(para);
    let t = 0;
    this._add(g, (dt) => {
      t += dt; const a = geo.attributes.position;
      for (let i = 0; i <= seg; i++) { const k = i / seg, j = i === 0 || i === seg ? 0 : 0.35; a.setXYZ(i, de.x + (para.x - de.x) * k + (Math.random() - 0.5) * j, de.y + (para.y - de.y) * k + (Math.random() - 0.5) * j, de.z + (para.z - de.z) * k + (Math.random() - 0.5) * j); }
      a.needsUpdate = true; l.material.opacity = l2.material.opacity = Math.max(0, 1 - t / dur); return t < dur;
    });
  }

  /** Coluna de luz (cura / reviver / sagrado). */
  coluna(pos, rgb = '#7dffb0', dur = 0.9) {
    const m = new THREE.Mesh(new THREE.CylinderGeometry(0.7, 0.7, 4, 20, 1, true), new THREE.MeshBasicMaterial({ color: rgb, transparent: true, side: THREE.DoubleSide, blending: THREE.AdditiveBlending, depthWrite: false }));
    m.position.set(pos.x, 2, pos.z); let t = 0;
    this._add(m, (dt) => { t += dt / dur; m.material.opacity = Math.sin(Math.min(1, t) * Math.PI) * 0.55; m.scale.set(1 - t * 0.4, 1, 1 - t * 0.4); m.rotation.y += dt * 4; return t < 1; });
    this.faiscas(new THREE.Vector3(pos.x, 0.2, pos.z), rgb, 14, { vel: 3, vida: 0.9 });
  }

  tremer(f = 0.6) { this.shake = Math.max(this.shake, f); }
}

let instancia = null;
export const obterCena = () => (instancia ??= new Cena3D());
export { THREE };
