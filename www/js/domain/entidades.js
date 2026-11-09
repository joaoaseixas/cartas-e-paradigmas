// Camada de DOMÍNIO (POO + SOLID), espelhando o PDF:
//   Destrutivel  <|.. Personagem <|-- Guerreiro / Mago / Arqueiro / Clerigo / Inimigo (Zumbi, Chefe)
//   Destrutivel  <|.. Membro, Cenario (Bau, Portao)
//   ComHabilidadeEspecial <|.. Guerreiro, Mago, Arqueiro, Clerigo   (Inimigo/Fera NÃO implementa: ISP/LSP)
//   Personagem *-- Membro (composição)      Personagem o-- Arma (agregação)
import { calcularDano } from './dano.js';
import { implementa, ComHabilidadeEspecial } from './contratos.js';

const nomeDe = (e) => e.getNome();

// ---------------------------------------------------------------- Membro (composição)
export class Membro {
  constructor(id, nomeToken, integridade, { braco = false } = {}) {
    this.id = id; this.nomeToken = nomeToken; this.maxVida = integridade; this.vida = integridade; this.eBraco = braco;
  }
  getNome() { return this.nomeToken; }
  estaDestruido() { return this.vida <= 0; }
  receberDano(valor, notifier) {
    if (this.estaDestruido()) return { dano: 0 };
    const antes = this.vida;
    this.vida = Math.max(0, this.vida - valor);
    const dano = antes - this.vida;
    notifier.fx({ tipo: 'dano', alvo: this.donoId, valor: dano, bloqueado: 0, elemento: 'fisico', membro: true });
    if (this.estaDestruido()) notifier.notify('log.limb', [this.donoToken], { tom: 'bom', fx: { tipo: 'membro', alvo: this.donoId } });
    return { dano };
  }
}

// ---------------------------------------------------------------- Arma (agregação)
export class Arma {
  constructor(def) { Object.assign(this, def); }
  getNome() { return `@arma.${this.id}`; }
}

// ---------------------------------------------------------------- Personagem (abstrata)
export class Personagem {
  constructor({ id, nome = null, nomeKey = null, emoji, vida, ataque, mana = 0, regenMana = 0, tipos = [], lado }) {
    if (new.target === Personagem) throw new TypeError('Personagem é abstrata'); // LSP: só subclasses concretas
    Object.assign(this, {
      id, nome, nomeKey, emoji, maxVida: vida, vida, ataqueBase: ataque, maxMana: mana, mana, regenMana,
      tipos: [...tipos], lado, status: {}, bloqueio: 0, membros: [], arma: null,
    });
  }

  getNome() { return this.nomeKey ? `@${this.nomeKey}` : this.nome; }
  bonusArma() { return this.arma ? this.arma.bonusAtaque : 0; }
  estaDestruido() { return this.vida <= 0; }
  membroDestruido() { return this.membros.some((m) => m.eBraco && m.estaDestruido()); }
  tem(status) { return (this.status[status] ?? 0) > 0; }

  adicionarMembro(m) { m.donoId = this.id; m.donoToken = this.getNome(); this.membros.push(m); return m; }

  addStatus(nome, n, notifier, { silencioso = false } = {}) {
    if (this.estaDestruido()) return;
    this.status[nome] = (this.status[nome] ?? 0) + n;
    if (!silencioso) {
      notifier.notify('log.status', [this.getNome(), n > 0 ? `+${n}` : `${n}`, `@st.${nome}`],
        { fx: { tipo: 'status', alvo: this.id, status: nome, n } });
    }
  }
  removerStatus(nome) { delete this.status[nome]; }

  ganharBloqueio(n, notifier) {
    if (n <= 0 || this.estaDestruido()) return;
    this.bloqueio += n;
    notifier.notify('log.block', [this.getNome(), n], { fx: { tipo: 'bloqueio', alvo: this.id, valor: n } });
  }

  curar(n, notifier) {
    if (this.estaDestruido() || n <= 0) return 0;
    const real = Math.min(n, this.maxVida - this.vida);
    this.vida += real;
    notifier.notify('log.heal', [this.getNome(), real], { tom: 'cura', fx: { tipo: 'cura', alvo: this.id, valor: real, vida: this.vida } });
    return real;
  }

  ganharMana(n, notifier) {
    if (this.maxMana <= 0 || this.estaDestruido()) return 0;
    const real = Math.min(n, this.maxMana - this.mana);
    this.mana += real;
    if (real > 0) notifier.notify('log.mana', [this.getNome(), real], { fx: { tipo: 'mana', alvo: this.id, valor: real } });
    return real;
  }

  // PDF: atacar(alvo) depende apenas de Destrutivel (DIP), nunca de uma classe concreta.
  atacar(alvo, notifier, { base = this.ataqueBase, elemento = 'fisico', kb = null, perfura = false, semMira = false } = {}) {
    const calc = calcularDano({ base, fonte: this, alvo, kb, elemento, semMira });
    const res = alvo.receberDano(calc.dano, notifier, { elemento, perfura, notas: calc.notas, fonte: this });
    return { ...res, calc };
  }

  // Gancho (OCP): subclasses decidem se zerar a vida realmente derrota o combatente.
  aoZerarVida(/* notifier */) { return true; }

  receberDano(valor, notifier, meta = {}) {
    if (this.estaDestruido()) return { dano: 0, bloqueado: 0, esquivou: false };
    if (valor > 0 && this.tem('esquiva') && !meta.dot) {
      this.status.esquiva -= 1; if (this.status.esquiva <= 0) delete this.status.esquiva;
      notifier.notify('log.dodge', [this.getNome()], { fx: { tipo: 'esquiva', alvo: this.id } });
      return { dano: 0, bloqueado: 0, esquivou: true };
    }
    let resto = valor, bloqueado = 0;
    if (!meta.perfura && this.bloqueio > 0) {
      bloqueado = Math.min(this.bloqueio, resto); this.bloqueio -= bloqueado; resto -= bloqueado;
    }
    this.vida = Math.max(0, this.vida - resto);
    const nota = (meta.notas || []).find((n) => ['weak', 'resist', 'crit'].includes(n)) || null;
    notifier.notify(resto > 0 || bloqueado === 0 ? 'log.damage' : 'log.blocked',
      [this.getNome(), resto > 0 || bloqueado === 0 ? resto : bloqueado],
      { fx: { tipo: 'dano', alvo: this.id, valor: resto, bloqueado, elemento: meta.elemento || 'fisico', nota, vida: this.vida } });
    if (nota) notifier.notify(`log.${nota}`, [], { tom: nota === 'resist' ? 'ruim' : 'bom' });
    if (this.vida === 0 && this.aoZerarVida(notifier)) {
      this.vida = 0;
      notifier.notify('log.defeated', [this.getNome()], { tom: 'morte', fx: { tipo: 'morte', alvo: this.id } });
    }
    return { dano: resto, bloqueado, esquivou: false };
  }
}

// ---------------------------------------------------------------- Heróis
export class Guerreiro extends Personagem {
  usarHabilidade(alvo, notifier, ctx) { // Golpe Brutal
    return this.atacar(alvo, notifier, { base: this.ataqueBase * 2 + 2, kb: ctx.kb });
  }
}

export class Mago extends Personagem {
  usarHabilidade(alvo, notifier, ctx) { // Bola de Fogo (a mana é cobrada pela carta antes de chegar aqui)
    const r = this.atacar(alvo, notifier, { base: this.ataqueBase * 2 + 4, elemento: 'fogo', kb: ctx.kb });
    if (!alvo.estaDestruido() && alvo.addStatus) alvo.addStatus('queimadura', 3, notifier);
    return r;
  }
}

export class Arqueiro extends Personagem {
  usarHabilidade(alvo, notifier, ctx) { // Tiro Certeiro: ignora escudo
    return this.atacar(alvo, notifier, { base: this.ataqueBase * 2 + 2, perfura: true, kb: ctx.kb });
  }
}

export class Clerigo extends Personagem {
  usarHabilidade(alvo, notifier) { // Cura
    return { cura: alvo.curar(10 + this.bonusArma(), notifier) };
  }
}

// ---------------------------------------------------------------- Inimigos
export class Inimigo extends Personagem {
  constructor(opts) {
    super({ ...opts, lado: opts.lado ?? 'inimigo' });
    this.plano = opts.plano ?? []; this.turno = 0; this.intencao = null;
    this.loot = opts.loot ?? null; this.cenario = false; this.aura = null;
    this.deslocamento = opts.deslocamento ?? 0;
  }
  planejar() {
    const lista = this.plano;
    this.intencao = lista.length ? { ...lista[(this.turno + this.deslocamento) % lista.length] } : null;
    this.turno += 1;
  }
}

/** Zumbi: não morre na primeira vez que a vida zera (exemplo do PDF) — sem alterar Personagem. */
export class Zumbi extends Inimigo {
  constructor(o) { super(o); this.ressuscitou = false; }
  aoZerarVida(notifier) {
    if (this.ressuscitou) return true;
    this.ressuscitou = true;
    this.vida = Math.ceil(this.maxVida * 0.4);
    this.status = {};
    notifier.notify('log.zombie', [this.getNome()], { tom: 'ruim', fx: { tipo: 'reviver', alvo: this.id } });
    return false;
  }
}

/** Chefe: muda de fase ao zerar a vida (outro exemplo do PDF). */
export class Chefe extends Inimigo {
  constructor(o) { super(o); this.fases = o.fases ?? []; this.faseAtual = 0; this.imune = ['atordoado']; }
  aoZerarVida(notifier) {
    if (this.faseAtual >= this.fases.length) return true;
    const f = this.fases[this.faseAtual++];
    const antigo = this.getNome();
    this.nomeKey = f.nomeKey; this.emoji = f.emoji; this.maxVida = f.vida; this.vida = f.vida;
    this.ataqueBase = f.ataque; this.plano = f.plano; this.turno = 0; this.tipos = [...f.tipos];
    this.status = {}; this.bloqueio = 0; this.fase2 = true;
    this.membros.forEach((m) => { m.vida = m.maxVida; });
    notifier.notify('log.phase', [antigo, this.getNome()], { tom: 'ruim', fx: { tipo: 'fase', alvo: this.id } });
    this.planejar();
    return false;
  }
}

// ---------------------------------------------------------------- Cenário (Destrutivel sem herdar de Personagem)
export class Cenario {
  constructor({ id, nomeKey, emoji, durabilidade, tipos = [], loot = null }) {
    Object.assign(this, { id, nomeKey, emoji, maxVida: durabilidade, vida: durabilidade, tipos, loot,
      status: {}, bloqueio: 0, membros: [], lado: 'inimigo', cenario: true, intencao: null, arma: null });
  }
  getNome() { return `@${this.nomeKey}`; }
  estaDestruido() { return this.vida <= 0; }
  tem() { return false; }
  addStatus() {}
  planejar() {}
  danoEfetivo(valor) { return valor; }
  receberDano(valor, notifier) {
    if (this.estaDestruido()) return { dano: 0, bloqueado: 0 };
    const efetivo = this.danoEfetivo(valor);
    this.vida = Math.max(0, this.vida - efetivo);
    notifier.notify('log.damage', [this.getNome(), efetivo],
      { fx: { tipo: 'dano', alvo: this.id, valor: efetivo, bloqueado: 0, elemento: 'fisico' } });
    if (this.estaDestruido()) this.aoDestruir(notifier);
    return { dano: efetivo, bloqueado: 0 };
  }
  aoDestruir(notifier) {
    notifier.notify('log.defeated', [this.getNome()], { tom: 'morte', fx: { tipo: 'morte', alvo: this.id } });
  }
}

export class Bau extends Cenario {
  aoDestruir(notifier) {
    notifier.notify('log.chest', [this.getNome()], { tom: 'bom', fx: { tipo: 'morte', alvo: this.id } });
  }
}

export class Portao extends Cenario { // "Fortaleza" do PDF: reduz cada impacto em 3
  constructor(o) { super(o); this.aura = 3; }
  danoEfetivo(valor) { return Math.max(1, valor - 3); }
  aoDestruir(notifier) {
    notifier.notify('log.gateBroken', [this.getNome()], { tom: 'bom', fx: { tipo: 'morte', alvo: this.id } });
  }
}

export const podeUsarHabilidade = (p) => implementa(p, ComHabilidadeEspecial);
export { nomeDe };
