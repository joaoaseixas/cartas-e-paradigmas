// Ponto de entrada / roteador de telas (composition root).
import { Estado } from './ui/estado.js';
import { Som } from './ui/audio.js';
import { Perfil } from './game/perfil.js';
import { Missao } from './game/missao.js';
import { telaTitulo } from './ui/telas.js';
import { telaBatalha } from './ui/telaBatalha.js';
import { telaHub, telaResultado } from './ui/hub.js';

const app = document.getElementById('app');
const perfil = new Perfil();
let atual = null;

function mostrar(el) {
  atual?.destruir?.();
  app.replaceChildren(el);
  atual = el;
}

const resetar = () => { perfil.resetar(); irTitulo(); };

function irTitulo() {
  mostrar(telaTitulo({ perfil, aoJogar: () => irHub('jogar'), aoIdioma: irTitulo, aoResetar: resetar }));
}

function irHub(aba = 'jogar') {
  mostrar(telaHub({ perfil, abaInicial: aba, aoJogar: irBatalha, aoTitulo: irTitulo }));
}

function irBatalha(faseIdx) {
  const missao = new Missao(perfil, faseIdx);
  mostrar(telaBatalha({
    jornada: missao,
    aoTerminar: ({ venceu, batalha }) => {
      if (!venceu) { irResultado(missao, false, 0, null); return; }
      const estrelas = missao.estrelas(batalha);
      const rec = perfil.registrarVitoria(faseIdx, estrelas, missao.saque(batalha));
      irResultado(missao, true, estrelas, rec);
    },
    aoSair: ({ abandonar, recarregar }) => {
      if (abandonar) irHub('jogar');
      else if (recarregar) irBatalha(faseIdx);
    },
  }));
}

function irResultado(missao, venceu, estrelas, rec) {
  mostrar(telaResultado({
    venceu, estrelas, rec, missao, perfil,
    aoProxima: () => irHub('jogar'),
    aoTentar: () => irBatalha(missao.faseIdx),
    aoHub: () => irHub('jogar'),
    aoRoleta: () => irHub('roleta'),
  }));
}

// Destrava o áudio no primeiro toque (política dos navegadores / WebView).
window.addEventListener('pointerdown', () => Som.destravar(), { once: true });
window.addEventListener('contextmenu', (e) => e.preventDefault());
irTitulo();

// ---- integração com o app Android (Capacitor): botão voltar e tela cheia
const nativo = window.Capacitor?.Plugins;
try { nativo?.StatusBar?.hide?.(); } catch { /* ignore */ }
nativo?.App?.addListener?.('backButton', () => {
  const modal = document.getElementById('modal-root');
  if (modal.lastElementChild) { modal.lastElementChild.remove(); return; }
  const scr = app.querySelector('.screen');
  if (!scr) return;
  if (scr.classList.contains('title-screen')) nativo.App.exitApp();
  else if (scr.classList.contains('battle')) scr.querySelector('.icon-btn')?.click();
  else if (scr.classList.contains('hub')) irTitulo();
  else irHub('jogar');
});

// Hook de depuração/teste automatizado.
window.__rpg = { Estado, perfil, irTitulo, irHub, irBatalha, irResultado };
