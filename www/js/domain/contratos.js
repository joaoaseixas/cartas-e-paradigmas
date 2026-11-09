// Interfaces segregadas (ISP). Em JS não há `interface`, então o contrato é um conjunto de métodos
// verificável em tempo de execução — o equivalente do `instanceof ComHabilidadeEspecial` do PDF.
export const Destrutivel = Object.freeze({ nome: 'Destrutivel', metodos: ['receberDano', 'estaDestruido', 'getNome'] });
export const ComHabilidadeEspecial = Object.freeze({ nome: 'ComHabilidadeEspecial', metodos: ['usarHabilidade'] });

export const implementa = (obj, contrato) =>
  !!obj && contrato.metodos.every((m) => typeof obj[m] === 'function');
