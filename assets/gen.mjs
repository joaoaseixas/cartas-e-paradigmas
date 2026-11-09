// Gera os PNGs-fonte do ícone/splash a partir de SVG (rodar antes do capacitor-assets).
import sharp from 'sharp';

const estrelas = Array.from({ length: 46 }, (_, i) => {
  const r = (n) => ((Math.sin(i * 91.7 + n * 13.3) * 43758.5453) % 1 + 1) % 1;
  return `<circle cx="${r(1) * 1024}" cy="${r(2) * 1024}" r="${1 + r(3) * 3}" fill="#fff" opacity="${0.35 + r(4) * 0.6}"/>`;
}).join('');

const sabreSvg = (cor, halo) => `
  <rect x="496" y="120" width="32" height="520" rx="16" fill="${halo}" opacity=".35" filter="url(#blur)"/>
  <rect x="502" y="130" width="20" height="510" rx="10" fill="${cor}"/>
  <rect x="508" y="130" width="8" height="510" rx="4" fill="#fff"/>
  <rect x="470" y="640" width="84" height="30" rx="8" fill="#9aa3b5"/>
  <rect x="492" y="670" width="40" height="120" rx="10" fill="#4a5163"/>
  <rect x="492" y="700" width="40" height="10" fill="#9aa3b5"/><rect x="492" y="740" width="40" height="10" fill="#9aa3b5"/>`;

const defs = `<defs>
  <radialGradient id="fundo" cx="50%" cy="38%" r="80%"><stop offset="0" stop-color="#173a7a"/><stop offset=".55" stop-color="#0a1633"/><stop offset="1" stop-color="#03050d"/></radialGradient>
  <radialGradient id="planeta" cx="35%" cy="35%" r="70%"><stop offset="0" stop-color="#6fb4ff"/><stop offset="1" stop-color="#0d2a66"/></radialGradient>
  <filter id="blur"><feGaussianBlur stdDeviation="14"/></filter></defs>`;

const cena = (esc = 1, planeta = true) => `<g transform="translate(512 512) scale(${esc}) translate(-512 -512)">
  ${planeta ? '<circle cx="740" cy="300" r="150" fill="url(#planeta)" opacity=".85"/><circle cx="740" cy="300" r="150" fill="none" stroke="#58e1ff" stroke-opacity=".5" stroke-width="6"/>' : ''}
  <g transform="rotate(-38 512 512)">${sabreSvg('#4fd1ff', '#4fd1ff')}</g>
  <g transform="rotate(38 512 512)">${sabreSvg('#ff3b4a', '#ff3b4a')}</g>
  <circle cx="512" cy="512" r="58" fill="#fff" opacity=".9" filter="url(#blur)"/>
  <path d="M512 452 l14 36 38 3 -29 25 9 38 -32 -21 -32 21 9 -38 -29 -25 38 -3z" fill="#ffe066"/>
</g>`;
const svg = (corpo) => `<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="1024" viewBox="0 0 1024 1024">${defs}${corpo}</svg>`;
const out = async (nome, s, size = 1024) => sharp(Buffer.from(s)).resize(size, size).png().toFile(`assets/${nome}`);

await out('icon-only.png', svg(`<rect width="1024" height="1024" fill="url(#fundo)"/>${estrelas}${cena(1)}`));
await out('icon-foreground.png', svg(cena(0.62, false)));
await out('icon-background.png', svg(`<rect width="1024" height="1024" fill="url(#fundo)"/>${estrelas}`));
await out('splash.png', svg(`<rect width="1024" height="1024" fill="#03050d"/>${estrelas}${cena(0.42)}`), 2732);
await out('splash-dark.png', svg(`<rect width="1024" height="1024" fill="#03050d"/>${estrelas}${cena(0.42)}`), 2732);
console.log('assets gerados');
