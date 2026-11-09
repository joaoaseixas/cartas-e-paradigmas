// Telas fora do combate: título, seleção de grupo, mapa da jornada, recompensa e fim de jogo.
import { h } from './dom.js';
import { t } from '../i18n.js';
import { FASES, HEROIS, ORDEM_HEROIS, criarHeroi } from '../game/mundo.js';
import { CARTAS } from '../game/cartas.js';
import { criarFundo } from './fundos.js';
import { barra, criarCartaEl } from './componentes.js';
import { Som } from './audio.js';
import { Estado } from './estado.js';
import { COR_CLASSE, descreverCarta, nomeCarta } from './descrever.js';
import { abrirComoJogar, abrirCodex, abrirConfig, abrirDeck, abrirEquipamentos } from './modais.js';
import { Fx } from './fx.js';
import { icone, iconeDaArma } from './icones.js';

const clique = (fn) => () => { Som.destravar(); Som.sfx('clique'); fn(); };

// ------------------------------------------------------------------ título
export function telaTitulo({ aoJogar, aoIdioma, aoResetar, perfil }) {
  return h('div', { class: 'screen title-screen' },
    criarFundo('noite', { palco: true }),
    h('div', { class: 'title-top' }, h('button', { class: 'icon-btn', 'aria-label': 'config', onclick: clique(() => abrirConfig(aoIdioma, aoResetar)) }, icone('gear', { tam: 20 }))),
    h('div', { class: 'logo' },
      h('div', { class: 'sword' }, h('i', { class: 'hilt' }), h('i', { class: 'blade' })),
      h('h1', {}, ...t('app.title').split(' & ').flatMap((p, i) => (i ? [h('span', { class: 'amp' }, '&'), h('span', {}, p)] : [h('span', {}, p)]))),
      h('p', {}, t('app.sub'))),
    h('div', { class: 'menu' },
      h('button', { class: 'btn', onclick: clique(aoJogar) }, t('menu.play')),
      h('button', { class: 'btn sec', onclick: clique(abrirComoJogar) }, t('menu.how')),
      h('button', { class: 'btn sec', onclick: clique(abrirCodex) }, t('menu.codex'))),
    h('div', { class: 'title-foot' }, t('menu.stats', perfil.d.vitorias, perfil.d.maxFase, '∞')));
}

// ------------------------------------------------------------------ seleção de grupo
export function telaGrupo({ aoVoltar, aoIniciar }) {
  const escolhidos = [];
  const lista = h('div', { class: 'party-list' });
  const cont = h('div', { class: 'count' });
  const go = h('button', { class: 'btn', onclick: clique(() => aoIniciar([...escolhidos])) }, t('party.go'));
  const atualizar = () => {
    cont.textContent = t('party.pick', escolhidos.length);
    go.disabled = escolhidos.length !== 3;
    lista.querySelectorAll('.hero-card').forEach((c) => c.classList.toggle('sel', escolhidos.includes(c.dataset.id)));
  };
  ORDEM_HEROIS.forEach((id) => {
    const d = HEROIS[id];
    const habilidade = t(`sk.${d.classe}`);
    lista.append(h('button', {
      class: 'hero-card', 'data-id': id, style: { '--cor': d.cor }, onclick: () => {
        Som.sfx('clique');
        const i = escolhidos.indexOf(id);
        if (i >= 0) escolhidos.splice(i, 1); else if (escolhidos.length < 3) escolhidos.push(id); else { Fx.toast(t('party.sub')); return; }
        atualizar();
      },
    },
    h('div', { class: 'portrait' }, d.emoji),
    h('div', { style: { flex: 1, minWidth: 0 } },
      h('h3', {}, d.nome), h('div', { class: 'cls' }, t(`class.${d.classe}`)),
      h('div', { class: 'desc' }, t(`class.${d.classe}.desc`), habilidade ? '' : ''),
      h('div', { class: 'stats' }, h('span', {}, t('stat.hp'), ' ', h('b', {}, d.vida)), h('span', {}, t('stat.atk'), ' ', h('b', {}, d.ataque)), d.mana ? h('span', {}, t('stat.mana'), ' ', h('b', {}, d.mana)) : null)),
    h('div', { class: 'check' }, '✓')));
  });
  const el = h('div', { class: 'screen' }, criarFundo('floresta'),
    h('div', { class: 'screen-head' }, h('h2', { class: 'h-title' }, t('party.title')), h('p', {}, t('party.sub'))),
    lista,
    h('div', { class: 'bottom-bar' }, h('button', { class: 'btn sec', onclick: clique(aoVoltar) }, '←'), cont, go));
  atualizar();
  return el;
}

// ------------------------------------------------------------------ mapa da jornada
export function telaMapa({ jornada, aoAvancar, aoMenu }) {
  const nos = FASES.map((f, i) => {
    const estado = i < jornada.fase ? 'done' : i === jornada.fase ? 'now' : 'lock';
    return h('div', { class: `node ${estado}${f.chefe ? ' boss' : ''}` },
      h('div', { class: 'dot' }, estado === 'done' ? icone('check', { tam: 22, traco: 2.4 }) : estado === 'lock' ? icone('lock', { tam: 20 }) : String(i + 1).padStart(2, '0')),
      h('div', { class: 'info' }, h('small', {}, t('map.stage', i + 1)), h('div', {}, t(f.nomeKey))));
  });
  const contaBag = h('span', {}, String(jornada.mochila.length));
  const equipBtn = h('button', { class: 'btn sec', onclick: clique(() => abrirEquipamentos(jornada, () => { contaBag.textContent = String(jornada.mochila.length); })) }, icone('bag', { tam: 18 }), contaBag);
  return h('div', { class: 'screen' }, criarFundo(jornada.faseAtual.tema),
    h('div', { class: 'hud', style: { padding: '0 0 6px' } },
      h('button', { class: 'icon-btn', onclick: clique(aoMenu) }, '☰'),
      h('div', { class: 'stage' }, t('map.title')),
      h('span', { style: { width: '40px' } })),
    h('div', { class: 'party-strip' }, jornada.herois.map((hr) => {
      const b = barra('hpbar thin'); b.set(hr.vida, hr.maxVida, false);
      return h('div', { class: `mini-hero${hr.estaDestruido() ? ' dead' : ''}`, style: { '--cor': hr.cor } }, h('span', { class: 'e' }, hr.emoji), hr.nome, b,
        h('div', { style: { color: 'var(--muted)', marginTop: '2px' } }, `${hr.vida}/${hr.maxVida}`));
    })),
    h('div', { class: 'map-path' }, nos),
    h('div', { class: 'row-btns', style: { marginBottom: '8px' } },
      h('button', { class: 'btn sec', onclick: clique(() => abrirDeck(jornada)) }, icone('deck', { tam: 18 }), String(jornada.baralho.length)), equipBtn),
    h('button', { class: 'btn block', onclick: clique(aoAvancar) }, t('map.go')));
}

// ------------------------------------------------------------------ recompensa
export function telaRecompensa({ jornada, aoContinuar }) {
  const opcoes = jornada.gerarRecompensas();
  let escolha = null;
  const desc = h('div', { class: 'desc-line' });
  const btn = h('button', { class: 'btn block', onclick: clique(() => {
    if (escolha) { jornada.adicionarCarta(escolha, jornada.donoParaCarta(escolha)); Som.sfx('saque'); }
    aoContinuar();
  }) }, t('reward.skip'));
  const cartas = opcoes.map((id) => {
    const dono = CARTAS[id].heroi === 'neutro' ? null : jornada.herois.find((x) => x.classe === CARTAS[id].heroi)?.id;
    const el = criarCartaEl(id, dono, { big: true });
    el.addEventListener('click', () => {
      Som.sfx('carta');
      escolha = escolha === id ? null : id;
      cartas.forEach((c, i) => { c.classList.toggle('taken', escolha === opcoes[i]); c.classList.toggle('gone', escolha != null && escolha !== opcoes[i]); });
      desc.textContent = escolha ? `${nomeCarta(id)} — ${descreverCarta(CARTAS[id])}` : '';
      btn.textContent = escolha ? t('reward.card') : t('reward.skip');
    });
    return el;
  });
  const equipBtn = h('button', { class: 'btn sec sm', onclick: clique(() => abrirEquipamentos(jornada, () => { renderLoot(); })) }, icone('bag', { tam: 16 }));
  const loot = h('div', { class: 'loot' });
  const renderLoot = () => {
    loot.replaceChildren(...(jornada.mochila.length ? [h('div', { class: 'section-title' }, `${t('reward.bag')} (${jornada.mochila.length})`),
      ...jornada.mochila.slice(0, 3).map((a) => h('div', { class: 'loot-item' }, h('span', { class: 'ic' }, icone(iconeDaArma(a), { tam: 24 })), h('span', { class: 'tx' }, h('b', {}, t(`arma.${a.id}`)), ` +${a.bonusAtaque} ${t('stat.atk')}`))),
      h('button', { class: 'btn sec sm', onclick: clique(() => abrirEquipamentos(jornada, renderLoot)) }, icone('bag', { tam: 16 }), t('reward.equipWho'))] : []));
  };
  renderLoot();
  Som.sfx('vitoria');
  return h('div', { class: 'screen reward-screen' }, criarFundo('floresta'),
    h('h2', { class: 'h-title' }, t('reward.title')),
    h('div', { class: 'camp' }, t('reward.camp')),
    h('div', { class: 'party-strip' }, jornada.herois.map((hr) => {
      const b = barra('hpbar thin'); b.set(hr.vida, hr.maxVida, false);
      return h('div', { class: 'mini-hero', style: { '--cor': hr.cor } }, h('span', { class: 'e' }, hr.emoji), hr.nome, b);
    })),
    loot,
    h('div', { class: 'section-title', style: { textAlign: 'center' } }, t('reward.card')),
    h('div', { class: 'cards-row' }, cartas),
    desc,
    h('div', { style: { flex: 1 } }),
    btn);
}

// ------------------------------------------------------------------ fim
export function telaFim({ venceu, jornada, aoNovo, aoMenu }) {
  Som.sfx(venceu ? 'vitoria' : 'derrota');
  return h('div', { class: 'screen end-screen' }, criarFundo(venceu ? 'floresta' : 'covil'),
    h('div', { class: 'big-mark' }, icone(venceu ? 'star' : 'burst', { tam: 76, traco: 1.4 })),
    h('h2', { class: 'h-title' }, venceu ? t('end.win') : t('end.lose')),
    h('p', {}, venceu ? t('end.winSub') : t('end.loseSub', t(FASES[Math.min(jornada.fase, FASES.length - 1)].nomeKey))),
    h('div', { class: 'menu' },
      h('button', { class: 'btn', onclick: clique(aoNovo) }, t('end.again')),
      h('button', { class: 'btn sec', onclick: clique(aoMenu) }, t('end.menu'))));
}
