<?php
// inc/ynmbotcontrol.php
declare(strict_types=1);

if (session_status() !== PHP_SESSION_ACTIVE) {
    session_start();
}

// Védelem: csak owner lássa
if (($_SESSION['role'] ?? '') !== 'owner') {
    http_response_code(403);
    header('Content-Type: text/plain; charset=utf-8');
    echo "Access denied.";
    exit;
}

$username = $_SESSION['username'] ?? 'Unknown';
?>
<!doctype html>
<div class="ynm-win-panel">
  <div class="ynm-win-titlebar">
    <div class="title">YnM Bot Control</div>
    <div class="meta">Bejelentkezve: <?php echo htmlspecialchars($username, ENT_QUOTES, 'UTF-8'); ?> (owner)</div>
  </div>

  <div class="ynm-win-body">
    <div class="ynm-grid">
      <button type="button" class="ynm-btn" data-bot-action="bot_status">
        <div class="ico ico-status">i</div>
        <div class="txt">
          <div class="h">Státusz</div>
          <div class="d">Állapot lekérdezése</div>
        </div>
      </button>

      <button type="button" class="ynm-btn" data-bot-action="bot_reload">
        <div class="ico ico-reload">R</div>
        <div class="txt">
          <div class="h">Reload</div>
          <div class="d">Konfig / pluginek újratöltése</div>
        </div>
      </button>

      <button type="button" class="ynm-btn" data-bot-action="bot_reconnect">
        <div class="ico ico-reconn">C</div>
        <div class="txt">
          <div class="h">IRC Reconnect</div>
          <div class="d">IRC kapcsolat újraépítése</div>
        </div>
      </button>

      <button type="button" class="ynm-btn" data-bot-action="bot_restart">
        <div class="ico ico-restart">!</div>
        <div class="txt">
          <div class="h">Restart</div>
          <div class="d">Bot újraindítása (kilép/újraindul)</div>
        </div>
      </button>
    </div>

    <div class="ynm-status">
      <div class="left">
        <div class="label">Művelet / üzenet</div>
        <div id="botStatus" class="value">Készen áll.</div>
      </div>

      <div class="right">
        <span class="ynm-pill ok" id="bot-status">—</span>
      </div>
    </div>
  </div>
</div>