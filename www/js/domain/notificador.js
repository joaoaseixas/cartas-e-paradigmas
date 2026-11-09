// OutputChannel + CombatNotifier (DIP): o domínio só conhece o notificador, nunca a tela.
// Cada canal decide o que fazer com o evento (registro de texto, animação, testes...).
import { I18n } from '../i18n.js';

export class OutputChannel {
  print(/* evento */) { throw new Error('OutputChannel.print não implementado'); }
}

export class LogInMemoryOutputChannel extends OutputChannel {
  constructor(limite = 120) { super(); this.linhas = []; this.limite = limite; this.ouvintes = []; }
  print(evt) {
    if (!evt.key) return;
    const linha = { texto: evt.texto, tom: evt.tom || '' };
    this.linhas.push(linha);
    if (this.linhas.length > this.limite) this.linhas.shift();
    this.ouvintes.forEach((fn) => fn(linha));
  }
}

export class FxQueueOutputChannel extends OutputChannel {
  constructor() { super(); this.fila = []; }
  print(evt) { if (evt.fx) this.fila.push(evt.fx); }
  drenar() { const f = this.fila; this.fila = []; return f; }
}

export class CombatNotifier {
  constructor(canais = []) { this.canais = canais; }
  add(canal) { this.canais.push(canal); return this; }
  notify(key, args = [], extra = {}) {
    const resolvidos = args.map((a) => I18n.resolve(a));
    const texto = key ? I18n.t(key, ...resolvidos) : '';
    const evt = { key, args, texto, ...extra };
    this.canais.forEach((c) => c.print(evt));
    return evt;
  }
  fx(fx) { return this.notify(null, [], { fx }); }
}
