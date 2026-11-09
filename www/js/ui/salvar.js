// Persistência em localStorage (sempre protegida: pode falhar em modo privado).
const K = { run: 'cp.run', cfg: 'cp.cfg', stats: 'cp.stats' };
const ler = (k, padrao) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : padrao; } catch { return padrao; } };
const gravar = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* ignore */ } };

export const Salvar = {
  config: () => ({ lang: (navigator.language || 'pt').toLowerCase().startsWith('pt') ? 'pt' : 'en', som: true, ...ler(K.cfg, {}) }),
  gravarConfig: (c) => gravar(K.cfg, c),
  stats: () => ({ vitorias: 0, melhorFase: 0, ...ler(K.stats, {}) }),
  gravarStats: (s) => gravar(K.stats, s),
  run: () => ler(K.run, null),
  gravarRun: (r) => gravar(K.run, r),
  apagarRun: () => { try { localStorage.removeItem(K.run); } catch { /* ignore */ } },
};
