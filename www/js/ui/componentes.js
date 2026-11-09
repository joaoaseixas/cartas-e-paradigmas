// Componentes visuais reutilizáveis: placas de carta, unidades de combate e barras segmentadas.
import { h } from './dom.js';
import { t, I18n } from '../i18n.js';
import { CARTAS } from '../game/cartas.js';
import { HEROIS } from '../game/mundo.js';
import { COR_CLASSE, ICONE_STATUS, STATUS_RUIM, valoresCarta, nomeCarta, nomeDe } from './descrever.js';
import { icone, iconeDaCarta } from './icones.js';

/** Barra segmentada (cada tique = 1/10 do máximo) com texto sobreposto. */
export const barra = (cls, texto = '') => {
  const fill = h('i'); const lbl = h('span', {}, texto);
  const el = h('div', { class: `bar ${cls}` }, fill, h('b', { class: 'ticks' }), lbl);
  el.set = (v, max, mostrar = true) => {
    fill.style.width = `${Math.max(0, Math.min(1, v / max)) * 100}%`;
    lbl.textContent = mostrar ? `${v}/${max}` : '';
    el.classList.toggle('low', cls.includes('hpbar') && v / max <= 0.3 && v > 0);
  };
  return el;
};

/** Placa de carta: faixa de custo, ícone em traço, nome condensado e número em destaque. */
export function criarCartaEl(cartaId, donoId = null, { big = false } = {}) {
  const def = CARTAS[cartaId];
  const cor = COR_CLASSE[def.heroi] ?? COR_CLASSE.neutro;
  const dono = donoId ? HEROIS[donoId] : null;
  const [v1, ...resto] = valoresCarta(def);
  return h('div', { class: `card rar-${def.raridade}${big ? ' big' : ''}`, style: { '--cor': cor } },
    h('div', { class: 'c-top' },
      h('span', { class: 'cost' }, def.custo),
      h('span', { class: 'c-cls' }, def.heroi === 'neutro' ? t('rar.item') : t(`class.${def.heroi}`)),
      def.mana ? h('span', { class: 'mcost' }, def.mana) : null),
    h('div', { class: 'c-ico' }, icone(iconeDaCarta(def), { tam: big ? 44 : 30, traco: 1.6 })),
    h('div', { class: 'c-name' }, nomeCarta(cartaId)),
    h('div', { class: 'c-val' },
      v1 ? h('span', { class: 'n' }, v1.n) : null, v1 ? h('span', { class: 'l' }, v1.l) : null,
      resto.length ? h('span', { class: 'm' }, resto.map((r) => `${r.n} ${r.l}`).join(' · ')) : null),
    h('div', { class: 'c-foot' },
      dono ? h('span', { class: 'owner', style: { '--cor': dono.cor } }, dono.emoji) : h('span'),
      def.exaurir ? h('span', { class: 'exh' }, '1×') : null));
}

const intencao = (p) => {
  if (!p) return null;
  const s = (n) => ICONE_STATUS[n] ?? '';
  switch (p.tipo) {
    case 'ataque': return { cls: 'atk', ic: 'slash', txt: `${p.valor}${p.hits > 1 ? `×${p.hits}` : ''}` };
    case 'aoe': return { cls: 'atk', ic: 'burst', txt: `${p.valor}` };
    case 'dreno': return { cls: 'atk', ic: 'drop', txt: `${p.valor}` };
    case 'bloqueio': return { cls: 'def', ic: 'shield', txt: `${p.valor}` };
    case 'buff': return { cls: 'heal', ic: 'up', txt: s(p.status) };
    case 'debuff': return { cls: 'dbf', ic: 'down', txt: `${p.aoe ? '✱ ' : ''}${s(p.status)}` };
    case 'cura': return { cls: 'heal', ic: 'cross', txt: `${p.valor}` };
    case 'atordoado': return { cls: 'dbf', ic: 'down', txt: 'ATD' };
    default: return null;
  }
};

/** Cria a "view" de uma entidade em combate; `atualizar` sincroniza com o estado do domínio. */
export function criarUnidade(entidade, batalha, { onclick }) {
  const heroi = entidade.lado === 'heroi';
  const chefe = !!entidade.fases;
  const token = h('div', { class: 'token' }, h('span', { class: 'emoji' }, entidade.emoji));
  const intent = heroi || (entidade.cenario && !entidade.aura) ? null : h('div', { class: 'intent' });
  const nome = h('div', { class: 'name' });
  const hp = barra('hpbar hp'); const mp = entidade.maxMana > 0 ? barra('mana thin mp') : null;
  const sts = h('div', { class: 'statuses' });
  const limb = entidade.membros?.some((m) => m.eBraco) ? h('div', { class: 'limb' }) : null;
  const blk = h('span', { class: 'badge blk', style: { display: 'none' } });
  token.append(blk);
  const el = h('div', { class: `unit ${heroi ? 'heroi' : 'inimigo'}${entidade.cenario ? ' cenario' : ''}${chefe ? ' chefe' : ''}`, style: heroi ? { '--cor': entidade.cor } : null, 'data-id': entidade.id, onclick: () => onclick(entidade) },
    intent, token, nome, hp, mp, limb, sts);

  const view = {
    el, token, entidade, ator: null, _x: -1, _y: -1, _h: -1,
    /** Posiciona o HUD sobre o modelo 3D (cabeça = topo do token, pés = base do token). */
    posicionar(cabeca, pes) {
      if (!cabeca || cabeca.atras) return;
      const altura = Math.max(36, pes.y - cabeca.y), x = Math.round(cabeca.x), y = Math.round(cabeca.y - 30);
      if (x !== this._x || y !== this._y) { el.style.transform = `translate(${x}px, ${y}px)`; this._x = x; this._y = y; }
      if (Math.abs(altura - this._h) > 1) { token.style.height = `${Math.round(altura)}px`; this._h = altura; }
    },
    setHp(v) { hp.set(v, entidade.maxVida); },
    atualizar() {
      const e = entidade;
      nome.textContent = nomeDe(e);
      hp.set(e.vida, e.maxVida);
      mp?.set(e.mana, e.maxMana);
      blk.style.display = e.bloqueio > 0 ? '' : 'none'; blk.textContent = e.bloqueio;
      el.classList.toggle('morto', e.estaDestruido());
      el.classList.toggle('stunned', !!e.tem?.('atordoado') && !e.estaDestruido());
      sts.replaceChildren(...Object.entries(e.status ?? {}).filter(([, n]) => n > 0).map(([k, n]) =>
        h('span', { class: `chip ${STATUS_RUIM.has(k) ? 'bad' : 'good'}` }, ICONE_STATUS[k] ?? '?', n > 1 || k === 'forca' ? ` ${n}` : '')));
      if (e.membroDestruido?.()) sts.append(h('span', { class: 'chip bad' }, ICONE_STATUS.desarmado));
      if (limb) {
        const m = e.membros.find((x) => x.eBraco);
        limb.className = `limb${m.estaDestruido() ? ' broken' : ''}`;
        limb.textContent = `${t('v.limb')} ${m.vida}/${m.maxVida}`;
      }
      if (intent) {
        let p = null;
        if (e.cenario && e.aura) p = e.estaDestruido() ? null : { tipo: 'bloqueio', valor: `+${e.aura}` };
        else p = batalha.previsao(e);
        const i = intencao(p);
        intent.style.visibility = i ? 'visible' : 'hidden';
        intent.className = `intent ${i?.cls ?? ''}`;
        intent.replaceChildren(...(i ? [icone(i.ic, { tam: 14, traco: 2.2 }), h('span', {}, i.txt)] : []));
      }
    },
  };
  view.atualizar();
  return view;
}

export const idiomaAtual = () => I18n.lang;
export { t };
