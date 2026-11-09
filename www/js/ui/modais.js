// Janelas modais (bottom sheets): menu, ajuda, códice, deck, equipamentos, info de unidade, confirmação.
import { h } from './dom.js';
import { t, I18n } from '../i18n.js';
import { Som } from './audio.js';
import { CARTAS } from '../game/cartas.js';
import { ARMAS, HEROIS } from '../game/mundo.js';
import { criarCartaEl } from './componentes.js';
import { ICONE_STATUS, STATUS_RUIM, nomeDe, nomeCarta, descreverCarta, COR_CLASSE } from './descrever.js';
import { Estado } from './estado.js';
import { Fx } from './fx.js';
import { icone, iconeDaArma } from './icones.js';

const raiz = () => document.getElementById('modal-root');

export function abrirSheet(conteudo, { centro = false, aoFechar = null } = {}) {
  const ov = h('div', { class: `overlay${centro ? ' mid' : ''}` });
  const sheet = h('div', { class: `sheet${centro ? ' center' : ''}` }, conteudo);
  ov.append(sheet);
  const fechar = () => { ov.remove(); aoFechar?.(); };
  ov.addEventListener('click', (e) => { if (e.target === ov) fechar(); });
  raiz().append(ov);
  return fechar;
}

export function confirmar(msg) {
  return new Promise((res) => {
    let fecha;
    const fim = (v) => () => { fecha(); res(v); };
    fecha = abrirSheet(h('div', {},
      h('p', { style: { textAlign: 'center', lineHeight: 1.4, margin: '4px 0 16px' } }, msg),
      h('div', { class: 'row-btns' }, h('button', { class: 'btn sec', onclick: fim(false) }, t('menu.no')), h('button', { class: 'btn', onclick: fim(true) }, t('menu.yes')))), { centro: true });
  });
}

export function abrirComoJogar() {
  const f = abrirSheet(h('div', {}, h('h3', { class: 'h-title' }, t('how.title')),
    h('ul', { class: 'how' }, [1, 2, 3, 4, 5, 6, 7, 8].map((i) => h('li', {}, t(`how.${i}`)))),
    h('button', { class: 'btn block', onclick: () => f() }, t('menu.ok'))));
}

export function abrirCodex() {
  const itens = ['poo', 'solid', 'assoc', 'fn', 'logic', 'struct', 'i18n'];
  const f = abrirSheet(h('div', {}, h('h3', { class: 'h-title' }, t('codex.title')),
    h('p', { style: { color: 'var(--muted)', fontSize: '13px', textAlign: 'center', margin: '0 0 12px' } }, t('codex.intro')),
    itens.map((k) => h('div', { class: 'codex-item' }, h('b', {}, t(`codex.${k}.t`)), h('p', {}, t(`codex.${k}.d`)))),
    h('button', { class: 'btn block', onclick: () => f() }, t('menu.close'))));
}

export function abrirConfig(aoMudar, aoResetar) {
  let f;
  const cfg = Estado.config;
  const linhaLang = h('div', { class: 'seg' });
  const linhaSom = h('div', { class: 'seg' });
  const render = () => {
    linhaLang.replaceChildren(...['pt', 'en'].map((l) => h('button', { class: cfg.lang === l ? 'on' : '', onclick: () => { Estado.definirIdioma(l); f(); aoMudar?.(); } }, l === 'pt' ? 'Português' : 'English')));
    linhaSom.replaceChildren(...[true, false].map((v) => h('button', { class: cfg.som === v ? 'on' : '', onclick: () => { Estado.definirSom(v); Som.sfx('clique'); render(); } }, v ? t('menu.on') : t('menu.off'))));
  };
  render();
  f = abrirSheet(h('div', {}, h('h3', { class: 'h-title' }, t('menu.lang'), ' / ', t('menu.sound')),
    h('div', { class: 'row' }, h('span', {}, t('menu.lang')), linhaLang),
    h('div', { class: 'row' }, h('span', {}, t('menu.sound')), linhaSom),
    aoResetar ? h('button', { class: 'btn block sec', style: { marginTop: '14px' }, onclick: async () => { f(); if (await confirmar(t('menu.confirmReset'))) aoResetar(); } }, t('menu.reset')) : null,
    h('button', { class: 'btn block', style: { marginTop: '10px' }, onclick: () => f() }, t('menu.close'))));
}

export function abrirLog(canalLog) {
  const caixa = h('div', { class: 'log-lines' }, canalLog.linhas.map((l) => h('div', { class: l.tom }, l.texto)));
  const f = abrirSheet(h('div', {}, h('h3', { class: 'h-title' }, t('battle.log')), caixa, h('button', { class: 'btn block', style: { marginTop: '12px' }, onclick: () => f() }, t('menu.close'))));
  caixa.scrollTop = caixa.scrollHeight;
}

export function abrirDeck(jornada) {
  const grupos = jornada.herois.map((hr) => {
    const cartas = jornada.baralho.filter((c) => c.dono === hr.id).sort((a, b) => CARTAS[a.id].custo - CARTAS[b.id].custo);
    return h('div', {}, h('div', { class: 'section-title' }, `${hr.nome} · ${cartas.length}`),
      h('div', { class: 'deck-grid' }, cartas.map((c) => {
        const el = criarCartaEl(c.id, null); el.onclick = () => verCarta(c.id, c.dono); return el;
      })));
  });
  const f = abrirSheet(h('div', {}, h('h3', { class: 'h-title' }, t('map.deck')), grupos, h('button', { class: 'btn block', onclick: () => f() }, t('menu.close'))));
}

function verCarta(id, dono) {
  const def = CARTAS[id];
  const f = abrirSheet(h('div', { style: { textAlign: 'center' } },
    h('div', { style: { display: 'flex', justifyContent: 'center', padding: '12px 0 20px' } }, criarCartaEl(id, dono, { big: true })),
    h('h3', { class: 'h-title', style: { marginBottom: '4px' } }, nomeCarta(id)),
    h('p', { style: { margin: '0 0 12px', lineHeight: 1.4 } }, descreverCarta(def)),
    h('button', { class: 'btn block', onclick: () => f() }, t('menu.close'))), { centro: true });
}

export function abrirInfoUnidade(e, batalha) {
  const linhas = Object.entries(e.status ?? {}).filter(([, n]) => n > 0).map(([k, n]) =>
    h('div', { class: 'status-line' }, h('span', { class: `chip ${STATUS_RUIM.has(k) ? 'bad' : 'good'}` }, ICONE_STATUS[k], n), h('b', {}, t(`st.${k}`)), h('span', { style: { color: 'var(--muted)' } }, t(`st.${k}.d`))));
  if (e.membroDestruido?.()) linhas.push(h('div', { class: 'status-line' }, h('span', { class: 'chip bad' }, ICONE_STATUS.desarmado), h('b', {}, t('st.desarmado')), h('span', { style: { color: 'var(--muted)' } }, t('st.desarmado.d'))));
  const f = abrirSheet(h('div', {},
    h('div', { style: { display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '8px' } },
      h('div', { style: { fontSize: '44px' } }, e.emoji),
      h('div', {}, h('h3', { class: 'h-title', style: { margin: 0, textAlign: 'left' } }, nomeDe(e)),
        h('div', { style: { fontSize: '13px', color: 'var(--muted)' } }, `${t('stat.hp')} ${e.vida}/${e.maxVida}${e.maxMana ? `  ·  ${t('stat.mana')} ${e.mana}/${e.maxMana}` : ''}  ·  ${t('stat.atk')} ${e.ataqueBase}${e.arma ? ` (+${e.arma.bonusAtaque})` : ''}`))),
    e.arma ? h('div', { class: 'status-line' }, icone(iconeDaArma(e.arma), { tam: 20 }), h('b', {}, t(`arma.${e.arma.id}`)), h('span', { style: { color: 'var(--muted)' } }, `+${e.arma.bonusAtaque} ${t('stat.atk')}`)) : null,
    linhas,
    h('button', { class: 'btn block', style: { marginTop: '12px' }, onclick: () => f() }, t('menu.close'))));
}

/** Gerenciador de equipamentos: mochila -> herói (agregação: a arma antiga volta para a mochila). */
export function abrirEquipamentos(jornada, aoMudar) {
  let f;
  const caixa = h('div', {});
  let escolhida = null;
  const render = () => {
    caixa.replaceChildren(
      h('div', { class: 'section-title' }, t('reward.bag')),
      jornada.mochila.length ? h('div', { class: 'loot' }, jornada.mochila.map((a, i) => h('button', {
        class: 'loot-item', style: escolhida === i ? { borderColor: 'var(--gold)' } : null, onclick: () => { escolhida = escolhida === i ? null : i; Som.sfx('clique'); render(); },
      }, h('span', { class: 'ic' }, icone(iconeDaArma(a), { tam: 24 })), h('span', { class: 'tx' }, h('b', {}, t(`arma.${a.id}`)), ` +${a.bonusAtaque} ${t('stat.atk')}`)))) : h('p', { style: { color: 'var(--muted)', fontSize: '13px' } }, '—'),
      escolhida != null ? h('div', {}, h('div', { class: 'section-title' }, t('reward.equipWho')),
        h('div', { class: 'equip-heroes' }, jornada.herois.map((hr) => h('button', {
          style: { borderColor: hr.cor }, onclick: () => {
            const arma = jornada.equipar(hr.id, escolhida); escolhida = null; Som.sfx('saque');
            Fx.toast(t('reward.equipped', hr.nome, t(`arma.${arma.id}`))); aoMudar?.(); render();
          },
        }, h('span', { class: 'e' }, hr.emoji), hr.nome, h('div', { style: { fontSize: '16px' } }, hr.arma ? `+${hr.arma.bonusAtaque}` : '—'))))) : null,
      h('div', { class: 'section-title' }, t('battle.weapon')),
      jornada.herois.map((hr) => h('div', { class: 'status-line' }, h('span', { style: { fontSize: '22px' } }, hr.emoji), h('b', {}, hr.nome), h('span', { style: { color: 'var(--muted)' } }, hr.arma ? `${t(`arma.${hr.arma.id}`)} +${hr.arma.bonusAtaque}` : '—'))));
  };
  render();
  f = abrirSheet(h('div', {}, h('h3', { class: 'h-title' }, t('reward.bag')), caixa, h('button', { class: 'btn block', style: { marginTop: '12px' }, onclick: () => f() }, t('menu.close'))));
}
