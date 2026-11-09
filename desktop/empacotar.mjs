// Gera o app de Windows em dist/CartasEParadigmas-win32-x64 e o zip para distribuir.
// Uso: node desktop/empacotar.mjs
import { cpSync, rmSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { execSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { packager } from '@electron/packager';
import pngToIco from 'png-to-ico';

const raiz = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const stage = path.join(raiz, 'dist', 'stage');
rmSync(path.join(raiz, 'dist'), { recursive: true, force: true });
mkdirSync(stage, { recursive: true });

// app mínimo: main + www lado a lado
cpSync(path.join(raiz, 'www'), path.join(stage, 'www'), { recursive: true });
cpSync(path.join(raiz, 'desktop', 'icone.png'), path.join(stage, 'icone.png'));
cpSync(path.join(raiz, 'desktop', 'package.json'), path.join(stage, 'package.json'));
writeFileSync(path.join(stage, 'main.cjs'), readFileSync(path.join(raiz, 'desktop', 'main.cjs'), 'utf8').replace("path.join(__dirname, '..', 'www')", "path.join(__dirname, 'www')"));
writeFileSync(path.join(stage, 'icone.ico'), await pngToIco(path.join(raiz, 'desktop', 'icone.png')));

const saidas = await packager({
  dir: stage, out: path.join(raiz, 'dist'), name: 'CartasEParadigmas', platform: 'win32', arch: 'x64',
  icon: path.join(stage, 'icone.ico'), overwrite: true, prune: true, asar: true,
  appCopyright: 'Projeto de estudo - uso pessoal', win32metadata: { ProductName: 'Cartas & Paradigmas', FileDescription: 'Cartas & Paradigmas' },
});
const pasta = saidas[0];
console.log('Pasta:', pasta);
const zip = path.join(raiz, 'dist', 'CartasEParadigmas-Windows.zip');
execSync(`powershell -NoProfile -Command "Compress-Archive -Path '${pasta}\\*' -DestinationPath '${zip}' -Force"`, { stdio: 'inherit' });
console.log('Zip:', zip);
