// Motor de batalha. Não conhece a tela: tudo que acontece sai por CombatNotifier (DIP).
import { CARTAS, alvoPadrao, precisaAlvo } from './cartas.js';
import { calcularDano } from '../domain/dano.js';
import { implementa, ComHabilidadeEspecial } from '../domain/contratos.js';
import { criarArma } from './mundo.js';

const embaralhar = (arr, rng) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a;
};
const DEBUFFS = ['fraqueza', 'vulneravel', 'veneno', 'queimadura', 'atordoado'];

// ------------------------------------------------------------------ registro de efeitos de carta (OCP)
const alvosDe = (b, ctx, eff) => {
  switch (eff.to ?? ctx.padrao) {
    case 'self': return [ctx.fonte];
    case 'enemies': return b.inimigosVivos();
    case 'allies': return b.heroisVivos();
    default: return ctx.alvo ? [ctx.alvo] : [];
  }
};

export const EFEITOS = {
  dmg(b, ctx, eff) {
    for (const alvo of alvosDe(b, ctx, eff)) {
      for (let i = 0; i < (eff.hits ?? 1); i++) {
        if (alvo.estaDestruido()) break;
        const base = eff.executar && alvo.vida < alvo.maxVida / 2 ? eff.n * 2 : eff.n;
        b.notifier.fx({ tipo: 'golpe', fonte: ctx.fonte.id, alvo: alvo.id, elemento: eff.el });
        ctx.fonte.atacar(alvo, b.notifier, { base, elemento: eff.el ?? 'fisico', kb: b.kb, perfura: !!eff.perfura });
      }
    }
    if (ctx.fonte.tem('mira')) ctx.fonte.removerStatus('mira');
  },
  block(b, ctx, eff) { alvosDe(b, ctx, eff).forEach((a) => a.ganharBloqueio(eff.n, b.notifier)); },
  heal(b, ctx, eff) { alvosDe(b, ctx, eff).forEach((a) => a.curar(eff.n, b.notifier)); },
  status(b, ctx, eff) {
    alvosDe(b, ctx, eff).forEach((a) => {
      if (a.imune?.includes(eff.status)) return;
      a.addStatus(eff.status, eff.n, b.notifier);
    });
  },
  draw(b, ctx, eff) { b.comprarCartas(eff.n); },
  mana(b, ctx, eff) { ctx.fonte.ganharMana(eff.n, b.notifier); },
  selfDmg(b, ctx, eff) { ctx.fonte.receberDano(eff.n, b.notifier, { dot: true, perfura: true }); },
  limb(b, ctx, eff) {
    const alvo = ctx.alvo;
    if (!alvo || alvo.estaDestruido()) return;
    const calc = calcularDano({ base: eff.n, fonte: ctx.fonte, alvo: null, semMira: true });
    const m = alvo.membros.find((x) => x.eBraco && !x.estaDestruido());
    b.notifier.fx({ tipo: 'golpe', fonte: ctx.fonte.id, alvo: alvo.id, elemento: 'fisico' });
    if (m) m.receberDano(calc.dano, b.notifier);
    else alvo.receberDano(calc.dano, b.notifier, { elemento: 'fisico' });
  },
  revive(b, ctx, eff) {
    const h = ctx.alvo;
    if (!h || !h.estaDestruido()) return;
    h.vida = Math.max(1, Math.ceil(h.maxVida * eff.pct / 100));
    h.status = {}; h.bloqueio = 0;
    b.devolverDoLimbo(h.id);
    b.notifier.notify('log.revive', [h.getNome()], { tom: 'cura', fx: { tipo: 'reviver', alvo: h.id } });
  },
  cleanse(b, ctx, eff) {
    alvosDe(b, ctx, eff).forEach((a) => {
      DEBUFFS.forEach((s) => a.removerStatus(s));
      b.notifier.notify('log.cleanse', [a.getNome()], { fx: { tipo: 'purificar', alvo: a.id } });
    });
  },
  habilidade(b, ctx) {
    const f = ctx.fonte;
    if (implementa(f, ComHabilidadeEspecial)) f.usarHabilidade(ctx.alvo, b.notifier, { kb: b.kb });
    else f.atacar(ctx.alvo, b.notifier, { kb: b.kb }); // quem não tem habilidade usa o ataque padrão
    if (f.tem('mira')) f.removerStatus('mira');
  },
};

// ------------------------------------------------------------------ ações dos inimigos (paradigma estruturado)
const alvoAleatorio = (b) => { const v = b.heroisVivos(); return v.length ? v[Math.floor(b.rng() * v.length)] : null; };

export const ACOES = {
  ataque(b, e, a) {
    const alvo = alvoAleatorio(b); if (!alvo) return;
    const base = Math.round(e.ataqueBase * a.mult);
    for (let i = 0; i < a.hits && !alvo.estaDestruido(); i++) {
      b.notifier.fx({ tipo: 'golpe', fonte: e.id, alvo: alvo.id, elemento: a.el });
      e.atacar(alvo, b.notifier, { base, elemento: a.el, kb: b.kb });
    }
  },
  aoe(b, e, a) {
    const base = Math.round(e.ataqueBase * a.mult);
    b.notifier.fx({ tipo: 'golpe', fonte: e.id, alvo: null, elemento: 'fisico' });
    b.heroisVivos().forEach((h) => e.atacar(h, b.notifier, { base, kb: b.kb }));
  },
  bloqueio(b, e, a) { e.ganharBloqueio(a.n, b.notifier); },
  buff(b, e, a) { e.addStatus(a.status, a.n, b.notifier); },
  debuff(b, e, a) {
    const alvos = a.aoe ? b.heroisVivos() : [alvoAleatorio(b)].filter(Boolean);
    alvos.forEach((h) => { b.notifier.fx({ tipo: 'golpe', fonte: e.id, alvo: h.id, elemento: 'sombra' }); h.addStatus(a.status, a.n, b.notifier); });
  },
  cura(b, e, a) {
    const aliados = b.inimigos.filter((x) => !x.cenario && !x.estaDestruido());
    const alvo = aliados.reduce((p, x) => ((x.vida / x.maxVida) < (p.vida / p.maxVida) ? x : p), aliados[0]);
    alvo?.curar(a.n, b.notifier);
  },
  dreno(b, e, a) {
    const alvo = alvoAleatorio(b); if (!alvo) return;
    b.notifier.fx({ tipo: 'golpe', fonte: e.id, alvo: alvo.id, elemento: 'sombra' });
    const r = e.atacar(alvo, b.notifier, { base: Math.round(e.ataqueBase * a.mult), kb: b.kb });
    if (r.dano > 0) e.curar(r.dano, b.notifier);
  },
};

// ------------------------------------------------------------------ Batalha
export class Batalha {
  constructor({ herois, inimigos, baralho, notifier, kb, rng = Math.random, energiaMax = 3, compraPorTurno = 5 }) {
    Object.assign(this, { herois, inimigos, notifier, kb, rng, energiaMax, compraPorTurno });
    this.todasCartas = baralho; // [{uid, id, dono}]
    this.compra = []; this.mao = []; this.descarte = []; this.exaurido = []; this.limbo = [];
    this.energia = 0; this.turno = 0; this.fase = 'jogador';
    this.mochila = []; // armas largadas / saqueadas nesta luta (agregação: continuam existindo)
  }

  // ---- consultas
  heroisVivos() { return this.herois.filter((h) => !h.estaDestruido()); }
  inimigosVivos() { return this.inimigos.filter((e) => !e.estaDestruido()); }
  combatentesVivos() { return this.inimigos.filter((e) => !e.cenario && !e.estaDestruido()); }
  entidade(id) { return [...this.herois, ...this.inimigos].find((e) => e.id === id); }
  get terminou() { return this.fase === 'vitoria' || this.fase === 'derrota'; }

  // ---- início
  iniciar() {
    this.herois.forEach((h) => { h.bloqueio = 0; h.status = {}; h.mana = h.maxMana; });
    this.compra = embaralhar(this.todasCartas.filter((c) => this.entidade(c.dono) && !this.entidade(c.dono).estaDestruido()), this.rng);
    this.inimigos.forEach((e) => e.planejar());
    this.comecarTurnoJogador();
  }

  comecarTurnoJogador() {
    this.turno += 1; this.fase = 'jogador'; this.energia = this.energiaMax;
    this.notifier.notify('log.turn', [this.turno], { tom: 'turno' });
    this.heroisVivos().forEach((h) => {
      h.bloqueio = 0;
      if (this.turno > 1) h.ganharMana(h.regenMana, this.notifier);
      this._dot(h);
    });
    this._varrer();
    if (this.terminou) return;
    this.comprarCartas(this.compraPorTurno);
  }

  comprarCartas(n) {
    for (let i = 0; i < n && this.mao.length < 10; i++) {
      if (!this.compra.length) {
        if (!this.descarte.length) break;
        this.compra = embaralhar(this.descarte, this.rng); this.descarte = [];
        this.notifier.fx({ tipo: 'embaralhar' });
      }
      this.mao.push(this.compra.pop());
    }
  }

  // ---- cartas
  definicao(carta) { return CARTAS[carta.id]; }
  alvosValidos(carta) {
    const def = CARTAS[carta.id];
    if (def.alvo === 'enemy') return this.inimigosVivos();
    if (def.alvo === 'ally') return this.heroisVivos();
    if (def.alvo === 'deadAlly') return this.herois.filter((h) => h.estaDestruido());
    return [];
  }

  podeJogar(carta) {
    const def = CARTAS[carta.id], dono = this.entidade(carta.dono);
    if (this.fase !== 'jogador') return { ok: false, motivo: 'fase' };
    if (!dono || dono.estaDestruido()) return { ok: false, motivo: 'battle.deadOwner' };
    if (this.energia < def.custo) return { ok: false, motivo: 'battle.noEnergy' };
    if (dono.mana < def.mana) return { ok: false, motivo: 'battle.noMana' };
    if (precisaAlvo(def) && !this.alvosValidos(carta).length) return { ok: false, motivo: 'alvo' };
    return { ok: true };
  }

  jogar(uid, alvoId = null) {
    const idx = this.mao.findIndex((c) => c.uid === uid);
    if (idx < 0) return { ok: false, motivo: 'mao' };
    const carta = this.mao[idx], def = CARTAS[carta.id];
    const chk = this.podeJogar(carta);
    if (!chk.ok) return chk;
    let alvo = null;
    if (precisaAlvo(def)) {
      alvo = this.alvosValidos(carta).find((e) => e.id === alvoId);
      if (!alvo) return { ok: false, motivo: 'alvo' };
    }
    const fonte = this.entidade(carta.dono);
    this.mao.splice(idx, 1);
    this.energia -= def.custo;
    if (def.mana) { fonte.mana -= def.mana; this.notifier.fx({ tipo: 'gastarMana', alvo: fonte.id }); }

    const nomeCarta = `@card.${def.id}`;
    this.notifier.fx({ tipo: 'conjurar', fonte: fonte.id, alvo: alvo?.id ?? null, elemento: def.el, arte: def.arte });
    if (alvo) this.notifier.notify('log.attack', [fonte.getNome(), nomeCarta, alvo.getNome()], { tom: 'jogador' });
    else this.notifier.notify('log.attackAll', [fonte.getNome(), nomeCarta], { tom: 'jogador' });

    const ctx = { fonte, alvo, carta, padrao: alvoPadrao(def) };
    for (const eff of def.fx) EFEITOS[eff.t](this, ctx, eff);

    (def.exaurir ? this.exaurido : this.descarte).push(carta);
    this._varrer();
    return { ok: true };
  }

  // ---- fim do turno do jogador + turno dos inimigos (gerador: a UI dá o ritmo a cada passo)
  terminarTurno() {
    if (this.fase !== 'jogador') return;
    this.fase = 'inimigo';
    this.descarte.push(...this.mao); this.mao = [];
    this.heroisVivos().forEach((h) => this._decaimento(h));
  }

  * turnoInimigos() {
    const cenarios = () => this.inimigos.filter((c) => c.cenario && c.aura && !c.estaDestruido());
    for (const e of this.inimigos) {
      if (this.terminou) return;
      if (e.estaDestruido() || e.cenario) continue;
      e.bloqueio = 0;
      cenarios().forEach((c) => {
        e.ganharBloqueio(c.aura, this.notifier);
      });
      this._dot(e);
      this._varrer();
      if (this.terminou) return;
      if (e.estaDestruido()) { yield e; continue; }
      if (e.tem('atordoado')) {
        this.notifier.notify('log.stun', [e.getNome()], { fx: { tipo: 'atordoado', alvo: e.id } });
        e.removerStatus('atordoado'); yield e; continue;
      }
      const a = e.intencao;
      if (a) {
        this.notifier.fx({ tipo: 'agir', fonte: e.id });
        ACOES[a.tipo]?.(this, e, a);
      }
      this._varrer();
      yield e;
    }
    if (this.terminou) return;
    this.inimigos.forEach((e) => { if (!e.estaDestruido()) { this._decaimento(e); e.planejar(); } });
    this.comecarTurnoJogador();
  }

  // ---- internos
  _dot(e) {
    if (e.estaDestruido()) return;
    for (const s of ['veneno', 'queimadura']) {
      const n = e.status[s] ?? 0;
      if (n > 0) {
        e.receberDano(n, this.notifier, { dot: true, perfura: true, elemento: s === 'queimadura' ? 'fogo' : 'veneno' });
        e.status[s] = n - 1; if (e.status[s] <= 0) delete e.status[s];
      }
    }
  }

  _decaimento(e) {
    ['fraqueza', 'vulneravel'].forEach((s) => {
      if (e.status?.[s]) { e.status[s] -= 1; if (e.status[s] <= 0) delete e.status[s]; }
    });
  }

  devolverDoLimbo(heroiId) {
    const volta = this.limbo.filter((c) => c.dono === heroiId);
    this.limbo = this.limbo.filter((c) => c.dono !== heroiId);
    this.descarte.push(...volta);
  }

  /** Processa mortes (soltar armas, saque, cartas de heróis caídos) e checa o fim da luta. */
  _varrer() {
    for (const h of this.herois) {
      if (h.estaDestruido() && !h._varrido) {
        h._varrido = true;
        const tira = (lista) => { const sai = lista.filter((c) => c.dono === h.id); sai.forEach((c) => lista.splice(lista.indexOf(c), 1)); return sai; };
        this.limbo.push(...tira(this.mao), ...tira(this.compra), ...tira(this.descarte));
        if (h.arma) { // agregação: a arma sobrevive ao portador
          const arma = h.arma; h.arma = null; this.mochila.push(arma);
          this.notifier.notify('log.weaponDrop', [h.getNome(), arma.getNome()], { tom: 'ruim' });
        }
      }
      if (!h.estaDestruido()) h._varrido = false;
    }
    for (const e of this.inimigos) {
      if (e.estaDestruido() && !e._varrido) {
        e._varrido = true;
        if (e.loot && this.rng() < e.loot.chance) {
          const id = e.loot.pool[Math.floor(this.rng() * e.loot.pool.length)];
          const arma = criarArma(id);
          this.mochila.push(arma);
          this.notifier.notify('log.loot', [arma.getNome()], { tom: 'bom', fx: { tipo: 'saque', alvo: e.id } });
        }
      }
    }
    if (!this.heroisVivos().length) this.fase = 'derrota';
    else if (!this.combatentesVivos().length) this.fase = 'vitoria';
  }

  /** Resumo do que o inimigo vai fazer (mostrado como "intenção" na tela). */
  previsao(e) {
    const a = e.intencao;
    if (!a || e.estaDestruido()) return null;
    if (e.tem?.('atordoado')) return { tipo: 'atordoado' };
    if (['ataque', 'aoe', 'dreno'].includes(a.tipo)) {
      const dano = calcularDano({ base: Math.round(e.ataqueBase * a.mult), fonte: e, alvo: null }).dano;
      return { tipo: a.tipo, valor: dano, hits: a.hits ?? 1 };
    }
    return { tipo: a.tipo, valor: a.n, status: a.status, aoe: a.aoe };
  }
}
