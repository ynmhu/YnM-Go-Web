<?php
session_start();

if (!isset($_SESSION['username']) || $_SESSION['username'] === 'Guest') {
    // ÜRES VÁLASZ - SEMMIT SEM KÜLDÜNK VISSZA
    echo '';
    exit;
}
?>
<div class="page-header">
    <h2>YnM-Go Logs</h2>
    <div>
        <button class="btn btn-warning" onclick="exportLogs()">📤 Export</button>
        <button class="btn btn-danger" onclick="showCleanupModal()">🧹 Cleanup Old Logs</button>
    </div>
</div>

<!-- Statisztikák -->
<div class="stats-grid">
    <div class="stat-card">
        <div class="stat-icon">📊</div>
        <div class="stat-content">
            <h3>Total Logs</h3>
            <div id="totalLogs" class="stat-value">-</div>
        </div>
    </div>
    
    <div class="stat-card">
        <div class="stat-icon">✅</div>
        <div class="stat-content">
            <h3>Successful Logins</h3>
            <div id="successfulLogins" class="stat-value">-</div>
        </div>
    </div>
    
    <div class="stat-card">
        <div class="stat-icon">❌</div>
        <div class="stat-content">
            <h3>Failed Logins</h3>
            <div id="failedLogins" class="stat-value">-</div>
        </div>
    </div>
    
    <div class="stat-card">
        <div class="stat-icon">📅</div>
        <div class="stat-content">
            <h3>Today's Activity</h3>
            <div id="todayLogs" class="stat-value">-</div>
        </div>
    </div>
</div>

<!-- Szűrők -->
<div class="filters">
    <input type="text" id="userFilter" name="user_filter" placeholder="🔍 Search by username..." class="search-input">
    
    <select id="actionFilter" name="action_filter" class="filter-select">
        <option value="">All Actions</option>
        <option value="✅">✅ Successful Login</option>
        <option value="❌">❌ Failed Login</option>
        <option value="🔑">🔑 Password Generated</option>
        <option value="➕">➕ Created</option>
        <option value="🔄">🔄 Updated</option>
        <option value="🗑️">🗑️ Deleted</option>
        <option value="🧹">🧹 Cleanup</option>
        <option value="📤">📤 Export</option>
        <option value="⛔">⛔ Unauthorized</option>
    </select>
    
    <select id="logLimit" name="log_limit" class="filter-select">
        <option value="50">Last 50 logs</option>
        <option value="100" selected>Last 100 logs</option>
        <option value="200">Last 200 logs</option>
        <option value="500">Last 500 logs</option>
    </select>
    
      <button class="btn btn-secondary" onclick="refreshLogs()">🔄 Refresh</button>
</div>

<!-- Logok konténer -->
<div id="logsContainer" class="logs-container">
    <p style="text-align: center; color: #666; padding: 40px;">Loading logs...</p>
</div>

<!-- Additional Stats -->
<div class="dashboard-section">
    <h3>📈 Activity Breakdown</h3>
    <div id="activityBreakdown" class="activity-breakdown">
        <p style="color: #666;">Loading activity breakdown...</p>
    </div>
</div>

<div class="dashboard-section">
    <h3>👥 Most Active User</h3>
    <p id="mostActiveUser" style="font-size: 1.2rem; font-weight: 600; color: #333;">Loading...</p>
</div>
<button class="btn btn-danger" onclick="console.log('Cleanup clicked'); showCleanupModal();">
    🧹 Cleanup Old Logs
</button>
