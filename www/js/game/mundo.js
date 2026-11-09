// Dados do mundo: armas, heróis, inimigos e fases. Fábricas criam as entidades do domínio.
import {
  Guerreiro, Mago, Arqueiro, Clerigo, Inimigo, Zumbi, Chefe, Bau, Portao, Membro, Arma,
} from '../domain/entidades.js';

// ----------------------------------------------------------------- Armas (agregação)
export const ARMAS = {
  espada: { id: 'espada', emoji: '🗡️', bonusAtaque: 1 },
  adaga: { id: 'adaga', emoji: '🔪', bonusAtaque: 1 },
  presa: { id: 'presa', emoji: '🦷', bonusAtaque: 2 },
  arco: { id: 'arco', emoji: '🏹', bonusAtaque: 2 },
  maca: { id: 'maca', emoji: '🔨', bonusAtaque: 2 },
  cajado: { id: 'cajado', emoji: '🪄', bonusAtaque: 2 },
  machado: { id: 'machado', emoji: '🪓', bonusAtaque: 3 },
  vorpal: { id: 'vorpal', emoji: '⚔️', bonusAtaque: 3 },
};
export const criarArma = (id) => new Arma(ARMAS[id]);

// ----------------------------------------------------------------- Heróis
const H = (id, nome, classe, Cls, mono, cor, raridade, vida, ataque, mana = 0, regen = 0, modelo = id) =>
  ({ id, nome, classe, Cls, emoji: mono, cor, raridade, vida, ataque, mana, regen, modelo });

export const HEROIS = {
  luke: H('luke', 'Luke', 'guerreiro', Guerreiro, 'LU', '#f26a21', 'comum', 44, 6),
  han: H('han', 'Han', 'arqueiro', Arqueiro, 'HA', '#f2b134', 'comum', 36, 5),
  leia: H('leia', 'Leia', 'clerigo', Clerigo, 'LE', '#86e3c9', 'comum', 34, 3, 14, 2),
  chewie: H('chewie', 'Chewbacca', 'fera', Inimigo, 'CH', '#c8905a', 'raro', 52, 7),
  lando: H('lando', 'Lando', 'arqueiro', Arqueiro, 'LC', '#f2b134', 'raro', 38, 5),
  r2: H('r2', 'R2-D2', 'clerigo', Clerigo, 'R2', '#86e3c9', 'raro', 32, 3, 16, 3),
  obiwan: H('obiwan', 'Obi-Wan', 'guerreiro', Guerreiro, 'OB', '#f26a21', 'epico', 48, 7),
  ahsoka: H('ahsoka', 'Ahsoka', 'guerreiro', Guerreiro, 'AH', '#f26a21', 'epico', 42, 8),
  mace: H('mace', 'Mace Windu', 'mago', Mago, 'MW', '#9ad46a', 'epico', 40, 6, 22, 2),
  yoda: H('yoda', 'Yoda', 'mago', Mago, 'YO', '#9ad46a', 'lendario', 36, 6, 26, 3),
  boba: H('boba', 'Boba Fett', 'arqueiro', Arqueiro, 'BF', '#f2b134', 'lendario', 44, 8, 0, 0, 'vampiro'),
};
export const ORDEM_HEROIS = ['luke', 'han', 'leia', 'chewie', 'lando', 'r2', 'obiwan', 'ahsoka', 'mace', 'yoda', 'boba'];
export const INICIAIS = ['luke', 'han', 'leia'];
export const NIVEL_MAX = 10;

// Cartas extras desbloqueadas por nível (a classe define o conjunto). Nível N libera a carta N-1 da lista.
export const EXTRAS_POR_CLASSE = {
  guerreiro: ['g_decepar', 'g_redemoinho', 'g_furia', 'g_muralha', 'g_execucao'],
  mago: ['m_raio', 'm_drenar', 'm_gelo', 'm_telecinese', 'm_meteoro'],
  arqueiro: ['a_duplo', 'a_veneno', 'a_chuva', 'a_armadilha', 'a_saraivada'],
  clerigo: ['c_luz', 'c_purificar', 'c_milagre', 'c_ressurreicao'],
  fera: ['d_dilacerar', 'd_investida'],
};
export const NIVEIS_CARTA = [2, 3, 4, 6, 8];
export const cartasDesbloqueadas = (classe, nivel) =>
  (EXTRAS_POR_CLASSE[classe] ?? []).filter((_, i) => nivel >= NIVEIS_CARTA[i]);

/** Atributos de um herói no nível dado: +9% de vida e +0,5 de ataque por nível acima do 1. */
export const statsDoNivel = (d, nivel) => ({
  vida: Math.round(d.vida * (1 + 0.09 * (nivel - 1))),
  ataque: Math.round(d.ataque + 0.5 * (nivel - 1)),
});

export function criarHeroi(id, nivel = 1, armaId = null) {
  const d = HEROIS[id];
  const s = statsDoNivel(d, nivel);
  // Chewbacca é um Inimigo "domado": herói sem habilidade especial (LSP/ISP do PDF).
  const h = new d.Cls({ id: d.id, nome: d.nome, emoji: d.emoji, vida: s.vida, ataque: s.ataque, mana: d.mana, regenMana: d.regen, lado: 'heroi', tipos: [d.id] });
  h.classe = d.classe; h.cor = d.cor; h.nivel = nivel; h.modelo = d.modelo;
  if (armaId && ARMAS[armaId]) h.arma = criarArma(armaId);
  return h;
}

// ----------------------------------------------------------------- Planos dos inimigos
const A = (mult, o = {}) => ({ tipo: 'ataque', mult, hits: 1, el: 'fisico', ...o });
const AoE = (mult) => ({ tipo: 'aoe', mult });
const Def = (n) => ({ tipo: 'bloqueio', n });
const Buff = (status, n) => ({ tipo: 'buff', status, n });
const Debuff = (status, n, o = {}) => ({ tipo: 'debuff', status, n, ...o });
const Cura = (n) => ({ tipo: 'cura', n });
const Dreno = (mult) => ({ tipo: 'dreno', mult });

const braco = (id, token, vida) => new Membro(`${id}_braco`, token, vida, { braco: true });

const MOLDES = {
  goblin: { vida: 18, ataque: 5, emoji: 'TR', braco: 8, plano: [A(1), A(1), Def(6)] },
  lobo: { vida: 20, ataque: 5, emoji: 'WA', plano: [A(0.8, { hits: 2 }), A(1.2), A(0.8, { hits: 2 })] },
  esqueleto: { vida: 22, ataque: 6, emoji: 'B1', braco: 10, plano: [A(1), Debuff('vulneravel', 1), A(1.4)] },
  zumbi: { Cls: Zumbi, vida: 30, ataque: 7, emoji: 'B1', braco: 12, plano: [A(1), Def(8), A(1.5)] },
  morcego: { vida: 12, ataque: 4, emoji: 'PD', plano: [Dreno(1), A(0.8, { hits: 2 }), Debuff('fraqueza', 1)] },
  cultista: { vida: 26, ataque: 5, emoji: 'DM', braco: 9, plano: [Debuff('fraqueza', 2), A(1.4, { el: 'fogo' }), Cura(8)] },
  vampiro: { vida: 40, ataque: 7, emoji: 'BF', braco: 12, plano: [Dreno(1), A(1), Buff('forca', 2), A(1.5)], loot: { chance: 0.7, pool: ['adaga', 'cajado', 'arco'] } },
  golem: { vida: 55, ataque: 9, emoji: 'AT', braco: 20, plano: [Def(8), A(1.3), A(2.2)], loot: { chance: 0.8, pool: ['machado', 'maca', 'vorpal'] } },
};

let seq = 0;
export function criarInimigo(tipo, escala = 1) {
  const e = criarInimigoBase(tipo);
  e.tipo = tipo; // chave do modelo 3D
  if (escala !== 1 && !e.cenario) {
    const f = escala;
    e.maxVida = e.vida = Math.round(e.vida * f); e.ataqueBase = Math.round(e.ataqueBase * (1 + (f - 1) * 0.7));
    e.membros.forEach((m) => { m.maxVida = m.vida = Math.round(m.vida * f); });
    e.fases?.forEach((p) => { p.vida = Math.round(p.vida * f); p.ataque = Math.round(p.ataque * (1 + (f - 1) * 0.7)); });
  }
  return e;
}

function criarInimigoBase(tipo) {
  const id = `e${++seq}_${tipo}`;
  if (tipo === 'bau') return new Bau({ id, nomeKey: 'unit.bau', emoji: 'CX', durabilidade: 12, tipos: ['bau', 'construcao'], loot: { chance: 1, pool: ['presa', 'arco', 'maca', 'cajado', 'adaga'] } });
  if (tipo === 'portao') return new Portao({ id, nomeKey: 'unit.portao', emoji: 'EF', durabilidade: 28, tipos: ['portao', 'construcao'], loot: { chance: 1, pool: ['machado', 'maca', 'vorpal'] } });
  if (tipo === 'demogorgon') {
    const e = new Chefe({
      id, nomeKey: 'unit.demogorgon', emoji: 'DV', vida: 110, ataque: 8, tipos: ['demogorgon', 'sombrio'],
      plano: [A(1.2), Debuff('vulneravel', 1, { aoe: true }), A(1.7), AoE(0.8)],
      fases: [{ nomeKey: 'unit.demogorgon2', emoji: 'DV', vida: 70, ataque: 11, tipos: ['demogorgon2', 'sombrio'], plano: [AoE(1), A(1.8), Buff('forca', 2), A(1.4, { hits: 2 })] }],
    });
    e.adicionarMembro(new Membro(`${id}_braco`, '@unit.garras', 25, { braco: true }));
    return e;
  }
  const m = MOLDES[tipo];
  const Cls = m.Cls ?? Inimigo;
  const e = new Cls({ id, nomeKey: `unit.${tipo}`, emoji: m.emoji, vida: m.vida, ataque: m.ataque, tipos: [tipo, ...(m.tipos ?? [])], plano: m.plano, loot: m.loot ?? null, deslocamento: seq % 2 });
  if (m.braco) e.adicionarMembro(braco(id, `@unit.braco|@unit.${tipo}`, m.braco));
  return e;
}

// ----------------------------------------------------------------- Fases
export const FASES = [
  { id: 'clareira', nomeKey: 'stage.clareira', tema: 'floresta', inimigos: ['goblin', 'bau', 'goblin'] },
  { id: 'bosque', nomeKey: 'stage.bosque', tema: 'mina', inimigos: ['lobo', 'goblin', 'lobo'] },
  { id: 'cripta', nomeKey: 'stage.cripta', tema: 'noite', inimigos: ['esqueleto', 'zumbi', 'morcego'] },
  { id: 'cidadela', nomeKey: 'stage.cidadela', tema: 'cidadela', inimigos: ['goblin', 'portao', 'cultista'] },
  { id: 'mina', nomeKey: 'stage.mina', tema: 'covil', inimigos: ['cultista', 'golem'] },
  { id: 'salao', nomeKey: 'stage.salao', tema: 'salao', inimigos: ['morcego', 'vampiro', 'morcego'] },
  { id: 'covil', nomeKey: 'stage.covil', tema: 'cripta', inimigos: ['lobo', 'demogorgon', 'lobo'], chefe: true },
];
