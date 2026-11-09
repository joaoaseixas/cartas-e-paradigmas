// Uma missão = uma batalha da campanha infinita, montada a partir do perfil (equipe, níveis, armas).
import { BARALHO_INICIAL } from './cartas.js';
import { criarHeroi, criarInimigo, cartasDesbloqueadas, FASES } from './mundo.js';
import { Batalha } from './batalha.js';

export class Missao {
  constructor(perfil, faseIdx) {
    this.faseIdx = faseIdx;
    this.herois = perfil.equipe.map((id) => criarHeroi(id, perfil.nivel(id), perfil.armaDe(id)));
    this.baralho = [];
    let uid = 0;
    for (const h of this.herois) {
      [...BARALHO_INICIAL[h.classe], ...cartasDesbloqueadas(h.classe, h.nivel)].forEach((cid) => this.baralho.push({ uid: ++uid, id: cid, dono: h.id }));
    }
  }

  get setor() { return Math.floor(this.faseIdx / FASES.length) + 1; }
  get fase() { return FASES[this.faseIdx % FASES.length]; }
  get faseAtual() { return this.fase; }
  get chefe() { return !!this.fase.chefe; }
  /** Multiplicador de vida/ataque dos inimigos: sobe a cada setor completo. */
  get escala() { return 1 + 0.32 * (this.setor - 1) + 0.015 * (this.faseIdx % FASES.length); }
  get nivelRecomendado() { return 1 + Math.floor(this.faseIdx * 0.7); }

  criarBatalha(notifier, kb) {
    const inimigos = this.fase.inimigos.map((t) => criarInimigo(t, this.escala));
    return new Batalha({ herois: this.herois, inimigos, baralho: this.baralho, notifier, kb });
  }

  /** 1 estrela pela vitória, +1 sem baixas, +1 por terminar rápido. */
  estrelas(batalha) {
    if (batalha.fase !== 'vitoria') return 0;
    let e = 1;
    if (this.herois.every((h) => !h.estaDestruido())) e += 1;
    if (batalha.turno <= (this.chefe ? 9 : 6)) e += 1;
    return e;
  }

  /** Armas largadas em combate (loot) viram itens permanentes do perfil. */
  saque(batalha) { return batalha.mochila.map((a) => a.id); }
}

export const nomeSetor = (idx) => Math.floor(idx / FASES.length) + 1;
