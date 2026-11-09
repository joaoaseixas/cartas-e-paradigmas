// Hub do jogo (estilo Clash Royale): três abas — Heróis, Jogar e Roleta — sobre uma vitrine 3D.
import { h, sleep } from './dom.js';
import { t } from '../i18n.js';
import { HEROIS, ORDEM_HEROIS, FASES, NIVEL_MAX, EXTRAS_POR_CLASSE, NIVEIS_CARTA, ARMAS, statsDoNivel } from '../game/mundo.js';
import { Missao } from '../game/missao.js';
import { RARIDADES, SEGMENTOS } from '../game/perfil.js';
import { criarVitrine } from './fundos.js';
import { icone, iconeDaClasse, iconeDaArma } from './icones.js';
import { criarRoleta, iconeSeg } from './roleta.js';
import { Som } from './audio.js';
import { Fx } from './fx.js';
import { abrirSheet, abrirConfig, abrirComoJogar } from './modais.js';
import { nomeCarta } from './descrever.js';
import { barra } from './componentes.js';

const fmt = (n) => Number(n).toLocaleString(I18Nlocale());
function I18Nlocale() { return document.documentElement.lang === 'en' ? 'en-US' : 'pt-BR'; }
const corRar = (r) => RARIDADES[r].cor;
const estrelasEl = (n, tam = 16) => h('span', { class: 'estrelas' }, [1, 2, 3].map((i) => icone('star', { tam, traco: 1.6, cls: i <= n ? 'on' : '' })));

export function telaHub({ perfil, aoJogar, aoTitulo, abaInicial = 'jogar' }) {
  let aba = abaInicial, selecionado = perfil.equipe[0] ?? 'luke', faseSel = Math.min(perfil.faseAtual, perfil.faseAtual);
  const vitrine = criarVitrine('noite');
  const chipCred = h('span', { class: 'chip-moeda' }), chipGiros = h('span', { class: 'chip-moeda alt' });
  const topo = h('header', { class: 'hub-topo' },
    h('div', { class: 'moedas' }, chipCred, chipGiros),
    h('button', { class: 'icon-btn', 'aria-label': 'menu', onclick: () => abrirMenuHub() }, icone('gear', { tam: 20 })));
  const principal = h('main', { class: 'hub-main' });
  const nav = h('nav', { class: 'hub-nav' });
  const raiz = h('div', { class: 'screen hub' }, vitrine.el, topo, principal, nav);

  // ------------------------------------------------------------ cabeçalho / navegação
  function atualizarChips() {
    chipCred.replaceChildren(h('i', { class: 'moeda-ic' }), h('b', {}, fmt(perfil.d.creditos)), h('small', {}, t('hub.creditos')));
    chipGiros.replaceChildren(icone('revive', { tam: 14, traco: 2.2 }), h('b', {}, String(perfil.d.giros)), h('small', {}, t('hub.giros')));
  }
  function renderNav() {
    const abas = [['herois', 'hub.herois', 'cards'], ['jogar', 'hub.jogar', 'slash'], ['roleta', 'hub.roleta', 'revive']];
    nav.replaceChildren(...abas.map(([id, rot, ic]) => h('button', {
      class: `aba${aba === id ? ' on' : ''}${id === 'jogar' ? ' central' : ''}`,
      onclick: () => { if (aba !== id) { aba = id; Som.sfx('clique'); render(); } },
    }, icone(ic, { tam: id === 'jogar' ? 26 : 22, traco: 1.8 }), h('span', {}, t(rot)),
    id === 'roleta' && perfil.giroGratisDisponivel ? h('i', { class: 'ponto' }) : null)));
  }

  function render() {
    atualizarChips(); renderNav();
    principal.replaceChildren();
    if (aba === 'jogar') abaJogar(); else if (aba === 'herois') abaHerois(); else abaRoleta();
  }

  // ------------------------------------------------------------ aba JOGAR
  function abaJogar() {
    vitrine.mostrar(perfil.equipe.map((id) => HEROIS[id].modelo));
    const max = perfil.faseAtual; faseSel = Math.min(faseSel, max);
    const m = new Missao(perfil, faseSel);
    const fase = m.fase, nivelEq = Math.round(perfil.equipe.reduce((s, id) => s + perfil.nivel(id), 0) / Math.max(1, perfil.equipe.length));
    const fraco = nivelEq < m.nivelRecomendado - 1;
    const slots = h('div', { class: 'equipe-slots' }, [0, 1, 2].map((i) => {
      const id = perfil.equipe[i];
      return id
        ? h('button', { class: 'slot', style: { '--cor': HEROIS[id].cor }, onclick: () => { aba = 'herois'; selecionado = id; render(); } }, h('b', {}, HEROIS[id].emoji), h('small', {}, `${t('hub.nv')} ${perfil.nivel(id)}`))
        : h('button', { class: 'slot vazio', onclick: () => { aba = 'herois'; render(); } }, icone('chev', { tam: 16 }));
    }));
    const cartao = h('section', { class: `painel fase${m.chefe ? ' chefe' : ''}` },
      h('div', { class: 'fase-topo' },
        h('button', { class: 'seta', disabled: faseSel <= 0, onclick: () => { faseSel--; Som.sfx('clique'); render(); } }, icone('chev', { tam: 20, cls: 'esq' })),
        h('div', { class: 'fase-nome' },
          h('small', {}, `${t('hub.setor')} ${m.setor} · ${t('map.stage', (faseSel % FASES.length) + 1)}${m.chefe ? ` · ${t('hub.chefe')}` : ''}`),
          h('div', { class: 'h-title' }, t(fase.nomeKey))),
        h('button', { class: 'seta', disabled: faseSel >= max, onclick: () => { faseSel++; Som.sfx('clique'); render(); } }, icone('chev', { tam: 20 }))),
      h('div', { class: 'fase-info' },
        estrelasEl(perfil.estrelasDa(faseSel), 18),
        h('span', { class: `rec${fraco ? ' fraco' : ''}` }, `${t('hub.nivelrec')} ${m.nivelRecomendado}`),
        faseSel === max ? h('span', { class: 'novo' }, t('hub.nova')) : null),
      slots,
      fraco ? h('p', { class: 'aviso' }, t('hub.aviso')) : null,
      h('button', { class: 'btn block', style: { marginTop: '10px' }, onclick: () => { Som.destravar(); Som.sfx('clique'); aoJogar(faseSel); } }, t('hub.lutar')));
    principal.append(cartao);
  }

  // ------------------------------------------------------------ aba HERÓIS
  function silhueta(id) {
    const a = [...(vitrine.cena?.atores.values() ?? [])][0];
    if (!a || perfil.possui(id)) return;
    a.corpo.traverse((o) => { if (o.material?.color) o.material.color.set('#0d0f11'); if (o.material?.emissive) o.material.emissive.set('#000000'); if (o.isSprite) o.visible = false; });
  }

  function abaHerois() {
    const d = HEROIS[selecionado], tem = perfil.possui(selecionado), n = perfil.nivel(selecionado);
    vitrine.mostrar([d.modelo]); silhueta(selecionado);
    const s = statsDoNivel(d, Math.max(1, n));
    const custo = perfil.custoNivel(selecionado);
    const extras = EXTRAS_POR_CLASSE[d.classe] ?? [];
    const proxima = extras.findIndex((_, i) => n < NIVEIS_CARTA[i]);
    const roster = h('div', { class: 'roster' }, ORDEM_HEROIS.map((id) => {
      const x = HEROIS[id], tm = perfil.possui(id);
      return h('button', { class: `tile${id === selecionado ? ' sel' : ''}${tm ? '' : ' trava'}${perfil.equipe.includes(id) ? ' equipe' : ''}`, style: { '--cor': corRar(x.raridade) }, onclick: () => { selecionado = id; Som.sfx('clique'); render(); } },
        h('b', {}, tm ? x.emoji : '?'), h('small', {}, tm ? `${t('hub.nv')} ${perfil.nivel(id)}` : icone('lock', { tam: 11 })));
    }));
    const painel = h('section', { class: 'painel heroi', style: { '--cor': corRar(d.raridade) } },
      h('div', { class: 'heroi-topo' },
        h('div', {},
          h('div', { class: 'h-title heroi-nome' }, tem ? d.nome : '???'),
          h('div', { class: 'mono-lbl' }, h('span', { style: { color: corRar(d.raridade) } }, t(`hr.${d.raridade}`)), ` · ${t(`class.${d.classe}`)}`)),
        tem ? h('div', { class: 'nivel-bloco' }, h('small', {}, t('hub.nivel')), h('b', {}, `${n}/${NIVEL_MAX}`)) : null),
      tem ? h('div', { class: 'stats-grid' },
        h('div', {}, h('small', {}, t('stat.hp')), h('b', {}, s.vida)), h('div', {}, h('small', {}, t('stat.atk')), h('b', {}, s.ataque)),
        h('div', {}, h('small', {}, t('stat.mana')), h('b', {}, d.mana || '—')), h('div', {}, h('small', {}, t('hub.cartas')), h('b', {}, 6 + extras.filter((_, i) => n >= NIVEIS_CARTA[i]).length)))
        : h('p', { class: 'aviso neutro' }, t('hub.bloqueado')),
      tem && custo ? h('div', { class: 'evolucao' },
        (() => { const b = barra('thin xp', ''); b.set(Math.min(perfil.fragmentos(selecionado), custo.fragmentos), custo.fragmentos, false); return b; })(),
        h('small', {}, `${t('hub.frag')} ${perfil.fragmentos(selecionado)}/${custo.fragmentos}`)) : null,
      tem && proxima >= 0 ? h('p', { class: 'proxima' }, `${t('hub.proxcarta')}: `, h('b', {}, nomeCarta(extras[proxima])), ` · ${t('hub.nv')} ${NIVEIS_CARTA[proxima]}`) : null,
      tem ? h('div', { class: 'row-btns', style: { marginTop: '8px' } },
        h('button', { class: `btn sm${perfil.podeEvoluir(selecionado) ? '' : ' sec'}`, disabled: !custo, onclick: () => evoluir() }, custo ? `${t('hub.evoluir')} · ${fmt(custo.creditos)}` : t('hub.max')),
        h('button', { class: 'btn sm sec', onclick: () => { perfil.alternarEquipe(selecionado); Som.sfx('clique'); render(); } }, perfil.equipe.includes(selecionado) ? t('hub.naequipe') : t('hub.equipar'))) : null,
      tem ? h('button', { class: 'arma-linha', onclick: () => abrirArmas() },
        icone(perfil.armaDe(selecionado) ? iconeDaArma(ARMAS[perfil.armaDe(selecionado)]) : 'slash', { tam: 18 }),
        h('span', {}, perfil.armaDe(selecionado) ? t(`arma.${perfil.armaDe(selecionado)}`) : t('hub.semarma')), icone('chev', { tam: 16 })) : null);
    principal.append(painel, roster);
  }

  async function evoluir() {
    const antes = perfil.nivel(selecionado);
    if (!perfil.podeEvoluir(selecionado)) {
      const c = perfil.custoNivel(selecionado);
      Som.sfx('erro'); Fx.toast(perfil.d.creditos < c.creditos ? t('hub.faltacred') : t('hub.faltafrag')); return;
    }
    perfil.evoluir(selecionado); Som.sfx('vitoria'); Som.vibrar(40);
    const a = [...(vitrine.cena?.atores.values() ?? [])][0]; a?.pulo(0.6, 0.5);
    if (vitrine.cena) { vitrine.cena.anelOnda(a.pontoPes().setY(0.05), '#f2b134', { max: 3.5, dur: 0.9 }); vitrine.cena.coluna(a.pontoPes(), '#f2b134', 1); }
    const d = HEROIS[selecionado], ex = EXTRAS_POR_CLASSE[d.classe] ?? [], novo = ex.find((_, i) => NIVEIS_CARTA[i] === antes + 1);
    Fx.toast(novo ? `${t('hub.nivel')} ${antes + 1} · ${nomeCarta(novo)}` : `${t('hub.nivel')} ${antes + 1}`);
    render();
  }

  function abrirArmas() {
    const f = abrirSheet(h('div', {}, h('h3', { class: 'h-title' }, t('battle.weapon')),
      h('div', { class: 'loot' }, [null, ...perfil.d.armas].map((id) => h('button', {
        class: 'loot-item', style: perfil.armaDe(selecionado) === id || (!id && !perfil.armaDe(selecionado)) ? { boxShadow: 'inset 3px 0 0 var(--crt)' } : null,
        onclick: () => { perfil.equiparArma(selecionado, id); Som.sfx('saque'); f(); render(); },
      }, icone(id ? iconeDaArma(ARMAS[id]) : 'slash', { tam: 22 }), h('span', { class: 'tx' }, h('b', {}, id ? t(`arma.${id}`) : t('hub.semarma')), id ? ` +${ARMAS[id].bonusAtaque} ${t('stat.atk')}` : '')))),
      h('button', { class: 'btn block sec', style: { marginTop: '12px' }, onclick: () => f() }, t('menu.close'))));
  }

  // ------------------------------------------------------------ aba ROLETA
  function abaRoleta() {
    vitrine.mostrar([]);
    const roleta = criarRoleta({
      podeGirar: () => perfil.podeGirar,
      aoGirar: () => { Som.sfx('clique'); const p = perfil.girar(); atualizarChips(); botao.disabled = true; return p; },
      aoTerminar: (premio) => { revelar(premio); },
    });
    const gratis = perfil.giroGratisDisponivel;
    const botao = h('button', { class: 'btn block', disabled: !perfil.podeGirar, onclick: () => roleta.girar() },
      gratis ? t('roleta.gratis') : `${t('roleta.girar')} · ${perfil.d.giros}`);
    const garantia = perfil.girosParaGarantia;
    principal.append(h('section', { class: 'roleta-aba' },
      h('div', { class: 'mono-lbl centro' }, `${t('roleta.garantia')}: `, h('b', { style: { color: 'var(--ambar)' } }, String(garantia))),
      roleta.el, botao,
      h('button', { class: 'link', onclick: () => abrirChances() }, t('roleta.chances'))));
  }

  function abrirChances() {
    const total = SEGMENTOS.reduce((s, x) => s + x.peso, 0);
    const f = abrirSheet(h('div', {}, h('h3', { class: 'h-title' }, t('roleta.chances')),
      SEGMENTOS.map((s) => h('div', { class: 'row' }, h('span', {}, s.tipo === 'heroi' ? `${t('roleta.heroi')} ${t(`hr.${s.raridade}`)}` : s.tipo === 'creditos' ? `${s.n} ${t('roleta.creditos')}` : s.tipo === 'fragmentos' ? `${s.n} ${t('roleta.frag')}` : `+${s.n} ${t('roleta.giros')}`), h('b', {}, `${((s.peso / total) * 100).toFixed(1)}%`))),
      h('p', { class: 'aviso neutro' }, t('roleta.nota', 12)),
      h('button', { class: 'btn block', style: { marginTop: '12px' }, onclick: () => f() }, t('menu.close'))));
  }

  /** Mostra o prêmio. Herói novo ganha um palco 3D próprio. */
  async function revelar(premio) {
    const seg = premio.segmento;
    Som.sfx(premio.heroiNovo ? 'vitoria' : 'saque'); Som.vibrar(premio.heroiNovo ? 120 : 40);
    if (premio.heroiNovo) {
      const d = HEROIS[premio.heroiNovo];
      principal.replaceChildren(); // some a roleta: o palco 3D fica livre para o herói
      vitrine.mostrar([d.modelo], { y: 0.6, z: 6.4, alt: 1.8 });
      if (vitrine.cena) { const a = [...vitrine.cena.atores.values()][0]; a.pulo(0.8, 0.7); vitrine.cena.coluna(a.pontoPes(), corRar(d.raridade), 1.6); vitrine.cena.anelOnda(a.pontoPes().setY(0.05), corRar(d.raridade), { max: 4, dur: 1.2 }); vitrine.cena.tremer(0.5); }
      const ov = h('div', { class: 'revela', style: { '--cor': corRar(d.raridade) } },
        h('div', { class: 'revela-txt' },
          h('small', {}, t('roleta.novo')), h('div', { class: 'h-title revela-nome' }, d.nome),
          h('div', { class: 'mono-lbl' }, h('span', { style: { color: corRar(d.raridade) } }, t(`hr.${d.raridade}`)), ` · ${t(`class.${d.classe}`)}`),
          h('button', { class: 'btn block', style: { marginTop: '16px' }, onclick: () => { ov.remove(); selecionado = premio.heroiNovo; aba = 'herois'; render(); } }, t('roleta.ver'))));
      raiz.append(ov); return;
    }
    let txt = '', sub = '';
    if (premio.creditos) { txt = `+${fmt(premio.creditos)}`; sub = t('roleta.creditos'); }
    else if (premio.giros) { txt = `+${premio.giros}`; sub = t('roleta.giros'); }
    else if (premio.fragmentos) { txt = `+${premio.fragmentos.n}`; sub = `${t('roleta.frag')} · ${HEROIS[premio.fragmentos.id].nome}`; }
    const ov = h('div', { class: 'revela pequeno' },
      h('div', { class: 'premio-card' }, icone(iconeSeg(seg), { tam: 44, traco: 1.4 }), h('div', { class: 'premio-n' }, txt), h('div', { class: 'mono-lbl' }, sub),
        premio.duplicado ? h('div', { class: 'mono-lbl', style: { color: 'var(--ambar)' } }, t('roleta.dup')) : null,
        h('button', { class: 'btn block', style: { marginTop: '14px' }, onclick: () => { ov.remove(); render(); } }, perfil.podeGirar ? t('roleta.denovo') : t('menu.ok'))));
    raiz.append(ov);
    await sleep(0);
  }

  // ------------------------------------------------------------ menu / diário
  function abrirMenuHub() {
    const f = abrirSheet(h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
      h('h3', { class: 'h-title' }, t('app.title')),
      h('button', { class: 'btn sec', onclick: () => { f(); abrirComoJogar(); } }, t('menu.how')),
      h('button', { class: 'btn sec', onclick: () => { f(); abrirConfig(() => aoTitulo()); } }, `${t('menu.lang')} / ${t('menu.sound')}`),
      h('button', { class: 'btn sec', onclick: () => { f(); aoTitulo(); } }, t('end.menu'))));
  }

  const bonus = perfil.coletarDiario();
  render();
  if (bonus) {
    setTimeout(() => {
      const f = abrirSheet(h('div', { style: { textAlign: 'center' } },
        h('div', { class: 'mono-lbl' }, t('hub.diario')), h('div', { class: 'h-title premio-n' }, `+${bonus.creditos}`),
        h('div', { class: 'mono-lbl' }, `${t('hub.creditos')} · ${t('hub.sequencia', bonus.streak)}`),
        h('p', { class: 'aviso neutro' }, t('hub.gratisdia')),
        h('button', { class: 'btn block', style: { marginTop: '12px' }, onclick: () => { f(); render(); } }, t('menu.ok'))), { centro: true });
      Som.sfx('saque'); atualizarChips();
    }, 500);
  }
  raiz.destruir = () => {};
  return raiz;
}

/** Tela de resultado da missão (vitória com estrelas e recompensas, ou derrota com dica). */
export function telaResultado({ venceu, estrelas, rec, missao, perfil, aoProxima, aoTentar, aoHub, aoRoleta }) {
  const vit = criarVitrine('noite');
  if (vit.mostrar) vit.mostrar(venceu ? perfil.equipe.map((id) => HEROIS[id].modelo) : [], { y: -1.6, z: 9.4, alt: 1.6 });
  const linhas = [];
  if (venceu) {
    linhas.push(h('div', { class: 'rec-linha' }, h('span', {}, t('hub.creditos')), h('b', {}, `+${rec.creditos}`)));
    linhas.push(h('div', { class: 'rec-linha' }, h('span', {}, t('hub.giros')), h('b', {}, `+${rec.giros}`)));
    for (const [id, n] of Object.entries(rec.fragmentos)) linhas.push(h('div', { class: 'rec-linha' }, h('span', {}, `${t('hub.frag')} · ${HEROIS[id].nome}`), h('b', {}, `+${n}`)));
    for (const a of rec.armas) linhas.push(h('div', { class: 'rec-linha novo' }, h('span', {}, `${t('battle.weapon')} · ${t(`arma.${a}`)}`), h('b', {}, t('hub.nova'))));
  }
  const estrelasBloco = h('div', { class: 'estrelas grande' }, [1, 2, 3].map((i) => icone('star', { tam: 44, traco: 1.4, cls: 'vazia' })));
  const raiz = h('div', { class: 'screen resultado' }, vit.el,
    h('div', { class: 'res-corpo' },
      h('small', { class: 'mono-lbl' }, `${t('hub.setor')} ${missao.setor} · ${t(missao.fase.nomeKey)}`),
      h('h2', { class: 'h-title' }, venceu ? t('res.ok') : t('res.falha')),
      venceu ? estrelasBloco : h('p', { class: 'aviso neutro' }, t('res.dica')),
      h('div', { class: 'rec-lista' }, linhas),
      h('div', { class: 'res-botoes' },
        venceu ? h('button', { class: 'btn block', onclick: aoProxima }, t('res.proxima')) : h('button', { class: 'btn block', onclick: aoTentar }, t('res.tentar')),
        venceu && perfil.podeGirar ? h('button', { class: 'btn block sec', onclick: aoRoleta }, `${t('res.girar')} · ${perfil.d.giros}`) : null,
        h('button', { class: 'btn block sec', onclick: aoHub }, t('res.hub')))));
  // estrelas acendem em sequência
  (async () => {
    await sleep(500);
    for (let i = 0; i < estrelas; i++) { estrelasBloco.children[i].classList.remove('vazia'); estrelasBloco.children[i].classList.add('on'); Som.tom(600 + i * 180, 0.14, 'triangle', 0.07); Som.vibrar(20); await sleep(380); }
    if (venceu) Som.sfx('vitoria'); else Som.sfx('derrota');
  })();
  raiz.destruir = () => {};
  return raiz;
}
