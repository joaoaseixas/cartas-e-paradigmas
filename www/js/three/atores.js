// Ator 3D: liga uma entidade do domínio a um modelo e cuida das animações (idle, ataque, dano, morte).
import { THREE } from './cena.js';
import { criarModelo } from './modelos.js';

const ease = (k) => 1 - (1 - k) * (1 - k);
const easeIO = (k) => (k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2);

export class Ator {
  constructor(cena, entidade, chaveModelo, { x, z, yaw }) {
    const m = criarModelo(chaveModelo);
    this.cena = cena; this.id = entidade.id; this.entidade = entidade;
    this.modelo = m; this.partes = m.partes; this.altura = m.altura; this.flutua = !!m.flutua; this.estatico = !!m.estatico; this.corFx = m.cor ?? '#ffffff';
    this.tipoAtaque = m.arma ?? 'corpo'; this.raio = m.raio ?? 0.6;
    this.grupo = new THREE.Group();
    this.corpo = m.grupo; this.grupo.add(this.corpo);
    this.base = new THREE.Vector3(x, 0, z); this.yawBase = yaw;
    this.grupo.position.copy(this.base); this.grupo.rotation.y = yaw;
    this.desloc = new THREE.Vector3(); this.fase = Math.random() * 6.28;
    this.tweens = []; this.morto = false; this.flash = 0; this.flashCor = new THREE.Color('#ffffff'); this.aura = null; this.auraForca = 0;
    this.ocupado = 0;
    // sombra (disco escuro no chão)
    this.sombra = new THREE.Mesh(new THREE.CircleGeometry(this.raio + 0.25, 24), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.45, depthWrite: false }));
    this.sombra.rotation.x = -Math.PI / 2; this.sombra.position.y = 0.02; this.grupo.add(this.sombra);
    // materiais "tingíveis" para o flash de dano
    this.mats = []; this.corpo.traverse((o) => {
      if (o.isMesh && o.material?.emissive && o.material.emissive.getHex() === 0 && o.material.isMeshStandardMaterial) { o.material = o.material.clone(); this.mats.push(o.material); }
      if (o.isMesh && o.material && !o.material.isMeshStandardMaterial) o.material = o.material.clone();
    });
    this.todosMats = []; this.corpo.traverse((o) => { if ((o.isMesh || o.isSprite) && o.material) { this.todosMats.push(o.material); o.material.userData.op0 = o.material.opacity ?? 1; } });
    this.escalaBase = this.corpo.scale.x;
  }

  get pos() { return this.grupo.position; }
  pontoPeito() { return new THREE.Vector3(this.base.x, this.altura * 0.58, this.base.z); }
  pontoCabeca() { return new THREE.Vector3(this.base.x, this.altura + 0.2, this.base.z); }
  pontoPes() { return new THREE.Vector3(this.base.x, 0, this.base.z); }
  pontoMao() { const p = this.pontoPeito(); p.y += 0.25; return p; }

  // ----------------------------------------------------------------- tween
  tween(dur, fn) {
    return new Promise((res) => { this.tweens.push({ t: 0, dur, fn, res }); });
  }

  atualizar(dt, t) {
    // tweens
    for (let i = this.tweens.length - 1; i >= 0; i--) {
      const w = this.tweens[i]; w.t += dt; const k = Math.min(1, w.t / w.dur); w.fn(k);
      if (k >= 1) { this.tweens.splice(i, 1); w.res(); }
    }
    const f = this.fase;
    if (!this.morto) {
      const y = this.flutua ? 0.15 + Math.sin(t * 2 + f) * 0.1 : (this.estatico ? 0 : Math.sin(t * 2.1 + f) * 0.025);
      this.grupo.position.set(this.base.x + this.desloc.x, this.desloc.y + y, this.base.z + this.desloc.z);
      if (!this.estatico) this.corpo.rotation.z = Math.sin(t * 1.3 + f) * 0.018;
      const P = this.partes;
      if (!this.ocupado) {
        if (P.bracoE) P.bracoE.rotation.x = Math.sin(t * 1.7 + f) * 0.06;
        if (P.cabeca && !this.flutua) P.cabeca.rotation.y = Math.sin(t * 0.7 + f) * 0.1;
        if (P.anel) P.anel.rotation.z += dt * 2;
      }
      if (P.orbe) { const a = t * 1.6 + f; P.orbe.position.set(Math.cos(a) * 0.7, 1.55 + Math.sin(a * 1.3) * 0.12, Math.sin(a) * 0.5); }
      if (P.drone) { const a = t * 1.9 + f; P.drone.position.set(-0.6 + Math.cos(a) * 0.12, 1.75 + Math.sin(a * 1.5) * 0.1, 0.1); }
      if (P.saber || P.saber === undefined) { /* lâmina respira */ }
      if (P.campo) P.campo.material.opacity = 0.22 + Math.sin(t * 3 + f) * 0.07;
    }
    // flash/aura
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);
    const a = this.flash + (this.aura ? this.auraForca * (0.5 + Math.sin(t * 5) * 0.2) : 0);
    this.mats.forEach((m) => { m.emissive.copy(this.flash > 0 ? this.flashCor : this.aura ?? this.flashCor).multiplyScalar(1); m.emissiveIntensity = a; });
  }

  // ----------------------------------------------------------------- animações de combate
  piscar(cor = '#ff3b3b') { this.flashCor.set(cor); this.flash = 1; }

  async recuar(dirX = 0, dirZ = 0, forca = 0.4) {
    const d = new THREE.Vector3(dirX, 0, dirZ).normalize().multiplyScalar(forca);
    await this.tween(0.12, (k) => this.desloc.copy(d).multiplyScalar(ease(k)));
    await this.tween(0.25, (k) => this.desloc.copy(d).multiplyScalar(1 - easeIO(k)));
  }

  /** Estocada em direção ao alvo (ataque corpo a corpo). Resolve no ponto de impacto. */
  async investir(alvoPos, { ms = 0.2, ate = 0.7 } = {}) {
    this.ocupado++;
    const dir = alvoPos.clone().sub(this.base); dir.y = 0; const dist = dir.length(); dir.normalize();
    const ponto = dir.clone().multiplyScalar(Math.max(0, dist - ate));
    const P = this.partes;
    this.corpo.rotation.x = 0;
    await this.tween(ms * 0.7, (k) => { this.desloc.copy(ponto).multiplyScalar(ease(k)); if (P.bracoD) P.bracoD.rotation.x = -1.9 * k; });
    return {
      impacto: () => this.tween(ms * 0.5, (k) => { if (P.bracoD) P.bracoD.rotation.x = -1.9 + 2.6 * k; this.corpo.rotation.x = 0.22 * k; }),
      volta: async () => {
        await this.tween(ms * 1.4, (k) => { this.desloc.copy(ponto).multiplyScalar(1 - easeIO(k)); this.corpo.rotation.x = 0.22 * (1 - k); if (P.bracoD) P.bracoD.rotation.x = 0.7 * (1 - k) - 0.3 * k; });
        this.ocupado--;
      },
    };
  }

  /** Gesto de tiro/magia: levanta o braço, recua levemente. */
  async conjurar(ms = 0.28) {
    this.ocupado++;
    const P = this.partes, braco = P.bracoD ?? P.bracoE;
    await this.tween(ms, (k) => { if (braco) braco.rotation.x = -1.5 * ease(k); this.corpo.rotation.x = -0.12 * ease(k); if (P.bracoE && this.tipoAtaque === 'magia') P.bracoE.rotation.x = -1.2 * ease(k); });
    return {
      fim: async () => {
        await this.tween(ms * 1.2, (k) => { if (braco) braco.rotation.x = -1.5 * (1 - k); this.corpo.rotation.x = -0.12 * (1 - k); if (P.bracoE) P.bracoE.rotation.x = -1.2 * (1 - k); });
        this.ocupado--;
      },
    };
  }

  pulo(h = 0.35, ms = 0.35) { return this.tween(ms, (k) => { this.desloc.y = Math.sin(k * Math.PI) * h; }); }

  async morrer() {
    if (this.morto) return;
    this.morto = true; this.ocupado = 0;
    const est = this.estatico;
    this.sombra.visible = false;
    this.todosMats.forEach((m) => { m.transparent = true; });
    await this.tween(0.7, (k) => {
      this.corpo.rotation.x = est ? 0 : -1.45 * ease(k);
      this.corpo.rotation.z = 0;
      this.grupo.position.set(this.base.x, (this.flutua ? 0.15 : 0) - 0.15 * k + (est ? -0.2 * k : 0), this.base.z - (est ? 0 : 0.3 * k));
      this.corpo.scale.setScalar(this.escalaBase * (est ? 1 - 0.7 * k : 1));
      this.todosMats.forEach((m) => { m.opacity = (m.userData.op0 ?? 1) * (1 - k); });
    });
    this.grupo.visible = false;
  }

  reviver() {
    this.morto = false; this.grupo.visible = true; this.sombra.visible = true;
    this.corpo.rotation.set(0, 0, 0); this.corpo.scale.setScalar(this.escalaBase); this.desloc.set(0, 0, 0);
    this.todosMats.forEach((m) => { m.opacity = m.userData.op0 ?? 1; });
    return this.pulo(0.5, 0.5);
  }

  /** Transformação do chefe (fase 2): cresce e ganha aura vermelha, braço ciborgue. */
  transformar() {
    this.aura = new THREE.Color('#ff1e2e'); this.auraForca = 0.45;
    if (this.partes.ciber) this.partes.ciber.visible = true;
    const e0 = this.escalaBase;
    return this.tween(0.8, (k) => this.corpo.scale.setScalar(e0 * (1 + 0.18 * easeIO(k)))).then(() => { this.escalaBase = e0 * 1.18; });
  }
}

/** Posições padrão em arco: heróis na frente (perto da câmera), inimigos ao fundo. */
export function posicoesLinha(n, espaco, z, curva = 0.25) {
  return Array.from({ length: n }, (_, i) => {
    const k = i - (n - 1) / 2;
    return { x: k * espaco, z: z + Math.abs(k) * curva, k };
  });
}
