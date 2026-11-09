// Paradigma FUNCIONAL: o cálculo de dano é um pipeline de funções puras (contexto -> novo contexto).
// Nenhuma função altera o contexto recebido; cada uma devolve uma cópia com o dano e as notas atualizadas.
export const pipe = (...fns) => (x) => fns.reduce((acc, fn) => fn(acc), x);

const stack = (e, nome) => (e?.status?.[nome] ?? 0);
const comNota = (c, dano, nota) => ({ ...c, dano, notas: nota ? [...c.notas, nota] : c.notas });

export const porArma = (c) => (c.base > 0 && c.fonte?.bonusArma ? comNota(c, c.dano + c.fonte.bonusArma()) : c);
export const porForca = (c) => comNota(c, c.dano + stack(c.fonte, 'forca'));
export const porMira = (c) => (stack(c.fonte, 'mira') > 0 && !c.semMira ? comNota({ ...c, consumirMira: true }, c.dano * 2, 'mira') : c);
export const porFraqueza = (c) => (stack(c.fonte, 'fraqueza') > 0 ? comNota(c, c.dano * 0.75) : c);
export const porMembro = (c) => (c.fonte?.membroDestruido?.() ? comNota(c, c.dano * 0.5) : c);
export const porElemento = (c) => {
  if (!c.alvo?.tipos || !c.kb || !c.elemento) return c;
  const { mult, nota } = c.kb.inferirMultiplicador(c.elemento, c.alvo.tipos);
  return comNota(c, c.dano * mult, nota);
};
export const porVulneravel = (c) => (stack(c.alvo, 'vulneravel') > 0 ? comNota(c, c.dano * 1.5) : c);

export const calcularDano = (ctx) => {
  const r = pipe(porArma, porForca, porMira, porFraqueza, porMembro, porElemento, porVulneravel)(
    { notas: [], consumirMira: false, ...ctx, dano: ctx.base });
  return { ...r, dano: Math.max(0, Math.floor(r.dano + 1e-6)) };
};

// Cura entre as fases: map puro que devolve o NOVO plano de vida, sem mutar os heróis (como no PDF).
export const planejarAcampamento = (herois, pctVivo = 0.3, pctCaido = 0.25) =>
  herois.map((h) => ({
    id: h.id,
    vida: h.estaDestruido() ? Math.ceil(h.maxVida * pctCaido) : Math.min(h.maxVida, h.vida + Math.ceil(h.maxVida * pctVivo)),
  }));
