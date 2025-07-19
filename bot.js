const mineflayer = require('mineflayer');
const { pathfinder } = require('mineflayer-pathfinder');

module.exports = function (options, onSpawnCallback) {
  const bot = mineflayer.createBot({
    host: options.host,
    port: options.port,
    username: options.username,
    version: options.version,
    auth: 'offline'
  });

  bot.loadPlugin(pathfinder);

  let ileri = true;
  let takipModu = false;
  let hareketInterval = null;
  const patron = options.patron || 'Mcompanionisback';

  let sonSaldiran = null;
  let sonMesajZamani = 0;
  const MESAJ_COOLDOWN_MS = 10000; // 10 saniye

  function baslatHareket() {
    if (hareketInterval) clearInterval(hareketInterval);
    hareketInterval = setInterval(() => {
      if (!bot.entity || takipModu) return;
      bot.setControlState('forward', ileri);
      bot.setControlState('back', !ileri);
      setTimeout(() => bot.clearControlStates(), 700);
      ileri = !ileri;
    }, 1400);
  }

  function durdurHareket() {
    if (hareketInterval) {
      clearInterval(hareketInterval);
      hareketInterval = null;
    }
    bot.clearControlStates();
  }

  bot.once('spawn', () => {
    if (!takipModu) baslatHareket();
    bot.chat('🟢 Bot oyunda!');
    onSpawnCallback?.();
  });

  bot.on('chat', (username, message) => {
    if (username !== patron) return;

    if (message === '*çık') {
      bot.chat('🟥 Bot çıkıyor...');
      bot.quit();
    }

    if (message === '*gir') {
      bot.chat('🟡 Zaten oyundayım!');
    }

    if (message === '*takip') {
      bot.chat('🟢 Takip moduna geçtim.');
      takipModu = true;
      durdurHareket();
    }

    if (message === '*dur') {
      bot.chat('🟡 Takip modu kapandı.');
      takipModu = false;
      baslatHareket();
    }
  });

  bot.on('physicsTick', () => {
    if (!takipModu) return;

    const hedef = bot.players[patron];
    if (!hedef || !hedef.entity) {
      bot.clearControlStates();
      return;
    }

    const hedefPos = hedef.entity.position.offset(0, hedef.entity.height, 0);
    const mesafe = bot.entity.position.distanceTo(hedefPos);

    if (mesafe > 2) {
      bot.lookAt(hedefPos);
      bot.setControlState('forward', true);
    } else {
      bot.clearControlStates();
    }
  });

  bot.on('entityHurt', (entity) => {
    if (entity !== bot.entity) return;

    // Saldıran oyuncuyu bul
    const saldirgan = Object.values(bot.entities).find(
      e => e.type === 'player' &&
           e.username !== patron &&
           e.username !== bot.username &&
           e.position.distanceTo(bot.entity.position) < 4
    );

    if (saldirgan) {
      const now = Date.now();
      if (saldirgan.username !== sonSaldiran || now - sonMesajZamani > MESAJ_COOLDOWN_MS) {
        sonSaldiran = saldirgan.username;
        sonMesajZamani = now;

        // Patrona özel mesaj gönder (oyun içi /msg komutu ile)
        bot.chat(`/msg ${patron} ⚠️ ${saldirgan.username} sana saldırıyor!`);
      }
    }
  });

  bot.on('death', () => {
    bot.chat('💀 Öldüm, yeniden doğmayı bekliyorum...');
  });

  bot.on('spawn', () => {
    if (!takipModu) baslatHareket();
  });

  bot.on('kicked', (reason, loggedIn) => {
    console.log('🛑 Kicked:', JSON.stringify(reason, null, 2));
  });

  bot.on('end', () => {
    console.log('🔴 Bot bağlantısı sona erdi.');
  });

  bot.on('error', err => {
    console.log(`⚠️ Bot hatası: ${err.message}`);
  });

  return bot;
};
