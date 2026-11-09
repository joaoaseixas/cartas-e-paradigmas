// Helper mínimo de DOM: h('div', {class:'x', onclick:fn}, ...filhos)
export const h = (tag, attrs = {}, ...kids) => {
  const e = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs || {})) {
    if (v == null || v === false) continue;
    if (k === 'class') e.className = v;
    else if (k === 'style' && typeof v === 'object') {
      for (const [p, val] of Object.entries(v)) { if (p.startsWith('--')) e.style.setProperty(p, val); else e.style[p] = val; }
    }
    else if (k === 'html') e.innerHTML = v;
    else if (k.startsWith('on')) e.addEventListener(k.slice(2).toLowerCase(), v);
    else if (v === true) e.setAttribute(k, '');
    else e.setAttribute(k, v);
  }
  for (const kid of kids.flat(Infinity)) {
    if (kid == null || kid === false) continue;
    e.append(kid.nodeType ? kid : document.createTextNode(String(kid)));
  }
  return e;
};

export const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
export const $ = (sel, root = document) => root.querySelector(sel);
export const limpar = (el) => { while (el.firstChild) el.removeChild(el.firstChild); return el; };
