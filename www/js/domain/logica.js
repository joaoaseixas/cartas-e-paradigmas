// Paradigma LÓGICO: base de conhecimento com fatos e regras + motor de unificação (resolução SLD).
// Termos que começam com "?" são variáveis. Ex.: fraqueza(sagrado, ?T) :- tipo(?T, morto-vivo).
export class BaseDeConhecimento {
  constructor() { this.fatos = []; this.regras = []; this._n = 0; }

  fato(...termos) { this.fatos.push({ cabeca: termos, corpo: [] }); return this; }
  regra(cabeca, ...corpo) { this.regras.push({ cabeca, corpo }); return this; }

  static ehVar(t) { return typeof t === 'string' && t.startsWith('?'); }

  _walk(t, s) { while (BaseDeConhecimento.ehVar(t) && t in s) t = s[t]; return t; }

  _unificar(a, b, s) {
    a = this._walk(a, s); b = this._walk(b, s);
    if (a === b) return s;
    if (BaseDeConhecimento.ehVar(a)) return { ...s, [a]: b };
    if (BaseDeConhecimento.ehVar(b)) return { ...s, [b]: a };
    return null;
  }

  _unificarLista(xs, ys, s) {
    if (xs.length !== ys.length) return null;
    for (let i = 0; i < xs.length; i++) { s = this._unificar(xs[i], ys[i], s); if (!s) return null; }
    return s;
  }

  _renomear(clausula) {
    const id = ++this._n, mapa = {};
    const r = (t) => (BaseDeConhecimento.ehVar(t) ? (mapa[t] ??= `${t}_${id}`) : t);
    return { cabeca: clausula.cabeca.map(r), corpo: clausula.corpo.map((g) => g.map(r)) };
  }

  *_provar(metas, s, prof = 0) {
    if (metas.length === 0) { yield s; return; }
    if (prof > 12) return;
    const [meta, ...resto] = metas;
    for (const c of [...this.fatos, ...this.regras]) {
      const { cabeca, corpo } = this._renomear(c);
      const s2 = this._unificarLista(meta, cabeca, s);
      if (s2) yield* this._provar([...corpo, ...resto], s2, prof + 1);
    }
  }

  /** Há alguma prova para a meta? ex.: existe('fraqueza','fogo','esqueleto') */
  existe(...meta) {
    for (const _ of this._provar([meta], {})) return true; // eslint-disable-line no-unused-vars
    return false;
  }

  /** Multiplicador inferido para um elemento contra uma lista de tipos de um alvo. */
  inferirMultiplicador(elemento, tipos) {
    let melhor = { mult: 1, nota: null };
    for (const tipo of tipos) {
      if (this.existe('critico', elemento, tipo)) return { mult: 2, nota: 'crit' };
      if (this.existe('fraqueza', elemento, tipo)) melhor = { mult: 1.5, nota: 'weak' };
      else if (melhor.mult === 1 && this.existe('resiste', elemento, tipo)) melhor = { mult: 0.5, nota: 'resist' };
    }
    return melhor;
  }
}

export function criarBaseDoMundo() {
  const kb = new BaseDeConhecimento();
  // Tipos das criaturas (cenário: ópera espacial)
  ['esqueleto', 'zumbi', 'morcego'].forEach((u) => kb.fato('tipo', u, 'droide'));
  kb.fato('tipo', 'vampiro', 'sombrio').fato('tipo', 'cultista', 'sombrio');
  kb.fato('tipo', 'golem', 'construto').fato('tipo', 'portao', 'construcao').fato('tipo', 'bau', 'construcao');
  kb.fato('tipo', 'demogorgon', 'sombrio').fato('tipo', 'demogorgon2', 'sombrio');
  kb.fato('tipo', 'goblin', 'soldado').fato('tipo', 'lobo', 'fera');
  // Regras gerais: elemento "raio" = íon, "sagrado" = luz, "fogo" = plasma, "gelo" = crio
  kb.regra(['fraqueza', 'raio', '?T'], ['tipo', '?T', 'droide']);
  kb.regra(['fraqueza', 'fogo', '?T'], ['tipo', '?T', 'construcao']);
  kb.regra(['fraqueza', 'fogo', '?T'], ['tipo', '?T', 'soldado']);
  kb.regra(['fraqueza', 'sagrado', '?T'], ['tipo', '?T', 'sombrio']);
  kb.regra(['fraqueza', 'raio', '?T'], ['tipo', '?T', 'construto']);
  kb.regra(['fraqueza', 'raio', '?T'], ['tipo', '?T', 'fera']);
  kb.regra(['resiste', 'gelo', '?T'], ['tipo', '?T', 'construto']);
  kb.regra(['resiste', 'fogo', '?T'], ['tipo', '?T', 'construto']);
  kb.regra(['resiste', 'gelo', '?T'], ['tipo', '?T', 'sombrio']);
  kb.regra(['resiste', 'sagrado', '?T'], ['tipo', '?T', 'droide']);
  kb.regra(['resiste', 'sagrado', '?T'], ['tipo', '?T', 'fera']);
  // Fatos específicos (o "fogo contra Demogorgon" do PDF vira "luz contra o Lorde Sombrio")
  kb.fato('critico', 'sagrado', 'demogorgon').fato('critico', 'sagrado', 'demogorgon2');
  return kb;
}
