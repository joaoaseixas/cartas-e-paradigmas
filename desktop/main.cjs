// App de desktop (Windows): abre o jogo numa janela de celular, servindo www/ por um servidor local
// (módulos ES não carregam via file://, então usamos http://127.0.0.1:<porta>).
const { app, BrowserWindow, Menu } = require('electron');
const http = require('http');
const fs = require('fs');
const path = require('path');

const raiz = path.join(__dirname, '..', 'www');
const tipos = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.png': 'image/png', '.json': 'application/json' };

function servidor() {
  return new Promise((resolve) => {
    const s = http.createServer((req, res) => {
      let p = decodeURIComponent(req.url.split('?')[0]); if (p === '/') p = '/index.html';
      const f = path.join(raiz, p);
      if (!f.startsWith(raiz) || !fs.existsSync(f) || fs.statSync(f).isDirectory()) { res.writeHead(404); return res.end('404'); }
      res.writeHead(200, { 'Content-Type': tipos[path.extname(f)] || 'application/octet-stream' });
      fs.createReadStream(f).pipe(res);
    });
    s.listen(0, '127.0.0.1', () => resolve(s.address().port));
  });
}

app.whenReady().then(async () => {
  const porta = await servidor();
  Menu.setApplicationMenu(null);
  const janela = new BrowserWindow({
    width: 480, height: 900, minWidth: 360, minHeight: 640, backgroundColor: '#1a1d20', title: 'Cartas & Paradigmas',
    icon: path.join(__dirname, 'icone.png'), autoHideMenuBar: true,
    webPreferences: { contextIsolation: true, sandbox: true },
  });
  janela.loadURL(`http://127.0.0.1:${porta}/`);
  janela.webContents.on('before-input-event', (e, i) => { if (i.key === 'F11' && i.type === 'keyDown') janela.setFullScreen(!janela.isFullScreen()); });
});
app.on('window-all-closed', () => app.quit());
