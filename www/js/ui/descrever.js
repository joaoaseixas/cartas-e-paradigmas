// Descrições textuais geradas a partir dos dados da carta (sem texto fixo por carta => i18n barata).
import { t } from '../i18n.js';
import { CARTAS, alvoPadrao } from '../game/cartas.js';

export const ICONE_STATUS = { forca: 'ATQ', fraqueza: 'FRQ', vulneravel: 'VUL', veneno: 'VEN', queimadura: 'QUE', mira: 'MIR', esquiva: 'ESQ', atordoado: 'ATD', desarmado: 'DSM' };
export const STATUS_RUIM = new Set(['fraqueza', 'vulneravel', 'veneno', 'queimadura', 'atordoado', 'desarmado']);
export const ICONE_ELEMENTO = { fogo: 'fogo', gelo: 'gelo', raio: 'raio', sagrado: 'sagrado', fisico: '', veneno: '', sombra: '' };
export const COR_CLASSE = { guerreiro: '#e8743b', mago: '#9b6dff', arqueiro: '#4cc27a', clerigo: '#f2c94c', fera: '#c98b5a', neutro: '#7f9db8' };

const alvoTexto = (eff, def, plural) => {
  const to = eff.to ?? alvoPadrao(def);
  if (to === 'self') return t('fx.toSelf');
  if (to === 'enemies') return t('fx.toEnemies');
  if (to === 'allies') return t('fx.toAllies');
  return plural ?? '';
};

export function descreverEfeito(eff, def) {
  switch (eff.t) {
    case 'dmg': {
      const el = ICONE_ELEMENTO[eff.el] ? ` (${t(`el.${eff.el}`)})` : '';
      const base = eff.hits > 1 ? t('fx.dmgHits', eff.n, eff.hits) : t('fx.dmg', eff.n);
      return base + el + ((eff.to ?? alvoPadrao(def)) === 'enemies' ? t('fx.all') : '') + (eff.perfura ? t('fx.pierce') : '') + (eff.executar ? `.${t('fx.execute')}` : '');
    }
    case 'block': {
      const to = eff.to ?? alvoPadrao(def);
      return to === 'allies' ? t('fx.blockAllies', eff.n) : to === 'target' ? t('fx.blockAlly', eff.n) : t('fx.block', eff.n);
    }
    case 'heal': {
      const to = eff.to ?? alvoPadrao(def);
      return to === 'allies' ? t('fx.healAll', eff.n) : to === 'self' && def.alvo !== 'self' ? t('fx.healSelf', eff.n) : t('fx.heal', eff.n);
    }
    case 'status': return t('fx.status', t(`st.${eff.status}`), `+${eff.n}`) + alvoTexto(eff, def);
    case 'draw': return t('fx.draw', eff.n);
    case 'mana': return t('fx.mana', eff.n);
    case 'selfDmg': return t('fx.selfDmg', eff.n);
    case 'limb': return t('fx.limb', eff.n);
    case 'revive': return t('fx.revive', eff.pct);
    case 'cleanse': return t('fx.cleanse');
    case 'habilidade': return habilidadeTexto(def);
    default: return '';
  }
}

const habilidadeTexto = (def) => t(`sk.${def.heroi}`);

export function descreverCarta(def) {
  const partes = def.fx.map((e) => descreverEfeito(e, def)).filter(Boolean);
  let txt = partes.join('. ') + '.';
  if (def.exaurir) txt += ` ${t('fx.exhaust')}`;
  return txt.replace(/\.\./g, '.');
}

/** Valores destacados da carta: o primeiro vira o número grande da placa, os demais viram linhas pequenas. */
export function valoresCarta(def) {
  const out = [];
  for (const e of def.fx) {
    const to = e.to ?? alvoPadrao(def);
    if (e.t === 'dmg') out.push({ n: `${e.n}${e.hits > 1 ? `x${e.hits}` : ''}`, l: t('v.dmg') + (to === 'enemies' ? ' ✱' : '') });
    else if (e.t === 'block') out.push({ n: e.n, l: t('v.blk') });
    else if (e.t === 'heal' && to !== 'self') out.push({ n: e.n, l: t('v.heal') });
    else if (e.t === 'habilidade') out.push({ n: '★', l: t('v.skill') });
    else if (e.t === 'status') out.push({ n: `${ICONE_STATUS[e.status] ?? ''}`, l: `+${e.n}` });
    else if (e.t === 'draw') out.push({ n: e.n, l: t('v.draw') });
    else if (e.t === 'mana') out.push({ n: e.n, l: t('v.mana') });
    else if (e.t === 'limb') out.push({ n: e.n, l: t('v.limb') });
    else if (e.t === 'revive') out.push({ n: '+', l: t('v.revive') });
    else if (e.t === 'cleanse') out.push({ n: '—', l: t('v.cleanse') });
  }
  return out.slice(0, 3);
}

export const nomeCarta = (id) => t(`card.${id}`);
export const dadosCarta = (id) => CARTAS[id];

/** Nome exibível de uma entidade (token "@chave|arg" ou nome próprio). */
import { I18n } from '../i18n.js';
export const nomeDe = (e) => I18n.resolve(e.getNome());
