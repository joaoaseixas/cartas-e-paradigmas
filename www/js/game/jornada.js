// Estado da "run" (jornada): grupo, baralho, fase atual e mochila. Serializável para salvar/continuar.
import { CARTAS, BARALHO_INICIAL } from './cartas.js';
import { criarHeroi, criarArma, criarInimigo, FASES, HEROIS } from './mundo.js';
import { Batalha } from './batalha.js';
import { planejarAcampamento } from '../domain/dano.js';

export class Jornada {
  constructor() {
    this.herois = []; this.baralho = []; this.fase = 0; this.mochila = []; this.uid = 0;
  }

  static nova(idsHerois) {
    const j = new Jornada();
    idsHerois.forEach((id) => {
      const h = criarHeroi(id);
      j.herois.push(h);
      BARALHO_INICIAL[h.classe].forEach((cid) => j.adicionarCarta(cid, h.id));
    });
    return j;
  }

  get faseAtual() { return FASES[this.fase]; }
  get totalFases() { return FASES.length; }

  adicionarCarta(cartaId, donoId) { this.baralho.push({ uid: ++this.uid, id: cartaId, dono: donoId }); }

  criarBatalha(notifier, kb) {
    const inimigos = this.faseAtual.inimigos.map(criarInimigo);
    return new Batalha({ herois: this.herois, inimigos, baralho: this.baralho, notifier, kb });
  }

  /** Fim de luta vencida: recolhe o saque e aplica o acampamento (estilo funcional: planeja e só depois aplica). */
  concluirBatalha(batalha) {
    this.mochila.push(...batalha.mochila);
    const plano = planejarAcampamento(this.herois);
    plano.forEach(({ id, vida }) => {
      const h = this.herois.find((x) => x.id === id);
      h.vida = vida; h.status = {}; h.bloqueio = 0; h._varrido = false;
    });
  }

  /** Sorteia 3 cartas novas (sem repetir) entre as do grupo e os itens. */
  gerarRecompensas(rng = Math.random) {
    const classes = new Set(this.herois.map((h) => h.classe));
    const pool = Object.values(CARTAS).filter((c) => c.raridade !== 'basica' && (c.heroi === 'neutro' || classes.has(c.heroi)));
    const peso = (c) => ({ comum: 6, rara: 2 + this.fase * 0.5, item: 2.5 }[c.raridade]);
    const escolhas = [];
    const disponiveis = [...pool];
    while (escolhas.length < 3 && disponiveis.length) {
      const total = disponiveis.reduce((s, c) => s + peso(c), 0);
      let r = rng() * total, i = 0;
      for (; i < disponiveis.length; i++) { r -= peso(disponiveis[i]); if (r <= 0) break; }
      escolhas.push(disponiveis.splice(Math.min(i, disponiveis.length - 1), 1)[0].id);
    }
    return escolhas;
  }

  /** Dono da carta recompensa: o herói da classe (qualquer vivo do grupo para itens neutros). */
  donoParaCarta(cartaId, rng = Math.random) {
    const def = CARTAS[cartaId];
    const candidatos = def.heroi === 'neutro' ? this.herois : this.herois.filter((h) => h.classe === def.heroi);
    return candidatos[Math.floor(rng() * candidatos.length)].id;
  }

  equipar(heroiId, indiceMochila) {
    const h = this.herois.find((x) => x.id === heroiId);
    const [arma] = this.mochila.splice(indiceMochila, 1);
    if (h.arma) this.mochila.push(h.arma); // agregação: a arma antiga continua existindo
    h.arma = arma;
    return arma;
  }

  avancar() { this.fase += 1; }
  get terminou() { return this.fase >= FASES.length; }

  // ------------------------------------------------------------ persistência
  serializar() {
    return {
      v: 1, fase: this.fase, uid: this.uid,
      herois: this.herois.map((h) => ({ id: h.id, vida: h.vida, arma: h.arma?.id ?? null })),
      baralho: this.baralho, mochila: this.mochila.map((a) => a.id),
    };
  }

  static restaurar(d) {
    if (!d || d.v !== 1) return null;
    const j = new Jornada();
    j.fase = d.fase; j.uid = d.uid; j.baralho = d.baralho;
    j.herois = d.herois.map((s) => {
      if (!HEROIS[s.id]) throw new Error('herói desconhecido');
      const h = criarHeroi(s.id); h.vida = s.vida; h.arma = s.arma ? criarArma(s.arma) : null; return h;
    });
    j.mochila = d.mochila.map(criarArma);
    return j;
  }
}
