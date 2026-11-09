// Estado global da aplicação (composition root da UI): config, stats, jornada e base lógica.
import { I18n } from '../i18n.js';
import { Salvar } from './salvar.js';
import { Som } from './audio.js';
import { criarBaseDoMundo } from '../domain/logica.js';

export const Estado = {
  config: Salvar.config(),
  stats: Salvar.stats(),
  jornada: null,
  kb: criarBaseDoMundo(),
  definirIdioma(l) { this.config.lang = l; I18n.set(l); document.documentElement.lang = l === 'pt' ? 'pt-BR' : 'en'; Salvar.gravarConfig(this.config); },
  definirSom(v) { this.config.som = v; Som.ligado = v; Salvar.gravarConfig(this.config); },
  registrarFase(n) { if (n > this.stats.melhorFase) { this.stats.melhorFase = n; Salvar.gravarStats(this.stats); } },
  registrarVitoria() { this.stats.vitorias += 1; Salvar.gravarStats(this.stats); },
};
I18n.set(Estado.config.lang);
Som.ligado = Estado.config.som;
document.documentElement.lang = Estado.config.lang === 'pt' ? 'pt-BR' : 'en';
