<?php
session_start();

if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
    // ÜRES VÁLASZ - SEMMIT SEM KÜLDÜNK VISSZA
    echo '';
    exit;
}
?>

<div class="page-header">
    <div>
        <h2>📊 Dashboard</h2>
        <p class="subtitle">
            Welcome back, <?= htmlspecialchars($_SESSION['username']) ?>!
            
            <?php 
            $effectiveRole = $_SESSION['effective_role'] ?? $_SESSION['role'] ?? 'user';
            $globalRole = $_SESSION['role'] ?? 'user';
            $hasChannelAdmin = $_SESSION['has_channel_admin'] ?? false;
            $channelRoles = $_SESSION['channel_roles'] ?? [];
            ?>
            
            <span class="role-badge role-<?= strtolower($effectiveRole) ?>">
                <?= strtoupper($effectiveRole) ?>
            </span>
            
            <?php if ($effectiveRole !== $globalRole): ?>
                <small style="margin-left: 10px; color: #6c757d;">
                    (Global: <?= $globalRole ?>)
                </small>
            <?php endif; ?>
            
            <?php if ($hasChannelAdmin && !empty($channelRoles)): ?>
                <span class="channel-admin-badge">
                    👑 Channel Admin
                </span>
            <?php endif; ?>
        </p>
        
        <?php if (!empty($channelRoles)): ?>
        <div style="margin-top: 10px; font-size: 0.9rem; color: #666;">
            <strong>Channel roles:</strong>
            <?php foreach ($channelRoles as $cr): ?>
                <span style="display: inline-block; margin: 0 5px; padding: 2px 8px; background: #e9ecef; border-radius: 10px;">
                    <?= htmlspecialchars($cr['channel']) ?>: <strong><?= $cr['role'] ?></strong>
                </span>
            <?php endforeach; ?>
        </div>
        <?php endif; ?>
    </div>
    
    <?php 
    // Bot control CSAK GLOBÁLIS owner/admin számára
    $showBotControls = in_array($globalRole, ['owner', 'admin']);
    
    if ($showBotControls): 
    ?>
    <div style="display: flex; gap: 10px; flex-wrap: wrap;">
        <button class="btn btn-danger" onclick="restartBot()" title="Restart the entire bot">
            🔄 Restart Bot
        </button>
        <button class="btn btn-warning" onclick="reconnectIRC()" title="Reconnect IRC only">
            🔌Reconnect IRC
        </button>
        <button class="btn btn-info" onclick="checkBotStatus()" title="Check current status">
            🔍Check Status
        </button>
        <button class="btn btn-success" onclick="reloadBot()" title="Reload bot configuration">
            ♻️Reload Config
        </button>
    </div>
    <?php endif; ?>
</div>

<!-- Statistics Cards -->
<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-icon">👥</div>
        <div class="stat-content">
            <h3 id="total-users">-</h3>
            <p>Total Users</p>
        </div>
    </div>
    
    <div class="stat-card">
        <div class="stat-icon">💬</div>
        <div class="stat-content">
            <h3 id="total-channels">-</h3>
            <p>Total Channels</p>
        </div>
    </div>
    
    <div class="stat-card">
        <div class="stat-icon">📝</div>
        <div class="stat-content">
            <h3 id="total-logs">-</h3>
            <p>Audit Logs</p>
        </div>
    </div>
    
    <?php if (isset($bot) && $bot): ?>
    <div class="stat-card">
        <div class="stat-icon">🤖</div>
        <div class="stat-content">
            <h3><?= htmlspecialchars($bot['nick']) ?></h3>
            <p>Bot Nick</p>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-icon">📡</div>
        <div class="stat-content">
            <h3 id="bot-status" style="color: <?= $bot['connected'] ? '#4caf50' : '#f44336' ?>">
            <?= $bot['connected'] ? 'Online' : 'Offline' ?>
            </h3>
            <p>Bot Status</p>
        </div>
    </div>

<div class="stat-card">
    <div class="stat-icon">📡</div>
    <div class="stat-content">
        <h3 style="color: <?= $bot['connected'] ? '#4caf50' : '#f44336' ?>">
            <?= $bot['connected'] ? 'Online' : 'Offline' ?>
        </h3>
        <p>Bot Status</p>
    </div>
</div>
    <div class="stat-card">
        <div class="stat-icon">⏱️</div>
        <div class="stat-content">
            <h3><?= htmlspecialchars($bot['bot_uptime'] ?? 'N/A') ?></h3>
            <p>Bot Uptime</p>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-icon">🧠</div>
        <div class="stat-content">
            <h3><?= isset($bot['cpu_percent']) ? round($bot['cpu_percent'], 1) . '%' : 'N/A' ?></h3>
            <p>CPU Usage</p>
        </div>
    </div>

    <div class="stat-card">
        <div class="stat-icon">📦</div>
        <div class="stat-content">
            <h3><?= isset($bot['process_memory_mb']) ? round($bot['process_memory_mb'], 1) . ' MB' : 'N/A' ?></h3>
            <p>Bot RAM</p>
        </div>
    </div>
    <?php endif; ?>
    
    <?php 
    // CHANNEL ROLE STATS (csak ha van channel role)
    $channelRoles = $_SESSION['channel_roles'] ?? [];
    if (!empty($channelRoles)): 
    ?>
    <div class="stat-card" style="grid-column: span 2; background: linear-gradient(135deg, #f8f9fa, #e9ecef);">
        <div class="stat-icon">🏷️</div>
        <div class="stat-content">
            <h3 style="font-size: 1.2rem; color: #6f42c1;">
                Channel Roles: <?= count($channelRoles) ?>
            </h3>
            <p style="font-size: 0.9rem; color: #666;">
                <?php 
                $roleCounts = [];
                foreach ($channelRoles as $cr) {
                    $role = $cr['role'] ?? 'user';
                    $roleCounts[$role] = ($roleCounts[$role] ?? 0) + 1;
                }
                
                $roleStrings = [];
                foreach ($roleCounts as $role => $count) {
                    $roleStrings[] = "$count $role" . ($count > 1 ? 's' : '');
                }
                echo implode(', ', $roleStrings);
                ?>
            </p>
        </div>
    </div>
    <?php endif; ?>
</div>

<!-- Recent Activity -->
<div class="table-container">
    <h3>📋 Recent Activity</h3>
    <table class="data-table" id="recent-activity">
        <thead>
            <tr>
                <th>Time</th>
                <th>User</th>
                <th>Action</th>
                <th>Details</th>
            </tr>
        </thead>
        <tbody>
            <tr><td colspan="4" class="loading">Loading...</td></tr>
        </tbody>
    </table>
</div>


