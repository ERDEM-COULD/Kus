const http = require('http');
const WebSocket = require('ws');
const fs = require('fs');
const path = require('path');
const createBot = require('./bot.js');

// HTML ve diğer dosyaları servis et
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

// WebSocket sunucusu
const wss = new WebSocket.Server({ server });
let botInstance = null;

wss.on('connection', ws => {
  console.log('🟢 Yeni WebSocket bağlantısı kuruldu.');

  ws.on('message', msg => {
    let data;
    try {
      data = JSON.parse(msg);
    } catch (e) {
      ws.send('⚠️ Geçersiz JSON alındı.');
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

      console.log('🤖 Bot başlatılıyor:', options);

      botInstance = createBot(options, () => {
        ws.send('✅ Bot oyuna başarıyla giriş yaptı.');
      });

      ws.send('🚀 Bot başlatıldı.');
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

  // Sayfa kapanınca bot çıkmasın
  ws.on('close', () => {
    console.log('🔌 WebSocket kapandı (sayfa kapandı), bot çalışmaya devam ediyor.');
    // bot.quit() çağrılmadığı için bot oyunda kalır
  });

  ws.on('error', err => {
    console.error('❌ WebSocket hatası:', err);
  });
});

// Sunucuyu başlat
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`🌐 Sunucu http://localhost:${PORT} adresinde çalışıyor`);
});

// Render gibi platformlar için kendine ping atarak ayakta tut
setInterval(() => {
  http.get(`http://localhost:${PORT}/ping`, res => {
    console.log('🔁 Kendine ping atıldı:', res.statusCode);
  }).on('error', err => {
    console.error('❌ Ping hatası:', err.message);
  });
}, 500); // 0.5 saniyede bir ping

// Uyumasın diye boş bir döngü
setInterval(() => {}, 1000);

