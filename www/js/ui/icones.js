// Conjunto de ícones em traço (SVG inline, herdam currentColor). Substituem os emojis da interface.
const P = {
  slash: '<path d="M4 20 20 4M14 4h6v6M5.5 13.5l5 5"/>',
  blaster: '<path d="M3 11h13v4H8l-1 4H4zM16 12h5M10 11V8h4v3"/>',
  claw: '<path d="M5 4l4 16M11 4l4 16M17 4l3 16"/>',
  plasma: '<path d="M12 3c1 4 5 5 5 10a5 5 0 0 1-10 0c0-3 2-4 2-7 1 1 3 2 3-3z" fill="currentColor" fill-opacity=".25"/>',
  ion: '<path d="M13 2 5 14h6l-1 8 8-12h-6z" fill="currentColor" fill-opacity=".25"/>',
  crio: '<path d="M12 3v18M4.5 7.5l15 9M19.5 7.5l-15 9M9 4l3 2 3-2M9 20l3-2 3 2"/>',
  luz: '<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
  shield: '<path d="M12 3l7 3v6c0 5-3 8-7 9-4-1-7-4-7-9V6z" fill="currentColor" fill-opacity=".2"/>',
  cross: '<path d="M10 4h4v6h6v4h-6v6h-4v-6H4v-4h6z" fill="currentColor" fill-opacity=".2"/>',
  up: '<path d="M12 4l7 9h-4v7H9v-7H5z"/>',
  down: '<path d="M12 20l-7-9h4V4h6v7h4z"/>',
  cards: '<rect x="4" y="6" width="11" height="14" rx="1"/><path d="M8 4h10a2 2 0 0 1 2 2v11"/>',
  drop: '<path d="M12 3c4 5 6 8 6 11a6 6 0 0 1-12 0c0-3 2-6 6-11z"/>',
  sever: '<path d="M3 12h7M14 12h7M13 4l-2 16"/>',
  revive: '<path d="M12 5a7 7 0 1 1-7 7M5 5v5h5"/>',
  star: '<path d="M12 3l2.7 5.6 6.1.8-4.4 4.3 1 6.1L12 17l-5.4 2.8 1-6.1L3.2 9.4l6.1-.8z" fill="currentColor" fill-opacity=".2"/>',
  burst: '<path d="M12 3v5M12 16v5M3 12h5M16 12h5M5.6 5.6l3.5 3.5M14.9 14.9l3.5 3.5M18.4 5.6l-3.5 3.5M9.1 14.9l-3.5 3.5"/>',
  chev: '<path d="M9 5l7 7-7 7"/>',
  menu: '<path d="M4 7h16M4 12h16M4 17h16"/>',
  deck: '<rect x="3" y="7" width="12" height="14" rx="1"/><path d="M7 4h11a3 3 0 0 1 3 3v10"/>',
  gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M19.1 4.9 17 7M7 17l-2.1 2.1"/>',
  bag: '<path d="M5 8h14l-1 12H6zM9 8a3 3 0 0 1 6 0"/>',
  lock: '<rect x="5" y="11" width="14" height="9" rx="1"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',
  check: '<path d="M4 12l5 5L20 6"/>',
  crate: '<path d="M3 7l9-4 9 4v10l-9 4-9-4zM3 7l9 4 9-4M12 11v10"/>',
};

/** Cria um <svg> com o ícone pedido. */
export function icone(nome, { tam = 20, traco = 1.8, cls = '' } = {}) {
  const s = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  s.setAttribute('viewBox', '0 0 24 24'); s.setAttribute('width', tam); s.setAttribute('height', tam);
  s.setAttribute('fill', 'none'); s.setAttribute('stroke', 'currentColor'); s.setAttribute('stroke-width', traco);
  s.setAttribute('stroke-linecap', 'round'); s.setAttribute('stroke-linejoin', 'round'); s.setAttribute('aria-hidden', 'true');
  s.setAttribute('class', `ico ${cls}`.trim());
  s.innerHTML = P[nome] ?? P.star;
  return s;
}

const ICONE_ELEM = { fogo: 'plasma', raio: 'ion', gelo: 'crio', sagrado: 'luz' };
const ICONE_FISICO = { guerreiro: 'slash', arqueiro: 'blaster', fera: 'claw', mago: 'burst', clerigo: 'luz', neutro: 'burst' };
const ICONE_SKILL = { guerreiro: 'slash', mago: 'plasma', arqueiro: 'blaster', clerigo: 'cross' };

/** Ícone principal de uma carta, deduzido dos seus efeitos (nada de arte desenhada à mão por carta). */
export function iconeDaCarta(def) {
  for (const e of def.fx) {
    if (e.t === 'habilidade') return ICONE_SKILL[def.heroi] ?? 'star';
    if (e.t === 'dmg') return ICONE_ELEM[e.el] ?? ICONE_FISICO[def.heroi] ?? 'slash';
    if (e.t === 'limb') return 'sever';
    if (e.t === 'revive') return 'revive';
  }
  const t = def.fx[0]?.t;
  if (def.fx.some((e) => e.t === 'heal' && (e.to ?? 'target') !== 'self')) return 'cross';
  if (t === 'block') return 'shield';
  if (t === 'status') return ['fraqueza', 'vulneravel', 'veneno', 'queimadura', 'atordoado'].includes(def.fx[0].status) ? 'down' : 'up';
  if (t === 'draw') return 'cards';
  if (t === 'mana') return 'drop';
  if (t === 'cleanse') return 'cross';
  return 'star';
}

export const iconeDaClasse = (classe) => ({ guerreiro: 'slash', mago: 'ion', arqueiro: 'blaster', clerigo: 'cross', fera: 'claw' }[classe] ?? 'star');
export const iconeDaArma = (arma) => (['arco'].includes(arma.id) ? 'blaster' : ['maca', 'cajado'].includes(arma.id) ? 'burst' : 'slash');
