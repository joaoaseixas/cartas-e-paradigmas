// Roleta de recompensas: SVG com 8 segmentos, giro com easing, clique de catraca e revelação do prêmio.
import { h, sleep } from './dom.js';
import { t } from '../i18n.js';
import { SEGMENTOS, RARIDADES } from '../game/perfil.js';
import { HEROIS } from '../game/mundo.js';
import { Som } from './audio.js';
import { icone } from './icones.js';

const NS = 'http://www.w3.org/2000/svg';
const R = 150;

const corSeg = (s) => (s.tipo === 'heroi' ? RARIDADES[s.raridade].cor : s.tipo === 'giros' ? '#f26a21' : s.tipo === 'fragmentos' ? '#86e3c9' : '#aaa698');

function rotuloSeg(s) {
  if (s.tipo === 'heroi') return { topo: { raro: 'RARO', epico: 'ÉPICO', lendario: 'LEND.' }[s.raridade], base: t('roleta.heroi') };
  if (s.tipo === 'creditos') return { topo: s.n, base: t('roleta.creditos') };
  if (s.tipo === 'fragmentos') return { topo: s.n, base: t('roleta.frag') };
  return { topo: `+${s.n}`, base: t('roleta.giros') };
}

/** Constrói o SVG da roleta (ponteiro fica no topo; a roda gira dentro do grupo #roda). */
function desenharRoda() {
  const svg = document.createElementNS(NS, 'svg');
  svg.setAttribute('viewBox', '-170 -190 340 360'); svg.setAttribute('class', 'roleta-svg');
  const n = SEGMENTOS.length, ang = (Math.PI * 2) / n;
  const roda = document.createElementNS(NS, 'g'); roda.setAttribute('class', 'roda');
  SEGMENTOS.forEach((s, i) => {
    const a0 = -Math.PI / 2 + i * ang - ang / 2, a1 = a0 + ang;
    const p = document.createElementNS(NS, 'path');
    p.setAttribute('d', `M0 0 L${R * Math.cos(a0)} ${R * Math.sin(a0)} A${R} ${R} 0 0 1 ${R * Math.cos(a1)} ${R * Math.sin(a1)}Z`);
    p.setAttribute('fill', i % 2 ? '#2a2e33' : '#353a40'); p.setAttribute('stroke', '#1a1d20'); p.setAttribute('stroke-width', '2');
    roda.append(p);
    const barra = document.createElementNS(NS, 'path');
    barra.setAttribute('d', `M${(R - 8) * Math.cos(a0 + 0.06)} ${(R - 8) * Math.sin(a0 + 0.06)} A${R - 8} ${R - 8} 0 0 1 ${(R - 8) * Math.cos(a1 - 0.06)} ${(R - 8) * Math.sin(a1 - 0.06)}`);
    barra.setAttribute('stroke', corSeg(s)); barra.setAttribute('stroke-width', '7'); barra.setAttribute('fill', 'none');
    roda.append(barra);
    const g = document.createElementNS(NS, 'g'); g.setAttribute('transform', `rotate(${(i * 360) / n})`);
    const l = rotuloSeg(s);
    const t1 = document.createElementNS(NS, 'text'); t1.setAttribute('y', -R + 46); t1.setAttribute('text-anchor', 'middle'); t1.setAttribute('class', 'rt1'); t1.setAttribute('fill', corSeg(s)); t1.textContent = l.topo;
    const t2 = document.createElementNS(NS, 'text'); t2.setAttribute('y', -R + 62); t2.setAttribute('text-anchor', 'middle'); t2.setAttribute('class', 'rt2'); t2.textContent = l.base;
    g.append(t1, t2); roda.append(g);
  });
  const cubo = document.createElementNS(NS, 'circle'); cubo.setAttribute('r', 26); cubo.setAttribute('fill', '#1a1d20'); cubo.setAttribute('stroke', '#f26a21'); cubo.setAttribute('stroke-width', 4);
  const aro = document.createElementNS(NS, 'circle'); aro.setAttribute('r', R + 4); aro.setAttribute('fill', 'none'); aro.setAttribute('stroke', '#4a5158'); aro.setAttribute('stroke-width', 8);
  roda.append(aro, cubo);
  const ponteiro = document.createElementNS(NS, 'path');
  ponteiro.setAttribute('d', `M-16 -${R + 12} L16 -${R + 12} L0 -${R - 20} Z`); ponteiro.setAttribute('fill', '#f26a21'); ponteiro.setAttribute('stroke', '#1a1d20'); ponteiro.setAttribute('stroke-width', 3);
  svg.append(roda, ponteiro);
  return { svg, roda };
}

/**
 * Componente da roleta. `aoGirar()` deve devolver o prêmio já aplicado (com `.indice`) ou null.
 * Resolve após a animação com o prêmio, para a tela mostrar a revelação.
 */
export function criarRoleta({ aoGirar, aoTerminar, podeGirar }) {
  const { svg, roda } = desenharRoda();
  let angulo = 0, girando = false;
  const caixa = h('div', { class: 'roleta' }, svg);

  async function girar() {
    if (girando || !podeGirar()) { Som.sfx('erro'); return; }
    const premio = aoGirar(); if (!premio) return;
    girando = true; caixa.classList.add('girando');
    const n = SEGMENTOS.length, passo = 360 / n;
    const alvo = -(premio.indice * passo) + (Math.random() - 0.5) * passo * 0.6;
    const voltas = 5 + Math.floor(Math.random() * 2);
    const inicio = angulo, base = inicio - voltas * 360, delta = (((alvo - base) % 360) + 360) % 360, fim = base + delta - 360;
    const dur = 4200, t0 = performance.now(); let ultimoTique = -1;
    await new Promise((res) => {
      const quadro = (agora) => {
        const k = Math.min(1, (agora - t0) / dur), e = 1 - Math.pow(1 - k, 4);
        angulo = inicio + (fim - inicio) * e;
        roda.setAttribute('transform', `rotate(${angulo})`);
        const tique = Math.floor(-angulo / passo + 0.5);
        if (tique !== ultimoTique) { ultimoTique = tique; Som.tom(900 + (k < 0.8 ? 0 : 200), 0.03, 'square', 0.04); Som.vibrar(8); }
        if (k < 1) requestAnimationFrame(quadro); else res();
      };
      requestAnimationFrame(quadro);
    });
    await sleep(250);
    girando = false; caixa.classList.remove('girando');
    aoTerminar(premio);
  }
  return { el: caixa, girar, get girando() { return girando; } };
}

export const iconeSeg = (s) => (s.tipo === 'heroi' ? 'star' : s.tipo === 'giros' ? 'revive' : s.tipo === 'fragmentos' ? 'burst' : 'drop');
export const nomeHeroi = (id) => HEROIS[id].nome;
export { icone };
