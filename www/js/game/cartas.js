// Catálogo de cartas (dados puros). Os efeitos são descritos como dados e executados por um registro
// de handlers em batalha.js — adicionar um efeito novo não exige alterar o motor (OCP).
const dmg = (n, o = {}) => ({ t: 'dmg', n, hits: 1, el: 'fisico', ...o });
const block = (n, o = {}) => ({ t: 'block', n, ...o });
const heal = (n, o = {}) => ({ t: 'heal', n, ...o });
const st = (status, n, o = {}) => ({ t: 'status', status, n, ...o });
const draw = (n) => ({ t: 'draw', n });
const mana = (n) => ({ t: 'mana', n });
const selfDmg = (n) => ({ t: 'selfDmg', n });
const limb = (n) => ({ t: 'limb', n });
const revive = (pct) => ({ t: 'revive', pct });
const cleanse = () => ({ t: 'cleanse' });
const skill = () => ({ t: 'habilidade' });

const C = {};
const carta = (id, heroi, custo, alvo, arte, raridade, fx, o = {}) => {
  C[id] = { id, heroi, custo, mana: o.mana ?? 0, alvo, arte, raridade, fx, el: o.el ?? 'fisico', exaurir: !!o.exaurir };
};

// ----------------------------------------------------------------- Guerreiro
carta('g_golpe', 'guerreiro', 1, 'enemy', '🗡️', 'basica', [dmg(6)]);
carta('g_defesa', 'guerreiro', 1, 'self', '🛡️', 'basica', [block(6)]);
carta('g_brutal', 'guerreiro', 2, 'enemy', '💥', 'basica', [skill()]);
carta('g_grito', 'guerreiro', 1, 'allAllies', '📣', 'basica', [st('forca', 2)], { exaurir: true });
carta('g_redemoinho', 'guerreiro', 2, 'allEnemies', '🌀', 'comum', [dmg(7)]);
carta('g_decepar', 'guerreiro', 1, 'enemy', '🪓', 'comum', [dmg(3), limb(10)]);
carta('g_furia', 'guerreiro', 0, 'self', '😡', 'comum', [selfDmg(3), st('forca', 2)]);
carta('g_muralha', 'guerreiro', 2, 'allAllies', '🏰', 'comum', [block(8)]);
carta('g_execucao', 'guerreiro', 2, 'enemy', '⚰️', 'rara', [dmg(9, { executar: true })]);

// ----------------------------------------------------------------- Maga
carta('m_faisca', 'mago', 1, 'enemy', '✨', 'basica', [dmg(5, { el: 'fogo' })], { mana: 1, el: 'fogo' });
carta('m_barreira', 'mago', 1, 'self', '🔮', 'basica', [block(6)]);
carta('m_bola', 'mago', 2, 'enemy', '🔥', 'basica', [skill()], { mana: 5, el: 'fogo' });
carta('m_meditar', 'mago', 1, 'self', '🧘', 'basica', [mana(6), draw(1)]);
carta('m_raio', 'mago', 1, 'enemy', '⚡', 'comum', [dmg(9, { el: 'raio' })], { mana: 3, el: 'raio' });
carta('m_gelo', 'mago', 2, 'allEnemies', '❄️', 'comum', [dmg(5, { el: 'gelo' }), st('fraqueza', 1)], { mana: 4, el: 'gelo' });
carta('m_meteoro', 'mago', 3, 'allEnemies', '☄️', 'rara', [dmg(16, { el: 'fogo' })], { mana: 8, el: 'fogo', exaurir: true });
carta('m_drenar', 'mago', 1, 'enemy', '🩸', 'comum', [dmg(4), heal(4, { to: 'self' })], { mana: 2 });
carta('m_telecinese', 'mago', 1, 'enemy', '🧠', 'rara', [dmg(4), st('atordoado', 1)], { mana: 3 });

// ----------------------------------------------------------------- Arqueiro
carta('a_flecha', 'arqueiro', 1, 'enemy', '🏹', 'basica', [dmg(5)]);
carta('a_abrigo', 'arqueiro', 1, 'self', '🌿', 'basica', [block(4), st('esquiva', 1)]);
carta('a_certeiro', 'arqueiro', 2, 'enemy', '🎯', 'basica', [skill()]);
carta('a_mirar', 'arqueiro', 0, 'self', '👁️', 'basica', [st('mira', 1)]);
carta('a_chuva', 'arqueiro', 2, 'allEnemies', '🌧️', 'comum', [dmg(5)]);
carta('a_duplo', 'arqueiro', 1, 'enemy', '➰', 'comum', [dmg(3, { hits: 2 })]);
carta('a_veneno', 'arqueiro', 1, 'enemy', '☠️', 'comum', [dmg(2), st('veneno', 4)]);
carta('a_armadilha', 'arqueiro', 1, 'enemy', '🪤', 'comum', [dmg(3), st('vulneravel', 2)]);
carta('a_saraivada', 'arqueiro', 3, 'enemy', '🎆', 'rara', [dmg(4, { hits: 5 })]);

// ----------------------------------------------------------------- Clérigo
carta('c_maca', 'clerigo', 1, 'enemy', '🔨', 'basica', [dmg(4, { el: 'sagrado' })], { el: 'sagrado' });
carta('c_escudo', 'clerigo', 1, 'ally', '✝️', 'basica', [block(7)]);
carta('c_cura', 'clerigo', 1, 'ally', '💖', 'basica', [skill()], { mana: 3 });
carta('c_bencao', 'clerigo', 1, 'ally', '🙏', 'basica', [st('forca', 2)], { mana: 2 });
carta('c_luz', 'clerigo', 2, 'enemy', '☀️', 'comum', [dmg(8, { el: 'sagrado' }), heal(4, { to: 'self' })], { mana: 3, el: 'sagrado' });
carta('c_purificar', 'clerigo', 1, 'ally', '🧼', 'comum', [cleanse(), draw(1)], { mana: 1 });
carta('c_ressurreicao', 'clerigo', 2, 'deadAlly', '👼', 'rara', [revive(40)], { mana: 6, exaurir: true });
carta('c_milagre', 'clerigo', 3, 'allAllies', '🌟', 'rara', [heal(12), block(5)], { mana: 8, exaurir: true });

// ----------------------------------------------------------------- Fera domada (Dart)
carta('d_mordida', 'fera', 1, 'enemy', '🦷', 'basica', [dmg(7)]);
carta('d_pelo', 'fera', 1, 'self', '🐾', 'basica', [block(5)]);
carta('d_uivo', 'fera', 1, 'allAllies', '🌕', 'basica', [st('forca', 1)]);
carta('d_farejar', 'fera', 0, 'self', '👃', 'basica', [draw(2)], { exaurir: true });
carta('d_dilacerar', 'fera', 2, 'enemy', '🩸', 'comum', [dmg(6), st('veneno', 3)]);
carta('d_investida', 'fera', 2, 'enemy', '🐕', 'comum', [dmg(12), selfDmg(3)]);

// ----------------------------------------------------------------- Itens (qualquer herói)
carta('pocao', 'neutro', 0, 'ally', '🧪', 'item', [heal(8)], { exaurir: true });
carta('granada', 'neutro', 1, 'allEnemies', '💣', 'item', [dmg(6, { el: 'fogo' })], { exaurir: true, el: 'fogo' });
carta('pergaminho', 'neutro', 0, 'self', '📜', 'item', [draw(2), mana(4)], { exaurir: true });

export const CARTAS = Object.freeze(C);

// Baralho inicial de cada herói (ids de carta).
export const BARALHO_INICIAL = {
  guerreiro: ['g_golpe', 'g_golpe', 'g_defesa', 'g_defesa', 'g_brutal', 'g_grito'],
  mago: ['m_faisca', 'm_faisca', 'm_barreira', 'm_barreira', 'm_bola', 'm_meditar'],
  arqueiro: ['a_flecha', 'a_flecha', 'a_abrigo', 'a_abrigo', 'a_certeiro', 'a_mirar'],
  clerigo: ['c_maca', 'c_maca', 'c_escudo', 'c_escudo', 'c_cura', 'c_bencao'],
  fera: ['d_mordida', 'd_mordida', 'd_pelo', 'd_pelo', 'd_uivo', 'd_farejar'],
};

export const alvoPadrao = (def) => ({
  enemy: 'target', ally: 'target', deadAlly: 'target', allEnemies: 'enemies', self: 'self', allAllies: 'allies',
}[def.alvo]);
export const precisaAlvo = (def) => ['enemy', 'ally', 'deadAlly'].includes(def.alvo);
