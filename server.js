const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const createBot = require('./bot.js');

const server = http.createServer((req, res) => {
  if (req.url === '/') {
    fs.readFile(path.join(__dirname, 'public', 'index.html'), (err, data) => {
      if (err) {
        res.writeHead(500);
        return res.end('Hata oluştu.');
      }
      res.writeHead(200, { 'Content-Type': 'text/html' });
      res.end(data);
    });
  } else if (req.url === '/ping') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('pong');
  } else {
    res.writeHead(404);
    res.end();
  }
});

const wss = new WebSocket.Server({ server });

let botInstance = null;

wss.on('connection', ws => {
  console.log('Yeni bağlantı');

  ws.on('message', msg => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      ws.send('⚠️ Geçersiz JSON.');
      return;
    }

    if (data.action === 'connect') {
      if (botInstance) {
        botInstance.quit();
        botInstance = null;
      }

      const options = {
        host: data.host,
        port: parseInt(data.port) || 25565,
        version: data.version,
        username: data.username,
        patron: data.patron
      };

      botInstance = createBot(options, () => {
        ws.send('✅ Bot oyuna giriş yaptı.');
      });

      ws.send('🔄 Bot başlatıldı.');
    }

    if (data.action === 'disconnect') {
      if (botInstance) {
        botInstance.quit();
        botInstance = null;
        ws.send('🛑 Bot oyundan çıkarıldı.');
      } else {
        ws.send('⚠️ Bot zaten kapalı.');
      }
    }
  });

  ws.on('close', () => {
    if (botInstance) {
      botInstance.quit();
      botInstance = null;
      console.log('Bot kapatıldı, bağlantı kapandı.');
    }
  });

  ws.on('error', err => {
    console.error('WebSocket hatası:', err);
  });
});

server.listen(3000, () => {
  console.log('HTTP + WS server 3000 portunda çalışıyor');
});

// 🟢 Otomatik Ping Sistemi: 0.5 saniyede bir /ping
setInterval(() => {
  http.get('http://localhost:3000/ping', res => {
    console.log('🔁 Kendine ping atıldı:', res.statusCode);
  }).on('error', err => {
    console.error('❌ Ping hatası:', err.message);
  });
}, 100); // 500 ms = 0.5 saniye
