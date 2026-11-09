// Teste de fumaça do motor: joga a jornada inteira com uma IA simples, sem interface.
// Uso: node tests/simulacao.mjs
import assert from 'node:assert/strict';
import { Jornada } from '../www/js/game/jornada.js';
import { CARTAS } from '../www/js/game/cartas.js';
import { criarBaseDoMundo } from '../www/js/domain/logica.js';
import { CombatNotifier, LogInMemoryOutputChannel, FxQueueOutputChannel } from '../www/js/domain/notificador.js';
import { Personagem } from '../www/js/domain/entidades.js';
import { calcularDano } from '../www/js/domain/dano.js';
import { implementa, ComHabilidadeEspecial } from '../www/js/domain/contratos.js';
import { criarHeroi } from '../www/js/game/mundo.js';

const kb = criarBaseDoMundo();

// --- lógica
assert.equal(kb.inferirMultiplicador('raio', ['esqueleto']).mult, 1.5, 'ion vs droide');
assert.equal(kb.inferirMultiplicador('sagrado', ['vampiro']).mult, 1.5);
assert.equal(kb.inferirMultiplicador('sagrado', ['demogorgon', 'sombrio']).mult, 2, 'crítico do PDF');
assert.equal(kb.inferirMultiplicador('gelo', ['golem', 'construto']).mult, 0.5);
assert.equal(kb.inferirMultiplicador('raio', ['golem', 'construto']).mult, 1.5);
assert.equal(kb.inferirMultiplicador('fisico', ['golem']).mult, 1);

// --- POO / LSP / ISP
assert.throws(() => new Personagem({ id: 'x' }), /abstrata/);
assert.ok(implementa(criarHeroi('luke'), ComHabilidadeEspecial));
assert.ok(!implementa(criarHeroi('chewie'), ComHabilidadeEspecial), 'Fera não tem habilidade especial');

// --- funcional: pipeline puro
const ctx = Object.freeze({ base: 10, fonte: Object.freeze({ status: { forca: 2 }, bonusArma: () => 1 }), alvo: null });
assert.equal(calcularDano(ctx).dano, 13);

function simular(ids, rng) {
  const j = Jornada.nova(ids);
  const log = new LogInMemoryOutputChannel(); const fx = new FxQueueOutputChannel();
  const notifier = new CombatNotifier([log, fx]);
  let turnosTotal = 0;
  while (!j.terminou) {
    const b = j.criarBatalha(notifier, kb); b.rng = rng; b.iniciar();
    let guarda = 0;
    while (!b.terminou && guarda++ < 80) {
      let jogou = true;
      while (jogou && !b.terminou) {
        jogou = false;
        // IA: tenta cartas por ordem de custo decrescente
        const ordem = [...b.mao].sort((a, c) => CARTAS[c.id].custo - CARTAS[a.id].custo);
        for (const c of ordem) {
          if (!b.podeJogar(c).ok) continue;
          const def = CARTAS[c.id]; let alvo = null;
          const vs = b.alvosValidos(c);
          if (def.alvo === 'enemy') alvo = (vs.find((e) => !e.cenario) ?? vs[0]).id;
          else if (def.alvo === 'ally') alvo = vs.sort((x, y) => x.vida / x.maxVida - y.vida / y.maxVida)[0].id;
          else if (def.alvo === 'deadAlly') alvo = vs[0].id;
          const r = b.jogar(c.uid, alvo); assert.ok(r.ok, `jogada inválida ${c.id}: ${r.motivo}`);
          jogou = true; break;
        }
      }
      if (b.terminou) break;
      b.terminarTurno();
      for (const _ of b.turnoInimigos()); // eslint-disable-line no-unused-vars
      turnosTotal++;
    }
    fx.drenar();
    if (b.fase === 'derrota') return { ganhou: false, fase: j.fase, turnosTotal };
    assert.equal(b.fase, 'vitoria');
    j.concluirBatalha(b);
    const recompensas = j.gerarRecompensas(rng); assert.equal(recompensas.length, 3);
    j.adicionarCarta(recompensas[0], j.donoParaCarta(recompensas[0], rng));
    if (j.mochila.length) { const antes = j.mochila.length; j.equipar(j.herois[0].id, 0); assert.ok(j.mochila.length <= antes); }
    j.mochila.length = 0;
    // serialização ida e volta
    const volta = Jornada.restaurar(JSON.parse(JSON.stringify(j.serializar())));
    assert.equal(volta.herois.length, 3); assert.equal(volta.baralho.length, j.baralho.length);
    j.avancar();
  }
  return { ganhou: true, fase: j.fase, turnosTotal };
}

let vitorias = 0; const N = 60;
for (let i = 0; i < N; i++) {
  let s = i + 1; const rng = () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;
  const grupos = [['luke', 'yoda', 'leia'], ['luke', 'han', 'leia'], ['yoda', 'han', 'chewie'], ['luke', 'yoda', 'han']];
  const r = simular(grupos[i % grupos.length], rng);
  if (r.ganhou) vitorias++; (globalThis.H ??= {})[r.fase] = ((globalThis.H[r.fase]) || 0) + 1;
}
console.log("fase onde terminou (6=venceu a última):", JSON.stringify(globalThis.H));
console.log(`Simulações: ${N}, vitórias da IA simples: ${vitorias}`);
console.log('OK — nenhuma exceção e nenhuma jogada inválida.');
