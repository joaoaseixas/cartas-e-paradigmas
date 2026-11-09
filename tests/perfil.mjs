// Testes da meta-progressão: roleta (gacha), garantia, evolução, diário e campanha. node tests/perfil.mjs
import assert from 'node:assert/strict';
import { Perfil, SEGMENTOS, GIROS_PARA_GARANTIA } from '../www/js/game/perfil.js';
import { HEROIS, ORDEM_HEROIS } from '../www/js/game/mundo.js';
import { Missao } from '../www/js/game/missao.js';
import { CombatNotifier } from '../www/js/domain/notificador.js';
import { criarBaseDoMundo } from '../www/js/domain/logica.js';

const armazemFalso = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, v) }; };
const semente = (s) => () => ((s = (s * 16807) % 2147483647) - 1) / 2147483646;

// --- estado inicial
let p = new Perfil(armazemFalso(), semente(7));
assert.deepEqual(p.desbloqueados.sort(), ['han', 'leia', 'luke']);
assert.equal(p.equipe.length, 3);

// --- distribuição da roleta: pesos somam e todos os tipos aparecem
const rng = semente(42); const cont = {};
for (let i = 0; i < 4000; i++) {
  const q = new Perfil(armazemFalso(), rng); q.d.giros = 99; q.d.giroDia = 'x';
  const r = q.girar(); cont[r.segmento.id] = (cont[r.segmento.id] ?? 0) + 1;
}
SEGMENTOS.forEach((s) => assert.ok(cont[s.id] > 0, `segmento ${s.id} nunca saiu`));
assert.ok(cont['cred-150'] > cont['heroi-lendario'] * 5, 'lendário deve ser bem mais raro');

// --- garantia: após N giros sem herói, o próximo é herói
p = new Perfil(armazemFalso(), () => 0.0001); // sempre cai no primeiro segmento (créditos)
p.d.giros = 50; p.d.giroDia = 'x';
for (let i = 0; i < GIROS_PARA_GARANTIA - 1; i++) assert.equal(p.girar().segmento.tipo, 'creditos');
const garantido = p.girar();
assert.equal(garantido.segmento.tipo, 'heroi', 'giro garantido deve entregar herói');
assert.equal(p.d.pity, 0);

// --- herói novo é adicionado; duplicata vira fragmentos
p = new Perfil(armazemFalso(), semente(3)); p.d.giros = 500; p.d.giroDia = 'x';
let novos = 0, dups = 0;
for (let i = 0; i < 400; i++) { const r = p.girar(); if (r.heroiNovo) novos++; if (r.duplicado) dups++; }
assert.equal(novos, ORDEM_HEROIS.length - 3, 'todos os heróis bloqueados devem sair eventualmente');
assert.ok(dups > 0, 'depois de ter todos, heróis viram fragmentos');
assert.equal(p.desbloqueados.length, ORDEM_HEROIS.length);

// --- evolução consome créditos e fragmentos
p = new Perfil(armazemFalso(), semente(1));
assert.equal(p.podeEvoluir('luke'), false);
p.d.creditos = 1000; p.d.herois.luke.sh = 10;
assert.ok(p.evoluir('luke')); assert.equal(p.nivel('luke'), 2);
assert.equal(p.d.creditos, 1000 - 80); assert.equal(p.fragmentos('luke'), 10 - 2);

// --- diário: sequência e uma coleta por dia
let agora = new Date(2026, 0, 10, 10);
p = new Perfil(armazemFalso(), semente(1), () => agora);
assert.ok(p.giroGratisDisponivel);
assert.ok(p.coletarDiario()); assert.equal(p.coletarDiario(), null);
const premio = p.girar(); assert.ok(premio); assert.equal(p.giroGratisDisponivel, false);
agora = new Date(2026, 0, 11, 9); assert.equal(p.coletarDiario().streak, 2); assert.ok(p.giroGratisDisponivel);
agora = new Date(2026, 0, 20, 9); assert.equal(p.coletarDiario().streak, 1, 'sequência quebra após faltar dias');

// --- campanha: estrelas só sobem; recompensas somam
p = new Perfil(armazemFalso(), semente(5));
const r1 = p.registrarVitoria(0, 2, ['machado']);
assert.equal(p.faseAtual, 1); assert.equal(p.estrelasDa(0), 2); assert.ok(r1.armas.includes('machado')); assert.ok(r1.primeira);
p.registrarVitoria(0, 1); assert.equal(p.estrelasDa(0), 2, 'estrelas não diminuem');

// --- persistência ida e volta
const arm = armazemFalso(); p = new Perfil(arm, semente(9)); p.d.creditos = 777; p.salvar();
assert.equal(new Perfil(arm).d.creditos, 777);

// --- missão monta equipe com cartas por nível e escala por setor
p = new Perfil(armazemFalso(), semente(2)); p.d.herois.luke.n = 4;
const m = new Missao(p, 0);
const doLuke = m.baralho.filter((c) => c.dono === 'luke').length;
assert.equal(doLuke, 6 + 3, 'nível 4 libera 3 cartas extras (níveis 2, 3 e 4)');
assert.ok(new Missao(p, 7).escala > new Missao(p, 0).escala, 'setor 2 é mais difícil');
const b = m.criarBatalha(new CombatNotifier([]), criarBaseDoMundo()); b.iniciar();
assert.equal(b.herois.length, 3); assert.ok(b.mao.length > 0);
console.log('OK — meta-progressão validada (roleta, garantia, evolução, diário, campanha, missão).');
