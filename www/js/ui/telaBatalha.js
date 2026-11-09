// Tela de batalha 3D: o estado do domínio vira modelos Three.js + HUD em DOM, e os eventos (fx) viram animações.
import { h, sleep } from './dom.js';
import { t } from '../i18n.js';
import { CARTAS, precisaAlvo } from '../game/cartas.js';
import { CombatNotifier, LogInMemoryOutputChannel, FxQueueOutputChannel } from '../domain/notificador.js';
import { criarCartaEl, criarUnidade } from './componentes.js';
import { Fx, EMOJI_ELEMENTO } from './fx.js';
import { Som } from './audio.js';
import { Estado } from './estado.js';
import { ICONE_STATUS, STATUS_RUIM, COR_CLASSE, descreverCarta, nomeCarta } from './descrever.js';
import { abrirLog, abrirInfoUnidade, abrirSheet, confirmar, abrirConfig, abrirDeck, abrirComoJogar } from './modais.js';
import { obterCena, THREE, LAYOUT } from '../three/cena.js';
import { Ator, posicoesLinha } from '../three/atores.js';
import { icone, iconeDaCarta } from './icones.js';

const COR_ELEMENTO = { fogo: '#ff8a2a', gelo: '#9fe6ff', raio: '#7fc4ff', sagrado: '#fff2a8', sombra: '#b06bff', veneno: '#7dff5a', fisico: null };

export function telaBatalha({ jornada, aoTerminar, aoSair }) {
  const log = new LogInMemoryOutputChannel();
  const fila = new FxQueueOutputChannel();
  const notifier = new CombatNotifier([log, fila]);
  const batalha = jornada.criarBatalha(notifier, Estado.kb);
  const fase = jornada.faseAtual;
  const cena = obterCena();

  let selUid = null, ocupado = true, vivo = true;
  const views = new Map();
  const vistas = new Set();

  // ------------------------------------------------------------------ DOM
  const stage = h('section', { class: 'stage3d' });
  const hud3d = h('div', { class: 'hud3d' });
  const logbar = h('button', { class: 'logbar', onclick: () => abrirLog(log) });
  const detalhe = h('div', { class: 'detail' });
  const mao = h('div', { class: 'hand' });
  const energiaEl = h('div', { class: 'energy' });
  const compraEl = h('span'), descarteEl = h('span');
  const btnFim = h('button', { class: 'btn', onclick: () => fimDeTurno() }, t('battle.end'));
  const turnoEl = h('small');
  const stageEl = h('div', { class: 'stage' }, t(fase.nomeKey), turnoEl);
  stage.append(hud3d, logbar);

  const raiz = h('div', { class: 'screen battle m3d' },
    h('header', { class: 'hud' },
      h('button', { class: 'icon-btn', onclick: () => abrirMenu(), 'aria-label': 'menu' }, icone('menu', { tam: 20 })), stageEl,
      h('button', { class: 'icon-btn', onclick: () => abrirDeck(jornada), 'aria-label': 'deck' }, icone('deck', { tam: 20 }))),
    stage,
    detalhe,
    h('div', { class: 'hand-wrap' }, mao),
    h('footer', { class: 'controls' }, energiaEl, h('div', { class: 'piles' }, h('span', {}, t('battle.draw'), compraEl), h('span', {}, t('battle.discard'), descarteEl)), btnFim));

  // ------------------------------------------------------------------ cena 3D
  cena.aoQuadro = null;
  cena.limparAtores();
  cena.modoBatalha(fase.tema);
  cena.anexar(stage); stage.prepend(cena.canvas);

  const nI = batalha.inimigos.length, nH = batalha.herois.length;
  const posI = posicoesLinha(nI, LAYOUT.esE, LAYOUT.zE, 0.18), posH = posicoesLinha(nH, LAYOUT.esH, LAYOUT.zH, 0.22);
  batalha.inimigos.forEach((e, i) => {
    const ator = cena.adicionarAtor(new Ator(cena, e, e.tipo, { x: posI[i].x, z: posI[i].z - (e.fases ? 0.8 : 0), yaw: 0 }));
    const v = criarUnidade(e, batalha, { onclick: aoTocarUnidade }); v.ator = ator; views.set(e.id, v); hud3d.append(v.el);
  });
  batalha.herois.forEach((e, i) => {
    const ator = cena.adicionarAtor(new Ator(cena, e, e.modelo ?? e.id, { x: posH[i].x, z: posH[i].z, yaw: Math.PI - posH[i].k * 0.16 }));
    const v = criarUnidade(e, batalha, { onclick: aoTocarUnidade }); v.ator = ator; views.set(e.id, v); hud3d.append(v.el);
  });
  // reposiciona os atores a partir de LAYOUT (usado para ajuste fino do enquadramento)
  window.__relayout = () => {
    const pi = posicoesLinha(nI, LAYOUT.esE, LAYOUT.zE, 0.18), ph = posicoesLinha(nH, LAYOUT.esH, LAYOUT.zH, 0.22);
    batalha.inimigos.forEach((e, i) => views.get(e.id).ator.base.set(pi[i].x, 0, pi[i].z - (e.fases ? 0.8 : 0)));
    batalha.herois.forEach((e, i) => views.get(e.id).ator.base.set(ph[i].x, 0, ph[i].z));
  };
  const quadro = () => views.forEach((v) => v.posicionar(cena.projetar(v.ator.pontoCabeca()), cena.projetar(v.ator.pontoPes())));
  cena.aoQuadro = quadro;
  const entrada = (v, i) => { v.ator.grupo.visible = true; v.ator.pulo(0.4, 0.5); };
  [...views.values()].forEach(entrada);

  // ------------------------------------------------------------------ render
  function renderUnidades() { views.forEach((v) => v.atualizar()); }

  function renderMao() {
    const cartasEl = batalha.mao.map((c, i) => {
      const el = criarCartaEl(c.id, c.dono);
      el.dataset.uid = c.uid;
      const ok = batalha.podeJogar(c).ok && !ocupado;
      if (!ok) el.classList.add('off');
      if (c.uid === selUid) el.classList.add('sel');
      if (!vistas.has(c.uid)) { el.classList.add('entra'); el.style.animationDelay = `${i * 60}ms`; }
      el.addEventListener('click', () => aoTocarCarta(c));
      return el;
    });
    mao.replaceChildren(...cartasEl);
    vistas.clear(); batalha.mao.forEach((c) => vistas.add(c.uid));
  }

  function renderHud() {
    energiaEl.replaceChildren(h('div', {}, `${batalha.energia}/${batalha.energiaMax}`, h('small', {}, t('battle.energy'))));
    compraEl.textContent = batalha.compra.length; descarteEl.textContent = batalha.descarte.length;
    turnoEl.textContent = t('battle.turn', batalha.turno);
    btnFim.disabled = ocupado || batalha.fase !== 'jogador';
    atualizarLinha();
  }

  function atualizarLinha() {
    const l = log.linhas.filter((x) => x.texto).slice(-1)[0];
    if (!l) { logbar.textContent = '…'; return; }
    logbar.textContent = l.texto; logbar.className = `logbar ${l.tom}`;
  }

  function renderDetalhe() {
    const c = batalha.mao.find((x) => x.uid === selUid);
    if (!c) { detalhe.classList.remove('on'); return; }
    const def = CARTAS[c.id], dono = batalha.entidade(c.dono);
    detalhe.style.setProperty('--cor', COR_CLASSE[def.heroi]);
    const rs = stage.getBoundingClientRect(), rr = raiz.getBoundingClientRect();
    detalhe.style.top = `${rs.top - rr.top + rs.height * 0.43}px`;
    const dica = precisaAlvo(def) ? (batalha.alvosValidos(c).length === 1 ? t('battle.tapAgain') : t('battle.pickTarget')) : t('battle.tapAgain');
    detalhe.replaceChildren(
      h('h4', { class: 'h-title' }, icone(iconeDaCarta(def), { tam: 18 }), ' ', nomeCarta(c.id), h('span', { style: { marginLeft: 'auto', fontSize: '12px', color: 'var(--muted)', fontFamily: 'var(--font-body)' } }, `${dono.emoji} ${dono.nome}`)),
      h('p', {}, descreverCarta(def)),
      h('div', { class: 'meta' }, `${t(`rar.${def.raridade}`)} · ${t(`tg.${def.alvo}`)} · ${t('battle.energy')} ${def.custo}${def.mana ? ` · ${t('stat.mana')} ${def.mana}` : ''}  —  `, h('b', { style: { color: 'var(--gold)' } }, dica)));
    detalhe.classList.add('on');
  }

  function marcarAlvos() {
    const c = batalha.mao.find((x) => x.uid === selUid);
    const validos = new Set(c && precisaAlvo(CARTAS[c.id]) ? batalha.alvosValidos(c).map((e) => e.id) : []);
    views.forEach((v, id) => {
      v.el.classList.toggle('alvo-valido', validos.has(id));
      v.el.classList.toggle('indisponivel', validos.size > 0 && !validos.has(id));
    });
  }

  function renderTudo() { renderUnidades(); renderMao(); renderHud(); renderDetalhe(); marcarAlvos(); }

  // ------------------------------------------------------------------ interação
  function desselecionar() { selUid = null; renderMao(); renderDetalhe(); marcarAlvos(); }

  function aoTocarCarta(c) {
    if (ocupado || batalha.fase !== 'jogador') return;
    const chk = batalha.podeJogar(c);
    const el = mao.querySelector(`[data-uid="${c.uid}"]`);
    if (!chk.ok) { Som.sfx('erro'); Fx.tremer(el); if (chk.motivo?.startsWith('battle.')) Fx.toast(t(chk.motivo)); return; }
    const def = CARTAS[c.id];
    if (selUid === c.uid) {
      if (!precisaAlvo(def)) return jogar(c, null);
      const validos = batalha.alvosValidos(c);
      if (validos.length === 1) return jogar(c, validos[0].id);
      return desselecionar();
    }
    selUid = c.uid; Som.sfx('clique');
    renderMao(); renderDetalhe(); marcarAlvos();
    mao.querySelector('.sel')?.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' });
  }

  function aoTocarUnidade(e) {
    if (ocupado) return;
    const c = batalha.mao.find((x) => x.uid === selUid);
    if (c) {
      const def = CARTAS[c.id];
      if (precisaAlvo(def) && batalha.alvosValidos(c).some((v) => v.id === e.id)) return jogar(c, e.id);
      Som.sfx('erro'); return;
    }
    abrirInfoUnidade(e, batalha);
  }

  async function jogar(c, alvoId) {
    ocupado = true; selUid = null;
    const r = batalha.jogar(c.uid, alvoId);
    if (!r.ok) { ocupado = false; renderTudo(); return; }
    Som.sfx('carta');
    renderMao(); renderDetalhe(); marcarAlvos(); btnFim.disabled = true;
    await reproduzir(fila.drenar());
    if (!vivo) return;
    ocupado = false; renderTudo();
    if (batalha.terminou) finalizar();
  }

  async function fimDeTurno() {
    if (ocupado || batalha.fase !== 'jogador') return;
    ocupado = true; desselecionar(); Som.sfx('turno');
    batalha.terminarTurno(); renderTudo();
    await reproduzir(fila.drenar());
    for (const e of batalha.turnoInimigos()) {
      if (!vivo) return;
      const v = views.get(e.id);
      v?.el.classList.add('agindo');
      await sleep(180);
      await reproduzir(fila.drenar());
      v?.el.classList.remove('agindo');
      renderUnidades(); atualizarLinha();
      await sleep(140);
    }
    if (!vivo) return;
    await reproduzir(fila.drenar());
    ocupado = false; renderTudo();
    if (batalha.terminou) finalizar();
  }

  async function finalizar() {
    ocupado = true; btnFim.disabled = true;
    const venceu = batalha.fase === 'vitoria';
    Som.sfx(venceu ? 'vitoria' : 'derrota');
    if (venceu) batalha.herois.forEach((hr) => { const a = views.get(hr.id)?.ator; if (a && !a.morto) a.pulo(0.6, 0.6); });
    const banner = h('div', { class: 'toast', style: { top: '40%', fontSize: '28px', padding: '14px 28px', animationDuration: '2.2s' } }, venceu ? t('battle.victory') : t('battle.defeat'));
    document.body.append(banner); setTimeout(() => banner.remove(), 2300);
    await sleep(1600);
    if (vivo) aoTerminar({ venceu, batalha });
  }

  // ------------------------------------------------------------------ animação 3D + DOM dos eventos de domínio
  const pendentes = [];

  /** Efeito de ataque 3D de `f` sobre `v` (ou área quando v é nulo). Resolve no momento do impacto. */
  async function ataque3d(f, v, elemento) {
    const cor = COR_ELEMENTO[elemento] ?? null;
    if (!f) return;
    const a = f.ator;
    if (!v) { // ataque em área: onda de choque no centro do alvo
      cena.anelOnda(new THREE.Vector3(0, 0.05, f.entidade.lado === 'heroi' ? -3.3 : 2.5), cor ?? a.corFx, { max: 4.2, dur: 0.7 });
      cena.tremer(0.5); await sleep(280); return;
    }
    const alvoPos = v.ator.pontoPeito();
    const magico = ['fogo', 'gelo', 'raio', 'sagrado', 'sombra', 'veneno'].includes(elemento);
    if (magico) {
      const g = await a.conjurar(0.2);
      const origem = a.pontoMao();
      if (elemento === 'raio') { cena.raio(origem, alvoPos, '#8fd0ff'); await sleep(200); }
      else if (elemento === 'sagrado') { cena.coluna(v.ator.pontoPes(), '#fff2a8', 0.7); cena.projetil(origem, alvoPos, '#fff2a8', { vel: 30, tipo: 'orb' }); await sleep(300); }
      else { await cena.projetil(origem, alvoPos, cor, { vel: 24, tipo: 'orb', tamanho: 1.2 }); }
      g.fim(); return;
    }
    if (a.tipoAtaque === 'corpo') {
      const mov = await a.investir(v.ator.pontoPes(), { ms: 0.22 });
      cena.corte(alvoPos, a.corFx, 1.7);
      await mov.impacto();
      pendentes.push(mov.volta());
    } else {
      const g = await a.conjurar(0.16);
      const origem = a.pontoMao(); origem.z += f.entidade.lado === 'heroi' ? -0.5 : 0.5;
      await cena.projetil(origem, alvoPos, a.corFx, { vel: 34, tamanho: 1 });
      g.fim();
    }
  }

  async function reproduzir(eventos) {
    for (const e of eventos) {
      if (!vivo) return;
      const v = e.alvo ? views.get(e.alvo) : null, f = e.fonte ? views.get(e.fonte) : null;
      switch (e.tipo) {
        case 'conjurar':
          if (f) { f.ator.pulo(0.18, 0.3); cena.anelOnda(f.ator.pontoPes().setY(0.05), f.ator.corFx, { max: 1.8, dur: 0.5 }); }
          Som.sfx(['fogo', 'gelo', 'raio', 'sagrado'].includes(e.elemento) ? 'magia' : 'clique');
          await sleep(200); break;
        case 'golpe':
          Som.sfx('golpe');
          await ataque3d(f, v, e.elemento);
          break;
        case 'dano': {
          if (!v) break;
          if (e.vida != null) v.setHp(e.vida);
          const a = v.ator;
          if (e.valor > 0 || e.bloqueado === 0) {
            const forte = e.nota === 'crit';
            Fx.flutuar(v.token, e.membro ? `${t('v.limb')} -${e.valor}` : `-${e.valor}`, 'dmg');
            a.piscar(COR_ELEMENTO[e.elemento] ?? '#ff3b3b');
            const dir = a.base.clone().sub(f ? f.ator.base : new THREE.Vector3(0, 0, 0)); a.recuar(dir.x * 0.3, a.entidade.lado === 'heroi' ? 1 : -1, forte ? 0.55 : 0.3);
            cena.faiscas(a.pontoPeito(), COR_ELEMENTO[e.elemento] ?? '#ffd27a', forte ? 36 : 20, { vel: forte ? 7 : 5 });
            cena.tremer(forte ? 0.7 : 0.25);
            Som.sfx(forte ? 'critico' : 'dano'); Som.vibrar(forte ? 60 : 25);
          }
          if (e.bloqueado > 0) {
            Fx.flutuar(v.token, `${t('v.blk')} ${e.bloqueado}`, 'blk', { dx: e.valor > 0 ? 30 : 0, atraso: 80 });
            cena.anelOnda(a.pontoPeito(), '#7cc4ff', { max: 1.6, dur: 0.4, vertical: true });
            if (!e.valor) Som.sfx('bloqueio');
          }
          if (e.nota) Fx.flutuar(v.token, e.nota === 'crit' ? t('log.crit') : e.nota === 'weak' ? '▲' + t('log.weak') : t('log.resist'), 'txt', { dy: -92, ms: 1100, atraso: 120 });
          await sleep(e.valor > 0 ? 200 : 110); break;
        }
        case 'cura':
          if (!v) break;
          if (e.vida != null) v.setHp(e.vida);
          Fx.flutuar(v.token, `+${e.valor}`, 'heal'); cena.coluna(v.ator.pontoPes(), '#7dffb0', 0.8);
          Som.sfx('cura'); await sleep(190); break;
        case 'bloqueio':
          if (!v) break;
          Fx.flutuar(v.token, `${t('v.blk')} +${e.valor}`, 'blk'); cena.anelOnda(v.ator.pontoPeito(), '#7cc4ff', { max: 1.9, dur: 0.5, vertical: true });
          Som.sfx('bloqueio'); v.atualizar(); await sleep(120); break;
        case 'status': {
          if (!v) break;
          const ruim = STATUS_RUIM.has(e.status);
          Fx.flutuar(v.token, `${ICONE_STATUS[e.status] ?? ''} ${e.n > 0 ? '+' : ''}${e.n}`, ruim ? 'bad' : 'heal', { dy: -50 });
          cena.faiscas(v.ator.pontoPeito(), ruim ? '#c37bff' : '#7dffb0', 10, { vel: 2.5 });
          v.atualizar(); await sleep(100); break;
        }
        case 'mana': if (v) { Fx.flutuar(v.token, `+${e.valor} ${t('v.mana')}`, 'mana', { dy: -40 }); v.atualizar(); } break;
        case 'morte':
          if (!v) break;
          v.el.classList.add('morto');
          cena.faiscas(v.ator.pontoPeito(), '#ffb347', 40, { vel: 6, vida: 1 }); cena.anelOnda(v.ator.pontoPes().setY(0.05), '#ffb347', { max: 3, dur: 0.7 }); cena.tremer(0.8);
          pendentes.push(v.ator.morrer());
          Som.sfx('morte'); Som.vibrar(80); await sleep(300); break;
        case 'reviver':
          if (!v) break;
          v.el.classList.remove('morto'); v.atualizar(); cena.coluna(v.ator.pontoPes(), '#ffe9a6', 1);
          pendentes.push(v.ator.reviver()); Som.sfx('cura'); await sleep(300); break;
        case 'esquiva':
          if (v) { Fx.flutuar(v.token, 'MISS', 'txt'); v.ator.recuar(1, 0, 0.8); } await sleep(160); break;
        case 'atordoado': if (v) { Fx.flutuar(v.token, 'ATD', 'txt'); cena.faiscas(v.ator.pontoCabeca(), '#ffe066', 12, { vel: 2 }); } await sleep(200); break;
        case 'membro': if (v) { Fx.flutuar(v.token, t('battle.limb') + '!', 'txt', { dy: -90 }); cena.faiscas(v.ator.pontoPeito(), '#58e1ff', 24, { vel: 6 }); } v?.atualizar(); await sleep(200); break;
        case 'fase': Fx.flashTela(); cena.tremer(1.2); Som.sfx('critico'); if (v) pendentes.push(v.ator.transformar()); v?.atualizar(); await sleep(800); break;
        case 'agir': if (f) { f.ator.pulo(0.15, 0.25); } Som.sfx('clique'); break;
        case 'purificar': if (v) cena.coluna(v.ator.pontoPes(), '#9ffcff', 0.6); await sleep(120); break;
        case 'saque': if (v) cena.faiscas(v.ator.pontoPeito(), '#ffe066', 30, { vel: 5 }); Som.sfx('saque'); await sleep(200); break;
        default: break;
      }
      if (v) v.atualizar();
    }
    if (pendentes.length) { await Promise.all(pendentes.splice(0)); }
    renderUnidades(); renderHud();
  }

  // ------------------------------------------------------------------ menu
  function abrirMenu() {
    const f = abrirSheet(h('div', { style: { display: 'flex', flexDirection: 'column', gap: '10px' } },
      h('h3', { class: 'h-title' }, t('app.title')),
      h('button', { class: 'btn', onclick: () => f() }, t('menu.resume')),
      h('button', { class: 'btn sec', onclick: () => { f(); abrirLog(log); } }, t('battle.log')),
      h('button', { class: 'btn sec', onclick: () => { f(); abrirComoJogar(); } }, t('menu.how')),
      h('button', { class: 'btn sec', onclick: () => { f(); abrirConfig(() => aoSair({ recarregar: true })); } }, `${t('menu.lang')} / ${t('menu.sound')}`),
      h('button', { class: 'btn sec', onclick: async () => { f(); if (await confirmar(t('menu.confirmQuit'))) aoSair({ abandonar: true }); } }, t('menu.quit'))));
  }

  // ------------------------------------------------------------------ início
  // só solta o callback se ainda for o nosso (a nova tela é criada antes de destruir a antiga)
  raiz.destruir = () => { vivo = false; if (cena.aoQuadro === quadro) cena.aoQuadro = null; };
  window.__batalha = batalha; // gancho de depuração
  batalha.iniciar();
  renderTudo();
  ocupado = true; renderHud();
  setTimeout(async () => {
    await reproduzir(fila.drenar());
    ocupado = false; renderTudo();
  }, 600);
  return raiz;
}
