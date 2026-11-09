// Perfil do jogador (meta-progressão): moedas, heróis, níveis, fragmentos, campanha, roleta e bônus diário.
// Tudo é salvo em localStorage; a lógica não conhece a tela (testável em Node com um armazenamento falso).
import { HEROIS, ORDEM_HEROIS, INICIAIS, NIVEL_MAX, ARMAS, FASES } from './mundo.js';

const CHAVE = 'cp.perfil.v2';

export const RARIDADES = {
  comum: { peso: 0, cor: '#aaa698', fragmentos: 3 },
  raro: { peso: 30, cor: '#58a6ff', fragmentos: 5 },
  epico: { peso: 15, cor: '#b97bff', fragmentos: 8 },
  lendario: { peso: 5, cor: '#f2b134', fragmentos: 14 },
};

/** Segmentos da roleta (ordem visual). `peso` é a chance relativa de cair em cada um. */
export const SEGMENTOS = [
  { id: 'cred-150', tipo: 'creditos', n: 150, peso: 22, rotulo: '150' },
  { id: 'frag-3', tipo: 'fragmentos', n: 3, peso: 22, rotulo: '3' },
  { id: 'heroi-raro', tipo: 'heroi', raridade: 'raro', peso: 10, rotulo: 'R' },
  { id: 'giros-2', tipo: 'giros', n: 2, peso: 10, rotulo: '+2' },
  { id: 'cred-400', tipo: 'creditos', n: 400, peso: 8, rotulo: '400' },
  { id: 'frag-8', tipo: 'fragmentos', n: 8, peso: 8, rotulo: '8' },
  { id: 'heroi-epico', tipo: 'heroi', raridade: 'epico', peso: 4, rotulo: 'E' },
  { id: 'heroi-lendario', tipo: 'heroi', raridade: 'lendario', peso: 1.5, rotulo: 'L' },
];
export const GIROS_PARA_GARANTIA = 12;

const hoje = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const padrao = () => ({
  v: 2, creditos: 300, giros: 2,
  herois: Object.fromEntries(INICIAIS.map((id) => [id, { n: 1, sh: 0 }])),
  equipe: [...INICIAIS], armas: ['espada'], equip: { luke: 'espada' },
  maxFase: 0, estrelas: {}, pity: 0, giroDia: '', streak: 0, ultimoLogin: '', vitorias: 0, totalGiros: 0,
});

export class Perfil {
  constructor(armazem = globalThis.localStorage, rng = Math.random, relogio = () => new Date()) {
    this.armazem = armazem; this.rng = rng; this.relogio = relogio;
    this.d = this._ler();
  }

  _ler() {
    try {
      const bruto = this.armazem?.getItem(CHAVE);
      if (bruto) { const d = JSON.parse(bruto); if (d?.v === 2) return { ...padrao(), ...d }; }
    } catch { /* perfil corrompido: recomeça */ }
    return padrao();
  }
  salvar() { try { this.armazem?.setItem(CHAVE, JSON.stringify(this.d)); } catch { /* ignore */ } }
  resetar() { this.d = padrao(); this.salvar(); }

  // ------------------------------------------------------------ heróis
  possui(id) { return !!this.d.herois[id]; }
  nivel(id) { return this.d.herois[id]?.n ?? 0; }
  fragmentos(id) { return this.d.herois[id]?.sh ?? 0; }
  get desbloqueados() { return ORDEM_HEROIS.filter((id) => this.possui(id)); }
  get equipe() { return this.d.equipe.filter((id) => this.possui(id)); }

  alternarEquipe(id) {
    const e = this.d.equipe;
    const i = e.indexOf(id);
    if (i >= 0) { if (e.length > 1) e.splice(i, 1); } else { if (e.length >= 3) e.shift(); e.push(id); }
    this.salvar();
  }

  custoNivel(id) {
    const n = this.nivel(id);
    if (!n || n >= NIVEL_MAX) return null;
    return { creditos: 80 * n, fragmentos: 2 * n };
  }
  podeEvoluir(id) {
    const c = this.custoNivel(id);
    return !!c && this.d.creditos >= c.creditos && this.fragmentos(id) >= c.fragmentos;
  }
  evoluir(id) {
    if (!this.podeEvoluir(id)) return false;
    const c = this.custoNivel(id);
    this.d.creditos -= c.creditos; this.d.herois[id].sh -= c.fragmentos; this.d.herois[id].n += 1;
    this.salvar(); return true;
  }

  // ------------------------------------------------------------ armas
  armaDe(id) { return this.d.equip[id] ?? null; }
  equiparArma(heroiId, armaId) {
    for (const k of Object.keys(this.d.equip)) if (this.d.equip[k] === armaId) delete this.d.equip[k];
    if (armaId) this.d.equip[heroiId] = armaId; else delete this.d.equip[heroiId];
    this.salvar();
  }
  ganharArma(id) {
    if (!ARMAS[id]) return false;
    const nova = !this.d.armas.includes(id);
    if (nova) this.d.armas.push(id);
    this.salvar(); return nova;
  }

  // ------------------------------------------------------------ campanha
  get totalFases() { return Infinity; }
  /** Índice da próxima fase ainda não vencida. */
  get faseAtual() { return this.d.maxFase; }
  estrelasDa(i) { return this.d.estrelas[i] ?? 0; }
  tierDe(i) { return Math.floor(i / FASES.length); }

  /** Aplica o resultado de uma vitória e devolve o resumo das recompensas. */
  registrarVitoria(faseIdx, estrelas, saque = []) {
    const primeira = faseIdx >= this.d.maxFase;
    const melhorou = estrelas > this.estrelasDa(faseIdx);
    if (primeira) this.d.maxFase = faseIdx + 1;
    if (melhorou) this.d.estrelas[faseIdx] = estrelas;
    this.d.vitorias += 1;
    const base = 50 + faseIdx * 14;
    const rec = { creditos: base + estrelas * 15 + (primeira ? 60 : 0), giros: 1 + (primeira && estrelas === 3 ? 1 : 0), fragmentos: {}, armas: [], primeira, estrelas };
    // fragmentos: um herói aleatório da equipe a cada vitória; chefes dão mais
    const chefe = faseIdx % FASES.length === FASES.length - 1;
    const equipe = this.equipe;
    for (let i = 0; i < (chefe ? 3 : 1) + (estrelas === 3 ? 1 : 0); i++) {
      const id = equipe[Math.floor(this.rng() * equipe.length)];
      rec.fragmentos[id] = (rec.fragmentos[id] ?? 0) + 1;
    }
    for (const a of saque) if (this.ganharArma(a)) rec.armas.push(a);
    this.d.creditos += rec.creditos; this.d.giros += rec.giros;
    for (const [id, n] of Object.entries(rec.fragmentos)) this.d.herois[id].sh += n;
    this.salvar();
    return rec;
  }

  // ------------------------------------------------------------ bônus diário
  /** Registra o login do dia: sequência e giro grátis. Devolve o bônus ou null se já coletado hoje. */
  coletarDiario() {
    const dia = hoje(this.relogio());
    if (this.d.ultimoLogin === dia) return null;
    const ontem = new Date(this.relogio()); ontem.setDate(ontem.getDate() - 1);
    this.d.streak = this.d.ultimoLogin === hoje(ontem) ? this.d.streak + 1 : 1;
    this.d.ultimoLogin = dia;
    const creditos = 100 + Math.min(this.d.streak, 7) * 40;
    this.d.creditos += creditos;
    this.salvar();
    return { creditos, streak: this.d.streak };
  }
  get giroGratisDisponivel() { return this.d.giroDia !== hoje(this.relogio()); }
  get podeGirar() { return this.giroGratisDisponivel || this.d.giros > 0; }
  get girosParaGarantia() { return GIROS_PARA_GARANTIA - this.d.pity; }

  // ------------------------------------------------------------ roleta (gacha)
  _sortearSegmento(forcarHeroi) {
    const pool = forcarHeroi ? SEGMENTOS.filter((s) => s.tipo === 'heroi') : SEGMENTOS;
    const total = pool.reduce((s, x) => s + x.peso, 0);
    let r = this.rng() * total;
    for (const s of pool) { r -= s.peso; if (r <= 0) return s; }
    return pool[pool.length - 1];
  }

  /** Gasta um giro (o grátis do dia primeiro) e devolve o prêmio já aplicado ao perfil. */
  girar() {
    if (!this.podeGirar) return null;
    if (this.giroGratisDisponivel) this.d.giroDia = hoje(this.relogio()); else this.d.giros -= 1;
    this.d.totalGiros += 1;
    const garantido = this.d.pity + 1 >= GIROS_PARA_GARANTIA;
    const seg = this._sortearSegmento(garantido);
    const premio = { segmento: seg, indice: SEGMENTOS.indexOf(seg) };
    switch (seg.tipo) {
      case 'creditos': this.d.creditos += seg.n; premio.creditos = seg.n; break;
      case 'giros': this.d.giros += seg.n; premio.giros = seg.n; break;
      case 'fragmentos': {
        const alvo = this._heroiParaFragmentos();
        this.d.herois[alvo].sh += seg.n; premio.fragmentos = { id: alvo, n: seg.n }; break;
      }
      case 'heroi': Object.assign(premio, this._premiarHeroi(seg.raridade)); break;
      default: break;
    }
    this.d.pity = seg.tipo === "heroi" ? 0 : this.d.pity + 1;
    this.salvar();
    return premio;
  }

  _heroiParaFragmentos() {
    // prefere heróis da equipe (mais útil), senão qualquer desbloqueado
    const pool = this.equipe.length ? this.equipe : this.desbloqueados;
    return pool[Math.floor(this.rng() * pool.length)];
  }

  _premiarHeroi(raridade) {
    const candidatos = ORDEM_HEROIS.filter((id) => HEROIS[id].raridade === raridade);
    const novos = candidatos.filter((id) => !this.possui(id));
    if (novos.length) {
      const id = novos[Math.floor(this.rng() * novos.length)];
      this.d.herois[id] = { n: 1, sh: 0 };
      return { heroiNovo: id };
    }
    // todos da raridade já foram conquistados: vira fragmentos extras de um deles
    const id = candidatos[Math.floor(this.rng() * candidatos.length)];
    const n = RARIDADES[raridade].fragmentos;
    this.d.herois[id].sh += n;
    return { duplicado: true, fragmentos: { id, n } };
  }
}

export const hojeISO = hoje;
