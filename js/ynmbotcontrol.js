// js/ynmbotcontrol.js
(function () {
  if (window.__ynmBotControlLoaded) return;
  window.__ynmBotControlLoaded = true;

  function setStatus(text, isError = false) {
    const el = document.getElementById('botStatus');
    if (!el) return;
    el.textContent = text;
    el.style.color = isError ? 'crimson' : 'green';
  }

  let botBusy = false;
  async function botAction(action) {
    if (botBusy) throw new Error('Művelet folyamatban, kérlek várj...');
    botBusy = true;
    document.querySelectorAll('[data-bot-action]').forEach(b => b.disabled = true);
    try {
      return await apiCall(action, {}, 'POST');
    } finally {
      botBusy = false;
      document.querySelectorAll('[data-bot-action]').forEach(b => b.disabled = false);
    }
  }


  async function checkBotStatus(silent = false) {
    try {
      const result = await apiCall('bot_status', {}, 'POST');

      const statusEl = document.getElementById('bot-status');
      const data = result.data || null;

      if (result.success) {
        if (!silent) setStatus('Státusz lekérdezve: OK');
        if (statusEl) {
          const irc = data?.irc_connected;
          statusEl.textContent = irc ? '🟢 Online' : '🟡 Running (IRC off)';
        }
      } else {
        if (!silent) setStatus(result.error || 'Státusz hiba', true);
        if (statusEl) statusEl.textContent = '⚠️ Error';
      }
    } catch (e) {
      if (!silent) setStatus(e.message || 'Státusz hiba', true);
      const statusEl = document.getElementById('bot-status');
      if (statusEl) statusEl.textContent = '⚠️ Error';
      console.error('checkBotStatus error:', e);
    }
  }

  async function doRestart() {
    try {
      showNotification('🔄 Restarting bot...', 'info');
      setStatus('Restart folyamatban...');
      const result = await botAction('bot_restart');
      showNotification(result.message || '✅ Bot is restarting...', 'success');
      setStatus(result.message || 'Restart elküldve');
      setTimeout(() => checkBotStatus(true), 10000);
    } catch (e) {
      showNotification('❌ ' + e.message, 'error');
      setStatus(e.message, true);
    }
  }

  async function doReload() {
    try {
      showNotification('♻️ Reloading...', 'info');
      setStatus('Reload folyamatban...');
      const result = await botAction('bot_reload');
      showNotification(result.message || '✅ Reloaded', 'success');
      setStatus(result.message || 'Reload OK');
      setTimeout(() => checkBotStatus(true), 1500);
    } catch (e) {
      showNotification('❌ ' + e.message, 'error');
      setStatus(e.message, true);
    }
  }

  async function doReconnect() {
    try {
      showNotification('🔌 Reconnecting...', 'info');
      setStatus('IRC reconnect folyamatban...');
      const result = await botAction('bot_reconnect');
      showNotification(result.message || '✅ Reconnecting...', 'success');
      setStatus(result.message || 'Reconnect OK');
      setTimeout(() => checkBotStatus(true), 5000);
    } catch (e) {
      showNotification('❌ ' + e.message, 'error');
      setStatus(e.message, true);
    }
  }

  document.addEventListener('click', (e) => {
    const btn = e.target.closest('[data-bot-action]');
    if (!btn) return;

    const action = btn.getAttribute('data-bot-action');

    if (action === 'bot_restart') return void doRestart();
    if (action === 'bot_reload') return void doReload();
    if (action === 'bot_reconnect') return void doReconnect();
    if (action === 'bot_status') return void checkBotStatus(false);
  });

  console.log('🔄 ynmbotcontrol.js loading...');

  function tryInit() {
    const box = document.getElementById('botStatus');
    if (!box) return false;
    checkBotStatus(true);
    return true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', tryInit);
  } else {
    setTimeout(tryInit, 100);
  }
})();